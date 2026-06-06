// Generuje NÁVRHY lockup/wordmark v2 — 8 variant pro Lukášův výběr.
// Geometrie interlocku převzata z monogramu v2 (N2): D(118,318) L(56,285) fs 258,
// knockout spára 20 j., halo cx 182,3 / cy 79,5 / rx 66 / ry 12,5 / tah 7.
// Výstup: brand/lockup-navrhy/prehled.html (inline SVG, ink + bone karty).
// Spouštět z eldee-brandbook/ (kvůli node_modules + fonts).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import wawoff from 'wawoff2';
import opentype from 'opentype.js';

const WOFF2_PATH = 'public/fonts/BigShouldersDisplay-Black.woff2';
const OUT_DIR = '/Users/lukashledik/Documents/Claude-code/07-eldee-business/brand/lockup-navrhy';
const MONOGRAM_PATH = 'public/logo/monogram-ld.svg';
const GOLD = '#C9A227';

const FS = 96;                 // font-size wordmarku
const S = FS / 258;            // scale z monogramu N2 (fs 258) na wordmark
const N2 = {
  dRaise: 33 * S,              // L baseline výš o 33 j. (318-285)
  dOffset: 62 * S,             // D origin +62 j. od L originu (118-56)
  knockout: 20 * S,            // spára (stroke-width na masce)
  halo: {                      // relativně k D originu (x=118) a baseline (y=318)
    dx: (182.3 - 118) * S,
    dyAbove: (318 - 79.5) * S,
    rx: 66 * S, ry: 12.5 * S, sw: 7 * S,
  },
};

console.log('Loading font...');
const woff2 = await readFile(WOFF2_PATH);
const ttfBytes = await wawoff.decompress(new Uint8Array(woff2));
const ttfBuf = Buffer.from(ttfBytes);
const font = opentype.parse(ttfBuf.buffer.slice(ttfBuf.byteOffset, ttfBuf.byteOffset + ttfBuf.byteLength));
console.log('Font:', font.names.fontFamily?.en, font.names.fontSubfamily?.en);

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
const bboxOf = (t, x, y) => font.getPath(t, x, y, FS).getBoundingBox();
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

const B = 100; // baseline

// ---------- stavební bloky ----------

// Interlock LD (N2 geometrie) na baseline B, L origin na xL. Vrací {markup, advEnd, haloCx}
function interlockLD(xL, idSuffix) {
  const xD = xL + N2.dOffset;
  const lPath = pathD('L', xL, B - N2.dRaise);
  const dPath = pathD('D', xD, B);
  const maskId = `ko-${idSuffix}`;
  const markup = `
    <defs><mask id="${maskId}"><rect x="-50" y="-50" width="2000" height="400" fill="white"/>
      <path d="${lPath}" fill="black" stroke="black" stroke-width="${N2.knockout.toFixed(2)}" stroke-linejoin="round"/></mask></defs>
    <path d="${dPath}" fill="currentColor" mask="url(#${maskId})"/>
    <path d="${lPath}" fill="currentColor"/>`;
  return { markup, advEnd: xD + adv('D'), haloCx: xD + N2.halo.dx };
}

function haloMarkup(cx) {
  const { dyAbove, rx, ry, sw } = N2.halo;
  return `<ellipse cx="${cx.toFixed(1)}" cy="${(B - dyAbove).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${GOLD}" stroke-width="${sw.toFixed(2)}"/>`;
}

function svgWrap(inner, w, h, x0 = 0, y0 = 0) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" fill="none" style="width:100%;height:auto;display:block">${inner}</svg>`;
}

// ---------- varianty ----------

const variants = [];

// V0 — reference: současný wordmark v1 (italika)
{
  const wordPath = pathD('eLDee', 5, B);
  const w = adv('eLDee') + 25;
  variants.push({
    id: 'v0', label: 'V0 · Reference — současný wordmark v1',
    note: 'eLDee, italika −8°, oddělená písmena. Jen pro porovnání — tohle dnes visí v brandbooku.',
    build: (sfx) => svgWrap(`<g transform="skewX(-8) translate(14,0)"><path d="${wordPath}" fill="currentColor"/></g>`, w, 120, 0, B - 90),
  });
}

// A1 — eLDee upright + interlock, bez halo
{
  const e1 = pathD('e', 0, B);
  const ld = (sfx) => interlockLD(adv('e'), `a1-${sfx}`);
  const tail = (x) => glyphRun('ee', x, B);
  const probe = interlockLD(adv('e'), 'probe');
  const w = probe.advEnd + adv('ee') + 10;
  variants.push({
    id: 'a1', label: 'A1 · eLDee upright + interlock LD',
    note: 'Wordmark srovnaný s monogramem v2: bez italiky, L proniká D s knockout spárou, L mírně zvednuté (N2 geometrie). Monogram je doslova uvnitř slova.',
    build: (sfx) => { const k = ld(sfx); return svgWrap(`<path d="${e1}" fill="currentColor"/>${k.markup}${tail(k.advEnd)}`, w, 125, -3, B - 95); },
  });
}

