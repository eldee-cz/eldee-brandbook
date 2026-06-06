// Generuje anotované konstrukční SVG pro stránku /logo/construction (brandbook).
// Zdroj geometrie: master monogram v2.1 (public/logo/monogram-ld.svg) + wordmark v2
// (public/logo/wordmark-light.svg). Čísla = zafixované konstanty fs-258 systému.
// Vrstvení: kótovací čáry POD logem, popisky NAD ním. Výstup: public/logo/construction/*.svg

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const GOLD = '#C9A227';
const DIM = '#7a7a7a';      // kótovací čáry
const AXIS = '#e0427a';     // hlavní osa
const LABEL = '#9a9a9a';

const inner = (svg) => svg.replace(/^[\s\S]*?(<defs>|<path)/, '$1').replace(/<\/svg>\s*$/, '');

const mono = await readFile('public/logo/monogram-ld.svg', 'utf8');
const wm = await readFile('public/logo/wordmark-light.svg', 'utf8');
await mkdir('public/logo/construction', { recursive: true });

const label = (x, y, text, anchor = 'start', color = LABEL, size = 11) =>
  `<text x="${x}" y="${y}" font-family="ui-monospace, monospace" font-size="${size}" fill="${color}" text-anchor="${anchor}">${text}</text>`;
const hline = (x1, x2, y, color = DIM, dash = '4 5', w = 1) =>
  `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="${w}" stroke-dasharray="${dash}"/>`;
const vdim = (x, y1, y2) => `
  <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${DIM}" stroke-width="1"/>
  <line x1="${x - 4}" y1="${y1}" x2="${x + 4}" y2="${y1}" stroke="${DIM}" stroke-width="1"/>
  <line x1="${x - 4}" y1="${y2}" x2="${x + 4}" y2="${y2}" stroke="${DIM}" stroke-width="1"/>`;
const hdim = (x1, x2, y) => `
  <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${DIM}" stroke-width="1"/>
  <line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}" stroke="${DIM}" stroke-width="1"/>
  <line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}" stroke="${DIM}" stroke-width="1"/>`;

// ───────────────────────────── 1) MONOGRAM — konstrukční mřížka
// v2.1: L origin 46 (baseline 285) · D origin 118 (baseline 318) · halo 182.3/77 rx66 ry13 sw11 · spára 25 · cap 206.4
{
  const guides = [
    hline(-80, 300, 78.6),
    hline(-80, 300, 111.6, DIM, '2 6'),
    hline(-80, 300, 285),
    hline(-80, 300, 318),
    vdim(300, 78.6, 285),
    vdim(335, 285, 318),
    hdim(46, 118, 360),
  ].join('');
  const labels = [
    label(-88, 74, 'vršek L'),
    label(-88, 107, 'vršek D'),
    label(-88, 280, 'baseline L'),
    label(-88, 338, 'baseline D'),
    label(308, 185, 'výška verzálek'),
    label(308, 199, '206,4 j.'),
    label(343, 306, 'Δy 33 j.'),
    label(82, 380, 'Δx origin L→D 72 j.', 'middle'),
    label(258, 50, 'svatozář · rx 66 · ry 13 · tah 11', 'start', GOLD),
    `<line x1="252" y1="55" x2="240" y2="68" stroke="${GOLD}" stroke-width="1"/>`,
    label(168, 252, '← spára 25 j. (≈1,8 mm)', 'start', AXIS),
    label(-88, 400, 'Jednotky: fs-258 systém · mm hodnoty platí při nášivce 35 mm', 'start', LABEL, 10),
  ].join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-95 20 640 400" fill="none" color="#F5F5F0">
  <!-- eldee construction grid — monogram v2.1 (generuje scripts/generate-construction.mjs) -->
  ${guides}
  ${inner(mono)}
  ${labels}
</svg>`;
  await writeFile('public/logo/construction/monogram-grid.svg', svg);
}

// ───────────────────────────── 2) WORDMARK — osová konstrukce
// e baseline 400 · L 206.4/419.4 · D 278.4/452.4 · ee 406.1+524.5 · osa 322.6 · halo 342.7/211.4
{
  const guides = [
    hline(-10, 690, 322.6, AXIS, '7 7', 1.5),
    hline(-10, 690, 400, '#6ab0de', '3 6'),
    hline(-10, 690, 452.4),
    hline(-10, 690, 192.9, DIM, '2 6'),
    vdim(660, 400, 452.4),
    vdim(45, 192.9, 452.4),
  ].join('');
  const labels = [
    label(698, 196.9, 'vršek svatozáře (192,9)'),
    label(698, 318, 'OSA y 322,6', 'start', AXIS),
    label(698, 333, 'střed e = střed LD+halo', 'start', AXIS, 10),
    label(698, 404, 'baseline e (400)', 'start', '#6ab0de'),
    label(698, 456.4, 'baseline D (452,4)'),
    label(668, 432, 'podsed D', 'start'),
    label(668, 446, '52,4 j.', 'start'),
    label(36, 315, 'blok', 'end'),
    label(36, 329, '259,5 j.', 'end'),
    label(-10, 512, 'Pozice glyfů (x / baseline): e 88/400 · L 206,4/419,4 · D 278,4/452,4 · e 406,1/400 · e 524,5/400 · fs 258', 'start', LABEL, 10.5),
  ].join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-90 150 1010 380" fill="none" color="#F5F5F0">
  <!-- eldee construction grid — wordmark v2 lockup L3 (generuje scripts/generate-construction.mjs) -->
  ${guides}
  ${inner(wm)}
  ${labels}
</svg>`;
  await writeFile('public/logo/construction/wordmark-grid.svg', svg);
}

// ───────────────────────────── 3) CLEAR SPACE — wordmark (pravidlo: výška L = 206,4 j.)
{
  const CS = 206.4;
  const bx1 = 96.4 - CS, by1 = 192.9 - CS, bx2 = 635.8 + CS, by2 = 452.4 + CS;
  const pad = 40;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bx1 - pad} ${by1 - pad} ${bx2 - bx1 + 2 * pad} ${by2 - by1 + 2 * pad + 20}" fill="none" color="#F5F5F0">
  <!-- eldee clear space — wordmark v2 (generuje scripts/generate-construction.mjs) -->
  <rect x="${bx1}" y="${by1}" width="${bx2 - bx1}" height="${by2 - by1}" stroke="${DIM}" stroke-width="1.5" stroke-dasharray="8 8"/>
  ${inner(wm)}
  <rect x="${bx1}" y="${by1 + (by2 - by1) / 2 - CS / 2}" width="14" height="${CS}" fill="${GOLD}" opacity="0.85"/>
  ${label(bx1 + 22, by1 + (by2 - by1) / 2 + 4, '= výška „L" (206,4 j.)', 'start', GOLD)}
  ${label(bx1, by2 + 34, 'Clear space: min. výška verzálky „L" na všech stranách — pro wordmark i samostatný monogram', 'start', LABEL, 12)}
</svg>`;
  await writeFile('public/logo/construction/clearspace.svg', svg);
}

console.log('Construction SVG hotové: monogram-grid, wordmark-grid, clearspace');
