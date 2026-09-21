// Arte do Caracol no traço Waldo: um desenho de corpo inteiro por personagem,
// cada peça da loja é uma camada, e cada "splash" é só um viewBox diferente.
export const C = {
  ink: '#151525', paper: '#f6f2e8', skin: '#c78261', hair: '#4a2d25',
  coral: '#ff745f', sky: '#75d9e9', acid: '#ddf45c', lavender: '#b39bff',
  jeans: '#4d628f', jeansLight: '#7189bd', olive: '#7b7753', oliveDark: '#5f5c3f',
  tropical: '#4f9f7f', basic: '#e8d6c2', gold: '#e7bc52', goldDark: '#9c722b',
  shell: '#d86b51', snailBody: '#efb37d', white: '#fffdf8',
};

const S = `stroke="${C.ink}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"`;
const s2 = `stroke="${C.ink}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
const line = (d, w = 2.4, color = C.ink) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

// ---------------------------------------------------------------- jogador
const P = {
  torso: 'M64 156 C62 136 74 126 90 124 Q100 136 110 124 C126 126 138 136 136 156 L140 238 L60 238 Z',
  sleeveL: 'M72 130 C58 136 50 150 47 168 L63 172 C64 160 67 152 72 148 Z',
  sleeveR: 'M128 130 C140 126 152 122 165 124 L167 141 C155 141 145 146 136 152 Z',
  pants: 'M60 234 L140 234 L138 356 L106 356 L100 272 L94 356 L62 356 Z',
};

const playerBase = {
  legs: `<ellipse cx="78" cy="362" rx="20" ry="8.5" fill="${C.ink}" ${S}/><ellipse cx="122" cy="362" rx="20" ry="8.5" fill="${C.ink}" ${S}/>`,
  armL: `<path d="M48 166 L63 170 L59 214 L44 212 Z" fill="${C.skin}" ${S}/><circle cx="51" cy="220" r="9.5" fill="${C.skin}" ${S}/>`,
  armR: `<path d="M150 136 L166 134 L165 100 L150 100 Z" fill="${C.skin}" ${S}/>`,
  hand: `<ellipse cx="146" cy="95" rx="4.5" ry="7" transform="rotate(-35 146 95)" fill="${C.skin}" ${S}/><ellipse cx="157.5" cy="86" rx="10.5" ry="12.5" fill="${C.skin}" ${S}/>${line('M152 75 L152 81 M157.5 73 L157.5 80 M163 75 L163 81', 2)}`,
  neck: `<rect x="91" y="104" width="18" height="34" fill="${C.skin}" ${S}/>`,
  hairBack: `<path d="M68 90 C58 62 70 36 98 34 C124 32 142 48 136 74 L140 88 L131 80 L130 94 L124 78 L76 78 L71 94 L68 82 Z" fill="${C.hair}" ${S}/>`,
  ears: `<circle cx="70" cy="88" r="8.5" fill="${C.skin}" ${S}/><circle cx="130" cy="88" r="8.5" fill="${C.skin}" ${S}/>`,
  face: `<ellipse cx="100" cy="84" rx="30" ry="34" fill="${C.skin}" ${S}/>`,
  fringe: `<path d="M69 76 C72 52 126 46 133 70 L126 64 L122 74 L114 60 L107 72 L99 58 L92 72 L85 60 L80 73 L74 64 Z" fill="${C.hair}" ${S}/>`,
  eyes: `<circle cx="89" cy="86" r="3.2" fill="${C.ink}"/><circle cx="111" cy="86" r="3.2" fill="${C.ink}"/>`,
  mouth: `${line('M100 89 q6 5 0 9', 2.2)}${line('M85 104 Q100 117 115 104', 2.6)}`,
};

const SHIRT_PARTS = [['L', P.sleeveL], ['R', P.sleeveR], ['T', P.torso]];
// Cada parte pinta, estampa e contorna antes da próxima: o tronco cobre a costura interna das mangas.
const shirt = (fill, uid, pattern = () => '') => SHIRT_PARTS.map(([k, d]) => `<path d="${d}" fill="${fill}"/>${pattern(k, `shirtclip-${k}-${uid}`)}<path d="${d}" fill="none" ${S}/>`).join('');

function stripes(y0, y1, step, color, clip) {
  let r = '';
  for (let y = y0; y < y1; y += step * 2) r += `<rect x="20" y="${y}" width="170" height="${step}" fill="${color}"/>`;
  return `<g clip-path="url(#${clip})">${r}</g>`;
}

const leaf = (x, y, rot, s = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 -9 C6 -4 6 4 0 9 C-6 4 -6 -4 0 -9 Z" fill="${C.acid}" ${s2}/>${line('M0 -7 L0 7', 1.6)}</g>`;
const flower = (x, y) => `<g transform="translate(${x} ${y})"><circle r="5.5" fill="${C.coral}" ${s2}/><circle r="1.8" fill="${C.acid}"/></g>`;