// A2 — A1 + zlaté halo nad D
{
  const e1 = pathD('e', 0, B);
  const probe = interlockLD(adv('e'), 'probe2');
  const w = probe.advEnd + adv('ee') + 10;
  variants.push({
    id: 'a2', label: 'A2 · eLDee upright + interlock + halo',
    note: 'Jako A1, navíc zlatá svatozář nad D — plný přenos monogramu v2 do wordmarku. Hero verze („Holy Socks").',
    build: (sfx) => { const k = interlockLD(adv('e'), `a2-${sfx}`); return svgWrap(`<path d="${e1}" fill="currentColor"/>${k.markup}${glyphRun('ee', k.advEnd, B)}${haloMarkup(k.haloCx)}`, w, 125, -3, B - 95); },
  });
}

// B1 — čisté lowercase eldee
{
  const p = pathD('eldee', 0, B);
  const w = adv('eldee') + 10;
  variants.push({
    id: 'b1', label: 'B1 · čisté „eldee" lowercase',
    note: 'Bez LD kapitálek — maximální čitelnost a klid. LD příběh nese jen monogram. Vazba wordmark ↔ monogram slabší.',
    build: () => svgWrap(`<path d="${p}" fill="currentColor"/>`, w, 115, -3, B - 90),
  });
}

// B2 — lowercase eldee s interlockem l→d (knockout spára)
{
  const OVERLAP = adv('l') * 0.45;   // d posunuté doleva, l proniká do bříška d
  const xL = adv('e');
  const xD = xL + adv('l') - OVERLAP;
  const lPath = pathD('l', xL, B);
  const dP = pathD('d', xD, B);
  const e1 = pathD('e', 0, B);
  const w = xD + adv('d') + adv('ee') + 10;
  variants.push({
    id: 'b2', label: 'B2 · lowercase „eldee" + interlock l→d',
    note: 'Subtilní verze interlocku: malé l proniká do bříška d se spárou. Decentní signature, na malých velikostech může spára zanikat.',
    build: (sfx) => svgWrap(`
      <defs><mask id="ko-b2-${sfx}"><rect x="-50" y="-50" width="2000" height="400" fill="white"/>
        <path d="${lPath}" fill="black" stroke="black" stroke-width="${N2.knockout.toFixed(2)}" stroke-linejoin="round"/></mask></defs>
      <path d="${e1}" fill="currentColor"/>
      <path d="${dP}" fill="currentColor" mask="url(#ko-b2-${sfx})"/>
      <path d="${lPath}" fill="currentColor"/>
      ${glyphRun('ee', xD + adv('d'), B)}`, w, 115, -3, B - 90),
  });
}

// ---------- lockupy s monogramem v2 ----------

const monogramRaw = await readFile(MONOGRAM_PATH, 'utf8');
const monogramInner = (sfx) => monogramRaw
  .replace(/^[\s\S]*?<defs>/, '<defs>')
  .replace(/<\/svg>\s*$/, '')
  .replaceAll('ld-knockout-brand', `ld-knockout-${sfx}`);
// monogram viewBox: 3.2 46 301.5 301.5
const MONO = { x: 3.2, y: 46, size: 301.5 };

// L1 — horizontální: monogram vlevo + lowercase eldee vpravo
{
  const H = 120;                       // cílová výška monogramu
  const ms = H / MONO.size;
  const wordP = pathD('eldee', 0, B);
  const bb = bboxOf('eldee', 0, B);
  const wordH = bb.y2 - bb.y1;
  const monoTop = (bb.y1 + bb.y2) / 2 - H / 2;  // vertikální centr na střed wordmarku
  const gap = 34;
  const wordX = H * (MONO.size / MONO.size) * 0 + H + gap; // šířka monogramu ≈ H (čtverec)
  const w = wordX + adv('eldee') + 10;
  variants.push({
    id: 'l1', label: 'L1 · Horizontální lockup — monogram + „eldee"',
    note: 'Klasika (Lacoste, Patagonia): monogram v2 vlevo, čisté lowercase vpravo. Funguje s wordmarkem B1 (s A1/A2 by LD bylo dvakrát).',
    build: (sfx) => svgWrap(`
      <g transform="translate(${(-MONO.x * ms).toFixed(1)},${(monoTop - MONO.y * ms).toFixed(1)}) scale(${ms.toFixed(4)})">${monogramInner(`l1-${sfx}`)}</g>
      <g transform="translate(${wordX},0)"><path d="${wordP}" fill="currentColor"/></g>`, w, 150, -3, monoTop - 8),
  });
}

