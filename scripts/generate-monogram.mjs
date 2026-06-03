// Generuje LD monogram (path-based) z fontu Big Shoulders Display Black.
// Proč path, ne <text>: v <img src="..."> se webfont NENAČTE → <text> by se nevykreslil.
// Vektorizujeme glyphy 'L' a 'D' přes opentype.js (font dekódujeme z WOFF2 přes wawoff2).
//
// Schválená geometrie (zdroj: 07-eldee-business/brand/ld-final-{brand,embroidery}.svg):
//   viewBox 0 0 320 420
//   D: font-size 310, baseline y=380, vycentrované na x=205
//   L: font-size 310 (stejná velikost i tloušťka jako D), baseline y=331 ("L mírně níž"), vycentrované na x=118
//   Svatozář (brand): tenký zlatý prsten (ellipse) nad D
//   Svatozář (embroidery): plný zlatý ovál
//
// Knockout (mezera mezi L a D):
//   Brand book ukazuje logo na světlém I tmavém pozadí, takže knockout NESMÍ být pevná barva.
//   Řešíme PRŮHLEDNOU mezerou přes SVG <mask>: D je pod maskou, která má díru ve tvaru
//   rozšířeného L (L glyph + tlustý obrys). V místě překryvu tak prosvítá pozadí.
//   L se vykreslí navrch plně. Výsledek = currentColor cesty → LogoVariant nastaví barvu dle pozadí.

import { readFile, writeFile } from 'node:fs/promises';
import wawoff from 'wawoff2';
import opentype from 'opentype.js';

const WOFF2_PATH = 'public/fonts/BigShouldersDisplay-Black.woff2';

const VIEWBOX = '0 0 320 420';
const FONT_SIZE = 310;

// Pozice baseline + horizontální střed (dle schválené geometrie)
const D = { char: 'D', size: FONT_SIZE, baselineY: 380, centerX: 205 };
const L = { char: 'L', size: FONT_SIZE, baselineY: 331, centerX: 118 };

// Svatozář
const HALO_BRAND = { cx: 205, cy: 78, rx: 62, ry: 14, strokeWidth: 9 };       // prsten
const HALO_EMBROIDERY = { cx: 205, cy: 78, rx: 58, ry: 15 };                  // plný ovál

// Knockout šířky (poloměr obrysu kolem L, který se "vykousne" z D)
const KNOCKOUT_BRAND = 8;        // tenká čistá mezera (digital)
const KNOCKOUT_EMBROIDERY = 18;  // širší mezera (tenká by se při vyšití slila)
const D_BOLDEN_EMBROIDERY = 6;   // mírné ztučnění D (žádné tenké místo na niti)

const GOLD = '#C9A227';

console.log('Loading WOFF2...');
const woff2 = await readFile(WOFF2_PATH);

console.log('Decompressing to TTF...');
const ttfBytes = await wawoff.decompress(new Uint8Array(woff2));
const ttfBuf = Buffer.from(ttfBytes);

console.log('Parsing font...');
const font = opentype.parse(ttfBuf.buffer.slice(ttfBuf.byteOffset, ttfBuf.byteOffset + ttfBuf.byteLength));
console.log('Font loaded:', font.names.fontFamily?.en, font.names.fontSubfamily?.en);

// Vrátí { path: pathData, width } pro daný znak, vycentrovaný horizontálně na centerX,
// s baseline na baselineY.
function glyphPath({ char, size, baselineY, centerX }) {
  const advance = font.getAdvanceWidth(char, size);
  // getPath umístí glyph tak, že (x, y) = počátek baseline vlevo.
  // Pro vycentrování: x = centerX - advance/2
  const x = centerX - advance / 2;
  const p = font.getPath(char, x, baselineY, size);
  return { path: p.toPathData(2), advance };
}

const dGlyph = glyphPath(D);
const lGlyph = glyphPath(L);
console.log(`D advance: ${dGlyph.advance.toFixed(1)}, L advance: ${lGlyph.advance.toFixed(1)}`);

