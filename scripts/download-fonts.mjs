// Stáhne Google Fonts jako WOFF2 do public/fonts/.
// Robust path: dynamically resolves font URL z Google Fonts CSS API (URLs se mění)
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const FAMILIES = [
  { family: 'Big+Shoulders+Display', weight: 900, ital: 0, filename: 'BigShouldersDisplay-Black.woff2' },
  { family: 'Space+Grotesk',         weight: 400, ital: 0, filename: 'SpaceGrotesk-Regular.woff2' },
  { family: 'Space+Grotesk',         weight: 500, ital: 0, filename: 'SpaceGrotesk-Medium.woff2' },
  { family: 'Space+Grotesk',         weight: 700, ital: 0, filename: 'SpaceGrotesk-Bold.woff2' },
  { family: 'Caveat+Brush',          weight: 400, ital: 0, filename: 'CaveatBrush-Regular.woff2' },
  { family: 'JetBrains+Mono',        weight: 400, ital: 0, filename: 'JetBrainsMono-Regular.woff2' },
];

const OUT = 'public/fonts';
if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

// Use Chrome UA so Google returns WOFF2 (not WOFF/TTF for old UA)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

for (const f of FAMILIES) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${f.family}:wght@${f.weight}&display=swap`;
  console.log(`Resolving ${f.filename}...`);
  const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
  if (!cssRes.ok) throw new Error(`CSS fetch failed for ${f.family}: ${cssRes.status}`);
  const css = await cssRes.text();
  // Find the latin subset URL — it's in the last @font-face block (latin is always last in Google Fonts CSS)
  // Grabbing the last match avoids picking a small Vietnamese/latin-ext subset
  const allMatches = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g)];
  const match = allMatches.length > 0 ? allMatches[allMatches.length - 1] : null;
  if (!match) throw new Error(`No WOFF2 url found for ${f.family} in CSS: ${css.slice(0, 200)}`);
  const woff2Url = match[1];
  const fontRes = await fetch(woff2Url);
  if (!fontRes.ok) throw new Error(`Font fetch failed for ${f.filename}: ${fontRes.status}`);
  const buf = Buffer.from(await fontRes.arrayBuffer());
  await writeFile(`${OUT}/${f.filename}`, buf);
  console.log(`  → ${f.filename}: ${buf.length} bytes`);
}
console.log('All fonts downloaded.');
