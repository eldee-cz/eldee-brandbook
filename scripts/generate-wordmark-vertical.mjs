// Generuje VERTIKÁLNÍ lockup „eldee" — varianta V-C (finál 2026-06-13, výběr Lukáš).
// Svislé skládání: e – LD – e – e. Monogram LD + svatozář = master v2.1 (z monogram-ld.svg, 1:1).
// Střed dvojpísmene LD na svislé ose (L a D symetricky kolem osy). Rozestupy ~16 j. = jako vodorovný nápis.
//
// Bez závislostí (jen fs): monogram (L/D/svatozář/spára) se čte z public/logo/monogram-ld.svg,
// glyf „e" je zafixovaná path z fontu Big Shoulders Display Black (stejná jako ve wordmark-*.svg).
// Výstup: public/logo/wordmark-vertical-{light,dark,mono}.svg

import { readFile, writeFile } from 'node:fs/promises';

const MONOGRAM_PATH = 'public/logo/monogram-ld.svg';
const GOLD = '#C9A227';

// --- Glyf „e" (Big Shoulders Display Black, fs 258, origin x=88 baseline y=400) — zafixováno z fontu ---
const E_PATH = "M149.02 402.58L149.02 402.58Q122.57 402.58 110.45 391.87Q98.32 381.17 96.9 356.66L96.9 356.66Q96.64 352.27 96.51 343.18Q96.39 334.08 96.39 323.37Q96.39 312.67 96.51 303.25Q96.64 293.83 96.9 289.06L96.9 289.06Q98.71 264.03 110.64 253.33Q122.57 242.62 148.5 242.62L148.5 242.62Q174.43 242.62 186.17 253.07Q197.91 263.52 199.07 287.51L199.07 287.51Q199.2 290.35 199.26 297.51Q199.33 304.67 199.26 313.25Q199.2 321.83 198.81 329.05L198.81 329.05L135.09 329.05Q135.09 337.31 135.28 345.37Q135.47 353.43 135.6 360.78L135.6 360.78Q135.86 367.75 138.95 370.72Q142.05 373.68 149.02 373.68L149.02 373.68Q155.21 373.68 157.98 370.72Q160.76 367.75 161.14 360.78L161.14 360.78Q161.4 357.69 161.4 352.14Q161.4 346.59 161.14 339.89L161.14 339.89L198.81 339.89Q199.07 341.18 199.2 346.79Q199.33 352.4 199.07 356.66L199.07 356.66Q197.91 381.17 186.23 391.87Q174.56 402.58 149.02 402.58M135.09 302.48L135.09 302.48L161.4 302.48Q161.4 297.83 161.34 293.7Q161.27 289.58 161.21 286.74Q161.14 283.9 161.14 283.13L161.14 283.13Q160.76 276.93 157.85 274.23Q154.95 271.52 148.5 271.52L148.5 271.52Q141.79 271.52 138.83 274.23Q135.86 276.93 135.6 283.13L135.6 283.13Q135.47 287.77 135.41 292.61Q135.34 297.45 135.09 302.48";

// --- Layout (fs-258 souřadnicový systém) ---
const AX = 210;                         // svislá osa symetrie
const E_OPT_CENTER = 147.86;            // optický střed glyfu „e" (při origin x=88)
const E_BASE = 400, E_RISE = 157.38, E_DROP = 2.58;  // metriky glyfu „e"
const HALO_TOP = 58.5, D_BOTTOM = 318;  // master monogram: vršek svatozáře, spodek D
const L_LEFT = 56.32, D_RIGHT = 236.68; // kraje monogramu (master)
const HALO_CX = 182.3, HALO_RX = 66, HALO_SW = 11;
const LD_CENTER = 146.5;                // V-C: střed dvojpísmene LD
const G = 16, PAD = 12;

// e: posun glyfu tak, aby optický střed byl na ose
const E_TX = AX - E_OPT_CENTER;
// svislý rytmus
const E_TOP_BASE = PAD + E_RISE;                         // baseline horního e (vršek e na y=PAD)
const MONO_DY = (E_TOP_BASE + E_DROP + G) - HALO_TOP;    // posun monogramu dolů
const D_BOT_ABS = D_BOTTOM + MONO_DY;
const E_MID_BASE = (D_BOT_ABS + G) + E_RISE;
const E_BOT_BASE = (E_MID_BASE + E_DROP + G) + E_RISE;
// monogram horizontálně (V-C)
const MONO_DX = AX - LD_CENTER;

