// Porovnání dvou oficiálních verzí monogramu v2:
// BRAND (public/logo/monogram-ld.svg — použitá ve wordmark zadání / Claude Design)
// vs. EMBROIDERY (brand/vyrobce-balicek-v2/eldee-logo-vyseni-v2-svetla.svg)
// Výstup: overlay HTML s tabulkou rozdílů.

import { readFile, writeFile } from 'node:fs/promises';

const OUT = '/Users/lukashledik/Documents/Claude-code/07-eldee-business/brand/lockup-navrhy/brand-vs-embroidery.html';
const EMB = '/Users/lukashledik/Documents/Claude-code/07-eldee-business/brand/vyrobce-balicek-v2/eldee-logo-vyseni-v2-svetla.svg';
const BRAND = 'public/logo/monogram-ld.svg';

const parse = async (file) => {
  const raw = await readFile(file, 'utf8');
  const paths = [...raw.matchAll(/<path d="([^"]+)"[^>]*>/g)].map((m) => m[1]);
  const ellipse = raw.match(/<ellipse ([^/]+)\/>/)[1];
  const spara = raw.match(/stroke-width="([\d.]+)" stroke-linejoin/)[1];
  return { L: paths[2], D: paths[1], maskL: paths[0], ellipse, spara };
};

const brand = await parse(BRAND);
const emb = await parse(EMB);

console.log('BRAND  — L:', brand.L.slice(0, 30), '| spára:', brand.spara, '| halo:', brand.ellipse);
console.log('EMBROI — L:', emb.L.slice(0, 30), '| spára:', emb.spara, '| halo:', emb.ellipse);

const layer = (v, color, op, gold = color) => `
  <g opacity="${op}">
    <path d="${v.D}" fill="${color}"/>
    <path d="${v.L}" fill="${color}"/>
    <ellipse ${v.ellipse.replace(/stroke="[^"]*"/, `stroke="${gold}"`).replace(/fill="[^"]*"/, 'fill="none"')}/>
  </g>`;

const svg = (inner) => `<svg viewBox="3.2 46 301.5 301.5" style="width:100%;max-width:340px;display:block;margin:0 auto">${inner}</svg>`;

const html = `<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><title>Brand vs Embroidery — monogram v2</title>
<style>body{background:#141414;color:#F5F5F0;font-family:ui-sans-serif,system-ui;padding:40px 24px}
h1{font-size:22px}h1 em{color:#C9A227;font-style:normal}p{color:#aaa;font-size:14px;max-width:860px;line-height:1.55}
.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;max-width:1200px;margin:30px auto}
.card{background:#0A0A0A;border:1px solid #2a2a2a;border-radius:10px;padding:24px}
.card h2{font-size:14px;color:#C9A227;margin:0 0 12px;text-align:center}
table{border-collapse:collapse;margin:26px auto;font-size:13.5px}
th,td{border:1px solid #333;padding:7px 14px;text-align:left}th{color:#C9A227}
@media(max-width:900px){.row{grid-template-columns:1fr}}</style></head><body>
<h1>Monogram v2: <em>BRAND vs. EMBROIDERY</em> — dvě oficiální verze, záměrně různé</h1>
<p>BRAND verze (brandbook, web, tisk — a z ní vychází wordmark) azurově. EMBROIDERY verze
(balíček pro výrobce — technická adaptace pro vyšívání při nášivce 35 mm) červeně.
Rozdíly ve třetím panelu NEJSOU chyba — jsou to Lukášovy korekce vyšitelnosti z 2026-06-03.</p>
<div class="row">
  <div class="card"><h2>BRAND (azurová) — základ wordmarku</h2>${svg(layer(brand, '#32ade6', 1))}</div>
  <div class="card"><h2>EMBROIDERY (červená) — balíček v2</h2>${svg(layer(emb, '#ff3b30', 1))}</div>
  <div class="card"><h2>Překryv — rozdíly viditelné</h2>${svg(layer(brand, '#32ade6', 0.55) + layer(emb, '#ff3b30', 0.55))}</div>
</div>
<table>
<tr><th>Parametr</th><th>BRAND (wordmark)</th><th>EMBROIDERY (výšivka)</th><th>Proč se liší</th></tr>
<tr><td>Pozice L</td><td>x 66,3–155,9</td><td>x 56,3–145,9 (<b>−10 j. doleva</b>)</td><td>místo pro širší spáru</td></tr>
<tr><td>Knockout spára</td><td>tah 20 j.</td><td><b>tah 25 j.</b> (≈ 1,8 mm)</td><td>min. 1,5 mm pro vyšití</td></tr>
<tr><td>Svatozář</td><td>cy 79,5 · ry 12,5 · tah 7</td><td>cy 77 · ry 13 · <b>tah 11</b> (≈ 1,6 mm)</td><td>tenký prsten 1,0 mm nešel vyšít</td></tr>
<tr><td>D</td><td colspan="2" style="text-align:center">identické (118 / 318)</td><td>—</td></tr>
</table>
</body></html>`;

await writeFile(OUT, html);
console.log('Hotovo:', OUT);
