// L3 fine-tune: LD + svatozář vycentrované na osu okolních e (D klesá pod baseline).
// Jeden zdroj pravdy: spočítá geometrii ve fs-258 souřadnicích (systém monogramu N2),
// vygeneruje (a) porovnávací HTML render, (b) prompt pro Claude Design s absolutními čísly.

import { readFile, writeFile } from 'node:fs/promises';
import wawoff from 'wawoff2';
import opentype from 'opentype.js';

const OUT_DIR = '/Users/lukashledik/Documents/Claude-code/07-eldee-business/brand/lockup-navrhy';
const GOLD = '#C9A227';
const FS = 258; // systém monogramu N2

const woff2 = await readFile('public/fonts/BigShouldersDisplay-Black.woff2');
const ttf = Buffer.from(await wawoff.decompress(new Uint8Array(woff2)));
const font = opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));

const adv = (t) => font.getAdvanceWidth(t, FS);
// vlastní serializace — toPathData() v ESM distribuci opentype.js generuje NaN
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
const pathD = (t, x, y) => {
  const d = serialize(font.getPath(t, x, y, FS));
  if (d.includes('NaN')) throw new Error(`NaN v commands pro "${t}" @ ${x},${y}`);
  return d;
};
// opentype.js u víceglyfových stringů občas vyrobí NaN → vždy po jednotlivých glyfech
const kern = (a, b) => {
  const k = font.getKerningValue(font.charToGlyph(a), font.charToGlyph(b));
  return Number.isFinite(k) ? k * FS / font.unitsPerEm : 0; // GPOS lookup občas vrátí NaN
};
const glyphRun = (text, x, y) => {
  let cx = x, out = '';
  for (let i = 0; i < text.length; i++) {
    out += `<path d="${pathD(text[i], cx, y)}" fill="currentColor"/>`;
    cx += adv(text[i]) + (i + 1 < text.length ? kern(text[i], text[i + 1]) : 0);
  }
  return out;
};

// --- N2 konstanty (fs 258) — JEDNOTNÝ MASTER v2.1 (embroidery-first, rozhodnutí 2026-06-06) ---
const L_RAISE = 33;        // L baseline výš o 33 vůči D
const D_OFFSET = 72;       // D origin +72 od L originu (embroidery: L o 10 j. dál od D)
const KNOCKOUT = 25;       // spára (stroke-width masky) ≈ 1,8 mm při 35mm nášivce
const HALO = { dx: 64.3, dyAbove: 241, rx: 66, ry: 13, sw: 11 }; // vůči D originu/baseline (cy 77 v monogramu)

// --- výpočet posunu: střed (LD+halo) = střed e ---
const eBB = font.getPath('e', 0, 0, FS).getBoundingBox();        // y1=-157.4, y2=2.6
const eCenter = (eBB.y1 + eBB.y2) / 2;                           // -77.4
const blockTop = -(HALO.dyAbove + HALO.ry + HALO.sw / 2);        // -254.5 (vůči D baseline 0)
const blockBottom = 0;                                           // spodek D
const blockCenter = (blockTop + blockBottom) / 2;                // -127.25
const SHIFT = Math.round((eCenter - blockCenter) * 10) / 10;     // +49.9 ≈ 50 dolů
console.log('e center:', eCenter.toFixed(1), '| block center:', blockCenter.toFixed(1), '| SHIFT:', SHIFT);

// --- absolutní layout (e-baseline y=400, start x=88) ---
const B = 400, X0 = 88;
const xL = X0 + adv('e');
const xD = xL + D_OFFSET;
const xEE = xD + adv('D');
const yD = B + SHIFT;           // D baseline
const yL = yD - L_RAISE;        // L baseline
const halo = { cx: xD + HALO.dx, cy: yD - HALO.dyAbove, rx: HALO.rx, ry: HALO.ry, sw: HALO.sw };
const W = xEE + adv('ee') + X0; // šířka plátna
const r1 = (n) => Math.round(n * 10) / 10;

console.log('Layout (fs 258):');
console.log(`  e1 (${X0}, ${B}) | L (${r1(xL)}, ${r1(yL)}) | D (${r1(xD)}, ${r1(yD)}) | ee (${r1(xEE)}, ${B})`);
console.log(`  halo cx ${r1(halo.cx)} cy ${r1(halo.cy)} rx ${halo.rx} ry ${halo.ry} sw ${halo.sw}`);
console.log(`  canvas ${Math.round(W)} × …, knockout ${KNOCKOUT}`);