export const playerItems = {
  shirt: {
    default: (uid) => shirt(C.sky, uid),
    'shirt-basic': (uid) => shirt(C.basic, uid) + line('M92 127 Q100 140 108 127', 2.4) + `<rect x="113" y="150" width="14" height="14" rx="2" fill="none" ${s2}/>`,
    'shirt-striped': (uid) => shirt(C.paper, uid, (k, clip) => stripes(118, 240, 7, C.coral, clip)),
    'shirt-tropical': (uid) => shirt(C.tropical, uid, (k, clip) => k === 'T' ? `<g clip-path="url(#${clip})">${leaf(76, 170, 30)}${leaf(122, 190, -25)}${leaf(84, 214, 70)}${flower(118, 158)}${flower(74, 196)}${flower(126, 222)}</g>` : k === 'R' ? `<g clip-path="url(#${clip})">${leaf(148, 132, 80, .8)}</g>` : `<g clip-path="url(#${clip})">${leaf(58, 152, -20, .8)}</g>`) + `<path d="M90 124 L100 146 L86 140 Z" fill="${C.tropical}" ${s2}/><path d="M110 124 L100 146 L114 140 Z" fill="${C.tropical}" ${s2}/>` + `<circle cx="100" cy="162" r="2.2" fill="${C.paper}" ${s2}/><circle cx="100" cy="184" r="2.2" fill="${C.paper}" ${s2}/><circle cx="100" cy="206" r="2.2" fill="${C.paper}" ${s2}/>`,
  },
  pants: {
    default: () => `<path d="${P.pants}" fill="${C.jeans}" ${S}/>`,
    'pants-jeans': () => `<path d="${P.pants}" fill="${C.jeans}" ${S}/><path d="M63 340 L97 340 L96 356 L62 356 Z M103 340 L138 340 L138 356 L106 356 Z" fill="${C.jeansLight}" ${s2}/>${line('M100 238 L100 262', 2)}${line('M66 250 Q78 252 82 238 M134 250 Q122 252 118 238', 2)}${line('M70 262 L68 336 M130 262 L132 336', 1.6, C.sky)}`,
    'pants-cargo': () => `<path d="${P.pants}" fill="${C.olive}" ${S}/><rect x="60" y="276" width="22" height="26" rx="2" fill="${C.oliveDark}" ${s2}/><path d="M59 276 L83 276 L83 284 L59 284 Z" fill="${C.olive}" ${s2}/><rect x="118" y="276" width="22" height="26" rx="2" fill="${C.oliveDark}" ${s2}/><path d="M117 276 L141 276 L141 284 L117 284 Z" fill="${C.olive}" ${s2}/>${line('M100 238 L100 262', 2)}`,
    'pants-neon-race': () => `<path d="${P.pants}" fill="${C.acid}" ${S}/><path d="M61 238 L69 238 L70 356 L62 356 Z M131 238 L139 238 L138 356 L130 356 Z" fill="${C.ink}"/><path d="M63 318 L97 318 L96.5 326 L62.5 326 Z M103.5 318 L138 318 L138 326 L104 326 Z" fill="${C.sky}" ${s2}/><path d="${P.pants}" fill="none" ${S}/>`,
  },
  watch: {
    'watch-digital': () => `<rect x="147" y="100" width="21" height="10" rx="3" fill="${C.sky}" ${s2}/><rect x="150" y="96.5" width="15" height="16" rx="3" fill="${C.ink}" ${s2}/><path d="M153 102 h3 M153 106 h3 M159 102 h3 M159 106 h3" stroke="${C.acid}" stroke-width="1.8" stroke-linecap="round"/>`,
    'watch-gold': () => `<rect x="147" y="100" width="21" height="10" rx="3" fill="${C.gold}" ${s2}/><circle cx="157.5" cy="105" r="8" fill="${C.paper}" stroke="${C.goldDark}" stroke-width="3"/>${line('M157.5 105 L157.5 100 M157.5 105 L161 107', 1.6)}`,
    'watch-holographic': () => `<rect x="147" y="100" width="21" height="10" rx="3" fill="${C.lavender}" ${s2}/><rect x="149" y="96" width="17" height="17" rx="4" fill="${C.lavender}" ${s2}/><path d="M151 104 h13 v5 h-13 Z" fill="${C.sky}"/><path d="M151 99 h13 v5 h-13 Z" fill="${C.acid}"/><rect x="149" y="96" width="17" height="17" rx="4" fill="none" ${s2}/>${line('M170 94 l3 -3 M171 100 l4 0', 1.6)}`,
  },
  glasses: {
    'glasses-round': () => `${line('M79 84 L70 82 M121 84 L130 82', 2.6)}<circle cx="88" cy="86" r="10.5" fill="${C.white}" stroke="${C.ink}" stroke-width="3.8"/><circle cx="112" cy="86" r="10.5" fill="${C.white}" stroke="${C.ink}" stroke-width="3.8"/>${line('M98 84 Q100 80 102 84', 3)}<circle cx="89" cy="87" r="3.2" fill="${C.ink}"/><circle cx="111" cy="87" r="3.2" fill="${C.ink}"/>`,
    'glasses-dark': () => `${line('M77 82 L69 80 M123 82 L131 80', 2.6)}<path d="M76 79 L98 79 L96 92 Q87 97 78 91 Z" fill="${C.ink}" ${S}/><path d="M102 79 L124 79 L122 91 Q113 97 104 92 Z" fill="${C.ink}" ${S}/>${line('M98 81 L102 81', 3)}${line('M81 83 L86 83 M107 83 L112 83', 1.8, C.paper)}`,
    'glasses-neon-visor': () => `${line('M72 84 L66 82 M128 84 L134 82', 2.6)}<path d="M72 78 Q100 72 128 78 L126 93 Q100 98 74 93 Z" fill="${C.sky}" ${S}/><circle cx="89" cy="86" r="3" fill="${C.ink}" opacity=".55"/><circle cx="111" cy="86" r="3" fill="${C.ink}" opacity=".55"/>${line('M77 80.5 Q100 75.5 123 80.5', 2.4, C.acid)}`,
  },
  cap: {
    'cap-flat': () => `<path d="M68 64 C66 32 134 32 132 64 Z" fill="${C.coral}" ${S}/><path d="M60 62 L146 58 L147 68 L60 70 Z" fill="${C.coral}" ${S}/><circle cx="100" cy="36" r="3.5" fill="${C.coral}" ${s2}/><circle cx="100" cy="50" r="6" fill="${C.acid}" ${s2}/>`,
    'cap-trucker': () => `<path d="M68 64 C66 32 134 32 132 64 Z" fill="${C.sky}" ${S}/><circle cx="74" cy="56" r="1.4" fill="${C.ink}"/><circle cx="78" cy="48" r="1.4" fill="${C.ink}"/><circle cx="126" cy="56" r="1.4" fill="${C.ink}"/><circle cx="122" cy="48" r="1.4" fill="${C.ink}"/><circle cx="72" cy="62" r="1.4" fill="${C.ink}"/><circle cx="128" cy="62" r="1.4" fill="${C.ink}"/><path d="M82 64 C80 38 120 38 118 64 Z" fill="${C.white}" ${s2}/><path d="M64 62 Q100 74 136 62 L138 69 Q100 84 62 69 Z" fill="${C.sky}" ${S}/><circle cx="100" cy="35" r="3" fill="${C.sky}" ${s2}/>${line('M92 53 L108 53', 2.6, C.coral)}`,
    'cap-bucket': () => `<path d="M72 60 C72 32 128 32 128 60 Z" fill="${C.olive}" ${S}/><path d="M72 58 L128 58 L148 78 Q100 68 52 78 Z" fill="${C.olive}" ${S}/>${line('M66 70 Q100 62 134 70', 1.6, C.paper)}`,
  },
};

