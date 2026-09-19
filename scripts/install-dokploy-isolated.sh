#!/usr/bin/env bash
set -Eeuo pipefail

# Installs Dokploy beside the existing host/Nginx services.
# The official installer assumes ports 80/443 are free; this VPS already uses
# them, so Dokploy's Traefik is published on isolated host ports instead.

ADVERTISE_ADDR="${ADVERTISE_ADDR:-13.140.129.191}"
DOKPLOY_PORT="${DOKPLOY_PORT:-3000}"
TRAEFIK_HTTP_PORT="${TRAEFIK_HTTP_PORT:-18080}"
TRAEFIK_HTTPS_PORT="${TRAEFIK_HTTPS_PORT:-18443}"
SWARM_ADDR_POOL="${SWARM_ADDR_POOL:-10.240.0.0/16}"
SWARM_ADDR_MASK="${SWARM_ADDR_MASK:-24}"

die() {
  echo "[dokploy] $*" >&2
  exit 1
}

port_in_use() {
  local port="$1"
  ss -H -ltn "sport = :${port}" | grep -q . || ss -H -lun "sport = :${port}" | grep -q .
}

wait_for_service() {
  local service="$1"
  local attempt
  for attempt in $(seq 1 30); do
    if docker service ps "$service" --filter desired-state=running --format '{{.CurrentState}}' | grep -q '^Running'; then
      return 0
    fi
    sleep 4
  done
  docker service ps "$service" --no-trunc >&2 || true
  die "serviço ${service} não ficou Running"
}

[ "$(id -u)" = "0" ] || die "execute como root"
command -v docker >/dev/null 2>&1 || die "Docker não está instalado"
command -v openssl >/dev/null 2>&1 || die "openssl não está instalado"

[ "$(docker info --format '{{.Swarm.LocalNodeState}}')" = "inactive" ] || die "o Docker já participa de um Swarm; não vou reconfigurá-lo automaticamente"

for port in "$DOKPLOY_PORT" "$TRAEFIK_HTTP_PORT" "$TRAEFIK_HTTPS_PORT"; do
  port_in_use "$port" && die "a porta ${port} já está em uso"
done

for resource in dokploy dokploy-postgres dokploy-traefik; do
  docker service inspect "$resource" >/dev/null 2>&1 && die "o recurso Docker ${resource} já existe"
  docker container inspect "$resource" >/dev/null 2>&1 && die "o container Docker ${resource} já existe"
done

docker network inspect dokploy-network >/dev/null 2>&1 && die "a rede dokploy-network já existe"

echo "[dokploy] inicializando Swarm com pool ${SWARM_ADDR_POOL}"
docker swarm init \
  --advertise-addr "$ADVERTISE_ADDR" \
  --default-addr-pool "$SWARM_ADDR_POOL" \
  --default-addr-pool-mask-length "$SWARM_ADDR_MASK"

docker network create --driver overlay --attachable dokploy-network
install -d -m 0755 /etc/dokploy

if ! docker secret inspect dokploy_postgres_password >/dev/null 2>&1; then
  openssl rand -base64 48 | tr -d '=+/\n' | cut -c1-32 | docker secret create dokploy_postgres_password -
fi

if ! docker secret inspect dokploy_auth_secret >/dev/null 2>&1; then
  openssl rand -hex 32 | docker secret create dokploy_auth_secret -
fi

docker service create \
  --name dokploy-postgres \
  --constraint 'node.role==manager' \
  --network dokploy-network \
  --env POSTGRES_USER=dokploy \
  --env POSTGRES_DB=dokploy \
  --secret source=dokploy_postgres_password,target=/run/secrets/postgres_password \
  --env POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password \
  --mount type=volume,source=dokploy-postgres,target=/var/lib/postgresql/data \
  postgres:16

docker service create \
  --name dokploy \
  --replicas 1 \
  --network dokploy-network \
  --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock \
  --mount type=bind,source=/etc/dokploy,target=/etc/dokploy \
  --mount type=volume,source=dokploy,target=/root/.docker \
  --secret source=dokploy_postgres_password,target=/run/secrets/postgres_password \
  --secret source=dokploy_auth_secret,target=/run/secrets/dokploy_auth_secret \
  --publish published="${DOKPLOY_PORT}",target=3000,mode=host \
  --update-parallelism 1 \
  --update-order stop-first \
  --constraint 'node.role==manager' \
  --env POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password \
  --env BETTER_AUTH_SECRET_FILE=/run/secrets/dokploy_auth_secret \
  dokploy/dokploy:latest

wait_for_service dokploy-postgres
wait_for_service dokploy

for attempt in $(seq 1 30); do
  [ -f /etc/dokploy/traefik/traefik.yml ] && [ -d /etc/dokploy/traefik/dynamic ] && break
  sleep 4
done

[ -f /etc/dokploy/traefik/traefik.yml ] || die "Dokploy não gerou a configuração do Traefik"

docker run -d \
  --name dokploy-traefik \
  --restart always \
  --network dokploy-network \
  -v /etc/dokploy/traefik/traefik.yml:/etc/traefik/traefik.yml:ro \
  -v /etc/dokploy/traefik/dynamic:/etc/dokploy/traefik/dynamic \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -p "${TRAEFIK_HTTP_PORT}:80/tcp" \
  -p "${TRAEFIK_HTTPS_PORT}:443/tcp" \
  -p "${TRAEFIK_HTTPS_PORT}:443/udp" \
  traefik:v3.6.7

for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 "http://127.0.0.1:${DOKPLOY_PORT}/" >/dev/null; then
    echo "[dokploy] instalado; painel: http://${ADVERTISE_ADDR}:${DOKPLOY_PORT}"
    echo "[dokploy] Traefik HTTP: ${TRAEFIK_HTTP_PORT}; HTTPS: ${TRAEFIK_HTTPS_PORT}"
    exit 0
  fi
  sleep 4
done

docker ps --filter name=dokploy --filter name=dokploy-traefik >&2 || true
die "Dokploy não respondeu na porta ${DOKPLOY_PORT}"
