import { createHash, randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import type { Server, Socket } from 'socket.io';
import {
  type CaracolActionResult,
  type CaracolActionFailure,
  CARACOL_COSMETIC_CATALOG,
  type CaracolDeathPayload,
  type CaracolHistoryInput,
  type CaracolHistoryResult,
  type CaracolLoginInput,
  type CaracolPushSubscriptionInput,
  type CaracolRedirectInput,
  type CaracolRegisterInput,
  type CaracolResumeInput,
  type CaracolSelectCityInput,
  type CaracolCosmeticSlot,
  type CaracolCosmeticWearer,
  type CaracolShopEquipInput,
  type CaracolShopPurchaseInput,
  type CaracolStateView,
  type CaracolVisibilityInput,
  CARACOL_BASE_SPEED_KMH,
  CARACOL_COIN_INTERVAL_MS,
  CARACOL_DISCOUNT_COSTS,
  CARACOL_HISTORY_PAGE_SIZE,
  CARACOL_OFFLINE_COINS_PER_INTERVAL,
  CARACOL_ONLINE_COINS_PER_INTERVAL,
  CARACOL_REDIRECT_COST,
  CARACOL_STARTING_COINS,
  emptyCaracolOutfit,
  type CaracolCity,
} from '../../shared/caracol';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../../shared/protocol';
import { cityById, type BrazilianCity } from '../../shared/cities';
import { normalizeText } from '../normalization';
import { distanceKm, moveTowards, type GeoPoint } from './geo';
import {
  CaracolNicknameTakenError,
  createCaracolStore,
  type CaracolAccountRecord,
  type CaracolPushRecord,
  type CaracolStore,
  type CaracolHistoryRecord,
  type CaracolWorldRecord,
} from './store';
import { CaracolPushService } from './push';

type CaracolSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type CaracolIo = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

interface RuntimeAccount extends CaracolAccountRecord {
  sockets: Set<string>;
  visibleSockets: Set<string>;
}

interface CaracolManagerOptions {
  store?: CaracolStore;
  clock?: () => number;
  autoTick?: boolean;
}

const MIN_NICKNAME_LENGTH = 2;
const MAX_NICKNAME_LENGTH = 24;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const APPROACHING_ETA_MS = 10 * 60_000;
const TICK_MS = 1_000;

export class CaracolGameManager {
  private readonly store: CaracolStore;
  private readonly clock: () => number;
  private readonly accounts = new Map<string, RuntimeAccount>();
  private readonly sockets = new Map<string, CaracolSocket>();
  private readonly sessions = new Map<string, string>();
  private readonly pushSubscriptions = new Map<string, CaracolPushRecord>();
  private readonly approachingSent = new Set<string>();
  private readonly push: CaracolPushService;
  private readonly readyPromise: Promise<void>;
  private world!: CaracolWorldRecord;
  private tickTimer: NodeJS.Timeout | null = null;
  private tickInFlight = false;
  private shopMutationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly io: CaracolIo, options: CaracolManagerOptions = {}) {
    this.store = options.store ?? createCaracolStore();
    this.clock = options.clock ?? (() => Date.now());
    this.push = new CaracolPushService((endpoint) => this.removePushSubscription(endpoint));
    this.readyPromise = this.initialize();
    if (options.autoTick !== false) {
      this.tickTimer = setInterval(() => { void this.runTick(); }, TICK_MS);
      this.tickTimer.unref();
    }
  }

  async ready(): Promise<void> {
    await this.readyPromise;
  }

  async initialize(): Promise<void> {
    await this.store.initialize();
    const snapshot = await this.store.loadSnapshot();
    this.world = snapshot.world;
    this.accounts.clear();
    for (const account of snapshot.accounts) {
      this.accounts.set(account.id, { ...account, sockets: new Set(), visibleSockets: new Set() });
    }
    this.pushSubscriptions.clear();
    for (const subscription of snapshot.pushSubscriptions) this.pushSubscriptions.set(subscription.endpoint, subscription);

    await this.tickInternal(this.clock(), false);
  }

  bindSocket(socket: CaracolSocket): void {
    this.sockets.set(socket.id, socket);
    socket.on('caracol:register', (payload, ack) => { void this.afterReady(() => this.register(socket, payload, ack)); });
    socket.on('caracol:login', (payload, ack) => { void this.afterReady(() => this.login(socket, payload, ack)); });
    socket.on('caracol:resume', (payload, ack) => { void this.afterReady(() => this.resume(socket, payload, ack)); });
    socket.on('caracol:sync', (ack) => { void this.afterReady(() => this.sync(socket, ack)); });
    socket.on('caracol:select-city', (payload, ack) => { void this.afterReady(() => this.selectCity(socket, payload, ack)); });
    socket.on('caracol:redirect', (payload, ack) => { void this.afterReady(() => this.redirect(socket, payload, ack)); });
    socket.on('caracol:buy-speed', (ack) => { void this.afterReady(() => this.buySpeed(socket, ack)); });
    socket.on('caracol:buy-discount', (ack) => { void this.afterReady(() => this.buyDiscount(socket, ack)); });
    socket.on('caracol:shop-purchase', (payload, ack) => { void this.afterReady(() => this.enqueueShopMutation(() => this.shopPurchase(socket, payload, ack))); });
    socket.on('caracol:shop-equip', (payload, ack) => { void this.afterReady(() => this.enqueueShopMutation(() => this.shopEquip(socket, payload, ack))); });
    socket.on('caracol:visibility', (payload) => { void this.afterReady(() => this.setVisibility(socket, payload)); });
    socket.on('caracol:push-subscribe', (payload, ack) => { void this.afterReady(() => this.subscribePush(socket, payload, ack)); });
    socket.on('caracol:push-unsubscribe', (payload, ack) => { void this.afterReady(() => this.unsubscribePush(socket, payload, ack)); });
    socket.on('caracol:history', (payload, ack) => { void this.afterReady(() => this.history(socket, payload, ack)); });
    socket.on('caracol:logout', () => { void this.afterReady(() => this.logout(socket)); });
    socket.on('disconnect', () => { void this.afterReady(() => this.disconnect(socket)); });
  }

  dispose(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
    void this.store.close();
  }

  getOnlineCount(): number {
    return Array.from(this.accounts.values()).filter((account) => account.sockets.size > 0).length;
  }

  /** Deterministic hook used by integration tests; production uses the timer. */
  async tickOnce(): Promise<void> {
    await this.readyPromise;
    await this.tickInternal(this.clock(), true);
  }

  private async afterReady(work: () => Promise<void>): Promise<void> {
    try {
      await this.readyPromise;
      await work();
    } catch (error) {
      console.error('[caracol] operação falhou', error);
    }
  }

  private async register(socket: CaracolSocket, payload: CaracolRegisterInput, ack: (result: CaracolActionResult) => void): Promise<void> {
    const nickname = this.cleanNickname(payload?.nickname);
    const password = typeof payload?.password === 'string' ? payload.password : '';
    const validation = this.validateCredentials(nickname, password);
    if (validation) {
      ack(this.failure('INVALID_CREDENTIALS', validation));
      return;
    }
    const normalizedNickname = normalizeText(nickname);
    if (Array.from(this.accounts.values()).some((account) => account.normalizedNickname === normalizedNickname)) {
      ack(this.failure('NICKNAME_TAKEN', 'Esse nick já está sendo usado.'));
      return;
    }

    const now = this.clock();
    try {
      const account = await this.store.createAccount({
        nickname,
        normalizedNickname,
        passwordHash: await hash(password, 12),
        coins: CARACOL_STARTING_COINS,
        alive: true,
        cityId: null,
        cityName: null,
        cityUf: null,
        cityLat: null,
        cityLon: null,
        speedDiscountLevel: 0,
        cosmeticOwnedItemIds: [],
        cosmeticOutfit: emptyCaracolOutfit(),
        lastCoinAccruedAt: now,
      });
      const runtime = this.addRuntimeAccount(account);
      await this.attachSocket(socket, runtime, now);
      await this.recordHistory({
        type: 'account',
        message: `${runtime.nickname} entrou no jogo com ${CARACOL_STARTING_COINS} moedas.`,
        actorNickname: runtime.nickname,
        targetNickname: null,
        amount: CARACOL_STARTING_COINS,
        createdAt: now,
      });
      await this.ensureTarget();
      const sessionToken = this.issueSession(socket, runtime);
      ack({ ok: true, accountId: runtime.id, nickname: runtime.nickname, sessionToken, state: this.stateFor(runtime) });
      this.broadcastState();
    } catch (error) {
      ack(error instanceof CaracolNicknameTakenError ? this.failure('NICKNAME_TAKEN', error.message) : this.failure('REGISTER_FAILED', 'Não consegui criar sua conta agora.'));
    }
  }

  private async login(socket: CaracolSocket, payload: CaracolLoginInput, ack: (result: CaracolActionResult) => void): Promise<void> {
    const nickname = this.cleanNickname(payload?.nickname);
    const password = typeof payload?.password === 'string' ? payload.password : '';
    if (!nickname || !password) {
      ack(this.failure('INVALID_CREDENTIALS', 'Digite seu nick e sua senha.'));
      return;
    }
    const account = Array.from(this.accounts.values()).find((candidate) => candidate.normalizedNickname === normalizeText(nickname));
    if (!account || !(await compare(password, account.passwordHash))) {
      ack(this.failure('INVALID_LOGIN', 'Nick ou senha incorretos. Não há recuperação de senha.'));
      return;
    }
    const now = this.clock();
    await this.attachSocket(socket, account, now);
    await this.ensureTarget();
    const sessionToken = this.issueSession(socket, account);
    ack({ ok: true, accountId: account.id, nickname: account.nickname, sessionToken, state: this.stateFor(account) });
    this.broadcastState();
  }

  private async resume(socket: CaracolSocket, payload: CaracolResumeInput, ack: (result: CaracolActionResult) => void): Promise<void> {
    const sessionToken = typeof payload?.sessionToken === 'string' ? payload.sessionToken.trim() : '';
    const tokenHash = this.hashSessionToken(sessionToken);
    const accountId = tokenHash ? this.sessions.get(tokenHash) : undefined;
    const account = accountId ? this.accounts.get(accountId) : undefined;
    if (!account) {
      ack(this.failure('SESSION_EXPIRED', 'Sua sessão do Caracol expirou. Entre novamente com seu nick e sua senha.'));
      return;
    }
    const now = this.clock();
    await this.attachSocket(socket, account, now);
    socket.data.caracolSessionTokenHash = tokenHash;
    await this.ensureTarget();
    ack({ ok: true, accountId: account.id, nickname: account.nickname, sessionToken, state: this.stateFor(account) });
    this.broadcastState();
  }

  private async sync(socket: CaracolSocket, ack: (result: CaracolActionResult) => void): Promise<void> {
    const account = this.authenticatedAccount(socket, ack);
    if (!account) return;
    await this.settleCoins(account);
    const targetChanged = await this.ensureTarget();
    if (targetChanged) await this.store.saveWorld(this.world);
    ack({ ok: true, state: this.stateFor(account) });
  }

  private async history(socket: CaracolSocket, payload: CaracolHistoryInput, ack: (result: CaracolHistoryResult) => void): Promise<void> {
    if (!this.authenticatedAccount(socket)) {
      ack(this.failure('NOT_AUTHENTICATED', 'Entre no Caracol com seu nick e sua senha.'));
      return;
    }
    const requestedLimit = Number(payload?.limit ?? CARACOL_HISTORY_PAGE_SIZE);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(CARACOL_HISTORY_PAGE_SIZE, Math.floor(requestedLimit)))
      : CARACOL_HISTORY_PAGE_SIZE;
    const page = await this.store.listHistory({
      beforeId: typeof payload?.beforeId === 'string' ? payload.beforeId : null,
      limit,
    });
    ack({ ok: true, ...page });
  }

  private async selectCity(socket: CaracolSocket, payload: CaracolSelectCityInput, ack: (result: CaracolActionResult) => void): Promise<void> {
    const account = this.authenticatedAccount(socket, ack);
    if (!account) return;
    if (account.alive && account.cityId) {
      ack(this.failure('CITY_LOCKED', 'Sua cidade fica travada enquanto você estiver vivo.'));
      return;
    }
    const city = cityById.get(String(payload?.cityId ?? ''));
    if (!city) {
      ack(this.failure('CITY_NOT_FOUND', 'Escolha uma cidade válida do mapa.'));
      return;
    }
    account.alive = true;
    this.setAccountCity(account, city);
    account.lastCoinAccruedAt = this.clock();
    await this.store.saveAccount(account);
    await this.recordHistory({
      type: 'city',
      message: `${account.nickname} escolheu ${city.name} (${city.uf}) para morar.`,
      actorNickname: account.nickname,
      targetNickname: null,
      amount: null,
      createdAt: this.clock(),
    });
    await this.ensureTarget();
    await this.store.saveWorld(this.world);
    ack({ ok: true, state: this.stateFor(account) });
    this.broadcastState();
  }

  private async redirect(socket: CaracolSocket, payload: CaracolRedirectInput, ack: (result: CaracolActionResult) => void): Promise<void> {
    const account = this.authenticatedAccount(socket, ack);
    if (!account) return;
    if (!account.alive || !account.cityId) {
      ack(this.failure('NEEDS_CITY', 'Escolha sua cidade antes de agir.'));
      return;
    }
    await this.settleCoins(account);
    const targetNickname = this.cleanNickname(payload?.targetNickname);
    const target = Array.from(this.accounts.values()).find((candidate) => candidate.normalizedNickname === normalizeText(targetNickname) && candidate.alive && candidate.cityId && candidate.id !== account.id);
    if (!target) {
      ack(this.failure('TARGET_NOT_FOUND', 'Esse nick não está vivo no mapa.'));
      return;
    }
    const cost = this.redirectCost(account.speedDiscountLevel);
    if (account.coins < cost) {
      ack(this.failure('INSUFFICIENT_COINS', `Você precisa de ${cost} moedas para redirecionar o caracol.`));
      return;
    }
    account.coins -= cost;
    this.world.targetAccountId = target.id;
    this.world.redirectLevel += 1;
    this.approachingSent.clear();
    await Promise.all([this.store.saveAccount(account), this.store.saveWorld(this.world)]);
    await this.recordHistory({
      type: 'redirect',
      message: `${account.nickname} mandou o caracol atrás de ${target.nickname} por ${cost} moedas.`,
      actorNickname: account.nickname,
      targetNickname: target.nickname,
      amount: cost,
      createdAt: this.clock(),
    });
    this.ioNotice('redirected', `O caracol mudou de ideia: agora vai atrás de ${target.nickname}.`);
    await this.notify(target, 'targeted', `O caracol está indo atrás de você. Alguém pagou para mudar o alvo para ${target.nickname}.`);
    ack({ ok: true, state: this.stateFor(account) });
    this.broadcastState();
  }

  private async buySpeed(socket: CaracolSocket, ack: (result: CaracolActionResult) => void): Promise<void> {
    const account = this.authenticatedAccount(socket, ack);
    if (!account) return;
    if (!account.alive || !account.cityId) {
      ack(this.failure('NEEDS_CITY', 'Escolha sua cidade antes de agir.'));
      return;
    }
    await this.settleCoins(account);
    const nextLevel = this.world.speedLevel + 1;
    const cost = this.speedCost(account.speedDiscountLevel);
    if (account.coins < cost) {
      ack(this.failure('INSUFFICIENT_COINS', `Você precisa de ${cost} moedas para levar o caracol a ${nextLevel * 100} km/h.`));
      return;
    }
    account.coins -= cost;
    this.world.speedLevel = nextLevel;
    await Promise.all([this.store.saveAccount(account), this.store.saveWorld(this.world)]);
    await this.recordHistory({
      type: 'speed',
      message: `${account.nickname} acelerou o caracol para ${nextLevel * 100} km/h por ${cost} moedas${account.speedDiscountLevel > 0 ? `, com desconto nível ${account.speedDiscountLevel}` : ''}.`,
      actorNickname: account.nickname,
      targetNickname: null,
      amount: cost,
      createdAt: this.clock(),
    });
    this.ioNotice('speed', `${account.nickname} pagou para o caracol correr a ${nextLevel * 100} km/h.`);
    ack({ ok: true, state: this.stateFor(account) });
    this.broadcastState();
  }

  private async buyDiscount(socket: CaracolSocket, ack: (result: CaracolActionResult) => void): Promise<void> {
    const account = this.authenticatedAccount(socket, ack);
    if (!account) return;
    await this.settleCoins(account);
    const nextLevel = account.speedDiscountLevel + 1;
    const cost = CARACOL_DISCOUNT_COSTS[nextLevel - 1];
    if (cost === undefined) {
      ack(this.failure('MAX_DISCOUNT', 'Seu desconto do caracol já está no máximo.'));
      return;
    }
    if (account.coins < cost) {
      ack(this.failure('INSUFFICIENT_COINS', `Você precisa de ${cost} moedas para melhorar seu desconto.`));
      return;
    }
    account.coins -= cost;
    account.speedDiscountLevel = nextLevel;
    await this.store.saveAccount(account);
    await this.recordHistory({
      type: 'discount',
      message: `${account.nickname} comprou o desconto do caracol nível ${nextLevel} por ${cost} moedas.`,
      actorNickname: account.nickname,
      targetNickname: null,
      amount: cost,
      createdAt: this.clock(),
    });
    this.ioNotice('discount', `${account.nickname} melhorou o próprio desconto do caracol.`);
    ack({ ok: true, state: this.stateFor(account) });
    this.broadcastState();
  }

  private enqueueShopMutation(work: () => Promise<void>): Promise<void> {
    const next = this.shopMutationQueue.then(work, work);
    this.shopMutationQueue = next.catch(() => undefined);
    return next;
  }

  private async shopPurchase(socket: CaracolSocket, payload: CaracolShopPurchaseInput, ack: (result: CaracolActionResult) => void): Promise<void> {
    const account = this.authenticatedAccount(socket, ack);
    if (!account) return;
    const wearer = this.validCosmeticWearer(payload?.wearer);
    const item = this.cosmeticItem(payload?.itemId);
    if (!wearer || !item) {
      ack(this.failure('INVALID_COSMETIC', 'Essa peça não existe na loja.'));
      return;
    }

    await this.settleCoins(account);
    const ownedItemIds = wearer === 'player' ? account.cosmeticOwnedItemIds : this.world.snailCosmeticOwnedItemIds;
    if (ownedItemIds.includes(item.id)) {
      ack(this.failure('COSMETIC_ALREADY_OWNED', 'Essa peça já está no guarda-roupa.'));
      return;
    }
    if (account.coins < item.price) {
      ack(this.failure('INSUFFICIENT_COINS', `Você precisa de ${item.price} moedas para comprar ${item.name}.`));
      return;
    }

    account.coins -= item.price;
    ownedItemIds.push(item.id);
    if (wearer === 'player') account.cosmeticOutfit[item.slot] = item.id;
    else this.world.snailCosmeticOutfit[item.slot] = item.id;
    await this.store.saveCosmeticState(account, this.world, wearer);
    await this.recordHistory({
      type: 'shop',
      message: `${account.nickname} comprou ${item.name} para ${wearer === 'player' ? 'si' : 'o caracol'} por ${item.price} moedas.`,
      actorNickname: account.nickname,
      targetNickname: wearer === 'snail' ? 'Caracol' : null,
      amount: item.price,
      createdAt: this.clock(),
    });
    this.ioNotice('shop', `${account.nickname} vestiu ${wearer === 'player' ? 'o próprio personagem' : 'o caracol'} com ${item.name}.`);
    ack({ ok: true, state: this.stateFor(account) });
    this.broadcastState();
  }

  private async shopEquip(socket: CaracolSocket, payload: CaracolShopEquipInput, ack: (result: CaracolActionResult) => void): Promise<void> {
    const account = this.authenticatedAccount(socket, ack);
    if (!account) return;
    const wearer = this.validCosmeticWearer(payload?.wearer);
    const slot = this.validCosmeticSlot(payload?.slot);
    if (!wearer || !slot) {
      ack(this.failure('INVALID_COSMETIC', 'Essa categoria não existe na loja.'));
      return;
    }

    const itemId = payload?.itemId;
    if (itemId !== null) {
      const item = this.cosmeticItem(itemId);
      const ownedItemIds = wearer === 'player' ? account.cosmeticOwnedItemIds : this.world.snailCosmeticOwnedItemIds;
      if (!item || item.slot !== slot || !ownedItemIds.includes(item.id)) {
        ack(this.failure('COSMETIC_NOT_OWNED', 'Compre essa peça antes de equipá-la.'));
        return;
      }
    }

    if (wearer === 'player') account.cosmeticOutfit[slot] = itemId;
    else this.world.snailCosmeticOutfit[slot] = itemId;
    await this.store.saveCosmeticState(account, this.world, wearer);
    ack({ ok: true, state: this.stateFor(account) });
    this.broadcastState();
  }

  private async setVisibility(socket: CaracolSocket, payload: CaracolVisibilityInput): Promise<void> {
    const account = this.authenticatedAccount(socket);
    if (!account) return;
    if (payload?.visible) account.visibleSockets.add(socket.id);
    else account.visibleSockets.delete(socket.id);
  }

  private async subscribePush(socket: CaracolSocket, payload: CaracolPushSubscriptionInput, ack: (result: CaracolActionResult) => void): Promise<void> {
    const account = this.authenticatedAccount(socket, ack);
    if (!account) return;
    if (!payload || typeof payload.endpoint !== 'string' || !payload.endpoint.startsWith('https://') || payload.endpoint.length > 2048 || !payload.keys?.p256dh || !payload.keys?.auth) {
      ack(this.failure('INVALID_PUSH_SUBSCRIPTION', 'A inscrição de notificação não é válida.'));
      return;
    }
    const subscription: CaracolPushRecord = {
      accountId: account.id,
      endpoint: payload.endpoint,
      p256dh: String(payload.keys.p256dh),
      auth: String(payload.keys.auth),
      expirationTime: payload.expirationTime ?? null,
      updatedAt: this.clock(),
    };
    this.pushSubscriptions.set(subscription.endpoint, subscription);
    await this.store.upsertPushSubscription(subscription);
    ack({ ok: true, state: this.stateFor(account) });
  }

  private async unsubscribePush(socket: CaracolSocket, payload: { endpoint: string }, ack: (result: CaracolActionResult) => void): Promise<void> {
    const account = this.authenticatedAccount(socket, ack);
    if (!account) return;
    const current = this.pushSubscriptions.get(payload?.endpoint);
    if (current?.accountId === account.id) await this.removePushSubscription(payload.endpoint);
    ack({ ok: true, state: this.stateFor(account) });
  }

  private async logout(socket: CaracolSocket): Promise<void> {
    this.revokeSession(socket);
    await this.detachSocket(socket);
    this.broadcastState();
  }

  private async disconnect(socket: CaracolSocket): Promise<void> {
    await this.detachSocket(socket);
    this.sockets.delete(socket.id);
    this.broadcastState();
  }

  private async attachSocket(socket: CaracolSocket, account: RuntimeAccount, now: number): Promise<void> {
    if (socket.data.caracolAccountId && socket.data.caracolAccountId !== account.id) await this.detachSocket(socket, false);
    const wasOnline = account.sockets.size > 0;
    const gainedIntervals = this.accrueCoins(account, now, wasOnline);
    if (gainedIntervals) await this.store.saveAccount(account);
    account.sockets.add(socket.id);
    account.visibleSockets.add(socket.id);
    socket.data.caracolAccountId = account.id;
  }

  private issueSession(socket: CaracolSocket, account: RuntimeAccount): string {
    this.revokeSession(socket);
    const sessionToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashSessionToken(sessionToken);
    this.sessions.set(tokenHash, account.id);
    socket.data.caracolSessionTokenHash = tokenHash;
    return sessionToken;
  }

  private revokeSession(socket: CaracolSocket): void {
    const tokenHash = socket.data.caracolSessionTokenHash;
    if (tokenHash) this.sessions.delete(tokenHash);
    delete socket.data.caracolSessionTokenHash;
  }

  private hashSessionToken(sessionToken: string): string {
    if (sessionToken.length < 32 || sessionToken.length > 256) return '';
    return createHash('sha256').update(sessionToken).digest('hex');
  }

  private async detachSocket(socket: CaracolSocket, persist = true): Promise<void> {
    const accountId = socket.data.caracolAccountId;
    if (!accountId) return;
    const account = this.accounts.get(accountId);
    if (!account) {
      delete socket.data.caracolAccountId;
      return;
    }
    const gainedIntervals = this.accrueCoins(account, this.clock(), true);
    account.sockets.delete(socket.id);
    account.visibleSockets.delete(socket.id);
    delete socket.data.caracolAccountId;
    if (persist && gainedIntervals) await this.store.saveAccount(account);
  }

  private authenticatedAccount(socket: CaracolSocket, ack?: (result: CaracolActionResult) => void): RuntimeAccount | null {
    const accountId = socket.data.caracolAccountId;
    const account = accountId ? this.accounts.get(accountId) : undefined;
    if (account) return account;
    if (ack) ack(this.failure('NOT_AUTHENTICATED', 'Entre no Caracol com seu nick e sua senha.'));
    return null;
  }

  private addRuntimeAccount(account: CaracolAccountRecord): RuntimeAccount {
    const runtime: RuntimeAccount = { ...account, sockets: new Set(), visibleSockets: new Set() };
    this.accounts.set(runtime.id, runtime);
    return runtime;
  }

  private cleanNickname(value: unknown): string {
    return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, MAX_NICKNAME_LENGTH) : '';
  }

  private validateCredentials(nickname: string, password: string): string | null {
    if (nickname.length < MIN_NICKNAME_LENGTH || nickname.length > MAX_NICKNAME_LENGTH || !normalizeText(nickname)) return 'Use um nick entre 2 e 24 caracteres.';
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) return 'Use uma senha entre 8 e 72 caracteres.';
    return null;
  }

  private setAccountCity(account: RuntimeAccount, city: BrazilianCity): void {
    account.cityId = city.id;
    account.cityName = city.name;
    account.cityUf = city.uf;
    account.cityLat = city.lat;
    account.cityLon = city.lon;
  }

  private validCosmeticWearer(value: unknown): CaracolCosmeticWearer | null {
    return value === 'player' || value === 'snail' ? value : null;
  }

  private validCosmeticSlot(value: unknown): CaracolCosmeticSlot | null {
    return value === 'pants' || value === 'shirt' || value === 'watch' || value === 'glasses' || value === 'cap' ? value : null;
  }

  private cosmeticItem(value: unknown) {
    return typeof value === 'string' ? CARACOL_COSMETIC_CATALOG.find((item) => item.id === value) ?? null : null;
  }

  private cityFor(account: CaracolAccountRecord): CaracolCity | null {
    if (!account.cityId || account.cityName === null || account.cityUf === null || account.cityLat === null || account.cityLon === null) return null;
    return { id: account.cityId, name: account.cityName, uf: account.cityUf, lat: account.cityLat, lon: account.cityLon };
  }

  private speedKmh(): number {
    return this.world.speedLevel === 0 ? CARACOL_BASE_SPEED_KMH : this.world.speedLevel * 100;
  }

  private discountedCost(baseCost: number, discountLevel: number, minimum: number): number {
    return Math.max(minimum, Math.floor(baseCost * 0.75 ** discountLevel));
  }

  private redirectCost(discountLevel: number): number {
    return this.discountedCost(CARACOL_REDIRECT_COST * 2 ** this.world.redirectLevel, discountLevel, 4);
  }

  private speedCost(discountLevel: number): number {
    return this.discountedCost(50 * (this.world.speedLevel + 1) ** 2, discountLevel, 1);
  }

  private async ensureTarget(): Promise<boolean> {
    const current = this.world.targetAccountId ? this.accounts.get(this.world.targetAccountId) : undefined;
    if (current?.alive && current.cityId) return false;
    const snail: GeoPoint = { lat: this.world.snailLat, lon: this.world.snailLon };
    const candidates = Array.from(this.accounts.values()).filter((account) => account.alive && account.cityId && account.cityLat !== null && account.cityLon !== null);
    const next = candidates.sort((a, b) => distanceKm(snail, { lat: a.cityLat!, lon: a.cityLon! }) - distanceKm(snail, { lat: b.cityLat!, lon: b.cityLon! }))[0];
    const changed = this.world.targetAccountId !== (next?.id ?? null);
    this.world.targetAccountId = next?.id ?? null;
    if (changed) {
      this.approachingSent.clear();
      if (next) {
        await this.recordHistory({
          type: 'target',
          message: `O caracol escolheu ${next.nickname} como novo alvo.`,
          actorNickname: null,
          targetNickname: next.nickname,
          amount: null,
          createdAt: this.clock(),
        });
        await this.notify(next, 'targeted', `O caracol despertou e está indo atrás de você.`);
      }
    }
    return changed;
  }

  private async runTick(): Promise<void> {
    if (this.tickInFlight) return;
    this.tickInFlight = true;
    try {
      await this.readyPromise;
      await this.tickInternal(this.clock(), true);
    } catch (error) {
      console.error('[caracol] erro no motor global', error);
    } finally {
      this.tickInFlight = false;
    }
  }

  private async tickInternal(now: number, broadcast: boolean): Promise<void> {
    const elapsedMs = Math.max(0, now - this.world.lastTickAt);
    this.world.lastTickAt = now;
    for (const account of this.accounts.values()) {
      if (account.sockets.size === 0) continue;
      const gainedIntervals = this.accrueCoins(account, now, true);
      if (gainedIntervals) {
        await this.store.saveAccount(account);
      }
    }

    await this.ensureTarget();
    const target = this.world.targetAccountId ? this.accounts.get(this.world.targetAccountId) : undefined;
    if (target?.alive && target.cityLat !== null && target.cityLon !== null && elapsedMs > 0) {
      const from: GeoPoint = { lat: this.world.snailLat, lon: this.world.snailLon };
      const to: GeoPoint = { lat: target.cityLat, lon: target.cityLon };
      const remainingKm = distanceKm(from, to);
      const travelKm = this.speedKmh() * elapsedMs / 3_600_000;
      if (remainingKm <= travelKm || remainingKm <= 0.001) {
        this.world.snailLat = to.lat;
        this.world.snailLon = to.lon;
        await this.eliminate(target, now);
        await this.ensureTarget();
      } else {
        const next = moveTowards(from, to, travelKm);
        this.world.snailLat = next.lat;
        this.world.snailLon = next.lon;
      }
    }

    await this.maybeApproachPush();
    await this.store.saveWorld(this.world);
    if (broadcast) this.broadcastState();
  }

  private async eliminate(target: RuntimeAccount, now: number): Promise<void> {
    const death: CaracolDeathPayload = {
      nickname: target.nickname,
      message: 'O caracol chegou. Você perdeu suas moedas e precisa escolher uma nova cidade.',
    };
    target.alive = false;
    target.coins = 0;
    target.lastCoinAccruedAt = now;
    target.speedDiscountLevel = 0;
    this.world.speedLevel = 0;
    this.world.redirectLevel = 0;
    this.world.targetAccountId = null;
    this.approachingSent.clear();
    await Promise.all([this.store.saveAccount(target), this.store.saveWorld(this.world)]);
    await this.recordHistory({
      type: 'death',
      message: `${target.nickname} foi alcançado pelo caracol e perdeu as moedas.`,
      actorNickname: target.nickname,
      targetNickname: null,
      amount: 0,
      createdAt: now,
    });
    for (const socketId of target.sockets) this.sockets.get(socketId)?.emit('caracol:death', death);
    await this.notify(target, 'death', death.message);
    this.ioNotice('death', `${target.nickname} foi alcançado pelo caracol.`);
  }

  private async maybeApproachPush(): Promise<void> {
    const target = this.world.targetAccountId ? this.accounts.get(this.world.targetAccountId) : undefined;
    if (!target?.alive || target.cityLat === null || target.cityLon === null) return;
    const speed = this.speedKmh();
    const distance = distanceKm({ lat: this.world.snailLat, lon: this.world.snailLon }, { lat: target.cityLat, lon: target.cityLon });
    const etaMs = distance / speed * 3_600_000;
    if (etaMs <= APPROACHING_ETA_MS && !this.approachingSent.has(target.id)) {
      this.approachingSent.add(target.id);
      await this.recordHistory({
        type: 'approaching',
        message: `O caracol ficou a caminho de ${target.nickname}, com chegada estimada em ${this.formatEta(etaMs)}.`,
        actorNickname: null,
        targetNickname: target.nickname,
        amount: null,
        createdAt: this.clock(),
      });
      await this.notify(target, 'approaching', `O caracol está a caminho e chega em aproximadamente ${this.formatEta(etaMs)}.`);
    }
  }

  private async notify(account: RuntimeAccount, code: 'targeted' | 'approaching' | 'death', message: string): Promise<void> {
    const payload = { code, message } as const;
    for (const socketId of account.sockets) this.sockets.get(socketId)?.emit('caracol:notice', payload);
    if (account.sockets.size > 0 && account.visibleSockets.size > 0) return;
    await this.push.send(account.id, Array.from(this.pushSubscriptions.values()), {
      title: code === 'death' ? 'Caracol: você foi pego' : 'Caracol: atenção',
      body: message,
      tag: `caracol-${code}`,
      url: '/',
      data: payload,
    });
  }

  private ioNotice(code: 'speed' | 'redirected' | 'discount' | 'death' | 'shop', message: string): void {
    for (const socket of this.sockets.values()) {
      if (socket.data.caracolAccountId) socket.emit('caracol:notice', { code, message });
    }
  }

  private async removePushSubscription(endpoint: string): Promise<void> {
    this.pushSubscriptions.delete(endpoint);
    await this.store.deletePushSubscription(endpoint);
  }

  private async recordHistory(input: Omit<CaracolHistoryRecord, 'id'>): Promise<CaracolHistoryRecord> {
    const entry = await this.store.appendHistory(input);
    for (const socket of this.sockets.values()) {
      if (socket.data.caracolAccountId) socket.emit('caracol:history-added', entry);
    }
    return entry;
  }

  private stateFor(account: RuntimeAccount): CaracolStateView {
    const target = this.world.targetAccountId ? this.accounts.get(this.world.targetAccountId) : undefined;
    const distance = target?.cityLat !== null && target?.cityLat !== undefined && target?.cityLon !== null && target?.cityLon !== undefined
      ? distanceKm({ lat: this.world.snailLat, lon: this.world.snailLon }, { lat: target.cityLat, lon: target.cityLon })
      : null;
    const speed = this.speedKmh();
    return {
      world: {
        snail: {
          lat: this.world.snailLat,
          lon: this.world.snailLon,
          speedKmh: speed,
          speedLevel: this.world.speedLevel,
          speedCost: this.speedCost(account.speedDiscountLevel),
          targetAccountId: target?.id ?? null,
          targetNickname: target?.nickname ?? null,
          distanceKm: distance,
          etaMs: distance === null ? null : distance / speed * 3_600_000,
          redirectCost: this.redirectCost(account.speedDiscountLevel),
          outfit: { ...this.world.snailCosmeticOutfit },
        },
        serverNow: this.clock(),
      },
      players: Array.from(this.accounts.values())
        .filter((candidate) => this.cityFor(candidate) !== null)
        .sort((a, b) => a.nickname.localeCompare(b.nickname, 'pt-BR'))
        .map((candidate) => ({
          accountId: candidate.id,
          nickname: candidate.nickname,
          alive: candidate.alive,
          city: this.cityFor(candidate)!,
          online: candidate.sockets.size > 0,
          isYou: candidate.id === account.id,
          outfit: { ...candidate.cosmeticOutfit },
        })),
      you: {
        accountId: account.id,
        nickname: account.nickname,
        alive: account.alive,
        coins: account.coins,
        city: this.cityFor(account),
        speedDiscountLevel: account.speedDiscountLevel,
      },
      shop: {
        catalog: CARACOL_COSMETIC_CATALOG.map((item) => ({ ...item })),
        player: {
          ownedItemIds: [...account.cosmeticOwnedItemIds],
          outfit: { ...account.cosmeticOutfit },
        },
        snail: {
          ownedItemIds: [...this.world.snailCosmeticOwnedItemIds],
          outfit: { ...this.world.snailCosmeticOutfit },
        },
      },
      needsCity: !account.alive || !account.cityId,
      pushPublicKey: this.push.getPublicKey(),
    };
  }

  private broadcastState(): void {
    for (const socket of this.sockets.values()) {
      const accountId = socket.data.caracolAccountId;
      const account = accountId ? this.accounts.get(accountId) : undefined;
      if (account) socket.emit('caracol:state', this.stateFor(account));
    }
  }

  private accrueCoins(account: RuntimeAccount, now: number, online: boolean): number {
    const elapsed = Math.max(0, now - account.lastCoinAccruedAt);
    const intervals = Math.floor(elapsed / CARACOL_COIN_INTERVAL_MS);
    if (intervals <= 0) return 0;
    account.coins += intervals * (online ? CARACOL_ONLINE_COINS_PER_INTERVAL : CARACOL_OFFLINE_COINS_PER_INTERVAL);
    account.lastCoinAccruedAt += intervals * CARACOL_COIN_INTERVAL_MS;
    return intervals;
  }

  private async settleCoins(account: RuntimeAccount): Promise<void> {
    const online = account.sockets.size > 0;
    const gainedIntervals = this.accrueCoins(account, this.clock(), online);
    if (!gainedIntervals) return;
    await this.store.saveAccount(account);
  }

  private failure(code: string, message: string): CaracolActionFailure {
    return { ok: false, code, message };
  }

  private formatEta(etaMs: number): string {
    const minutes = Math.max(1, Math.round(etaMs / 60_000));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h${minutes % 60 ? ` ${minutes % 60}min` : ''}`;
  }
}

export function createCaracolManager(io: CaracolIo, options?: CaracolManagerOptions): CaracolGameManager {
  return new CaracolGameManager(io, options);
}
