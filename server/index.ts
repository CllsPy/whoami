import path from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../shared/protocol';
import { createGameManager } from './game';
import { createCaracolManager } from './caracol/game';
import { isOriginAllowed, parseAllowedOrigins } from './origins';

type RuntimeService = 'all' | 'lobby' | 'whoami' | 'impostor' | 'caracol';

function readRuntimeService(): RuntimeService {
  const value = process.env.GAME_SERVICE;
  return value === 'lobby' || value === 'whoami' || value === 'impostor' || value === 'caracol' || value === 'all'
    ? value
    : 'all';
}

const app = express();
const httpServer = createServer(app);
const runtimeService = readRuntimeService();
const allowedOrigins = parseAllowedOrigins(process.env.PUBLIC_ORIGIN);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});
const classicMode = runtimeService === 'whoami' ? 'whoami' : runtimeService === 'impostor' ? 'draw-impostor' : 'all';
const gameManager = runtimeService === 'lobby' || runtimeService === 'caracol'
  ? null
  : createGameManager(io, undefined, undefined, classicMode);
const caracolManager = runtimeService === 'lobby' || runtimeService === 'whoami' || runtimeService === 'impostor'
  ? null
  : createCaracolManager(io);

app.disable('x-powered-by');

// O CORS do Socket.IO só cobre as rotas dele, e o `/healthz` é consultado pelo
// próprio navegador quando a interface está em outro domínio: num host free que
// hiberna, o cliente bate aqui para acordar o servidor e para saber quando ele
// respondeu. Sem estes cabeçalhos o navegador faria a requisição (acordando o
// serviço) mas bloquearia a leitura da resposta, e o cliente nunca saberia que
// já pode conectar.
app.get('/healthz', (request, response) => {
  const origin = request.headers.origin;
  if (typeof origin === 'string' && isOriginAllowed(allowedOrigins, origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.json({
    ok: true,
    service: runtimeService,
    rooms: gameManager?.getRoomCount() ?? 0,
    caracolOnline: caracolManager?.getOnlineCount() ?? 0,
  });
});

// Num deploy dividido (interface na Vercel, servidor na Railway) o servidor é
// buildado sem `dist/`. Servir estático nesse caso faria a raiz responder erro
// ao tentar enviar um index.html inexistente, então a interface só entra na
// rota quando de fato foi buildada junto — o caso do Docker e do `npm start`
// local, em que um processo serve as duas coisas.
const clientDist = path.resolve(process.cwd(), 'dist');
const servesClient = existsSync(path.join(clientDist, 'index.html'));

if (servesClient) {
  app.use(express.static(clientDist));
  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/socket.io')) {
      next();
      return;
    }
    response.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_request, response) => {
    response.json({ service: 'quem-sou-eu', mode: 'api-only', healthz: '/healthz' });
  });
}

io.on('connection', (socket) => {
  gameManager?.bindSocket(socket);
  caracolManager?.bindSocket(socket);
});

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '0.0.0.0';

const shutdown = (): void => {
  gameManager?.dispose();
  caracolManager?.dispose();
  io.close();
  httpServer.close(() => process.exit(0));
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

const ready = caracolManager ? caracolManager.ready() : Promise.resolve();

void ready.then(() => {
  httpServer.listen(port, host, () => {
    console.log(`[${runtimeService}] ouvindo em http://${host}:${port}`);
  });
}).catch((error: unknown) => {
  console.error('[caracol] não foi possível inicializar o mundo persistente', error);
  process.exitCode = 1;
});
