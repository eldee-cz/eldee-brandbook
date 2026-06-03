// Generuje wordmark "eLDee" — bez kruhových děr, LD jako přirozené velké uvnitř.
// Dekóduje WOFF2 ze public/fonts/ na TTF in-memory přes wawoff2, pak opentype.js.
// Výstup: 3 wordmark soubory (light, dark, mono).

import { readFile, writeFile } from 'node:fs/promises';
import wawoff from 'wawoff2';
import opentype from 'opentype.js';

const WOFF2_PATH = 'public/fonts/BigShouldersDisplay-Black.woff2';
const FONT_SIZE = 96;
const WORD = 'eLDee';

console.log('Loading WOFF2...');
const woff2 = await readFile(WOFF2_PATH);

console.log('Decompressing to TTF...');
const ttfBytes = await wawoff.decompress(new Uint8Array(woff2));
const ttfBuf = Buffer.from(ttfBytes);

console.log('Parsing font...');
const font = opentype.parse(ttfBuf.buffer.slice(ttfBuf.byteOffset, ttfBuf.byteOffset + ttfBuf.byteLength));
console.log('Font loaded:', font.names.fontFamily?.en, font.names.fontSubfamily?.en);

const wordPath = font.getPath(WORD, 0, 80, FONT_SIZE).toPathData(2);
const advance = font.getAdvanceWidth(WORD, FONT_SIZE);
console.log(`Word "${WORD}" advance:`, advance.toFixed(1));

const totalWidth = advance + 10;
const viewBox = `0 0 ${Math.round(totalWidth)} 100`;

const buildSvg = (fillColor) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">
  <g transform="skewX(-8)">
    <path d="${wordPath}" fill="${fillColor}"/>
  </g>
</svg>`;

await writeFile('public/logo/wordmark-light.svg', buildSvg('#F5F5F0'));
await writeFile('public/logo/wordmark-dark.svg',  buildSvg('#0A0A0A'));
await writeFile('public/logo/wordmark-mono.svg',  buildSvg('currentColor'));

console.log(`\nWordmarks regenerated. ViewBox: ${viewBox}`);
console.log('Files:');
console.log('  - public/logo/wordmark-light.svg');
console.log('  - public/logo/wordmark-dark.svg');
console.log('  - public/logo/wordmark-mono.svg');
