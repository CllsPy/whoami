import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// CaracolGame.tsx abre o socket no import, então o que sobra nele é conferido
// lendo o fonte. Estes guardas falham se o desenho antigo voltar.

const SRC = new URL('../src/', import.meta.url);
const STYLES = readFileSync(new URL('styles.css', SRC), 'utf8');

function componentSources(): { file: string; text: string }[] {
  return (readdirSync(SRC, { recursive: true }) as string[])
    .filter((file) => /\.tsx?$/.test(file))
    .map((file) => ({ file, text: readFileSync(new URL(file, SRC), 'utf8') }));
}

describe('guarda do novo design', () => {
  it('não sobra CosmeticAvatar nem cosmetic-avatar nos componentes (ARTE-14)', () => {
    const sources = componentSources();
    expect(sources.map((source) => source.file)).toContain('CaracolGame.tsx');
    for (const { file, text } of sources) {
      expect(text, file).not.toMatch(/CosmeticAvatar|cosmetic-avatar/);
    }
  });

  it('não sobra CSS do avatar de caixas (ARTE-14)', () => {
    expect(STYLES).toContain('.caracol-medallion');
    expect(STYLES).not.toContain('.cosmetic-');
  });

  it('não sobra desenho antigo de token do mapa', () => {
    for (const { file, text } of componentSources()) {
      expect(text, file).not.toMatch(/mapPlayerAvatar|mapDeadAvatar|mapSnailAvatar/);
    }
  });

  it('não sobra CSS dos glifos antigos do mapa e da lista (LISTA-03, MAPA-05)', () => {
    for (const selector of ['.map-avatar-', '.map-snail-', '.map-dead-avatar', '.caracol-skull', '.legend-skull']) {
      expect(STYLES, selector).not.toContain(selector);
    }
  });

  it('não pinta todo <circle> dos tokens, que repintaria olhos, lentes e mostradores', () => {
    expect(STYLES).not.toMatch(/\.(map-player|snail-token)[^{}]*\bcircle\s*[{,]/);
    for (const tone of ['you', 'target', 'dead']) expect(STYLES).toContain(`.map-medallion-ring.tone-${tone}`);
  });
});
