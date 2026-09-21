// Stáhne Google Fonts jako WOFF2 do public/fonts/.
//
// ⚠️ 21. 9. 2026 — PŘEPSÁNO. Původní verze brala z Google Fonts CSS *poslední*
// @font-face blok s komentářem „latin je vždycky poslední, tím se vyhneme malému
// latin-ext subsetu". To byl omyl, který stál celou knihu českou diakritiku:
// Google font NEDĚLÍ na „velký latin a malý latin-ext", ale na několik souborů
// podle unicode-range — a české č ď ě ň ř š ť ů ž žijí v latin-ext. Stažením
// jen latinu měla všech 5 písem knihy díru přesně v těch znacích, které čeština
// potřebuje nejvíc, a prohlížeč je znak po znaku nahrazoval systémovým písmem.
//
// Teď se stahuje TTF (obecné UA → Google vrátí nedělený soubor s celou sadou)
// a komprimuje se na WOFF2 přes wawoff2, který už v projektu je. Soubory jsou
// proto o něco větší než subsetované, ale mají kompletní češtinu.
//
// Na konci se pokrytí ověří — když by některému písmu čeština chyběla, skript
// spadne a soubor nezapíše. Tichá regrese se tak nemůže opakovat.
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import wawoff from 'wawoff2';
import opentype from 'opentype.js';

const FAMILIES = [
  { family: 'Big+Shoulders+Display', weight: 900, filename: 'BigShouldersDisplay-Black.woff2' },
  { family: 'Space+Grotesk',         weight: 400, filename: 'SpaceGrotesk-Regular.woff2' },
  { family: 'Space+Grotesk',         weight: 500, filename: 'SpaceGrotesk-Medium.woff2' },
  { family: 'Space+Grotesk',         weight: 700, filename: 'SpaceGrotesk-Bold.woff2' },
  { family: 'Caveat+Brush',          weight: 400, filename: 'CaveatBrush-Regular.woff2' },
  { family: 'JetBrains+Mono',        weight: 400, filename: 'JetBrainsMono-Regular.woff2' },
];

/** Znaky, bez kterých je písmo pro českou sazbu nepoužitelné. */
const CESTINA = 'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ';

const OUT = 'public/fonts';
if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

// Obecné UA (ne prohlížečové): Google vrátí TTF s celou znakovou sadou,
// ne woff2 rozřezané podle unicode-range.
const UA = 'curl/8.0';

for (const f of FAMILIES) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${f.family}:wght@${f.weight}&subset=latin,latin-ext`;
  console.log(`Resolving ${f.filename}...`);
  const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
  if (!cssRes.ok) throw new Error(`CSS fetch failed for ${f.family}: ${cssRes.status}`);
  const css = await cssRes.text();

  const blok = css.split('@font-face').slice(1).find((b) => {
    const w = (b.match(/font-weight:\s*(\d+)/) || [])[1];
    return !w || Number(w) === f.weight;
  });
  const url = blok && (blok.match(/url\(([^)]+)\)/) || [])[1];
  if (!url) throw new Error(`No font url found for ${f.family} ${f.weight}`);

  const fontRes = await fetch(url);
  if (!fontRes.ok) throw new Error(`Font fetch failed for ${f.filename}: ${fontRes.status}`);
  const ttf = Buffer.from(await fontRes.arrayBuffer());

  // Kontrola PŘED zápisem — rozbitý font se do repa nedostane.
  const font = opentype.parse(Uint8Array.from(ttf).buffer);
  const chybi = [...CESTINA].filter((ch) => font.charToGlyph(ch).index === 0);
  if (chybi.length) {
    throw new Error(`${f.filename}: v písmu chybí české znaky ${chybi.join(' ')} — nezapisuju.`);
  }

  const woff2 = Buffer.from(await wawoff.compress(ttf));
  await writeFile(`${OUT}/${f.filename}`, woff2);
  console.log(`  → ${f.filename}: ${woff2.length} B, čeština kompletní (${font.numGlyphs} glyfů)`);
}
console.log('Hotovo. Všechna písma mají kompletní českou diakritiku.');
console.log('⚠️ Po výměně písem zvyš ?v= v src/styles/fonts.css — jinak si vrácení');
console.log('   návštěvníci nechají starý soubor (Vercel posílá immutable na rok).');
