import { memo, useId, useMemo, type JSX } from 'react';
import type { CaracolCosmeticWearer, CaracolOutfit } from '../shared/caracol';
import {
  CARACOL_INK_MIN_PX,
  caracolArtLayers,
  caracolArtViewBox,
  sameCaracolOutfit,
  type CaracolArtCrop,
} from './caracolArt/model';
import { PLAYER_ART, type CaracolArtIds } from './caracolArt/PlayerArt';
import { SNAIL_ART } from './caracolArt/SnailArt';

// Um desenho por personagem, recortado por viewBox. CaracolFigure é o único
// lugar que desenha; medalhão, tokens do mapa e splash só escolhem recorte e tamanho.

export interface CaracolFigureProps {
  wearer: CaracolCosmeticWearer;
  outfit: CaracolOutfit;
  crop: CaracolArtCrop;
  /** Tamanho em que a figura aparece na tela; decide se a tinta tremida vale o custo. */
  sizePx: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/**
 * O servidor transmite o estado inteiro a cada segundo, com outfits em objetos
 * novos. Comparar por valor mantém o SVG de 40 a 120 nós fora do tick.
 */
export function sameFigureProps(prev: CaracolFigureProps, next: CaracolFigureProps): boolean {
  return prev.wearer === next.wearer
    && prev.crop === next.crop
    && prev.sizePx === next.sizePx
    && prev.x === next.x
    && prev.y === next.y
    && prev.width === next.width
    && prev.height === next.height
    && sameCaracolOutfit(prev.outfit, next.outfit);
}

export const CaracolFigure = memo(function CaracolFigure({ wearer, outfit, crop, sizePx, x, y, width, height }: CaracolFigureProps): JSX.Element {
  const uid = useId();
  const ids = useMemo<CaracolArtIds>(() => ({ clip: (part) => `${uid}clip-${part}`, ink: `${uid}ink` }), [uid]);
  const ink = sizePx >= CARACOL_INK_MIN_PX;
  const drawings = wearer === 'player'
    ? caracolArtLayers('player', outfit).map((layer) => PLAYER_ART[layer](ids))
    : caracolArtLayers('snail', outfit).map((layer) => SNAIL_ART[layer](ids));
  return <svg className="caracol-figure" viewBox={caracolArtViewBox(wearer, crop)} x={x} y={y} width={width} height={height} aria-hidden="true">
    {ink && <filter id={ids.ink} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={3} />
      <feDisplacementMap in="SourceGraphic" scale={1.7} />
    </filter>}
    <g filter={ink ? `url(#${ids.ink})` : undefined}>{drawings}</g>
  </svg>;
}, sameFigureProps);