function playerSvgBody(outfit, uid) {
  const o = outfit;
  const pick = (slot) => {
    const table = playerItems[slot];
    const id = o[slot];
    if (id && table[id]) return table[id](uid);
    return table.default ? table.default(uid) : '';
  };
  // Boné esconde a franja; o resto do cabelo continua aparecendo pelos lados.
  const hairFront = o.cap ? '' : playerBase.fringe;
  const eyes = o.glasses ? '' : playerBase.eyes;
  return [
    `<defs>${SHIRT_PARTS.map(([k, d]) => `<clipPath id="shirtclip-${k}-${uid}"><path d="${d}"/></clipPath>`).join('')}</defs>`,
    playerBase.legs, pick('pants'), playerBase.armL, playerBase.armR, playerBase.hand, playerBase.neck,
    pick('shirt'), pick('watch'), playerBase.hairBack, playerBase.ears, playerBase.face, hairFront, eyes, playerBase.mouth,
    pick('glasses'), pick('cap'),
  ].join('');
}

// ---------------------------------------------------------------- caracol
function spiral(cx, cy, r0, turns) {
  const pts = [];
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2 - Math.PI / 2;
    const r = r0 * (1 - t) + 4;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return 'M' + pts.join(' L');
}

const N = {
  column: 'M60 206 C54 170 60 142 72 124 L118 124 C128 142 132 172 128 206 Z',
  shirt: 'M60 194 C57 166 62 144 71 128 L119 128 C128 146 131 168 129 194 Z',
  foot: 'M16 214 C18 198 56 192 96 194 L200 198 C218 198 234 206 232 216 Z',
};

