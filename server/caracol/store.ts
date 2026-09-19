import { randomUUID } from 'node:crypto';
import { Pool, type PoolConfig } from 'pg';
import type { CaracolHistoryEntry, CaracolHistoryType } from '../../shared/caracol';
import {
  CARACOL_BASE_SPEED_KMH,
  CARACOL_BRAZILIA,
  CARACOL_STARTING_COINS,
} from '../../shared/caracol';

export interface CaracolAccountRecord {
  id: string;
  nickname: string;
  normalizedNickname: string;
  passwordHash: string;
  coins: number;
  alive: boolean;
  cityId: string | null;
  cityName: string | null;
  cityUf: string | null;
  cityLat: number | null;
  cityLon: number | null;
  speedDiscountLevel: number;
  lastCoinAccruedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface CaracolWorldRecord {
  snailLat: number;
  snailLon: number;
  speedLevel: number;
  redirectLevel: number;
  targetAccountId: string | null;
  lastTickAt: number;
}

export type CaracolHistoryRecord = CaracolHistoryEntry;

export interface CaracolPushRecord {
  accountId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime: number | null;
  updatedAt: number;
}

export interface CaracolSnapshot {
  accounts: CaracolAccountRecord[];
  world: CaracolWorldRecord;
  pushSubscriptions: CaracolPushRecord[];
}

export class CaracolNicknameTakenError extends Error {
  constructor() {
    super('Esse nick já está sendo usado.');
    this.name = 'CaracolNicknameTakenError';
  }
}

export interface CaracolStore {
  initialize(): Promise<void>;
  loadSnapshot(): Promise<CaracolSnapshot>;
  createAccount(input: Omit<CaracolAccountRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<CaracolAccountRecord>;
  saveAccount(account: CaracolAccountRecord): Promise<void>;
  saveWorld(world: CaracolWorldRecord): Promise<void>;
  appendHistory(input: Omit<CaracolHistoryRecord, 'id'>): Promise<CaracolHistoryRecord>;
  listHistory(input: { beforeId?: string | null; limit: number }): Promise<{
    entries: CaracolHistoryRecord[];
    hasMore: boolean;
    nextCursor: string | null;
  }>;
  upsertPushSubscription(subscription: CaracolPushRecord): Promise<void>;
  deletePushSubscription(endpoint: string): Promise<void>;
  close(): Promise<void>;
}

const WORLD_ID = 1;

function initialWorld(now = Date.now()): CaracolWorldRecord {
  return {
    snailLat: CARACOL_BRAZILIA.lat,
    snailLon: CARACOL_BRAZILIA.lon,
    speedLevel: 0,
    redirectLevel: 0,
    targetAccountId: null,
    lastTickAt: now,
  };
}

function cloneAccount(account: CaracolAccountRecord): CaracolAccountRecord {
  return { ...account };
}

function cloneWorld(world: CaracolWorldRecord): CaracolWorldRecord {
  return { ...world };
}

function clonePush(subscription: CaracolPushRecord): CaracolPushRecord {
  return { ...subscription };
}

const schemaSql = `
CREATE TABLE IF NOT EXISTS caracol_accounts (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  normalized_nickname TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT ${CARACOL_STARTING_COINS},
  alive BOOLEAN NOT NULL DEFAULT TRUE,
  city_id TEXT,
  city_name TEXT,
  city_uf TEXT,
  city_lat DOUBLE PRECISION,
  city_lon DOUBLE PRECISION,
  speed_discount_level INTEGER NOT NULL DEFAULT 0,
  last_coin_accrued_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT caracol_city_complete CHECK (
    (city_id IS NULL AND city_name IS NULL AND city_uf IS NULL AND city_lat IS NULL AND city_lon IS NULL)
    OR (city_id IS NOT NULL AND city_name IS NOT NULL AND city_uf IS NOT NULL AND city_lat IS NOT NULL AND city_lon IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS caracol_accounts_alive_city_idx
  ON caracol_accounts (alive, city_id);

CREATE TABLE IF NOT EXISTS caracol_world (
  id INTEGER PRIMARY KEY CHECK (id = ${WORLD_ID}),
  snail_lat DOUBLE PRECISION NOT NULL,
  snail_lon DOUBLE PRECISION NOT NULL,
  speed_level INTEGER NOT NULL DEFAULT 0,
  redirect_level INTEGER NOT NULL DEFAULT 0,
  target_account_id TEXT REFERENCES caracol_accounts(id) ON DELETE SET NULL,
  last_tick_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS caracol_push_subscriptions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES caracol_accounts(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  expiration_time BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS caracol_push_account_idx
  ON caracol_push_subscriptions (account_id);

CREATE TABLE IF NOT EXISTS caracol_history (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  actor_nickname TEXT,
  target_nickname TEXT,
  amount INTEGER,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS caracol_history_created_idx
  ON caracol_history (id DESC);
`;

function accountFromRow(row: Record<string, unknown>): CaracolAccountRecord {
  return {
    id: String(row.id),
    nickname: String(row.nickname),
    normalizedNickname: String(row.normalized_nickname),
    passwordHash: String(row.password_hash),
    coins: Number(row.coins),
    alive: Boolean(row.alive),
    cityId: row.city_id === null ? null : String(row.city_id),
    cityName: row.city_name === null ? null : String(row.city_name),
    cityUf: row.city_uf === null ? null : String(row.city_uf),
    cityLat: row.city_lat === null ? null : Number(row.city_lat),
    cityLon: row.city_lon === null ? null : Number(row.city_lon),
    speedDiscountLevel: Number(row.speed_discount_level),
    lastCoinAccruedAt: new Date(String(row.last_coin_accrued_at)).getTime(),
    createdAt: new Date(String(row.created_at)).getTime(),
    updatedAt: new Date(String(row.updated_at)).getTime(),
  };
}

function worldFromRow(row: Record<string, unknown>): CaracolWorldRecord {
  return {
    snailLat: Number(row.snail_lat),
    snailLon: Number(row.snail_lon),
    speedLevel: Number(row.speed_level),
    redirectLevel: Number(row.redirect_level ?? 0),
    targetAccountId: row.target_account_id === null ? null : String(row.target_account_id),
    lastTickAt: new Date(String(row.last_tick_at)).getTime(),
  };
}

function historyFromRow(row: Record<string, unknown>): CaracolHistoryRecord {
  return {
    id: String(row.id),
    type: String(row.event_type) as CaracolHistoryType,
    message: String(row.message),
    actorNickname: row.actor_nickname === null ? null : String(row.actor_nickname),
    targetNickname: row.target_nickname === null ? null : String(row.target_nickname),
    amount: row.amount === null ? null : Number(row.amount),
    createdAt: new Date(String(row.created_at)).getTime(),
  };
}

function pushFromRow(row: Record<string, unknown>): CaracolPushRecord {
  return {
    accountId: String(row.account_id),
    endpoint: String(row.endpoint),
    p256dh: String(row.p256dh),
    auth: String(row.auth),
    expirationTime: row.expiration_time === null ? null : Number(row.expiration_time),
    updatedAt: new Date(String(row.updated_at)).getTime(),
  };
}

export class MemoryCaracolStore implements CaracolStore {
  private readonly accounts = new Map<string, CaracolAccountRecord>();
  private readonly pushes = new Map<string, CaracolPushRecord>();
  private readonly history: CaracolHistoryRecord[] = [];
  private nextHistoryId = 1;
  private world: CaracolWorldRecord = initialWorld();

