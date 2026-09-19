import type { BrazilianCity } from './cities';

export const CARACOL_BASE_SPEED_KMH = 0.05;
export const CARACOL_REDIRECT_COST = 8;
export const CARACOL_HISTORY_PAGE_SIZE = 20;
export const CARACOL_STARTING_COINS = 5;
export const CARACOL_COIN_INTERVAL_MS = 10_000;
export const CARACOL_OFFLINE_COINS_PER_INTERVAL = 1;
export const CARACOL_ONLINE_COINS_PER_INTERVAL = 10;
export const CARACOL_DISCOUNT_COSTS = [10, 15] as const;
export const CARACOL_BRAZILIA: BrazilianCity = {
  id: '5300108',
  name: 'Brasília',
  uf: 'DF',
  lat: -15.7795,
  lon: -47.9297,
};

export interface CaracolCity {
  id: string;
  name: string;
  uf: string;
  lat: number;
  lon: number;
}

export interface CaracolPlayerView {
  accountId: string;
  nickname: string;
  city: CaracolCity;
  online: boolean;
  isYou: boolean;
}

export interface CaracolYouView {
  accountId: string;
  nickname: string;
  alive: boolean;
  coins: number;
  city: CaracolCity | null;
  speedDiscountLevel: number;
}

export interface CaracolWorldView {
  snail: {
    lat: number;
    lon: number;
    speedKmh: number;
    speedLevel: number;
    speedCost: number;
    targetAccountId: string | null;
    targetNickname: string | null;
    distanceKm: number | null;
    etaMs: number | null;
    redirectCost: number;
  };
  serverNow: number;
}

export interface CaracolStateView {
  world: CaracolWorldView;
  players: CaracolPlayerView[];
  you: CaracolYouView;
  needsCity: boolean;
  pushPublicKey: string | null;
}

export interface CaracolRegisterInput {
  nickname: string;
  password: string;
}

export interface CaracolLoginInput {
  nickname: string;
  password: string;
}

export interface CaracolResumeInput {
  sessionToken: string;
}

export interface CaracolSelectCityInput {
  cityId: string;
}

export interface CaracolRedirectInput {
  targetNickname: string;
}

export interface CaracolVisibilityInput {
  visible: boolean;
}

export interface CaracolPushSubscriptionInput {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export type CaracolHistoryType =
  | 'account'
  | 'city'
  | 'coins'
  | 'redirect'
  | 'speed'
  | 'discount'
  | 'target'
  | 'approaching'
  | 'death';

export interface CaracolHistoryEntry {
  id: string;
  type: CaracolHistoryType;
  message: string;
  actorNickname: string | null;
  targetNickname: string | null;
  amount: number | null;
  createdAt: number;
}

export interface CaracolHistoryInput {
  beforeId?: string | null;
  limit?: number;
}

export interface CaracolHistoryPage {
  ok: true;
  entries: CaracolHistoryEntry[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CaracolAuthSuccess {
  ok: true;
  accountId: string;
  nickname: string;
  sessionToken: string;
  state: CaracolStateView;
}

export interface CaracolActionSuccess {
  ok: true;
  state: CaracolStateView;
}

export interface CaracolActionFailure {
  ok: false;
  code: string;
  message: string;
}

export type CaracolAuthResult = CaracolAuthSuccess | CaracolActionFailure;
export type CaracolActionResult = CaracolAuthSuccess | CaracolActionSuccess | CaracolActionFailure;
export type CaracolHistoryResult = CaracolHistoryPage | CaracolActionFailure;

export interface CaracolDeathPayload {
  nickname: string;
  message: string;
}

export interface CaracolNoticePayload {
  code: 'targeted' | 'approaching' | 'speed' | 'redirected' | 'death' | 'discount';
  message: string;
}
