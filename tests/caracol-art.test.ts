import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARACOL_COSMETIC_CATALOG } from '../shared/caracol';
import {
  CARACOL_ART_ITEM_IDS,
  CARACOL_ART_PALETTE,
  caracolArtViewBox,
  type CaracolArtCrop,
} from '../src/caracolArt/model';

// O modelo da arte é dado puro: paleta, peças com desenho e recortes. Os valores
// esperados aqui são os das tabelas de plano/new-design/design.md, não os do código.

describe('paridade com o catálogo', () => {
  it('tem arte para exatamente as peças do catálogo (ARTE-05)', () => {
    const catalogIds = CARACOL_COSMETIC_CATALOG.map((item) => item.id).sort();
    expect([...CARACOL_ART_ITEM_IDS].sort()).toEqual(catalogIds);
  });
});

describe('recortes', () => {
  const table: Record<'player' | 'snail', Record<CaracolArtCrop, string>> = {
    player: {
      full: '18 14 172 372',
      portrait: '30 24 140 140',
      cap: '48 14 104 104',
      glasses: '56 42 88 88',
      shirt: '30 110 140 140',
      watch: '127 74 60 60',
      pants: '20 222 160 160',
    },
    snail: {
      full: '6 -6 236 236',
      portrait: '22 -6 150 150',
      cap: '48 36 94 94',
      glasses: '42 -26 106 106',
      shirt: '34 104 122 122',
      watch: '48 26 58 58',
      pants: '38 140 114 114',
    },
  };

  for (const wearer of ['player', 'snail'] as const) {
    for (const [crop, viewBox] of Object.entries(table[wearer]) as [CaracolArtCrop, string][]) {
      it(`${wearer} · ${crop} usa o retângulo da tabela do design (ARTE-07)`, () => {
        expect(caracolArtViewBox(wearer, crop)).toBe(viewBox);
      });
    }
  }
});

describe('paleta', () => {
  function rootTokens(): Record<string, string> {
    const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
    const root = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    return Object.fromEntries(Array.from(root.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g), (match) => [match[1], match[2]!.toLowerCase()]));
  }

  it('copia os hex dos tokens de :root (ARTE-12)', () => {
    const tokens = rootTokens();
    const pairs = [
      ['ink', 'night'],
      ['paper', 'paper'],
      ['acid', 'acid'],
      ['acidDark', 'acid-dark'],
      ['coral', 'coral'],
      ['sky', 'sky'],
      ['lavender', 'lavender'],
    ] as const;
    for (const [art, token] of pairs) {
      expect(tokens[token], `--${token}`).toMatch(/^#[0-9a-f]+$/);
      expect(CARACOL_ART_PALETTE[art].toLowerCase(), `${art} = --${token}`).toBe(tokens[token]);
    }
  });

  it('mantém a pele do jogador e as cores do caracol do avatar atual (ARTE-15)', () => {
    expect(CARACOL_ART_PALETTE.skin).toBe('#c78261');
    expect(CARACOL_ART_PALETTE.shell).toBe('#d86b51');
    expect(CARACOL_ART_PALETTE.snailBody).toBe('#efb37d');
  });
});
