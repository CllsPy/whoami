import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { io as createClient, type Socket } from 'socket.io-client';
import { Server } from 'socket.io';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../shared/protocol';
import type { CaracolActionResult, CaracolHistoryResult, CaracolStateView } from '../shared/caracol';
import { createCaracolManager, type CaracolGameManager } from '../server/caracol/game';
import { MemoryCaracolStore } from '../server/caracol/store';

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Harness {
  httpServer: HttpServer;
  ioServer: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  manager: CaracolGameManager;
  store: MemoryCaracolStore;
  address: string;
  now: { value: number };
}

const harnesses: Harness[] = [];
const clients: TestSocket[] = [];

function waitForEvent<T>(socket: TestSocket, event: keyof ServerToClientEvents, predicate?: (payload: T) => boolean): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event as never, listener as never);
      reject(new Error(`Timeout esperando ${String(event)}`));
    }, 4_000);
    const listener = (payload: T): void => {
      if (predicate && !predicate(payload)) return;
      clearTimeout(timeout);
      socket.off(event as never, listener as never);
      resolve(payload);
    };
    socket.on(event as never, listener as never);
  });
}

async function createHarness(): Promise<Harness> {
  const httpServer = createServer();
  const ioServer = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, { cors: { origin: true } });
  const now = { value: Date.now() };
  const store = new MemoryCaracolStore();
  const manager = createCaracolManager(ioServer, { store, clock: () => now.value, autoTick: false });
  ioServer.on('connection', (socket) => manager.bindSocket(socket));
  await manager.ready();
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const addressInfo = httpServer.address() as AddressInfo;
  const harness = { httpServer, ioServer, manager, store, address: `http://127.0.0.1:${addressInfo.port}`, now };
  harnesses.push(harness);
  return harness;
}

async function connectClient(address: string): Promise<TestSocket> {
  const client = createClient(address, { autoConnect: false, forceNew: true });
  clients.push(client);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout conectando cliente')), 4_000);
    client.once('connect', () => {
      clearTimeout(timeout);
      resolve(client);
    });
    client.once('connect_error', reject);
    client.connect();
  });
}

function register(client: TestSocket, nickname: string): Promise<CaracolActionResult> {
  return new Promise((resolve) => client.emit('caracol:register', { nickname, password: 'senha-segura' }, resolve));
}

function login(client: TestSocket, nickname: string): Promise<CaracolActionResult> {
  return new Promise((resolve) => client.emit('caracol:login', { nickname, password: 'senha-segura' }, resolve));
}

function resume(client: TestSocket, sessionToken: string): Promise<CaracolActionResult> {
  return new Promise((resolve) => client.emit('caracol:resume', { sessionToken }, resolve));
}

function sync(client: TestSocket): Promise<CaracolActionResult> {
  return new Promise((resolve) => client.emit('caracol:sync', resolve));
}

function selectCity(client: TestSocket, cityId: string): Promise<CaracolActionResult> {
  return new Promise((resolve) => client.emit('caracol:select-city', { cityId }, resolve));
}

function buySpeed(client: TestSocket): Promise<CaracolActionResult> {
  return new Promise((resolve) => client.emit('caracol:buy-speed', resolve));
}

function buyDiscount(client: TestSocket): Promise<CaracolActionResult> {
  return new Promise((resolve) => client.emit('caracol:buy-discount', resolve));
}

function redirect(client: TestSocket, targetNickname: string): Promise<CaracolActionResult> {
  return new Promise((resolve) => client.emit('caracol:redirect', { targetNickname }, resolve));
}

function history(client: TestSocket, beforeId: string | null = null): Promise<CaracolHistoryResult> {
  return new Promise((resolve) => client.emit('caracol:history', { beforeId, limit: 20 }, resolve));
}