const snailBase = {
  ground: `<ellipse cx="124" cy="218" rx="112" ry="7" fill="${C.ink}" opacity=".12"/>`,
  shell: `<circle cx="162" cy="122" r="62" fill="${C.shell}" ${S}/>${line(spiral(162, 122, 52, 2.6), 3)}`,
  foot: `<path d="${N.foot}" fill="${C.snailBody}" ${S}/>`,
  column: `<path d="${N.column}" fill="${C.snailBody}" ${S}/>`,
  stalks: `<path d="M80 78 L66 34 L76 31 L90 76 Z" fill="${C.snailBody}" ${S}/><path d="M104 76 L114 31 L124 34 L112 78 Z" fill="${C.snailBody}" ${S}/>`,
  eyes: `<circle cx="70" cy="27" r="11" fill="${C.white}" ${S}/><circle cx="120" cy="27" r="11" fill="${C.white}" ${S}/><circle cx="73" cy="29" r="4" fill="${C.ink}"/><circle cx="117" cy="29" r="4" fill="${C.ink}"/>`,
  head: `<ellipse cx="95" cy="100" rx="38" ry="31" fill="${C.snailBody}" ${S}/>`,
  mouth: `${line('M78 106 Q95 121 112 106', 2.8)}<circle cx="72" cy="98" r="4" fill="${C.coral}" opacity=".55"/><circle cx="118" cy="98" r="4" fill="${C.coral}" opacity=".55"/>`,
};

const snailShirt = (fill) => `<path d="${N.shirt}" fill="${fill}"/>`;
const snailShirtOutline = `<path d="${N.shirt}" fill="none" ${S}/>`;

