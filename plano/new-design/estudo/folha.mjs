import { writeFileSync } from 'node:fs';
import { figure } from './arte.mjs';

const empty = { pants: null, shirt: null, watch: null, glasses: null, cap: null };
const looks = [
  empty,
  { pants: 'pants-jeans', shirt: 'shirt-striped', watch: 'watch-gold', glasses: 'glasses-round', cap: 'cap-flat' },
  { pants: 'pants-cargo', shirt: 'shirt-tropical', watch: 'watch-digital', glasses: 'glasses-dark', cap: 'cap-bucket' },
  { pants: 'pants-neon-race', shirt: 'shirt-basic', watch: 'watch-holographic', glasses: 'glasses-neon-visor', cap: 'cap-trucker' },
];
const wearer = process.argv[2] ?? 'player';
const wob = process.argv[3] !== 'flat';
const medal = (svg) => `<div class="medal">${svg}</div>`;
let html = `<html><body style="margin:0;background:#151525;padding:16px;font-family:sans-serif;color:#fff">`;
html += `<div class="row">${looks.map((o) => `<div class="card">${figure(wearer, o, { crop: 'full', size: 170, wobble: wob })}</div>`).join('')}</div>`;
html += `<div class="row">${looks.map((o) => medal(figure(wearer, o, { crop: 'portrait', size: 150, wobble: wob }))).join('')}</div>`;
const crops = ['cap', 'glasses', 'shirt', 'watch', 'pants'];
for (const o of looks.slice(1, 3)) html += `<div class="row">${crops.map((c) => medal(figure(wearer, o, { crop: c, size: 120, wobble: wob }))).join('')}</div>`;
html += `<div class="row">${looks.map((o) => medal(figure(wearer, o, { crop: 'portrait', size: 32, wobble: wob }))).join('')}${looks.map((o) => medal(figure(wearer, o, { crop: 'portrait', size: 50, wobble: wob }))).join('')}</div>`;
html += `<style>.row{display:flex;gap:14px;margin-bottom:14px;align-items:center}.card{background:#f6f2e8}.medal{border-radius:50%;overflow:hidden;background:#fffdf8;line-height:0}</style></body></html>`;
writeFileSync(new URL(`./folha-${wearer}.html`, import.meta.url), html);
