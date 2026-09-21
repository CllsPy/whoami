import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CARACOL_ART_ITEM_IDS } from '../src/caracolArt/model';
import { PLAYER_ART, type CaracolArtIds } from '../src/caracolArt/PlayerArt';

// Os componentes de arte rodam em node com renderToStaticMarkup: sem jsdom e sem
// socket. As asserções olham camadas (`data-layer`), viewBox e ids, não a geometria.

const clipIds: string[] = [];
const ids: CaracolArtIds = {
  clip: (part) => {
    const id = `t-clip-${part}`;
    clipIds.push(id);
    return id;
  },
  ink: 't-ink',
};

function inSvg(node: ReactNode): string {
  return renderToStaticMarkup(createElement('svg', null, node));
}

function layersOf(markup: string): string[] {
  return Array.from(markup.matchAll(/data-layer="([^"]+)"/g), (match) => match[1]!);
}

describe('arte do jogador', () => {
  it('tem uma camada para cada parte do corpo e para cada peça do catálogo', () => {
    const body = ['legs', 'pants-default', 'arms', 'shirt-default', 'head', 'fringe', 'eyes', 'mouth'];
    expect(Object.keys(PLAYER_ART).sort()).toEqual([...body, ...CARACOL_ART_ITEM_IDS].sort());
  });

  for (const [key, draw] of Object.entries(PLAYER_ART)) {
    it(`desenha ${key} numa camada própria`, () => {
      expect(layersOf(inSvg(draw(ids)))).toEqual([key]);
    });
  }

  it('recorta as listras por manga e tronco com clipPath montados pelos ids da instância', () => {
    clipIds.length = 0;
    const markup = inSvg(PLAYER_ART['shirt-striped'](ids));
    const refs = new Set(Array.from(markup.matchAll(/clip-path="url\(#([^)]+)\)"/g), (match) => match[1]!));
    expect(refs.size).toBe(3);
    for (const ref of refs) {
      expect(clipIds).toContain(ref);
      expect(markup).toContain(`<clipPath id="${ref}">`);
    }
  });

  it('pinta a pele do jogador com #c78261 (ARTE-15)', () => {
    expect(inSvg(PLAYER_ART.head(ids))).toContain('fill="#c78261"');
  });
});