export const snailItems = {
  shirt: {
    'shirt-basic': () => snailShirt(C.basic) + snailShirtOutline + line('M80 130 Q95 142 110 130', 2.4),
    'shirt-striped': (uid) => snailShirt(C.paper) + `<g clip-path="url(#snailshirt-${uid})">${Array.from({ length: 6 }, (_, i) => `<rect x="40" y="${130 + i * 14}" width="110" height="7" fill="${C.coral}"/>`).join('')}</g>` + snailShirtOutline,
    'shirt-tropical': (uid) => snailShirt(C.tropical) + `<g clip-path="url(#snailshirt-${uid})">${leaf(76, 150, 30)}${leaf(114, 170, -25)}${leaf(82, 184, 70)}${flower(106, 146)}${flower(72, 170)}</g>` + snailShirtOutline + `<path d="M80 128 L95 146 L78 142 Z" fill="${C.tropical}" ${s2}/><path d="M110 128 L95 146 L112 142 Z" fill="${C.tropical}" ${s2}/>`,
  },
  pants: {
    'pants-jeans': () => `<path d="M56 184 L132 184 L136 214 L102 214 L95 202 L88 214 L52 214 Z" fill="${C.jeans}" ${S}/>${line('M95 186 L95 200', 2)}${line('M62 192 Q72 194 76 185 M126 192 Q116 194 112 185', 1.8)}`,
    'pants-cargo': () => `<path d="M56 184 L132 184 L136 214 L102 214 L95 202 L88 214 L52 214 Z" fill="${C.olive}" ${S}/><rect x="58" y="192" width="18" height="16" rx="2" fill="${C.oliveDark}" ${s2}/><rect x="114" y="192" width="18" height="16" rx="2" fill="${C.oliveDark}" ${s2}/>`,
    'pants-neon-race': () => `<path d="M56 184 L132 184 L136 214 L102 214 L95 202 L88 214 L52 214 Z" fill="${C.acid}" ${S}/><path d="M58 186 L65 186 L61 212 L54 212 Z M123 186 L130 186 L134 212 L127 212 Z" fill="${C.ink}"/>`,
  },
  watch: {
    'watch-digital': () => `<rect x="67" y="52" width="19" height="8" rx="3" fill="${C.sky}" transform="rotate(-18 76 56)" ${s2}/><rect x="70" y="49" width="13" height="13" rx="3" fill="${C.ink}" transform="rotate(-18 76 56)" ${s2}/><path d="M73 54 h3 M73 58 h3 M78 54 h2 M78 58 h2" stroke="${C.acid}" stroke-width="1.6" stroke-linecap="round" transform="rotate(-18 76 56)"/>`,
    'watch-gold': () => `<rect x="67" y="52" width="19" height="8" rx="3" fill="${C.gold}" transform="rotate(-18 76 56)" ${s2}/><circle cx="76.5" cy="56" r="7" fill="${C.paper}" stroke="${C.goldDark}" stroke-width="2.6"/>${line('M76.5 56 L76.5 51.5 M76.5 56 L79.5 57.5', 1.5)}`,
    'watch-holographic': () => `<g transform="rotate(-18 76 56)"><rect x="67" y="52" width="19" height="8" rx="3" fill="${C.lavender}" ${s2}/><rect x="69" y="48" width="15" height="15" rx="4" fill="${C.lavender}" ${s2}/><path d="M71 55 h11 v5 h-11 Z" fill="${C.sky}"/><path d="M71 50.5 h11 v4.5 h-11 Z" fill="${C.acid}"/><rect x="69" y="48" width="15" height="15" rx="4" fill="none" ${s2}/></g>`,
  },
  glasses: {
    'glasses-round': () => `<circle cx="70" cy="27" r="14" fill="${C.white}" fill-opacity=".35" stroke="${C.ink}" stroke-width="4"/><circle cx="120" cy="27" r="14" fill="${C.white}" fill-opacity=".35" stroke="${C.ink}" stroke-width="4"/>${line('M84 26 Q95 20 106 26', 3.4)}`,
    'glasses-dark': () => `<path d="M54 18 L86 18 L84 34 Q70 42 57 34 Z" fill="${C.ink}" ${S}/><path d="M104 18 L136 18 L133 34 Q120 42 106 34 Z" fill="${C.ink}" ${S}/>${line('M86 21 L104 21', 3.4)}${line('M60 23 L67 23 M110 23 L117 23', 1.8, C.paper)}`,
    'glasses-neon-visor': () => `<path d="M52 18 Q95 10 138 18 L136 36 Q95 42 54 36 Z" fill="${C.sky}" ${S}/><circle cx="73" cy="29" r="4" fill="${C.ink}" opacity=".55"/><circle cx="117" cy="29" r="4" fill="${C.ink}" opacity=".55"/>${line('M58 21.5 Q95 14.5 132 21.5', 2.4, C.acid)}`,
  },
  cap: {
    'cap-flat': () => `<path d="M68 80 C66 54 124 54 122 80 Z" fill="${C.coral}" ${S}/><path d="M58 78 L136 74 L137 83 L58 86 Z" fill="${C.coral}" ${S}/><circle cx="95" cy="67" r="5" fill="${C.acid}" ${s2}/>`,
    'cap-trucker': () => `<path d="M68 80 C66 54 124 54 122 80 Z" fill="${C.sky}" ${S}/><path d="M80 80 C79 60 111 60 110 80 Z" fill="${C.white}" ${s2}/><path d="M62 78 Q95 88 128 78 L130 85 Q95 98 60 85 Z" fill="${C.sky}" ${S}/>${line('M88 70 L102 70', 2.4, C.coral)}`,
    'cap-bucket': () => `<path d="M72 78 C72 52 118 52 118 78 Z" fill="${C.olive}" ${S}/><path d="M72 76 L118 76 L136 92 Q95 84 54 92 Z" fill="${C.olive}" ${S}/>${line('M64 86 Q95 79 126 86', 1.6, C.paper)}`,
  },
};