// viewBox (tight + padding)
const minX = L_LEFT + MONO_DX;                           // levý kraj L
const maxX = HALO_CX + MONO_DX + HALO_RX + HALO_SW / 2;  // pravý kraj svatozáře
const minY = PAD;                                        // vršek horního e
const maxY = E_BOT_BASE + E_DROP;                        // spodek dolního e
const VB = { x: minX - PAD, y: minY - PAD, w: (maxX - minX) + 2 * PAD, h: (maxY - minY) + 2 * PAD };
const viewBox = `${rr(VB.x)} ${rr(VB.y)} ${rr(VB.w)} ${rr(VB.h)}`;

function rr(n) { return Math.round(n * 100) / 100; }

// --- Načti kanonický monogram ---
const mono = await readFile(MONOGRAM_PATH, 'utf8');
const mPaths = [...mono.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]); // [0] maska L, [1] D, [2] L
const sparaW = mono.match(/stroke-width="([\d.]+)" stroke-linejoin/)[1];   // 25
const D_d = mPaths[1], L_d = mPaths[2];

const eTransform = (base) => `translate(${rr(E_TX)},${rr(base - E_BASE)})`;

const buildSvg = ({ ink, halo, comment, id }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none"${ink === 'currentColor' ? ' color="#F5F5F0"' : ''}>
  <!-- eldee wordmark VERTIKÁL — varianta V-C (finál 2026-06-13). ${comment} -->
  <!-- Svisle e–LD–e–e. LD + svatozář = master monogram v2.1 (translate ${rr(MONO_DX)} ${rr(MONO_DY)}), spára ${sparaW} j. průhledná. -->
  <!-- Střed dvojpísmene LD na ose x=${AX} (L a D symetricky). Rozestupy ~${G} j. = jako vodorovný nápis. Glyf e fs 258. -->
  <defs>
    <mask id="wmv-ko-${id}" maskUnits="userSpaceOnUse" x="-300" y="-300" width="1400" height="1400">
      <rect x="-300" y="-300" width="1400" height="1400" fill="white"/>
      <path d="${L_d}" fill="black" stroke="black" stroke-width="${sparaW}" stroke-linejoin="round"/>
    </mask>
  </defs>
  <path d="${E_PATH}" fill="${ink}" transform="${eTransform(E_TOP_BASE)}"/>
  <g transform="translate(${rr(MONO_DX)},${rr(MONO_DY)})">
    <path d="${D_d}" fill="${ink}" mask="url(#wmv-ko-${id})"/>
    <path d="${L_d}" fill="${ink}"/>
    <ellipse cx="${HALO_CX}" cy="77" rx="${HALO_RX}" ry="13" stroke="${halo}" stroke-width="${HALO_SW}" fill="none"/>
  </g>
  <path d="${E_PATH}" fill="${ink}" transform="${eTransform(E_MID_BASE)}"/>
  <path d="${E_PATH}" fill="${ink}" transform="${eTransform(E_BOT_BASE)}"/>
</svg>`;

await writeFile('public/logo/wordmark-vertical-light.svg', buildSvg({ ink: '#F5F5F0', halo: GOLD, comment: 'LIGHT — na tmavá pozadí.', id: 'light' }));
await writeFile('public/logo/wordmark-vertical-dark.svg',  buildSvg({ ink: '#0A0A0A', halo: GOLD, comment: 'DARK — na světlá pozadí.', id: 'dark' }));
await writeFile('public/logo/wordmark-vertical-mono.svg',  buildSvg({ ink: 'currentColor', halo: 'currentColor', comment: 'MONO — currentColor včetně svatozáře.', id: 'mono' }));

console.log(`Vertikální wordmark V-C vygenerován (viewBox ${viewBox}):`);
console.log('  - public/logo/wordmark-vertical-light.svg');
console.log('  - public/logo/wordmark-vertical-dark.svg');
console.log('  - public/logo/wordmark-vertical-mono.svg');
