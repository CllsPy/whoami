import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CARACOL_COSMETIC_CATALOG,
  emptyCaracolOutfit,
  type CaracolCosmeticWearer,
  type CaracolStateView,
} from '../shared/caracol';
import { CaracolShopDrawer } from '../src/CaracolShop';

// A loja vive fora de CaracolGame.tsx, que abre o socket no import. Os testes
// renderizam a gaveta em node com um estado de exemplo.

function sampleState(overrides: { coins?: number } = {}): CaracolStateView {
  return {
    world: {
      snail: {
        lat: -15.7795,
        lon: -47.9297,
        hidden: false,
        speedKmh: 0.05,
        speedLevel: 0,
        speedCost: 10,
        targetAccountId: null,
        targetNickname: null,
        distanceKm: null,
        etaMs: null,
        redirectCost: 8,
        outfit: { ...emptyCaracolOutfit(), cap: 'cap-trucker' },
      },
      effects: [],
      serverNow: 1_000_000,
    },
    players: [],
    you: {
      accountId: 'a1',
      nickname: 'Ana',
      alive: true,
      coins: overrides.coins ?? 40,
      city: null,
      speedDiscountLevel: 0,
      discountCost: 10,
      roulette: { availableAt: null, lastItemId: null },
      effects: [],
    },
    shop: {
      catalog: [...CARACOL_COSMETIC_CATALOG],
      player: { ownedItemIds: ['pants-jeans', 'pants-cargo', 'glasses-dark'], outfit: { ...emptyCaracolOutfit(), pants: 'pants-jeans', glasses: 'glasses-dark' } },
      snail: { ownedItemIds: ['cap-trucker'], outfit: { ...emptyCaracolOutfit(), cap: 'cap-trucker' } },
    },
    needsCity: false,
    pushPublicKey: null,
  };
}

function drawer(tab: CaracolCosmeticWearer, state = sampleState()): string {
  const noop = (): void => undefined;
  return renderToStaticMarkup(createElement(CaracolShopDrawer, { state, open: true, tab, onTabChange: noop, onClose: noop, onPurchase: noop, onEquip: noop }));
}

function card(markup: string, name: string): string {
  const cards = markup.split('<article ').slice(1);
  const found = cards.find((html) => html.includes(`<strong>${name}</strong>`));
  if (!found) throw new Error(`card ${name} não encontrado`);
  return found.slice(0, found.indexOf('</article>'));
}

describe('gaveta da loja', () => {
  it('troca título e descrição com a aba (LOJA-05)', () => {
    const player = drawer('player');
    expect(player).toContain('<h2>Seu guarda-roupa</h2>');
    expect(player).toContain('Peças compradas ficam para sempre na sua conta.');
    const snail = drawer('snail');
    expect(snail).toContain('<h2>O guarda-roupa do caracol</h2>');
    expect(snail).toContain('Este visual é global. Todo mundo vê a mesma roupa no mapa.');
  });

  it('mostra Equipado desabilitado na peça equipada', () => {
    expect(card(drawer('player'), 'Jeans')).toMatch(/<button class="shop-item-button is-equipped" type="button" disabled="">Equipado<\/button>/);
  });

  it('oferece Usar na peça comprada que não está em uso', () => {
    const cargo = card(drawer('player'), 'Cargo');
    expect(cargo).toMatch(/<button class="shop-item-button" type="button">Usar<\/button>/);
  });

  it('oferece Comprar com o preço, desabilitado quando o saldo não alcança', () => {
    const state = sampleState({ coins: 40 });
    const markup = drawer('player', state);
    expect(card(markup, 'Básica')).toMatch(/<button class="shop-item-button shop-item-buy" type="button">Comprar <span>25<\/span><\/button>/);
    expect(card(markup, 'Listrada')).toMatch(/<button class="shop-item-button shop-item-buy" type="button" disabled="">Comprar <span>50<\/span><\/button>/);
  });
});