  async initialize(): Promise<void> {
    // The in-memory implementation is intentionally used by local development
    // and unit tests when DATABASE_URL is absent.
  }

  async loadSnapshot(): Promise<CaracolSnapshot> {
    return {
      accounts: Array.from(this.accounts.values(), cloneAccount),
      world: cloneWorld(this.world),
      pushSubscriptions: Array.from(this.pushes.values(), clonePush),
    };
  }

  async createAccount(input: Omit<CaracolAccountRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<CaracolAccountRecord> {
    if (Array.from(this.accounts.values()).some((account) => account.normalizedNickname === input.normalizedNickname)) {
      throw new CaracolNicknameTakenError();
    }
    const now = Date.now();
    const account: CaracolAccountRecord = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    this.accounts.set(account.id, cloneAccount(account));
    return cloneAccount(account);
  }

  async saveAccount(account: CaracolAccountRecord): Promise<void> {
    account.updatedAt = Date.now();
    this.accounts.set(account.id, cloneAccount(account));
  }

  async saveWorld(world: CaracolWorldRecord): Promise<void> {
    this.world = cloneWorld(world);
  }

  async appendHistory(input: Omit<CaracolHistoryRecord, 'id'>): Promise<CaracolHistoryRecord> {
    const entry = { ...input, id: String(this.nextHistoryId++) };
    this.history.push({ ...entry });
    return { ...entry };
  }

  async listHistory(input: { beforeId?: string | null; limit: number }): Promise<{
    entries: CaracolHistoryRecord[];
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const limit = Math.max(1, input.limit);
    const before = input.beforeId && /^\d+$/.test(input.beforeId) ? Number(input.beforeId) : null;
    const entries = this.history
      .filter((entry) => before === null || Number(entry.id) < before)
      .slice()
      .sort((a, b) => Number(b.id) - Number(a.id));
    const page = entries.slice(0, limit).map((entry) => ({ ...entry }));
    const hasMore = entries.length > limit;
    return { entries: page, hasMore, nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null };
  }

  async upsertPushSubscription(subscription: CaracolPushRecord): Promise<void> {
    this.pushes.set(subscription.endpoint, clonePush(subscription));
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    this.pushes.delete(endpoint);
  }

  async close(): Promise<void> {
    // Nothing to close.
  }
}

export class PgCaracolStore implements CaracolStore {
  private readonly pool: Pool;