function snailSvgBody(outfit, uid) {
  const o = outfit;
  const pick = (slot) => {
    const id = o[slot];
    return id && snailItems[slot][id] ? snailItems[slot][id](uid) : '';
  };
  return [
    `<defs><clipPath id="snailshirt-${uid}"><path d="${N.shirt}"/></clipPath></defs>`,
    snailBase.ground, snailBase.shell, snailBase.foot, snailBase.column, pick('pants'), pick('shirt'),
    snailBase.stalks, pick('watch'), snailBase.eyes, snailBase.head, snailBase.mouth, pick('cap'), pick('glasses'),
  ].join('');
}

// ---------------------------------------------------------------- câmeras
export const CROPS = {
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

let seq = 0;
export function figure(wearer, outfit, { crop = 'portrait', wobble = true, size = 160 } = {}) {
  const uid = `u${++seq}`;
  const vb = CROPS[wearer][crop].join(' ');
  const body = wearer === 'player' ? playerSvgBody(outfit, uid) : snailSvgBody(outfit, uid);
  const filter = wobble ? `<filter id="wob-${uid}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.7"/></filter>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${size}" height="${size * CROPS[wearer][crop][3] / CROPS[wearer][crop][2]}">${filter}<g ${wobble ? `filter="url(#wob-${uid})"` : ''}>${body}</g></svg>`;
}

// ---------------------------------------------------------------- plano de camadas (para o componente do canvas)
// Cada entrada: [flag de visibilidade | null, svg]. `uid` vira o placeholder do template.
const key = (id) => id.replace(/-/g, '_');
function itemLayers(table, slot, uid) {
  return Object.entries(table[slot]).filter(([id]) => id !== 'default').map(([id, fn]) => [key(id), fn(uid)]);
}
export function layerPlan(wearer, uid) {
  if (wearer === 'player') {
    return {
      defs: SHIRT_PARTS.map(([k, d]) => `<clipPath id="shirtclip-${k}-${uid}"><path d="${d}"/></clipPath>`).join(''),
      layers: [
        [null, playerBase.legs],
        ['pants_default', playerItems.pants.default(uid)], ...itemLayers(playerItems, 'pants', uid),
        [null, playerBase.armL + playerBase.armR + playerBase.hand + playerBase.neck],
        ['shirt_default', playerItems.shirt.default(uid)], ...itemLayers(playerItems, 'shirt', uid),
        ...itemLayers(playerItems, 'watch', uid),
        [null, playerBase.hairBack + playerBase.ears + playerBase.face],
        ['fringe', playerBase.fringe], ['eyes', playerBase.eyes], [null, playerBase.mouth],
        ...itemLayers(playerItems, 'glasses', uid), ...itemLayers(playerItems, 'cap', uid),
      ],
    };
  }
  return {
    defs: `<clipPath id="snailshirt-${uid}"><path d="${N.shirt}"/></clipPath>`,
    layers: [
      [null, snailBase.ground + snailBase.shell + snailBase.foot + snailBase.column],
      ...itemLayers(snailItems, 'pants', uid), ...itemLayers(snailItems, 'shirt', uid),
      [null, snailBase.stalks], ...itemLayers(snailItems, 'watch', uid),
      [null, snailBase.eyes + snailBase.head + snailBase.mouth],
      ...itemLayers(snailItems, 'cap', uid), ...itemLayers(snailItems, 'glasses', uid),
    ],
  };
}