// Pozn. k barvě: SVG načtené přes <img src> NEDĚDÍ CSS `color` z parent stránky,
// takže `currentColor` by spadl na default (černá) a na tmavém pozadí by logo zmizelo.
// LogoVariant vkládá monogram právě přes <img> a jen na TMAVÝCH pozadích (ink, blood).
// Řešení: cesty necháme `currentColor` (dle brand specifikace, přebije se při inline vložení
// nastavením `color`), ale na root <svg> dáme `color="#F5F5F0"` (bone) jako default →
// přes <img> se vykreslí světle a je čitelné na tmavém pozadí. Svatozář zůstává gold.
const DEFAULT_INK_COLOR = '#F5F5F0';

// ---------- BRAND verze ----------
// currentColor písmena (default bone), zlatý prsten. Knockout přes mask.
const brandSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none" color="${DEFAULT_INK_COLOR}">
  <!-- eldee LD monogram — BRAND (digital). Path-based (vektorizovaný Big Shoulders Display Black). -->
  <!-- Písmena = currentColor (default bone, přes color na <svg>) → viditelné na tmavém i přes <img>. -->
  <!-- Při inline vložení a nastavení CSS color se barva přebije. Svatozář = gold prsten. -->
  <!-- Knockout mezi L a D = PRŮHLEDNÁ mezera (mask), prosvítá pozadí → čitelné na světlém i tmavém. -->
  <defs>
    <mask id="ld-knockout-brand" maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="420">
      <rect x="0" y="0" width="320" height="420" fill="white"/>
      <!-- díra ve tvaru rozšířeného L (glyph + tlustý obrys) -->
      <path d="${lGlyph.path}" fill="black" stroke="black" stroke-width="${KNOCKOUT_BRAND * 2}" stroke-linejoin="round"/>
    </mask>
  </defs>
  <!-- D s vykousnutým L -->
  <path d="${dGlyph.path}" fill="currentColor" mask="url(#ld-knockout-brand)"/>
  <!-- L navrch -->
  <path d="${lGlyph.path}" fill="currentColor"/>
  <!-- Svatozář: tenký zlatý prsten nad D -->
  <ellipse cx="${HALO_BRAND.cx}" cy="${HALO_BRAND.cy}" rx="${HALO_BRAND.rx}" ry="${HALO_BRAND.ry}" fill="none" stroke="${GOLD}" stroke-width="${HALO_BRAND.strokeWidth}"/>
</svg>
`;

// ---------- EMBROIDERY verze (mono) ----------
// Pro vyšívání: širší knockout, plný ovál svatozáře, mírně ztučněné D.
const embroiderySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none" color="${DEFAULT_INK_COLOR}">
  <!-- eldee LD monogram — EMBROIDERY (na vyšití). Path-based, jednobarevné (currentColor, default bone). -->
  <!-- ROZDÍLY proti brand: širší knockout (tenká mezera by se nití slila), plný ovál svatozáře, ztučněné D. -->
  <defs>
    <mask id="ld-knockout-mono" maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="420">
      <rect x="0" y="0" width="320" height="420" fill="white"/>
      <path d="${lGlyph.path}" fill="black" stroke="black" stroke-width="${KNOCKOUT_EMBROIDERY * 2}" stroke-linejoin="round"/>
    </mask>
  </defs>
  <!-- D ztučněné (fill + stroke v currentColor) s vykousnutým L -->
  <path d="${dGlyph.path}" fill="currentColor" stroke="currentColor" stroke-width="${D_BOLDEN_EMBROIDERY}" stroke-linejoin="round" mask="url(#ld-knockout-mono)"/>
  <!-- L navrch (taktéž mírně ztučněné kvůli konzistenci tahů) -->
  <path d="${lGlyph.path}" fill="currentColor" stroke="currentColor" stroke-width="${D_BOLDEN_EMBROIDERY}" stroke-linejoin="round"/>
  <!-- Svatozář: PLNÝ zlatý ovál nad D -->
  <ellipse cx="${HALO_EMBROIDERY.cx}" cy="${HALO_EMBROIDERY.cy}" rx="${HALO_EMBROIDERY.rx}" ry="${HALO_EMBROIDERY.ry}" fill="${GOLD}"/>
</svg>
`;

await writeFile('public/logo/monogram-ld.svg', brandSvg);
await writeFile('public/logo/monogram-mono.svg', embroiderySvg);

console.log('\nMonogramy vygenerovány:');
console.log('  - public/logo/monogram-ld.svg   (brand, currentColor + gold prsten)');
console.log('  - public/logo/monogram-mono.svg (embroidery, plný ovál, širší knockout)');
