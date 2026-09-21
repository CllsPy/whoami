import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyCaracolOutfit, type CaracolPlayerView, type CaracolStateView } from '../shared/caracol';
import { BrazilMap, type GeoFeatureCollection } from '../src/CaracolMap';

// O mapa vive fora de CaracolGame.tsx para os tokens e o Blooper serem testáveis em node.

const GEO: GeoFeatureCollection = {
  features: [
    { properties: { name: 'São Paulo', sigla: 'SP' }, geometry: { type: 'Polygon', coordinates: [[[-53, -25], [-44, -25], [-44, -20], [-53, -20], [-53, -25]]] } },
    { properties: { name: 'Pernambuco', sigla: 'PE' }, geometry: { type: 'MultiPolygon', coordinates: [[[[-41, -9], [-35, -9], [-35, -7], [-41, -7], [-41, -9]]]] } },
  ],
};

function player(nickname: string, lat: number, lon: number, overrides: Partial<CaracolPlayerView> = {}): CaracolPlayerView {
  return {
    accountId: `id-${nickname}`,
    nickname,
    alive: true,
    city: { id: nickname, name: nickname, uf: 'XX', lat, lon },
    online: true,
    isYou: false,
    outfit: emptyCaracolOutfit(),
    effectItemIds: [],
    ...overrides,
  };
}

function mapState({ snail = { lat: -15.78, lon: -47.93 }, players }: { snail?: { lat: number | null; lon: number | null }; players?: CaracolPlayerView[] } = {}): CaracolStateView {
  return {
    world: {
      snail: {
        lat: snail.lat,
        lon: snail.lon,
        hidden: snail.lat === null,
        speedKmh: 0.05,
        speedLevel: 0,
        speedCost: 10,
        targetAccountId: 'id-Bia',
        targetNickname: 'Bia',
        distanceKm: null,
        etaMs: null,
        redirectCost: 8,
        outfit: { ...emptyCaracolOutfit(), cap: 'cap-flat' },
      },
      effects: [],
      serverNow: 0,
    },
    players: players ?? [
      player('Ana', -23.55, -46.63, { isYou: true }),
      player('Bia', -22.9, -43.2),
      player('Caio', -8.05, -34.9, { alive: false }),
      player('Duda', -3.1, -60.0),
    ],
    you: {
      accountId: 'id-Ana',
      nickname: 'Ana',
      alive: true,
      coins: 0,
      city: null,
      speedDiscountLevel: 0,
      discountCost: 10,
      roulette: { availableAt: null, lastItemId: null },
      effects: [],
    },
    shop: { catalog: [], player: { ownedItemIds: [], outfit: emptyCaracolOutfit() }, snail: { ownedItemIds: [], outfit: emptyCaracolOutfit() } },
    needsCity: false,
    pushPublicKey: null,
  };
}

function map(state = mapState(), geoJson: GeoFeatureCollection | null = GEO): string {
  return renderToStaticMarkup(createElement(BrazilMap, { state, geoJson }));
}

describe('mapa do Brasil', () => {
  it('desenha um path por estado do GeoJSON', () => {
    expect(map().match(/<path d="M[^"]*" class="state-shape">/g)).toHaveLength(2);
  });

  it('desenha o caracol e a rota até o alvo quando a posição é conhecida', () => {
    const markup = map();
    expect(markup).toContain('class="snail-token"');
    expect(markup).toContain('class="snail-route"');
  });

  it('esconde o caracol e a rota com Blooper (MAPA-04)', () => {
    const markup = map(mapState({ snail: { lat: null, lon: null } }));
    expect(markup).not.toContain('snail-token');
    expect(markup).not.toContain('snail-route');
  });

  it('escreve o nick só de você, do alvo e de quem morreu', () => {
    const labels = Array.from(map().matchAll(/<text[^>]*>([^<]+)<\/text>/g), (match) => match[1]);
    expect(labels.sort()).toEqual(['Ana', 'Bia', 'Caio']);
  });
});
