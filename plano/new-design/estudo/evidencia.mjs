// Rodada de evidência do polish: renderiza as pendências do plano nos tamanhos reais
// (pele, tinta, estados do card, mapa em desktop e celular, splash) com as decisões tomadas.
// Uso: node plano/new-design/estudo/evidencia.mjs, e abra evidencia-desktop.html e evidencia-mobile.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { figure, C } from './arte.mjs';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const citiesSrc = readFileSync(`${REPO}/shared/cities.ts`, 'utf8');
const citiesStart = citiesSrc.indexOf('= [') + 2;
const cities = JSON.parse(citiesSrc.slice(citiesStart, citiesSrc.indexOf('}]', citiesStart) + 2));
const geo = JSON.parse(readFileSync(`${REPO}/public/brazil-states.geojson`, 'utf8'));
const city = (name, uf) => cities.find((c) => c.name === name && (!uf || c.uf === uf));

const B = { minLon: -74, maxLon: -34, minLat: -34, maxLat: 6 };
const W = 760, H = 570;
const project = (lat, lon) => ({ x: ((lon - B.minLon) / (B.maxLon - B.minLon)) * W, y: ((B.maxLat - lat) / (B.maxLat - B.minLat)) * H });
const featurePath = (f) => {
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  return polys.map((poly) => poly.map((ring) => ring.map(([lon, lat], i) => { const p = project(lat, lon); return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join(' ') + ' Z').join(' ')).join(' ');
};
const statesSvg = geo.features.map((f) => `<path d="${featurePath(f)}" fill="rgba(246,242,232,0.035)" stroke="rgba(246,242,232,0.31)" stroke-width="0.85" vector-effect="non-scaling-stroke"/>`).join('');

const O = (pants, shirt, watch, glasses, cap) => ({ pants, shirt, watch, glasses, cap });
const LOOKS = [
  O('pants-jeans', 'shirt-striped', null, 'glasses-round', 'cap-flat'), O(null, 'shirt-tropical', null, null, 'cap-bucket'),
  O(null, 'shirt-basic', null, 'glasses-dark', 'cap-trucker'), O(null, null, null, 'glasses-neon-visor', null),
  O(null, 'shirt-striped', null, null, null), O(null, null, null, null, 'cap-flat'), O(null, 'shirt-tropical', null, 'glasses-round', null),
];
const players = [
  ['São Paulo', 'SP', 'you'], ['Campinas', 'SP', 'default'], ['Guarulhos', 'SP', 'default'], ['Santos', 'SP', 'dead'], ['Sorocaba', 'SP', 'default'],
  ['Rio de Janeiro', 'RJ', 'target'], ['Niterói', 'RJ', 'default'], ['Belo Horizonte', 'MG', 'default'], ['Juiz de Fora', 'MG', 'default'],
  ['Curitiba', 'PR', 'default'], ['Florianópolis', 'SC', 'default'], ['Porto Alegre', 'RS', 'default'], ['Brasília', 'DF', 'default'],
  ['Goiânia', 'GO', 'default'], ['Salvador', 'BA', 'default'], ['Recife', 'PE', 'dead'], ['Fortaleza', 'CE', 'default'], ['Belém', 'PA', 'default'], ['Manaus', 'AM', 'default'],
].map(([n, uf, tone], i) => ({ ...city(n, uf), tone, outfit: LOOKS[i % LOOKS.length] }));
const LAYER = { dead: 0, default: 1, target: 2, you: 3 };
const drawOrder = [...players].sort((a, b) => LAYER[a.tone] - LAYER[b.tone]);
const snailAt = project(-17.5, -45.2);
const ringColor = { you: '#ddf45c', target: '#ff745f', default: '#75d9e9', dead: '#8b8498' };

let clipSeq = 0;
function portraitToken(p, radius) {
  const { x, y } = project(p.lat, p.lon);
  const id = `ck${++clipSeq}`;
  const svg = figure('player', p.outfit, { crop: 'portrait', size: radius * 2, wobble: false }).replace('<svg ', `<svg x="${x - radius}" y="${y - radius}" `);
  const gray = p.tone === 'dead' ? ` filter="url(#gray)" opacity=".75"` : '';
  return `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${radius}"/></clipPath><g${gray}><circle cx="${x}" cy="${y}" r="${radius}" fill="#fffdf8"/><g clip-path="url(#${id})">${svg}</g></g><circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${ringColor[p.tone]}" stroke-width="2.2" ${p.tone === 'dead' ? 'stroke-dasharray="2 2"' : ''}/>`;
}
function legacyToken(p) {
  const { x, y } = project(p.lat, p.lon);
  const big = p.tone === 'you' || p.tone === 'target';
  if (p.tone === 'dead') return `<g transform="translate(${x} ${y})"><circle r="6" fill="#8b8498" stroke="#f6f2e8" stroke-width="2" stroke-dasharray="2 2"/><path d="M-6 0 V-4 A6 6 0 0 1 6 -4 V0 L4 5 H-4 Z" fill="#bcb5c7" stroke="#151525"/></g>`;
  return `<g transform="translate(${x} ${y})"><circle r="${big ? 9 : 6}" fill="${ringColor[p.tone]}" stroke="#151525" stroke-width="2"/><circle cx="0" cy="-8" r="4" fill="#c78261" stroke="#151525"/><path d="M-5 -3 Q0 -7 5 -3 L5 5 L-5 5 Z" fill="#75d9e9" stroke="#151525"/><path d="M-5 5 L0 5 L-1 12 L-5 12 Z M0 5 L5 5 L5 12 L1 12 Z" fill="#4d628f" stroke="#151525"/></g>`;
}
function snailToken(scaleW) {
  const w = scaleW;
  return figure('snail', O(null, 'shirt-striped', null, 'glasses-dark', 'cap-trucker'), { crop: 'full', size: w, wobble: false }).replace('<svg ', `<svg x="${snailAt.x - w / 2}" y="${snailAt.y - w * 0.95}" `);
}
function map(width, variant) {
  clipSeq += 100;
  let tokens;
  if (variant === 'legacy') tokens = players.map(legacyToken).join('');
  else {
    const [rBig, rSmall] = variant;
    tokens = drawOrder.map((p) => portraitToken(p, p.tone === 'you' || p.tone === 'target' ? rBig : rSmall)).join('');
  }
  const snail = variant === 'legacy' ? `<g transform="translate(${snailAt.x - 18} ${snailAt.y - 20})"><path d="M3 19 C2 8 8 3 17 5 C25 6 31 12 31 20 Z" fill="#d86b51" stroke="#f6f2e8" stroke-width="1.4"/><path d="M5 19 C5 14 7 11 11 10 C16 9 19 13 19 19 Z" fill="#efb37d" stroke="#f6f2e8"/></g>` : snailToken(variant[2] ?? 40);
  const label = variant === 'legacy' ? 'hoje' : `retrato r ${variant[0]}/${variant[1]} · caracol ${variant[2] ?? 40}${variant[0] === 9 ? ' (escolhido)' : ' (descartado)'}`;
  return `<figure style="margin:0;width:${width}px"><figcaption>${label} · ${width}px (${(width / W).toFixed(2)} px/unidade)</figcaption><svg viewBox="0 0 ${W} ${H}" width="${width}" style="display:block;background:#20213a;border:1px solid rgba(246,242,232,.2)"><defs><filter id="gray"><feColorMatrix type="saturate" values="0"/></filter></defs>${statesSvg}<line x1="${snailAt.x}" y1="${snailAt.y}" x2="${project(players[5].lat, players[5].lon).x}" y2="${project(players[5].lat, players[5].lon).y}" stroke="#ff745f" stroke-width="1.6" stroke-dasharray="5 7" opacity=".85"/>${tokens}${snail}</svg></figure>`;
}

const medal = (svg, size, { ring = '0 0 0 1.5px #151525', extra = '', badge = '' } = {}) => `<span style="position:relative;display:inline-block;width:${size}px;height:${size}px;flex:0 0 auto"><span style="display:block;width:100%;height:100%;border-radius:50%;overflow:hidden;background:#fffdf8;box-shadow:${ring};${extra}">${svg.replace(/width="[\d.]+" height="[\d.]+"/, 'width="100%" height="100%"')}</span>${badge}</span>`;
const skinned = (svg, tone) => svg.replaceAll(C.skin, tone);
const check = `<span style="position:absolute;top:-4px;right:-4px;width:22px;height:22px;border-radius:50%;background:#151525;display:grid;place-items:center"><svg viewBox="0 0 24 24" width="13" height="13"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="#ddf45c" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
const chip = (t) => `<span style="position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);white-space:nowrap;padding:2px 6px;background:#151525;color:#ff745f;font:9px 'DM Mono',monospace;letter-spacing:.06em;text-transform:uppercase">${t}</span>`;

const base = O(null, 'shirt-striped', null, 'glasses-round', null);
const item = O(null, 'shirt-striped', null, 'glasses-round', 'cap-trucker');
const css = `<style>body{margin:0;padding:20px;background:#151525;color:#f6f2e8;font:12px 'DM Mono',monospace}h2{font:700 15px sans-serif;color:#ddf45c;margin:22px 0 10px;text-transform:uppercase;letter-spacing:.08em}.row{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.paper{background:#f6f2e8;color:#151525;padding:16px}.cell{display:flex;flex-direction:column;align-items:center;gap:8px}.lbl{font-size:10px;color:#6e6a7b;text-transform:uppercase}.card{display:grid;gap:8px;border:1px solid rgba(21,21,37,.13);padding:11px;background:rgba(255,255,255,.24);width:150px}.prev{display:grid;min-height:112px;place-items:center;background:#e7e2d5}figcaption{margin-bottom:6px;color:#aaa7b7}</style>`;

// ---------------------------------------------------------------- página desktop
const skins = [['#c78261', 'escolhido (#c78261)'], ['#f0bf9b', 'estudo (#f0bf9b)']];
const variety = ['#f3cfb1', '#d9a07a', '#b8744f', '#8a5234'];
let desk = `<html><body>${css}`;
desk += `<h2>A · Pele</h2><div class="paper"><div class="row">${skins.map(([t, l]) => `<div class="cell">${[40, 64, 112].map((s) => medal(skinned(figure('player', base, { size: s, wobble: s >= 56 }), t), s)).join('')}<span class="lbl">${l}</span></div>`).join('')}<div class="cell"><div class="row">${variety.map((t) => medal(skinned(figure('player', base, { size: 64 }), t), 64)).join('')}</div><span class="lbl">variação por conta (descartada)</span></div></div></div>`;
desk += `<h2>B · Tinta: sem × com, por tamanho</h2><div class="paper"><div class="row">${[40, 48, 56, 64, 88].map((s) => `<div class="cell"><div class="row" style="gap:8px">${medal(skinned(figure('player', item, { size: s, wobble: false }), '#c78261'), s)}${medal(skinned(figure('player', item, { size: s, wobble: true }), '#c78261'), s)}</div><span class="lbl">${s}px</span></div>`).join('')}</div></div>`;
const cardStates = [
  ['default', medal(skinned(figure('player', item, { crop: 'cap', size: 88 }), '#c78261'), 88), '50 moedas'],
  ['equipado', medal(skinned(figure('player', item, { crop: 'cap', size: 88 }), '#c78261'), 88, { ring: '0 0 0 3px #ddf45c, 0 0 0 5px #151525', badge: check }), 'Equipado'],
  ['sem saldo · cor + anel tracejado (escolhido)', medal(skinned(figure('player', item, { crop: 'cap', size: 88 }), '#c78261'), 88, { ring: 'none', extra: 'outline:2px dashed #6e6a7b;outline-offset:1px' }), 'Faltam 35 moedas'],
  ['sem saldo · cinza (descartado)', medal(skinned(figure('player', item, { crop: 'cap', size: 88 }), '#c78261'), 88, { extra: 'filter:grayscale(1);opacity:.55' }), 'Faltam 35 moedas'],
];
desk += `<h2>C · Estados do card da loja (88 px)</h2><div class="paper"><div class="row">${cardStates.map(([l, m, s]) => `<div class="cell"><div class="card"><div class="prev">${m}</div><strong style="font:700 14px sans-serif">Trucker</strong><span class="lbl">${s}</span></div><span class="lbl" style="max-width:160px;text-align:center">${l}</span></div>`).join('')}<div class="cell"><div class="card"><div class="prev">${medal(skinned(figure('player', O(null, 'shirt-tropical', null, null, null), { size: 88 }), '#c78261'), 88, { extra: 'filter:grayscale(1);opacity:.55', badge: '' })}</div><strong style="font:700 14px sans-serif">Lia</strong><span class="lbl">morta</span></div><span class="lbl">morta na lista (cinza)</span></div></div></div>`;
desk += `<h2>D · Mapa em 1280 px (coluna ~724 px)</h2><div class="row" style="align-items:flex-start">${map(724, 'legacy')}${map(724, [9, 7, 40])}</div><div class="row" style="align-items:flex-start;margin-top:14px">${map(724, [12, 9, 48])}</div>`;
desk += `</body></html>`;
writeFileSync(new URL('./evidencia-desktop.html', import.meta.url), desk);

// ---------------------------------------------------------------- página mobile
const splash = () => {
  const snail = figure('snail', O(null, null, null, null, null), { size: 560, wobble: true }).replace('<svg ', '<svg x="305" y="906" ');
  return `<svg viewBox="0 0 1170 2532" width="390" height="844" style="display:block"><rect width="1170" height="2532" fill="#151525"/><defs><clipPath id="spl"><circle cx="585" cy="1186" r="280"/></clipPath></defs><circle cx="585" cy="1186" r="280" fill="#fffdf8"/><g clip-path="url(#spl)">${snail}</g><text x="585" y="1610" fill="#f6f2e8" font-family="Arial, sans-serif" font-size="58" font-weight="700" text-anchor="middle">CARACOL</text></svg>`;
};
let mob = `<html><body style="width:390px">${css}`;
mob += `<h2>D · Mapa em 390 px (356 px)</h2>${map(356, 'legacy')}<div style="height:10px"></div>${map(356, [9, 7, 40])}<div style="height:10px"></div>${map(356, [12, 9, 48])}`;
mob += `<h2>C · Card 68 px</h2><div class="paper"><div class="row" style="gap:8px">${cardStates.map(([l, , s]) => `<div class="card" style="width:94px;padding:8px"><div class="prev" style="min-height:88px">${(l.startsWith('equip') ? medal(skinned(figure('player', item, { crop: 'cap', size: 68, wobble: false }), '#c78261'), 68, { ring: '0 0 0 3px #ddf45c, 0 0 0 5px #151525', badge: check }) : l.includes('cinza') ? medal(skinned(figure('player', item, { crop: 'cap', size: 68, wobble: false }), '#c78261'), 68, { extra: 'filter:grayscale(1);opacity:.55' }) : l.includes('tracejado') ? medal(skinned(figure('player', item, { crop: 'cap', size: 68, wobble: false }), '#c78261'), 68, { ring: 'none', extra: 'outline:2px dashed #6e6a7b;outline-offset:1px' }) : medal(skinned(figure('player', item, { crop: 'cap', size: 68, wobble: false }), '#c78261'), 68))}</div><span class="lbl" style="font-size:8px">${s}</span></div>`).join('')}</div></div>`;
mob += `<h2>E · Splash (390 × 844)</h2>${splash()}`;
mob += `</body></html>`;
writeFileSync(new URL('./evidencia-mobile.html', import.meta.url), mob);
console.log('ok', players.filter((p) => !p.lat).map((p) => p.name));
