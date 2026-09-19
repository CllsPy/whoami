# GameGameGame no Dokploy

O repositório continua sendo um monorepo, mas cada implantação escolhe um
serviço por meio de `VITE_GAME_SERVICE` (build) e `GAME_SERVICE` (runtime).
Assim, o Dokploy pode atualizar um jogo sem reiniciar os outros.

## Aplicações

| Aplicação | `VITE_GAME_SERVICE` | `GAME_SERVICE` | Domínio sugerido | Estado |
| --- | --- | --- | --- | --- |
| Lobby | `lobby` | `lobby` | `gamegamegame.site` | estático, sem banco |
| Quem Sou Eu | `whoami` | `whoami` | `whoami.gamegamegame.site` | salas em memória |
| Quem é o impostor | `impostor` | `impostor` | `impostor.gamegamegame.site` | salas em memória |
| Caracol | `caracol` | `caracol` | `caracol.gamegamegame.site` | PostgreSQL próprio |

Para cada aplicação, use o mesmo repositório e o `Dockerfile` da raiz. Defina
o argumento de build `VITE_GAME_SERVICE` com o valor da tabela e a variável de
runtime `GAME_SERVICE` com o mesmo valor. Cada serviço escuta internamente na
porta `3001`; o Dokploy/Traefik publica o domínio correspondente.

O frontend e o Socket.IO ficam no mesmo serviço e na mesma origem. Portanto,
`VITE_SERVER_URL` deve ficar vazio nessas aplicações; isso mantém salas,
WebSocket e reconexão juntos e evita CORS desnecessário.

## Caracol

O serviço `caracol` precisa de um PostgreSQL separado. Configure:

- `CARACOL_DATABASE_URL` apontando para o banco do serviço;
- `CARACOL_VAPID_PUBLIC_KEY`;
- `CARACOL_VAPID_PRIVATE_KEY`;
- `CARACOL_VAPID_SUBJECT`.

Não reutilize as chaves VAPID de outro projeto.

## Migração segura

1. Criar as quatro aplicações no Dokploy da VPS pessoal.
2. Publicar cada domínio e validar login, Socket.IO, reconexão e o fluxo do
   Caracol com os três usuários de teste.
3. Trocar o domínio principal para o lobby.
4. Manter o stack legado disponível até a validação final.
5. Só depois retirar o Compose antigo do Whoiam.

O valor `all` permanece como compatibilidade para desenvolvimento e para o
deploy legado atual; ele inicia Quem Sou Eu, Quem é o impostor e Caracol no
mesmo processo.
