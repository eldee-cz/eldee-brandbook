// Generuje SOLO wordmark — „eldee" na křivkách, bez monogramu a bez svatozáře.
// Jediná verze wordmarku BEZ svatozáře (každý jiný wordmark i monogram ji obsahuje).
// Výstup: public/logo/solo/ — 4 barvy samostatně + 6 variant na podkladu.
//
// ⚠️ PROČ TENHLE SKRIPT EXISTUJE: soubory z 30. 6. 2026 (commit 7b9f06c) vznikly
// bez generátoru a měly v path 18× `NaN` — prohlížeč path zpracuje jen do prvního
// neplatného tokenu, takže z „eldee" zůstalo vykreslené jen první „e". Glyf „l"
// měl NaN dokonce ve všech souřadnicích.
//
// ⚠️ PAST: opentype.js (ESM dist) vrací NaN z `toPathData()` i z kerning lookupu,
// hlavně u víceglyfových stringů. Proto:
//   · vlastní serializace `path.commands` místo toPathData()
//   · glyfy sázené JEDNOTLIVĚ, každý na vlastní x
//   · `throw` při jakémkoliv NaN — soubor se nesmí uložit rozbitý
// Stejnou pastí si prošly generate-wordmark.mjs i generate-l3-finetune.mjs.
//
// Geometrie je zpětně zkalibrovaná na původní soubory (nepoškozený první glyf
// „e" znak za znak): font-size 200, letter-spacing −0.02em = −4 px, BEZ kerningu.
// Kerning se schválně nepoužívá — původní soubory ho nemají a solo logo je
// brand asset, jehož rozteče se nesmějí změnit.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import wawoff from 'wawoff2';
import opentype from 'opentype.js';

const WOFF2_PATH = 'public/fonts/BigShouldersDisplay-Black.woff2';
const OUT_DIR = 'public/logo/solo';
const TEXT = 'eldee';
const FS = 200;
const LETTER_SPACING = -0.02 * FS; // −4 px, viz komentář v původních souborech
const PAD = 9.72;                  // zachovává původní viewBox (bbox 6,5 / −160 → −3,22 / −169,72)

const BARVY = { ink: '#0A0A0A', bone: '#F5F5F0', blood: '#B91C1C', gold: '#C9A227' };

console.log('Loading font...');
const woff2 = await readFile(WOFF2_PATH);
const ttf = Buffer.from(await wawoff.decompress(new Uint8Array(woff2)));
const font = opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));

// Dvě desetinná místa vždy a žádná mezera před minusem — formát původních souborů.
const rr = (n) => {
  if (!Number.isFinite(n)) throw new Error(`nekonečné/NaN číslo v path: ${n}`);
  return n.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};
// Mezera před číslem se vynechává jen tehdy, když číslo začíná minusem —
// ten sám odděluje. ⚠️ Rozhoduje znaménko TOHO čísla, které se přidává, ne
// sousedního: při prvním pokusu jsem porovnával špatné a vzniklo „Q151.5 2144.75"
// místo „Q151.5 2 144.75". Soubor by neobsahoval NaN, a přesto by byl rozbitý.
const spoj = (...cisla) => cisla
  .map((n, i) => {
    const s = rr(n);
    return i === 0 || s.startsWith('-') ? s : ` ${s}`;
  })
  .join('');

const serialize = (path) => {
  const out = [];
  let px = null, py = null;
  for (const c of path.commands) {
    switch (c.type) {
      case 'M': out.push(`M${spoj(c.x, c.y)}`); px = c.x; py = c.y; break;
      // font.getPath() vkládá za M ještě L na tentýž bod — nic nekreslí
      case 'L': if (c.x === px && c.y === py) break; out.push(`L${spoj(c.x, c.y)}`); px = c.x; py = c.y; break;
      case 'C': out.push(`C${spoj(c.x1, c.y1, c.x2, c.y2, c.x, c.y)}`); px = c.x; py = c.y; break;
      case 'Q': out.push(`Q${spoj(c.x1, c.y1, c.x, c.y)}`); px = c.x; py = c.y; break;
      case 'Z': out.push('Z'); break;
      default: throw new Error(`neznámý command ${c.type}`);
    }
  }
  return out.join('');
};

const advance = (ch) => font.charToGlyph(ch).advanceWidth / font.unitsPerEm * FS;

// Sazba po jednotlivých glyfech — víceglyfový getPath() je právě ta past s NaN.
let x = 0;
const dily = [];
const bbox = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
for (const ch of TEXT) {
  const p = font.getPath(ch, x, 0, FS);
  const d = serialize(p);
  if (d.includes('NaN')) throw new Error(`NaN v path glyfu „${ch}" na x=${x}`);
  const b = p.getBoundingBox();
  for (const v of [b.x1, b.y1, b.x2, b.y2]) {
    if (!Number.isFinite(v)) throw new Error(`NaN v bbox glyfu „${ch}"`);
  }
  bbox.x1 = Math.min(bbox.x1, b.x1); bbox.y1 = Math.min(bbox.y1, b.y1);
  bbox.x2 = Math.max(bbox.x2, b.x2); bbox.y2 = Math.max(bbox.y2, b.y2);
  dily.push(d);
  x += advance(ch) + LETTER_SPACING;
}

const D = dily.join('');
if (D.includes('NaN')) throw new Error('NaN ve výsledné path — soubor se neuloží');

const vb = {
  x: +(bbox.x1 - PAD).toFixed(2),
  y: +(bbox.y1 - PAD).toFixed(2),
  w: +(bbox.x2 - bbox.x1 + 2 * PAD).toFixed(2),
  h: +(bbox.y2 - bbox.y1 + 2 * PAD).toFixed(2),
};
const viewBox = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;

const POZNAMKA = 'eldee SOLO wordmark - Big Shoulders Display Black, "eldee" na krivkach, letter-spacing -.02em. Bez monogramu, bez svatozare.';

const svgSolo = (barva) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">
  <!-- ${POZNAMKA} -->
  <path d="${D}" fill="${barva}"/>
</svg>
`;

const svgNaPodkladu = (barva, podklad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">
  <!-- ${POZNAMKA} -->
  <rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="${podklad}"/>
  <path d="${D}" fill="${barva}"/>
</svg>
`;

await mkdir(OUT_DIR, { recursive: true });

const soubory = [];
for (const [jm, hex] of Object.entries(BARVY)) {
  soubory.push([`wordmark-solo-${jm}.svg`, svgSolo(hex)]);
}
// Kombinace, které měly původní soubory — jen čitelné páry.
for (const [pismo, podklad] of [
  ['blood', 'bone'], ['bone', 'blood'], ['bone', 'ink'],
  ['gold', 'ink'], ['ink', 'bone'], ['ink', 'gold'],
]) {
  soubory.push([`wordmark-solo-${pismo}-on-${podklad}.svg`, svgNaPodkladu(BARVY[pismo], BARVY[podklad])]);
}

for (const [jmeno, obsah] of soubory) {
  if (obsah.includes('NaN')) throw new Error(`NaN v ${jmeno} — neukládám`);
  await writeFile(`${OUT_DIR}/${jmeno}`, obsah);
}

console.log(`Solo wordmark vygenerován (viewBox ${viewBox}, ${soubory.length} souborů):`);
for (const [jmeno] of soubory) console.log(`  - ${OUT_DIR}/${jmeno}`);
