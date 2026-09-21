import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARACOL_COSMETIC_CATALOG, emptyCaracolOutfit, type CaracolOutfit } from '../shared/caracol';
import {
  CARACOL_ART_ITEM_IDS,
  CARACOL_ART_PALETTE,
  caracolArtLayers,
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

describe('camadas visíveis', () => {
  const fullOutfit: CaracolOutfit = {
    pants: 'pants-cargo',
    shirt: 'shirt-striped',
    watch: 'watch-gold',
    glasses: 'glasses-dark',
    cap: 'cap-bucket',
  };

  it('veste o jogador sem peças com camisa e calça padrão (ARTE-02)', () => {
    expect(caracolArtLayers('player', emptyCaracolOutfit())).toEqual(['legs', 'pants-default', 'arms', 'shirt-default', 'head', 'fringe', 'eyes', 'mouth']);
  });

  it('não desenha peça nenhuma no caracol sem peças (ARTE-02)', () => {
    expect(caracolArtLayers('snail', emptyCaracolOutfit())).toEqual(['body', 'stalks', 'head']);
  });

  it('empilha o jogador vestido na ordem do design, uma camada por slot', () => {
    expect(caracolArtLayers('player', fullOutfit)).toEqual(['legs', 'pants-cargo', 'arms', 'shirt-striped', 'watch-gold', 'head', 'mouth', 'glasses-dark', 'cap-bucket']);
  });

  it('empilha o caracol vestido na ordem do design, uma camada por slot', () => {
    expect(caracolArtLayers('snail', fullOutfit)).toEqual(['body', 'pants-cargo', 'shirt-striped', 'stalks', 'watch-gold', 'head', 'cap-bucket', 'glasses-dark']);
  });

  it('esconde a franja só quando há boné (ARTE-03)', () => {
    expect(caracolArtLayers('player', { ...emptyCaracolOutfit(), cap: 'cap-flat' })).not.toContain('fringe');
    expect(caracolArtLayers('player', { ...emptyCaracolOutfit(), cap: 'cap-flat' })).toContain('cap-flat');
    expect(caracolArtLayers('player', emptyCaracolOutfit())).toContain('fringe');
  });

  it('esconde os olhos só quando há óculos, que desenham os próprios (ARTE-04)', () => {
    expect(caracolArtLayers('player', { ...emptyCaracolOutfit(), glasses: 'glasses-round' })).not.toContain('eyes');
    expect(caracolArtLayers('player', { ...emptyCaracolOutfit(), glasses: 'glasses-round' })).toContain('glasses-round');
    expect(caracolArtLayers('player', emptyCaracolOutfit())).toContain('eyes');
  });

  it('trata id sem arte como slot vazio, sem lançar erro (ARTE-06)', () => {
    const unknown: CaracolOutfit = { pants: 'pants-skirt', shirt: 'shirt-hawaii', watch: 'watch-smart', glasses: 'glasses-3d', cap: 'cap-beanie' };
    expect(caracolArtLayers('player', unknown)).toEqual(['legs', 'pants-default', 'arms', 'shirt-default', 'head', 'fringe', 'eyes', 'mouth']);
    expect(caracolArtLayers('snail', unknown)).toEqual(['body', 'stalks', 'head']);
  });
});
