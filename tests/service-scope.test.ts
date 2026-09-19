import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { io as createClient, type Socket } from 'socket.io-client';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  RoomActionResult,
  ServerToClientEvents,
  SocketData,
} from '../shared/protocol';
import { createGameManager, type GameModeScope, type GameManager } from '../server/game';

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const clients: TestSocket[] = [];
const managers: GameManager[] = [];
const httpServers: HttpServer[] = [];
const ioServers: Array<Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>> = [];

async function openHarness(scope: GameModeScope): Promise<{ client: TestSocket; address: string }> {
  const httpServer = createServer();
  const ioServer = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, { cors: { origin: true } });
  const manager = createGameManager(ioServer, 1, 200, scope);
  ioServer.on('connection', (socket) => manager.bindSocket(socket));
  httpServers.push(httpServer);
  ioServers.push(ioServer);
  managers.push(manager);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address() as AddressInfo;
  const client = createClient(`http://127.0.0.1:${address.port}`, { autoConnect: false, forceNew: true });
  clients.push(client);
  await new Promise<void>((resolve, reject) => {
    client.once('connect', () => resolve());
    client.once('connect_error', reject);
    client.connect();
  });
  return { client, address: `http://127.0.0.1:${address.port}` };
}

function createRoom(client: TestSocket, mode: 'whoami' | 'draw-impostor'): Promise<RoomActionResult> {
  return new Promise((resolve) => client.emit('room:create', { nickname: 'Teste', mode }, resolve));
}

afterEach(async () => {
  clients.splice(0).forEach((client) => client.disconnect());
  managers.splice(0).forEach((manager) => manager.dispose());
  await Promise.all(ioServers.splice(0).map((ioServer) => new Promise<void>((resolve) => ioServer.close(() => resolve()))));
  await Promise.all(httpServers.splice(0).map((httpServer) => new Promise<void>((resolve) => httpServer.close(() => resolve()))));
});

describe('escopo do serviço de jogo', () => {
  it('aceita somente Quem Sou Eu no serviço whoami', async () => {
    const { client } = await openHarness('whoami');
    const refused = await createRoom(client, 'draw-impostor');
    expect(refused).toMatchObject({ ok: false, code: 'GAME_UNAVAILABLE' });
    const accepted = await createRoom(client, 'whoami');
    expect(accepted.ok).toBe(true);
  });

  it('aceita somente o impostor no serviço impostor', async () => {
    const { client } = await openHarness('draw-impostor');
    const refused = await createRoom(client, 'whoami');
    expect(refused).toMatchObject({ ok: false, code: 'GAME_UNAVAILABLE' });
    const accepted = await createRoom(client, 'draw-impostor');
    expect(accepted.ok).toBe(true);
  });
});
