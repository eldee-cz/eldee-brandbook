// Generuje single-file PDF z brand book webu.
// Spouští Astro preview server, projde stránky v pořadí knihy, vygeneruje
// per-page PDF a spojí je přes pdf-lib do public/eldee-brandbook.pdf.
//
// ⚠️ Seznam stránek se sem NEPÍŠE ručně. Bere se ze `src/data/sekce.ts`, což je
// jediný zdroj pravdy o struktuře knihy — ručně psaný seznam tady zapomněl na
// novou sekci /produkt a v PDF by chyběla.

import { chromium } from 'playwright';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import wawoff from 'wawoff2';
import { writeFile, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { poradiStranek, blokyProBuild } from '../src/data/sekce.ts';

// Dvě PDF, dva režimy (22. 9. 2026):
//   bez přepínače → INTERNÍ brand book (celá kniha včetně bloku I)
//   --verejny     → VEŘEJNÝ logomanuál (jen to, co unese veřejná adresa)
//
// ⚠️ Důvod, proč to vzniklo: do 22. 9. existovalo jen jedno PDF, generované
// z interního buildu a uložené v `public/`. Astro kopíruje `public/` do obou
// buildů, takže veřejná adresa nabízela ke stažení celou interní knihu —
// Positioning, persony, MOQ i provizi. Ověřeno stažením z logomanuálu.
// Proto interní PDF NESMÍ ležet v `public/`: soubor, který tam není, se
// do veřejného buildu nemůže dostat ani omylem.
const VEREJNY = process.argv.includes('--verejny');
const HQ = !VEREJNY;
// Titulka a tiráž nejsou v `sekce.ts` (nemají být v navigaci ani v obsahu),
// takže se do pořadí přidávají až tady — první a poslední stránka knihy.
const TITULKA = '/pdf/titulka';
const TIRAZ = '/pdf/tiraz';
const PAGES = [TITULKA, ...poradiStranek(HQ), TIRAZ];
// Stránky bez okrajů a bez čísla: předěly bloků + obálka a tiráž. U všech je to
// plnobarevná plocha od kraje ke kraji, kde by bílý rám vypadal jako chyba tisku.
const PREDELY = new Set([TITULKA, TIRAZ, ...blokyProBuild(HQ).map((b) => b.href)]);

const OKRAJE = { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' };
// Předěl bloku je plnobarevná stránka od kraje ke kraji. S okraji by kolem
// tmavé plochy zůstal bílý rám a vypadalo by to jako chyba tisku.
const BEZ_OKRAJU = { top: '0', bottom: '0', left: '0', right: '0' };

const VYSTUP = HQ ? 'pdf-interni/eldee-brandbook.pdf' : 'public/eldee-logomanual.pdf';

const PORT = 4322;
const BASE = `http://localhost:${PORT}`;

// ── Čísla stránek ──────────────────────────────────────────────────────────
// Chrome je do PDF nakreslit neumí (`--no-pdf-header-footer` je všechno, co
// nabízí) a CSS `@page` countery v něm nefungují. U smluv to eldee řeší
// druhým průchodem Chromem přes overlay HTML (smlouvy/build-pdf.py), tady to
// není potřeba: pdf-lib text kreslit umí, takže se čísla dopisují do hotového
// dokumentu jedním průchodem.
//
// Font je JetBrains Mono z knihy, ne Courier ze standardní sady — brand book
// je o typografické disciplíně a číslo v cizím fontu je přesně ta nekonzistence,
// kterou sám zakazuje. Kvůli tomu se woff2 dekomprimuje na TTF (stejně jako
// v generate-wordmark.mjs) a embeduje přes fontkit.
const MONO_WOFF2 = 'public/fonts/JetBrainsMono-Regular.woff2';
const CISLO = {
  velikost: 8,
  // #555555 — stejný tlumený odstín, jaký print.css používá pro drobný text
  // na papíře. Světlejší by na 80g papíře zmizel.
  barva: rgb(0x55 / 255, 0x55 / 255, 0x55 / 255),
  odKrajeDole: 20, // pt, uvnitř 16mm dolního okraje
};

async function waitForServer(url, retries = 60) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Server did not start in time');
}

console.log(`Starting preview server on port ${PORT}...`);
const server = spawn('npx', ['astro', 'preview', '--port', String(PORT), '--host', 'localhost'], {
  stdio: ['ignore', 'inherit', 'inherit'],
});

try {
  await waitForServer(BASE);
  console.log('Server up. Launching Chromium...');

  // PDF je plná kniha, takže `dist/` musí být interní build. Z veřejného
  // logomanuálu by celý blok I chyběl a v PDF by zůstaly stránky s
  // přesměrováním. Spouštět přes `npm run generate-pdf`, který staví build:hq.
  // Pojistka na obě strany. Stránka bloku I existuje jen v interním buildu,
  // takže jejím stavem se pozná, co v dist/ leží. Bez té druhé půlky by
  // `--verejny` nad interním buildem vyrobil veřejné PDF s celým blokem I —
  // přesně ten únik, kvůli kterému dvě PDF vznikla.
  const SONDA = '/blok/kdo-jsme';
  const sonda = await fetch(`${BASE}${SONDA}`, { redirect: 'manual' });
  const jeHQ = sonda.status === 200;
  if (HQ && !jeHQ) {
    throw new Error(
      `V dist/ není interní build — ${SONDA} vrací ${sonda.status}. Spusť "npm run generate-pdf".`,
    );
  }
  if (VEREJNY && jeHQ) {
    throw new Error(
      `V dist/ je INTERNÍ build, ale generuje se veřejné PDF — vzniklo by s celým blokem I. Spusť "npm run generate-pdf:verejny".`,
    );
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const merged = await PDFDocument.create();
  // Indexy stránek, které jsou předělem bloku — čísla se na ně netisknou.
  const predelIndexy = new Set();

  for (const path of PAGES) {
    const jePredel = PREDELY.has(path);
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    const pdfBytes = await page.pdf({
      format: 'A4',
      margin: jePredel ? BEZ_OKRAJU : OKRAJE,
      printBackground: true,
    });
    const src = await PDFDocument.load(pdfBytes);
    const pocet = src.getPageCount();
    console.log(`${path} → ${pocet} str.${jePredel ? ' (předěl, bez okrajů)' : ''}`);
    // Předěl musí být právě jedna stránka. Když se rozteče na dvě, je v knize
    // prázdný list a je lepší se to dozvědět tady než z tiskárny.
    if (jePredel && pocet !== 1) {
      throw new Error(`${path} má ${pocet} stránek místo jedné — zkontroluj min-height v print.css`);
    }
    const copied = await merged.copyPages(src, src.getPageIndices());
    copied.forEach((p) => {
      if (jePredel) predelIndexy.add(merged.getPageCount());
      merged.addPage(p);
    });
  }

  // ── Čísla stránek na hotový dokument ────────────────────────────────────
  // Předěly bloků se POČÍTAJÍ, ale číslo se na ně netiskne: je to dělící list
  // a navíc jediná plnobarevná stránka v knize, kde by tmavé číslo zmizelo.
  // Stejně to dělá sazba tištěných knih u vakátů a mezititulů.
  merged.registerFontkit(fontkit);
  const monoWoff2 = await readFile(MONO_WOFF2);
  const monoTtf = Buffer.from(await wawoff.decompress(new Uint8Array(monoWoff2)));
  const mono = await merged.embedFont(monoTtf, { subset: true });

  const strany = merged.getPages();
  let vytisteno = 0;
  for (const [i, str] of strany.entries()) {
    const cislo = String(i + 1);
    if (predelIndexy.has(i)) continue;
    const sirkaTextu = mono.widthOfTextAtSize(cislo, CISLO.velikost);
    const { width } = str.getSize();
    str.drawText(cislo, {
      x: (width - sirkaTextu) / 2,
      y: CISLO.odKrajeDole,
      size: CISLO.velikost,
      font: mono,
      color: CISLO.barva,
    });
    vytisteno += 1;
  }
  console.log(`Čísla stránek: ${vytisteno} z ${strany.length} (předěly bloků se nečíslují)`);

  const out = await merged.save();
  const outPath = VYSTUP;
  await writeFile(outPath, out);
  console.log(`PDF written: ${outPath} (${(out.length / 1024 / 1024).toFixed(2)} MB) — ${HQ ? 'INTERNÍ, mimo public/' : 'VEŘEJNÝ'}`);

  await browser.close();
} finally {
  console.log('Stopping preview server...');
  server.kill('SIGTERM');
  // give it a moment to die
  await new Promise((r) => setTimeout(r, 500));
}