afterEach(async () => {
  clients.splice(0).forEach((client) => client.disconnect());
  await Promise.all(harnesses.splice(0).map(async (harness) => {
    harness.manager.dispose();
    await new Promise<void>((resolve) => harness.ioServer.close(() => resolve()));
    await new Promise<void>((resolve) => harness.httpServer.close(() => resolve()));
  }));
});

describe('mundo global do Caracol', () => {
  it('persiste o nick, credita online/offline e valida custos globais', async () => {
    const harness = await createHarness();
    const player = await connectClient(harness.address);
    const created = await register(player, 'Lento');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.state.you.coins).toBe(5);

    const city = await selectCity(player, '3550308');
    expect(city.ok).toBe(true);
    if (!city.ok) return;

    harness.now.value += 10_000;
    const onlineState = waitForEvent<CaracolStateView>(player, 'caracol:state', (next) => next.you.coins === 15);
    await harness.manager.tickOnce();
    expect((await onlineState).you.coins).toBe(15);

    harness.now.value += 40_000;
    const accelerated = await buySpeed(player);
    expect(accelerated.ok).toBe(true);
    if (!accelerated.ok) return;
    expect(accelerated.state.world.snail.speedKmh).toBe(100);
    expect(accelerated.state.world.snail.speedCost).toBe(200);
    expect(accelerated.state.you.coins).toBe(5);

    const secondAcceleration = await buySpeed(player);
    expect(secondAcceleration.ok).toBe(false);
    if (secondAcceleration.ok) return;
    expect(secondAcceleration.code).toBe('INSUFFICIENT_COINS');

    harness.now.value += 20_000;
    const discount = await buyDiscount(player);
    expect(discount.ok).toBe(true);
    if (!discount.ok) return;
    expect(discount.state.you.speedDiscountLevel).toBe(1);
    expect(discount.state.world.snail.speedCost).toBe(150);

    harness.now.value += 140_000;
    const discountedAcceleration = await buySpeed(player);
    expect(discountedAcceleration.ok).toBe(true);
    if (!discountedAcceleration.ok) return;
    expect(discountedAcceleration.state.world.snail.speedKmh).toBe(200);
    expect(discountedAcceleration.state.you.coins).toBe(5);
  });

  it('mantém a conta offline vulnerável, cobra redirecionamento e bloqueia mudança viva', async () => {
    const harness = await createHarness();
    const playerA = await connectClient(harness.address);
    const playerB = await connectClient(harness.address);
    expect((await register(playerA, 'Aventureiro')).ok).toBe(true);
    expect((await register(playerB, 'Alvo')).ok).toBe(true);
    expect((await selectCity(playerA, '3550308')).ok).toBe(true);
    expect((await selectCity(playerB, '3304557')).ok).toBe(true);

    const locked = await selectCity(playerA, '5300108');
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.code).toBe('CITY_LOCKED');

    harness.now.value += 10_000;
    const redirected = await redirect(playerA, 'Alvo');
    expect(redirected.ok).toBe(true);
    if (redirected.ok) expect(redirected.state.world.snail.targetNickname).toBe('Alvo');

    playerB.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50));
    harness.now.value += 20_000;
    const reconnecting = await connectClient(harness.address);
    const logged = await login(reconnecting, 'Alvo');
    expect(logged.ok).toBe(true);
    if (logged.ok) expect(logged.state.you.coins).toBe(17);
  });

  it('retoma a sessão do PWA e entrega um snapshot novo ao voltar para a tela', async () => {
    const harness = await createHarness();
    const player = await connectClient(harness.address);
    const created = await register(player, 'Retorno');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect((await selectCity(player, '3550308')).ok).toBe(true);
    const sessionToken = created.sessionToken;

    player.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50));
    harness.now.value += 20_000;

    const resumedClient = await connectClient(harness.address);
    const resumed = await resume(resumedClient, sessionToken);
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.sessionToken).toBe(sessionToken);
    expect(resumed.state.you.coins).toBe(7);

    harness.now.value += 10_000;
    const refreshed = await sync(resumedClient);
    expect(refreshed.ok).toBe(true);
    if (refreshed.ok) expect(refreshed.state.you.coins).toBe(17);
  });

  it('mata no alcance, zera moedas, mantém desconto e reinicia o caracol', async () => {
    const harness = await createHarness();
    const playerA = await connectClient(harness.address);
    expect((await register(playerA, 'Brasiliense')).ok).toBe(true);
    expect((await selectCity(playerA, '5300108')).ok).toBe(true);

    harness.now.value += 25_000;
    expect((await buyDiscount(playerA)).ok).toBe(true);
    const death = waitForEvent<{ nickname: string; message: string }>(playerA, 'caracol:death');
    const deadState = waitForEvent<CaracolStateView>(playerA, 'caracol:state', (next) => next.needsCity);
    await harness.manager.tickOnce();
    expect((await death).nickname).toBe('Brasiliense');
    const state = await deadState;
    expect(state.needsCity).toBe(true);
    expect(state.you.coins).toBe(0);
    expect(state.you.speedDiscountLevel).toBe(1);
    expect(state.world.snail.speedKmh).toBe(0.05);
    expect(state.world.snail.lat).toBeCloseTo(-15.7795, 5);
    expect(state.world.snail.lon).toBeCloseTo(-47.9297, 5);
  });

  it('dobra o custo global de redirecionar e pagina as ações de 20 em 20', async () => {
    const harness = await createHarness();
    const playerA = await connectClient(harness.address);
    const playerB = await connectClient(harness.address);
    expect((await register(playerA, 'Diretor')).ok).toBe(true);
    expect((await register(playerB, 'Perseguido')).ok).toBe(true);
    expect((await selectCity(playerA, '3550308')).ok).toBe(true);
    expect((await selectCity(playerB, '3304557')).ok).toBe(true);

    harness.now.value += 10_000;
    const firstRedirect = await redirect(playerA, 'Perseguido');
    expect(firstRedirect.ok).toBe(true);
    if (!firstRedirect.ok) return;
    expect(firstRedirect.state.world.snail.redirectCost).toBe(16);
    expect(firstRedirect.state.you.coins).toBe(7);

    harness.now.value += 10_000;
    const secondRedirect = await redirect(playerA, 'Perseguido');
    expect(secondRedirect.ok).toBe(true);
    if (!secondRedirect.ok) return;
    expect(secondRedirect.state.world.snail.redirectCost).toBe(32);
    expect(secondRedirect.state.you.coins).toBe(1);

    harness.now.value += 10_000;
    const insufficient = await redirect(playerA, 'Perseguido');
    expect(insufficient.ok).toBe(false);
    if (!insufficient.ok) expect(insufficient.message).toContain('32');

    const actionPage = await history(playerA);
    expect(actionPage.ok).toBe(true);
    if (!actionPage.ok) return;
    expect(actionPage.entries.some((entry) => entry.type === 'redirect' && entry.amount === 8)).toBe(true);
    expect(actionPage.entries.some((entry) => entry.type === 'redirect' && entry.amount === 16)).toBe(true);

    for (let index = 0; index < 22; index += 1) {
      await harness.store.appendHistory({
        type: 'account',
        message: `Ação de paginação ${index}`,
        actorNickname: 'Diretor',
        targetNickname: null,
        amount: null,
        createdAt: harness.now.value + index + 1,
      });
    }
    const firstPage = await history(playerA);
    expect(firstPage.ok).toBe(true);
    if (!firstPage.ok) return;
    expect(firstPage.entries).toHaveLength(20);
    expect(firstPage.hasMore).toBe(true);
    const secondPage = await history(playerA, firstPage.nextCursor);
    expect(secondPage.ok).toBe(true);
    if (secondPage.ok) {
      expect(secondPage.entries.length).toBeGreaterThan(0);
      expect(secondPage.entries.every((entry) => !firstPage.entries.some((first) => first.id === entry.id))).toBe(true);
    }
  });
});
