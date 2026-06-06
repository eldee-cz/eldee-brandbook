// Ověření: LD interlock ve wordmark zadání (L 206.4/416.9 · D 268.4/449.9 · halo 332.7/211.4)
// = monogram N2 (L 56/285 · D 118/318 · halo 182.3/79.5) posunutý o (+150.4, +131.9)?
// Výstup: overlay HTML — monogram červeně, wordmark-LD azurově → při shodě vše splyne.

import { readFile, writeFile } from 'node:fs/promises';
import wawoff from 'wawoff2';
import opentype from 'opentype.js';

const OUT = '/Users/lukashledik/Documents/Claude-code/07-eldee-business/brand/lockup-navrhy/ld-overlay-check.html';
const FS = 258;

const woff2 = await readFile('public/fonts/BigShouldersDisplay-Black.woff2');
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
const pathD = (t, x, y) => serialize(font.getPath(t, x, y, FS));

// Oficiální monogram N2 — path data přímo z public/logo/monogram-ld.svg (zafixovaný finál)
const monogramRaw = await readFile('public/logo/monogram-ld.svg', 'utf8');
const mPaths = [...monogramRaw.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
const mEllipse = monogramRaw.match(/<ellipse ([^/]+)\/>/)[1];
// mPaths: [0] = L v masce, [1] = D, [2] = L

// Wordmark LD dle zadání
const wm = {
  L: pathD('L', 206.4, 416.9),
  D: pathD('D', 268.4, 449.9),
  halo: { cx: 332.7, cy: 211.4, rx: 66, ry: 12.5, sw: 7 },
};

// Očekávaný posun monogram → wordmark
const DX = 206.4 - 56, DY = 416.9 - 285;
console.log(`Posun monogram→wordmark: dx ${DX} dy ${DY}`);
console.log(`Kontrola D: 118+${DX}=${118 + DX} (zadání 268.4) | 318+${DY}=${318 + DY} (zadání 449.9)`);
console.log(`Kontrola halo: 182.3+${DX}=${rr(182.3 + DX)} (zadání 332.7) | 79.5+${DY}=${rr(79.5 + DY)} (zadání 211.4)`);

const VB = '150 150 420 340';

const monoLayer = (color, op) => `
  <g transform="translate(${DX},${DY})" opacity="${op}">
    <path d="${mPaths[1]}" fill="${color}"/>
    <path d="${mPaths[2]}" fill="${color}"/>
    <ellipse ${mEllipse.replace(/stroke="[^"]*"/, `stroke="${color}"`)}/>
  </g>`;
const wmLayer = (color, op) => `
  <g opacity="${op}">
    <path d="${wm.D}" fill="${color}"/>
    <path d="${wm.L}" fill="${color}"/>
    <ellipse cx="${wm.halo.cx}" cy="${wm.halo.cy}" rx="${wm.halo.rx}" ry="${wm.halo.ry}" fill="none" stroke="${color}" stroke-width="${wm.halo.sw}"/>
  </g>`;

// Pozn.: pro overlay tvarů nepoužíváme knockout masku — porovnáváme čisté siluety L, D, halo.
const svg = (inner) => `<svg viewBox="${VB}" style="width:100%;max-width:380px;display:block;margin:0 auto">${inner}</svg>`;

const html = `<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><title>LD overlay check — wordmark vs N2</title>
<style>body{background:#141414;color:#F5F5F0;font-family:ui-sans-serif,system-ui;padding:40px 24px}
h1{font-size:22px}h1 em{color:#C9A227;font-style:normal}p{color:#aaa;font-size:14px;max-width:820px;line-height:1.5}
.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;max-width:1200px;margin:30px auto}
.card{background:#0A0A0A;border:1px solid #2a2a2a;border-radius:10px;padding:24px}
.card h2{font-size:14px;color:#C9A227;margin:0 0 12px;text-align:center}
@media(max-width:900px){.row{grid-template-columns:1fr}}</style></head><body>
<h1>Overlay check: <em>LD z wordmark zadání vs. oficiální monogram N2</em></h1>
<p>Monogram N2 (path data 1:1 z <code>monogram-ld.svg</code>) posunutý o (+${DX}, +${DY}) — červeně.
LD z wordmark zadání (L 206,4/416,9 · D 268,4/449,9 · halo 332,7/211,4) — azurově.
Pokud zadání odpovídá N2, třetí panel je čistě fialový (dokonalý překryv, žádné červené ani azurové okraje).</p>
<div class="row">
  <div class="card"><h2>Monogram N2 (červená)</h2>${svg(monoLayer('#ff3b30', 1))}</div>
  <div class="card"><h2>Wordmark LD (azurová)</h2>${svg(wmLayer('#32ade6', 1))}</div>
  <div class="card"><h2>Překryv (shoda = fialová)</h2>${svg(monoLayer('#ff3b30', 0.55) + wmLayer('#32ade6', 0.55))}</div>
</div>
</body></html>`;

await writeFile(OUT, html);
console.log('Hotovo:', OUT);
