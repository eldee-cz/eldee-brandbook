// Generuje wordmark SVG s text převedeným na <path> data.
// Dekóduje WOFF2 ze public/fonts/ na TTF in-memory přes wawoff2, pak opentype.js.
// Výstup: 3 wordmark soubory (light, dark, mono).

import { readFile, writeFile } from 'node:fs/promises';
import wawoff from 'wawoff2';
import opentype from 'opentype.js';

const WOFF2_PATH = 'public/fonts/BigShouldersDisplay-Black.woff2';
const FONT_SIZE = 96;

console.log('Loading WOFF2...');
const woff2 = await readFile(WOFF2_PATH);

console.log('Decompressing to TTF...');
const ttfBytes = await wawoff.decompress(new Uint8Array(woff2));
const ttfBuf = Buffer.from(ttfBytes);

console.log('Parsing font...');
const font = opentype.parse(ttfBuf.buffer.slice(ttfBuf.byteOffset, ttfBuf.byteOffset + ttfBuf.byteLength));
console.log('Font loaded:', font.names.fontFamily?.en, font.names.fontSubfamily?.en);

// Generate paths for "e" and "dee" separately, so we can place the circle holes between them
const ePath = font.getPath('e', 0, 80, FONT_SIZE).toPathData(2);
const deeAdvance = font.getAdvanceWidth('e', FONT_SIZE) + 90; // gap for two holes (~45 each)
const deePath = font.getPath('dee', deeAdvance, 80, FONT_SIZE).toPathData(2);

console.log('Path "e" advance:', font.getAdvanceWidth('e', FONT_SIZE).toFixed(1));
console.log('Path "dee" starts at:', deeAdvance.toFixed(1));

// Position of circle holes — between "e" and "dee"
const eEndX = font.getAdvanceWidth('e', FONT_SIZE);
const hole1Cx = eEndX + 22;
const hole2Cx = eEndX + 67;
const holeCy = 48;
const holeR = 22;

// Compute total width
const deeWidth = font.getAdvanceWidth('dee', FONT_SIZE);
const totalWidth = deeAdvance + deeWidth + 10;
const viewBox = `0 0 ${Math.round(totalWidth)} 100`;

const buildSvg = (fillColor, strokeColor) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">
  <g transform="skewX(-8)">
    <path d="${ePath}" fill="${fillColor}"/>
    <circle cx="${hole1Cx.toFixed(1)}" cy="${holeCy}" r="${holeR}" stroke="${strokeColor}" stroke-width="6" fill="none"/>
    <circle cx="${hole2Cx.toFixed(1)}" cy="${holeCy}" r="${holeR}" stroke="${strokeColor}" stroke-width="6" fill="none"/>
    <path d="${deePath}" fill="${fillColor}"/>
  </g>
</svg>`;

await writeFile('public/logo/wordmark-light.svg', buildSvg('#F5F5F0', '#F5F5F0'));
await writeFile('public/logo/wordmark-dark.svg',  buildSvg('#0A0A0A', '#0A0A0A'));
await writeFile('public/logo/wordmark-mono.svg',  buildSvg('currentColor', 'currentColor'));

console.log(`\nWordmarks regenerated. ViewBox: ${viewBox}`);
console.log('Files:');
console.log('  - public/logo/wordmark-light.svg');
console.log('  - public/logo/wordmark-dark.svg');
console.log('  - public/logo/wordmark-mono.svg');
