import type { CaracolCosmeticSlot, CaracolCosmeticWearer } from '../../shared/caracol';

// Modelo da arte do Caracol: tudo que é dado e regra, sem JSX. Cada personagem
// é desenhado uma vez em coordenadas fixas (jogador em 200 × 400, caracol em
// 240 × 240), e cada recorte é só um viewBox diferente sobre o mesmo desenho.

/**
 * Atributo de apresentação SVG não aceita `var()`, e a splash é arquivo
 * estático, então a arte copia os hex. As cores que vêm de `:root` em
 * src/styles.css têm teste de paridade.
 */
export const CARACOL_ART_PALETTE = {
  ink: '#151525',
  paper: '#f6f2e8',
  white: '#fffdf8',
  acid: '#ddf45c',
  acidDark: '#94a329',
  coral: '#ff745f',
  sky: '#75d9e9',
  lavender: '#b39bff',
  skin: '#c78261',
  hair: '#4a2d25',
  shell: '#d86b51',
  snailBody: '#efb37d',
  jeans: '#4d628f',
  jeansLight: '#7189bd',
  olive: '#7b7753',
  oliveDark: '#5f5c3f',
  tropical: '#4f9f7f',
  basic: '#e8d6c2',
  gold: '#e7bc52',
  goldDark: '#9c722b',
} as const;

/** As peças com desenho. Peça nova no catálogo precisa entrar aqui e ganhar arte nos dois personagens. */
export const CARACOL_ART_ITEM_IDS = [
  'pants-jeans',
  'pants-cargo',
  'pants-neon-race',
  'shirt-basic',
  'shirt-striped',
  'shirt-tropical',
  'watch-digital',
  'watch-gold',
  'watch-holographic',
  'glasses-round',
  'glasses-dark',
  'glasses-neon-visor',
  'cap-flat',
  'cap-trucker',
  'cap-bucket',
] as const;

export type CaracolArtItemId = typeof CARACOL_ART_ITEM_IDS[number];
export type CaracolArtCrop = 'portrait' | 'full' | CaracolCosmeticSlot;
export type CaracolArtBox = readonly [x: number, y: number, width: number, height: number];

export const CARACOL_ART_CROPS: Record<CaracolCosmeticWearer, Record<CaracolArtCrop, CaracolArtBox>> = {
  player: {
    full: [18, 14, 172, 372],
    portrait: [30, 24, 140, 140],
    cap: [48, 14, 104, 104],
    glasses: [56, 42, 88, 88],
    shirt: [30, 110, 140, 140],
    watch: [127, 74, 60, 60],
    pants: [20, 222, 160, 160],
  },
  snail: {
    full: [6, -6, 236, 236],
    portrait: [22, -6, 150, 150],
    cap: [48, 36, 94, 94],
    glasses: [42, -26, 106, 106],
    shirt: [34, 104, 122, 122],
    watch: [48, 26, 58, 58],
    pants: [38, 140, 114, 114],
  },
};

export function caracolArtViewBox(wearer: CaracolCosmeticWearer, crop: CaracolArtCrop): string {
  return CARACOL_ART_CROPS[wearer][crop].join(' ');
}
