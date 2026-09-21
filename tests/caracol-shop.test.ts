import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CARACOL_COSMETIC_CATALOG,
  emptyCaracolOutfit,
  type CaracolCosmeticWearer,
  type CaracolStateView,
} from '../shared/caracol';
import { caracolArtViewBox } from '../src/caracolArt/model';
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

function layersOf(markup: string): string[] {
  return Array.from(markup.matchAll(/data-layer="([^"]+)"/g), (match) => match[1]!);
}

function section(markup: string, from: string, to: string): string {
  const start = markup.indexOf(from);
  const end = markup.indexOf(to, start);
  if (start < 0 || end < 0) throw new Error(`trecho ${from} não encontrado`);
  return markup.slice(start, end);
}

function medallionTone(markup: string): string | undefined {
  return /class="caracol-medallion tone-([\w-]+)"/.exec(markup)?.[1];
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

describe('cards da loja', () => {
  for (const tab of ['player', 'snail'] as const) {
    it(`${tab}: mostra cada peça no recorte do próprio slot (LOJA-01, LOJA-05)`, () => {
      const markup = drawer(tab);
      for (const item of CARACOL_COSMETIC_CATALOG) {
        expect(card(markup, item.name), item.id).toContain(`viewBox="${caracolArtViewBox(tab, item.slot)}"`);
      }
    });
  }

  it('veste a peça do card por cima do que já está equipado nos outros slots (LOJA-01)', () => {
    const markup = drawer('player');
    const flat = layersOf(card(markup, 'Aba reta'));
    expect(flat).toContain('cap-flat');
    expect(flat).toContain('pants-jeans');
    expect(flat).toContain('glasses-dark');
    const cargo = layersOf(card(markup, 'Cargo'));
    expect(cargo).toContain('pants-cargo');
    expect(cargo).not.toContain('pants-jeans');
    expect(cargo).toContain('glasses-dark');
  });

  it('marca a peça equipada com o tom equipped e o selo de check (LOJA-02)', () => {
    const jeans = card(drawer('player', sampleState({ coins: 0 })), 'Jeans');
    expect(medallionTone(jeans)).toBe('equipped');
    expect(jeans).toContain('badge-check');
  });

  it('marca a peça não comprada acima do saldo como unaffordable (LOJA-03)', () => {
    expect(medallionTone(card(drawer('player', sampleState({ coins: 40 })), 'Listrada'))).toBe('unaffordable');
  });

  it('usa o tom padrão nos demais casos (LOJA-04)', () => {
    const markup = drawer('player', sampleState({ coins: 40 }));
    expect(medallionTone(card(markup, 'Básica'))).toBe('default');
    expect(medallionTone(card(markup, 'Cargo'))).toBe('default');
    expect(card(markup, 'Cargo')).not.toContain('badge-check');
  });

  it('decide o saldo pelo preço que o servidor mandou, já com Moeda ou Raio', () => {
    const state = sampleState({ coins: 40 });
    state.shop.catalog = state.shop.catalog.map((item) => item.id === 'shirt-striped' ? { ...item, price: 25 } : item);
    expect(medallionTone(card(drawer('player', state), 'Listrada'))).toBe('default');
  });
});

describe('prévia e abas da loja', () => {
  it('mostra o personagem da aba de corpo inteiro e em retrato, com o outfit equipado (LOJA-06)', () => {
    const player = section(drawer('player'), 'caracol-shop-preview', 'caracol-shop-body');
    expect(player).toContain(`viewBox="${caracolArtViewBox('player', 'full')}"`);
    expect(player).toMatch(new RegExp(`class="caracol-avatar"[^>]*aria-label="Seu personagem vestido".*viewBox="${caracolArtViewBox('player', 'portrait')}"`));
    expect(layersOf(player).filter((layer) => layer === 'pants-jeans')).toHaveLength(2);
    expect(layersOf(player).filter((layer) => layer === 'glasses-dark')).toHaveLength(2);

    const snail = section(drawer('snail'), 'caracol-shop-preview', 'caracol-shop-body');
    expect(snail).toContain(`viewBox="${caracolArtViewBox('snail', 'full')}"`);
    expect(snail).toContain(`viewBox="${caracolArtViewBox('snail', 'portrait')}"`);
    expect(layersOf(snail).filter((layer) => layer === 'cap-trucker')).toHaveLength(2);
  });

  it('mostra nas abas o retrato de 32 px de cada personagem, seja qual for a aba ativa (LOJA-07)', () => {
    for (const active of ['player', 'snail'] as const) {
      const tabs = section(drawer(active), 'caracol-shop-tabs', 'caracol-shop-preview').split('<button ').slice(1);
      const you = tabs.find((html) => html.includes('<span>Você</span>'))!;
      const snail = tabs.find((html) => html.includes('<span>Caracol</span>'))!;
      expect(you).toContain('--medallion-size:32px');
      expect(you).toContain(`viewBox="${caracolArtViewBox('player', 'portrait')}"`);
      expect(layersOf(you)).toContain('pants-jeans');
      expect(snail).toContain('--medallion-size:32px');
      expect(snail).toContain(`viewBox="${caracolArtViewBox('snail', 'portrait')}"`);
      expect(layersOf(snail)).toContain('cap-trucker');
    }
  });
});
