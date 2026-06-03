// Generuje 6 variant wordmarku eLDee — všechny rovné (0° skew), různé typy detailů.
// Pro logo iteration sprint — Lukáš vybere finální podobu.

import { readFile, writeFile } from 'node:fs/promises';
import wawoff from 'wawoff2';
import opentype from 'opentype.js';

const WOFF2_PATH = 'public/fonts/BigShouldersDisplay-Black.woff2';
const FONT_SIZE = 96;
const WORD = 'eLDee';

const FILL_BONE = '#F5F5F0';
const FILL_GOLD = '#C9A227';
const FILL_BLOOD = '#B91C1C';

console.log('Loading WOFF2 + parsing font...');
const woff2 = await readFile(WOFF2_PATH);
const ttfBytes = await wawoff.decompress(new Uint8Array(woff2));
const ttfBuf = Buffer.from(ttfBytes);
const font = opentype.parse(ttfBuf.buffer.slice(ttfBuf.byteOffset, ttfBuf.byteOffset + ttfBuf.byteLength));

// Helper: render a substring with x-offset
const renderPath = (str, x) => font.getPath(str, x, 80, FONT_SIZE).toPathData(2);
const advance = (str) => font.getAdvanceWidth(str, FONT_SIZE);

// Letter advance positions (for rendering parts separately when needed for accents)
const x_e1 = 0;
const w_e = advance('e');
const x_L = w_e;
const w_L = advance('L');
const x_D = x_L + w_L;
const w_D = advance('D');
const x_e2 = x_D + w_D;
const w_e2 = advance('e');
const x_e3 = x_e2 + w_e2;
const w_e3 = advance('e');
const totalW = x_e3 + w_e3;

console.log(`Letter positions: e1@${x_e1.toFixed(0)} L@${x_L.toFixed(0)} D@${x_D.toFixed(0)} e2@${x_e2.toFixed(0)} e3@${x_e3.toFixed(0)} totalW=${totalW.toFixed(0)}`);

const wordPath = renderPath(WORD, 0);

// === VARIANT A — Clean (baseline, no detail) ===
{
  const w = Math.round(totalW + 10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 100" fill="none">
  <path d="${wordPath}" fill="${FILL_BONE}"/>
</svg>`;
  await writeFile('public/logo/iterations/A-clean.svg', svg);
}

// === VARIANT B — Dot accent (eLDee.) ===
{
  const dotR = 9;
  const dotCx = totalW + 14;
  const dotCy = 73;
  const w = Math.round(dotCx + dotR + 8);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 100" fill="none">
  <path d="${wordPath}" fill="${FILL_BONE}"/>
  <circle cx="${dotCx.toFixed(1)}" cy="${dotCy}" r="${dotR}" fill="${FILL_BLOOD}"/>
</svg>`;
  await writeFile('public/logo/iterations/B-dot.svg', svg);
}

// === VARIANT C — Halo above LD (gold subtle arc) ===
{
  const ldCenterX = (x_L + x_D + w_D) / 2;
  const haloRx = (w_L + w_D) / 2 + 8;
  const haloRy = 10;
  const haloCy = 8;
  const w = Math.round(totalW + 10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 110" fill="none">
  <ellipse cx="${ldCenterX.toFixed(1)}" cy="${haloCy}" rx="${haloRx.toFixed(1)}" ry="${haloRy}" stroke="${FILL_GOLD}" stroke-width="3" fill="none"/>
  <g transform="translate(0, 10)">
    <path d="${wordPath}" fill="${FILL_BONE}"/>
  </g>
</svg>`;
  await writeFile('public/logo/iterations/C-halo-ld.svg', svg);
}

// === VARIANT D — Hole in first "e" (subtle oval, blood red) ===
// Render e1 separately, then LD-ee with no first-e
{
  const path_e1 = renderPath('e', x_e1);
  const path_LDee = renderPath('LDee', x_L);
  const holeRx = 7;
  const holeRy = 9;
  const holeCx = w_e / 2;
  const holeCy = 48;
  const w = Math.round(totalW + 10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 100" fill="none">
  <path d="${path_e1}" fill="${FILL_BONE}"/>
  <ellipse cx="${holeCx.toFixed(1)}" cy="${holeCy}" rx="${holeRx}" ry="${holeRy}" fill="#0A0A0A"/>
  <path d="${path_LDee}" fill="${FILL_BONE}"/>
</svg>`;
  await writeFile('public/logo/iterations/D-hole-first-e.svg', svg);
}

// === VARIANT E — Hole in last "e" ===
{
  const path_eLDe = renderPath('eLDe', 0);
  const path_eLast = renderPath('e', x_e3);
  const holeRx = 7;
  const holeRy = 9;
  const holeCx = x_e3 + w_e3 / 2;
  const holeCy = 48;
  const w = Math.round(totalW + 10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 100" fill="none">
  <path d="${path_eLDe}" fill="${FILL_BONE}"/>
  <ellipse cx="${holeCx.toFixed(1)}" cy="${holeCy}" rx="${holeRx}" ry="${holeRy}" fill="#0A0A0A"/>
  <path d="${path_eLast}" fill="${FILL_BONE}"/>
</svg>`;
  await writeFile('public/logo/iterations/E-hole-last-e.svg', svg);
}

// === VARIANT F — Full halo behind whole word (saint emblem) ===
{
  const centerX = totalW / 2;
  const haloRx = totalW / 2 + 14;
  const haloRy = 56;
  const haloCy = 50;
  const w = Math.round(totalW + 40);
  const padX = (w - totalW) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 110" fill="none">
  <ellipse cx="${(centerX + padX).toFixed(1)}" cy="${haloCy + 5}" rx="${haloRx.toFixed(1)}" ry="${haloRy}" stroke="${FILL_GOLD}" stroke-width="2.5" fill="none"/>
  <g transform="translate(${padX.toFixed(1)}, 5)">
    <path d="${wordPath}" fill="${FILL_BONE}"/>
  </g>
</svg>`;
  await writeFile('public/logo/iterations/F-halo-full.svg', svg);
}

console.log('\n6 iterations generated:');
console.log('  A — Clean baseline (no detail)');
console.log('  B — Red dot accent (eLDee.)');
console.log('  C — Gold halo arc above LD');
console.log('  D — Hole in first "e"');
console.log('  E — Hole in last "e"');
console.log('  F — Full gold halo behind word');
