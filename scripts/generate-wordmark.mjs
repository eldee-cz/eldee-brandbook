// Generuje wordmark v2 — „eldee" s vnořeným interlock monogramem LD (lockup L3, finál 2026-06-06).
// Geometrie: zadání brand/lockup-navrhy/claude-design-zadani-wordmark.md (verze 1.1, jednotný master v2.1).
// LD + svatozář = doslova přeložený master monogram (translate +160.4, +134.4) → garance shody 1:1
// včetně zaoblených rohů knockout spáry. Malá „e" = path z fontu (wawoff2 + opentype.js).
// Výstup: public/logo/wordmark-light.svg / wordmark-dark.svg / wordmark-mono.svg
//
// ⚠️ opentype.js (ESM dist) bug: toPathData() i kerning lookup umí vrátit NaN →
// vlastní serializace commands + glyfy jednotlivě (viz scripts/generate-l3-finetune.mjs).

import { readFile, writeFile } from 'node:fs/promises';
import wawoff from 'wawoff2';
import opentype from 'opentype.js';

const WOFF2_PATH = 'public/fonts/BigShouldersDisplay-Black.woff2';
const MONOGRAM_PATH = 'public/logo/monogram-ld.svg';
const FS = 258;
const GOLD = '#C9A227';

// Layout (fs-258 souřadnice, baseline e = 400) — zadání v1.1
const E_POS = [[88, 400], [406.1, 400], [524.5, 400]];
const LD_TRANSLATE = { dx: 160.4, dy: 134.4 }; // monogram (L origin 46, D 118, baseline D 318) → wordmark (206.4 / 278.4 / 452.4)

console.log('Loading font...');
const woff2 = await readFile(WOFF2_PATH);
const ttf = Buffer.from(await wawoff.decompress(new Uint8Array(woff2)));
const font = opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));

const rr = (n) => Math.round(n * 100) / 100;
const serialize = (path) => path.commands.map((c) => {
  switch (c.type) {
    case 'M': return `M${rr(c.x)} ${rr(c.y)}`;
    case 'L': return `L${rr(c.x)} ${rr(c.y)}`;
    case 'C': return `C${rr(c.x1)} ${rr(c.y1)} ${rr(c.x2)} ${rr(c.y2)} ${rr(c.x)} ${rr(c.y)}`;
    case 'Q': return `Q${rr(c.x1)} ${rr(c.y1)} ${rr(c.x)} ${rr(c.y)}`;
    case 'Z': return 'Z';
    default: throw new Error(`neznámý command ${c.type}`);
  }
}).join('');
const ePath = (x, y) => {
  const d = serialize(font.getPath('e', x, y, FS));
  if (d.includes('NaN')) throw new Error(`NaN v path "e" @ ${x},${y}`);
  return d;
};

// Kanonické LD + svatozář z master monogramu (v2.1)
const mono = await readFile(MONOGRAM_PATH, 'utf8');
const mPaths = [...mono.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]); // [0] mask L, [1] D, [2] L
const mEllipse = mono.match(/<ellipse ([^/]+)\/>/)[1];                     // halo (cx 182.3 cy 77 …)
const sparaW = mono.match(/stroke-width="([\d.]+)" stroke-linejoin/)[1];   // 25

// ViewBox: obsah x 96,4–635,8 · y 192,9–452,4 + padding 12
const VB = { x: 84.4, y: 180.9, w: 563.4, h: 283.5 };
const viewBox = `${VB.x} ${VB.y} ${VB.w} ${VB.h}`;

const buildSvg = ({ letters, halo, comment, id }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none"${letters === 'currentColor' ? ' color="#F5F5F0"' : ''}>
  <!-- eldee wordmark v2 — lockup L3 (finál 2026-06-06). ${comment} -->
  <!-- 5 glyfů Big Shoulders Display Black fs 258, path-based. LD + svatozář = master monogram v2.1 (translate +160.4 +134.4), spára ${sparaW} j. průhledná, D podsedá 52,4 j. pod baseline e, blok LD+halo v ose e (y 322,6). -->
  <!-- Maska v souřadnicích monogramu — aplikuje se na D uvnitř translate skupiny (userSpaceOnUse = lokální prostor). -->
  <defs>
    <mask id="wm-ko-${id}" maskUnits="userSpaceOnUse" x="-300" y="-300" width="1400" height="1400">
      <rect x="-300" y="-300" width="1400" height="1400" fill="white"/>
      <path d="${mPaths[0]}" fill="black" stroke="black" stroke-width="${sparaW}" stroke-linejoin="round"/>
    </mask>
  </defs>
  ${E_POS.map(([x, y]) => `<path d="${ePath(x, y)}" fill="${letters}"/>`).join('\n  ')}
  <g transform="translate(${LD_TRANSLATE.dx},${LD_TRANSLATE.dy})">
    <path d="${mPaths[1]}" fill="${letters}" mask="url(#wm-ko-${id})"/>
    <path d="${mPaths[2]}" fill="${letters}"/>
    <ellipse ${mEllipse.replace(/stroke="[^"]*"/, `stroke="${halo}"`).replace(/ fill="[^"]*"/, '')} fill="none"/>
  </g>
</svg>`;

await writeFile('public/logo/wordmark-light.svg', buildSvg({ letters: '#F5F5F0', halo: GOLD, comment: 'LIGHT — na tmavá pozadí.', id: 'light' }));
await writeFile('public/logo/wordmark-dark.svg',  buildSvg({ letters: '#0A0A0A', halo: GOLD, comment: 'DARK — na světlá pozadí.', id: 'dark' }));
await writeFile('public/logo/wordmark-mono.svg',  buildSvg({ letters: 'currentColor', halo: 'currentColor', comment: 'MONO — currentColor včetně svatozáře.', id: 'mono' }));

console.log(`Wordmark v2 vygenerován (viewBox ${viewBox}):`);
console.log('  - public/logo/wordmark-light.svg');
console.log('  - public/logo/wordmark-dark.svg');
console.log('  - public/logo/wordmark-mono.svg');