  constructor(config: PoolConfig | string) {
    this.pool = typeof config === 'string' ? new Pool({ connectionString: config }) : new Pool(config);
  }

  async initialize(): Promise<void> {
    await this.pool.query(schemaSql);
    await this.pool.query('ALTER TABLE caracol_world ADD COLUMN IF NOT EXISTS redirect_level INTEGER NOT NULL DEFAULT 0');
    await this.pool.query(
      `INSERT INTO caracol_world (id, snail_lat, snail_lon, speed_level, redirect_level, last_tick_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [WORLD_ID, CARACOL_BRAZILIA.lat, CARACOL_BRAZILIA.lon, 0, 0],
    );
  }

  async loadSnapshot(): Promise<CaracolSnapshot> {
    const [accounts, world, pushes] = await Promise.all([
      this.pool.query('SELECT * FROM caracol_accounts ORDER BY nickname'),
      this.pool.query('SELECT * FROM caracol_world WHERE id = $1', [WORLD_ID]),
      this.pool.query('SELECT * FROM caracol_push_subscriptions'),
    ]);
    const worldRow = world.rows[0] as Record<string, unknown> | undefined;
    return {
      accounts: accounts.rows.map((row) => accountFromRow(row as Record<string, unknown>)),
      world: worldRow ? worldFromRow(worldRow) : initialWorld(),
      pushSubscriptions: pushes.rows.map((row) => pushFromRow(row as Record<string, unknown>)),
    };
  }

  async createAccount(input: Omit<CaracolAccountRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<CaracolAccountRecord> {
    try {
      const result = await this.pool.query(
        `INSERT INTO caracol_accounts (
          id, nickname, normalized_nickname, password_hash, coins, alive,
          city_id, city_name, city_uf, city_lat, city_lon,
          speed_discount_level, last_coin_accrued_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TO_TIMESTAMP($13 / 1000.0))
        RETURNING *`,
        [
          randomUUID(), input.nickname, input.normalizedNickname, input.passwordHash,
          input.coins, input.alive, input.cityId, input.cityName, input.cityUf,
          input.cityLat, input.cityLon, input.speedDiscountLevel, input.lastCoinAccruedAt,
        ],
      );
      return accountFromRow(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        throw new CaracolNicknameTakenError();
      }
      throw error;
    }
  }

  async saveAccount(account: CaracolAccountRecord): Promise<void> {
    await this.pool.query(
      `UPDATE caracol_accounts SET
        coins = $2, alive = $3, city_id = $4, city_name = $5, city_uf = $6,
        city_lat = $7, city_lon = $8, speed_discount_level = $9,
        last_coin_accrued_at = TO_TIMESTAMP($10 / 1000.0), updated_at = NOW()
       WHERE id = $1`,
      [account.id, account.coins, account.alive, account.cityId, account.cityName, account.cityUf, account.cityLat, account.cityLon, account.speedDiscountLevel, account.lastCoinAccruedAt],
    );
  }

  async saveWorld(world: CaracolWorldRecord): Promise<void> {
    await this.pool.query(
      `UPDATE caracol_world SET snail_lat = $2, snail_lon = $3, speed_level = $4,
        redirect_level = $5, target_account_id = $6, last_tick_at = TO_TIMESTAMP($7 / 1000.0), updated_at = NOW()
       WHERE id = $1`,
      [WORLD_ID, world.snailLat, world.snailLon, world.speedLevel, world.redirectLevel, world.targetAccountId, world.lastTickAt],
    );
  }

  async appendHistory(input: Omit<CaracolHistoryRecord, 'id'>): Promise<CaracolHistoryRecord> {
    const result = await this.pool.query(
      `INSERT INTO caracol_history (event_type, message, actor_nickname, target_nickname, amount, created_at)
       VALUES ($1, $2, $3, $4, $5, TO_TIMESTAMP($6 / 1000.0))
       RETURNING *`,
      [input.type, input.message, input.actorNickname, input.targetNickname, input.amount, input.createdAt],
    );
    return historyFromRow(result.rows[0] as Record<string, unknown>);
  }

  async listHistory(input: { beforeId?: string | null; limit: number }): Promise<{
    entries: CaracolHistoryRecord[];
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const limit = Math.max(1, Math.min(100, Math.floor(input.limit)));
    const hasCursor = Boolean(input.beforeId && /^\d+$/.test(input.beforeId));
    const result = hasCursor
      ? await this.pool.query('SELECT * FROM caracol_history WHERE id < $1 ORDER BY id DESC LIMIT $2', [input.beforeId, limit + 1])
      : await this.pool.query('SELECT * FROM caracol_history ORDER BY id DESC LIMIT $1', [limit + 1]);
    const rows = result.rows.map((row) => historyFromRow(row as Record<string, unknown>));
    const hasMore = rows.length > limit;
    const entries = rows.slice(0, limit);
    return { entries, hasMore, nextCursor: hasMore ? entries[entries.length - 1]?.id ?? null : null };
  }

  async upsertPushSubscription(subscription: CaracolPushRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO caracol_push_subscriptions (id, account_id, endpoint, p256dh, auth, expiration_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (endpoint) DO UPDATE SET account_id = EXCLUDED.account_id,
         p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
         expiration_time = EXCLUDED.expiration_time, updated_at = NOW()`,
      [randomUUID(), subscription.accountId, subscription.endpoint, subscription.p256dh, subscription.auth, subscription.expirationTime],
    );
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await this.pool.query('DELETE FROM caracol_push_subscriptions WHERE endpoint = $1', [endpoint]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createCaracolStore(): CaracolStore {
  const connectionString = process.env.CARACOL_DATABASE_URL || process.env.DATABASE_URL;
  return connectionString ? new PgCaracolStore(connectionString) : new MemoryCaracolStore();
}