// --- SVG builder (varianta: shift 0 = původní L3, shift = nová) ---
function buildSvg(shift, sfx) {
  const yd = B + shift, yl = yd - L_RAISE;
  const lP = pathD('L', xL, yl);
  const dP = pathD('D', xD, yd);
  const hCy = yd - HALO.dyAbove;
  const top = hCy - HALO.ry - HALO.sw / 2 - 14;
  const bottom = Math.max(yd, B + 8) + 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${r1(top)} ${Math.round(W)} ${r1(bottom - top)}" fill="none" style="width:100%;height:auto;display:block">
    <defs><mask id="ko-${sfx}"><rect x="-100" y="-100" width="3000" height="1200" fill="white"/>
      <path d="${lP}" fill="black" stroke="black" stroke-width="${KNOCKOUT}" stroke-linejoin="round"/></mask></defs>
    ${glyphRun('e', X0, B)}
    <path d="${dP}" fill="currentColor" mask="url(#ko-${sfx})"/>
    <path d="${lP}" fill="currentColor"/>
    ${glyphRun('ee', xEE, B)}
    <ellipse cx="${r1(halo.cx)}" cy="${r1(hCy)}" rx="${HALO.rx}" ry="${HALO.ry}" stroke="${GOLD}" stroke-width="${HALO.sw}"/>
  </svg>`;
}

// pomocná verze s vodicími linkami (jen pro náhled — ukazuje osu e)
function buildSvgGuides(shift, sfx) {
  const svg = buildSvg(shift, sfx);
  const axis = B + eCenter;
  const guides = `<line x1="0" y1="${r1(axis)}" x2="${Math.round(W)}" y2="${r1(axis)}" stroke="#e0427a" stroke-width="2" stroke-dasharray="8 8" opacity="0.75"/>
    <line x1="0" y1="${B}" x2="${Math.round(W)}" y2="${B}" stroke="#888" stroke-width="1.5" stroke-dasharray="3 6" opacity="0.6"/></svg>`;
  return svg.replace('</svg>', guides);
}

const card = (title, note, builder) => `
  <section class="variant"><h2>${title}</h2><p class="note">${note}</p>
    <div class="pair">
      <div class="swatch ink">${builder('ink')}</div>
      <div class="swatch bone">${builder('bone')}</div>
    </div></section>`;

const html = `<!DOCTYPE html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>eldee — L3 fine-tune: LD v ose e</title>
<style>
  body { background:#141414; color:#F5F5F0; font-family: ui-sans-serif, system-ui, sans-serif; margin:0; padding:40px 24px 80px; }
  header { max-width:1100px; margin:0 auto 38px; } h1 { font-size:24px; margin:0 0 6px; } h1 em { color:${GOLD}; font-style:normal; }
  header p { color:#999; margin:0; font-size:14px; }
  .variant { max-width:1100px; margin:0 auto 44px; } h2 { font-size:17px; margin:0 0 4px; color:${GOLD}; }
  .note { color:#aaa; font-size:13.5px; margin:0 0 14px; max-width:760px; line-height:1.5; }
  .pair { display:grid; grid-template-columns:1fr 1fr; gap:14px; } @media (max-width:760px){ .pair { grid-template-columns:1fr; } }
  .swatch { border-radius:10px; padding:34px 30px; display:flex; align-items:center; min-height:150px; }
  .swatch svg { max-width:460px; margin:0 auto; }
  .ink { background:#0A0A0A; color:#F5F5F0; border:1px solid #2a2a2a; } .bone { background:#F5F5F0; color:#0A0A0A; }
</style></head><body>
<header><h1>eldee — L3 fine-tune: <em>LD + svatozář v ose okolních e</em></h1>
<p>Posun bloku LD+halo o ${SHIFT} j. dolů (fs 258) → střed bloku = střed malých e. Růžová čárkovaná = osa e, šedá tečkovaná = baseline.</p></header>
${card('PŘED — L3 původní (D na baseline)', 'LD+halo sedí na baseline s e — blok je opticky vysoko, těžiště nad osou slova.', (s) => buildSvg(0, 'pred-' + s))}
${card(`PO — LD+halo v ose e (D −${SHIFT} j. pod baseline)`, `Celý blok (L, D i svatozář) posunut o ${SHIFT} j. dolů. Střed LD+halo = střed e (osa slova). D podsedá pod baseline.`, (s) => buildSvg(SHIFT, 'po-' + s))}
${card('PO — s vodicími linkami', 'Kontrola: růžová osa prochází středem e i středem bloku LD+halo.', (s) => buildSvgGuides(SHIFT, 'gd-' + s))}
</body></html>`;

await writeFile(`${OUT_DIR}/l3-finetune.html`, html);

// --- prompt pro Claude Design ---
const prompt = `# Claude Design — zadání: wordmark „eldee" v2 (finální lockup L3)

> Zkopíruj do appky Claude Design (projekt „eldee logo"). Appka ignoruje relativní pokyny —
> všechno níže je v absolutních souřadnicích. Jednotky = stejný systém jako finální monogram N2 (font-size 258).

## Co stavíme

Wordmark **eldee** = master logo. Uprostřed slova je vnořený interlock monogram LD (přesně N2 geometrie),
malá písmena „e" okolo. Celý blok **LD + svatozář je vycentrovaný na horizontální osu malých e** —
D proto podsedá ${SHIFT} jednotek pod baseline.

⚠️ **Zápis je vždy „eldee" — nikdy „eldée"** (žádný akcent, žádná diakritika).

## Plátno

- Šířka ${Math.round(W)} × výška 640 jednotek, obsah horizontálně na střed
- Font: **Big Shoulders Display, weight 900 (Black)**, font-size **258**, žádný sklon (0°)

## Absolutní souřadnice (origin = levý okraj glyfu na baseline)

| Prvek | x | baseline y | Poznámka |
|---|---|---|---|
| e (první) | ${X0} | ${B} | malé písmeno |
| **L** | ${r1(xL)} | **${r1(yL)}** | kapitálka, baseline ${L_RAISE} j. NAD baseline D |
| **D** | ${r1(xD)} | **${r1(yD)}** | kapitálka, baseline ${SHIFT} j. POD baseline e |
| ee (koncové) | ${r1(xEE)} | ${B} | malá písmena, baseline = první e |

## Interlock LD (převzato 1:1 z monogramu N2 — NEMĚNIT)

- L proniká přes levou část D, **knockout spára ${KNOCKOUT} j.** kolem celého L (spára = průhledná / barva pozadí)
- L i D stejná velikost i tloušťka tahu (stejný font-size 258)

## Svatozář (zlatý prsten)

- Elipsa: **cx ${r1(halo.cx)} · cy ${r1(halo.cy)} · rx ${halo.rx} · ry ${halo.ry} · tloušťka tahu ${halo.sw}**, jen obrys (žádná výplň)
- Barva **#C9A227**
- (Odvození: cy = baseline D − ${HALO.dyAbove}; spodní okraj prstenu 0,5 V nad horní hranou D — stejně jako monogram)

## Kontrolní osa (pro ověření v appce)

- Osa malých e: **y = ${r1(B + eCenter)}** (střed mezi vrškem a spodkem písmene e)
- Střed bloku LD+svatozář musí ležet na téže ose: (vršek svatozáře ${r1(halo.cy - HALO.ry - HALO.sw / 2)} + spodek D ${r1(yD)}) / 2 = ${r1((halo.cy - HALO.ry - HALO.sw / 2 + yD) / 2)} ✅

## Barvy a artboardy (4×)

| Artboard | Pozadí | Písmena | Svatozář |
|---|---|---|---|
| 1 — primary dark | #0A0A0A | #F5F5F0 | #C9A227 |
| 2 — primary light | #F5F5F0 | #0A0A0A | #C9A227 |
| 3 — mono white | transparent/tmavé | #F5F5F0 | #F5F5F0 |
| 4 — mono black | transparent/světlé | #0A0A0A | #0A0A0A |

## Checklist před exportem

- [ ] Zápis „eldee" (zkontrolovat všechny artboardy — žádné „eldée")
- [ ] Spára kolem L jednotná ${KNOCKOUT} j., průhledná (ne bílá výplň)
- [ ] L a D stejná tloušťka tahu jako malá e (jeden font-size)
- [ ] Svatozář přesně dle souřadnic, jen u barevných verzí zlatá
- [ ] Export: standalone HTML (jako u monogramu N2)
`;

// Zadání pro Claude Design se už negeneruje — plná verze je ručně udržovaná
// v claude-design-zadani-wordmark.md (2026-06-06). `prompt` zůstává jen pro referenci.
void prompt;
console.log(`\nHotovo:\n  ${OUT_DIR}/l3-finetune.html`);