// L2 — stacked: monogram nahoře, lowercase eldee pod ním
{
  const H = 150;
  const ms = H / MONO.size;
  const wordW = adv('eldee');
  const totalW = Math.max(H, wordW) + 20;
  const monoX = (totalW - H) / 2;
  const wordX = (totalW - wordW) / 2;
  const wordBase = H + 80;
  const wordP = pathD('eldee', 0, 0);
  variants.push({
    id: 'l2', label: 'L2 · Vertikální lockup (stacked)',
    note: 'Monogram nad wordmarkem, na střed. Pro hangtag, krabičku, etiketu. Stejná výhrada — počítá s čistým lowercase wordmarkem.',
    build: (sfx) => svgWrap(`
      <g transform="translate(${(monoX - MONO.x * ms).toFixed(1)},${(-MONO.y * ms).toFixed(1)}) scale(${ms.toFixed(4)})">${monogramInner(`l2-${sfx}`)}</g>
      <g transform="translate(${wordX},${wordBase})"><path d="${wordP}" fill="currentColor"/></g>`, totalW, wordBase + 18, 0, -8),
  });
}

// L3 — „wordmark = lockup": A2 solo (vnořený monogram, žádná duplikace)
{
  const e1 = pathD('e', 0, B);
  const probe = interlockLD(adv('e'), 'probe3');
  const w = probe.advEnd + adv('ee') + 10;
  variants.push({
    id: 'l3', label: 'L3 · Wordmark = lockup (A2 samostatně)',
    note: 'Žádná kombinace není potřeba: master = wordmark s vnořeným interlockem + halo, sub-mark = monogram solo (výšivka, favicon, avatar). Architektura bez duplikace LD.',
    build: (sfx) => { const k = interlockLD(adv('e'), `l3-${sfx}`); return svgWrap(`<path d="${e1}" fill="currentColor"/>${k.markup}${glyphRun('ee', k.advEnd, B)}${haloMarkup(k.haloCx)}`, w, 125, -3, B - 95); },
  });
}

// ---------- HTML přehled ----------

const card = (v) => `
  <section class="variant">
    <h2>${v.label}</h2>
    <p class="note">${v.note}</p>
    <div class="pair">
      <div class="swatch ink">${v.build('ink')}</div>
      <div class="swatch bone">${v.build('bone')}</div>
    </div>
  </section>`;

const html = `<!DOCTYPE html>
<html lang="cs"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>eldee — návrhy wordmark + lockup v2</title>
<style>
  :root { --ink:#0A0A0A; --bone:#F5F5F0; --gold:${GOLD}; }
  body { background:#141414; color:var(--bone); font-family: ui-sans-serif, system-ui, sans-serif; margin:0; padding:40px 24px 80px; }
  header { max-width:1100px; margin:0 auto 38px; }
  h1 { font-size:26px; margin:0 0 6px; } h1 em { color:var(--gold); font-style:normal; }
  header p { color:#999; margin:0; font-size:14px; line-height:1.5; }
  .variant { max-width:1100px; margin:0 auto 44px; }
  h2 { font-size:17px; margin:0 0 4px; color:var(--gold); }
  .note { color:#aaa; font-size:13.5px; line-height:1.5; margin:0 0 14px; max-width:760px; }
  .pair { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  @media (max-width:760px){ .pair { grid-template-columns:1fr; } }
  .swatch { border-radius:10px; padding:34px 30px; display:flex; align-items:center; justify-content:center; min-height:150px; }
  .swatch svg { max-width:430px; }
  .ink  { background:var(--ink);  color:var(--bone); border:1px solid #2a2a2a; }
  .bone { background:var(--bone); color:var(--ink); }
</style></head>
<body>
<header>
  <h1>eldee — návrhy <em>wordmark + lockup v2</em></h1>
  <p>Zápis potvrzen: <strong>eldee</strong> (bez akcentu). Geometrie interlocku převzata 1:1 z monogramu v2 (N2). Každá varianta na ink ${'#'}0A0A0A a bone ${'#'}F5F5F0. Vyber 1–2 favority + co změnit — pak jdeme do micro-iterací.</p>
</header>
${variants.map(card).join('\n')}
</body></html>`;

await mkdir(OUT_DIR, { recursive: true });
await writeFile(`${OUT_DIR}/prehled.html`, html);
console.log(`\nHotovo: ${OUT_DIR}/prehled.html (${variants.length} variant)`);
