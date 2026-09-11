// Generuje single-file PDF z brand book webu.
// Spouští Astro preview server, projde stránky v pořadí knihy, vygeneruje
// per-page PDF a spojí je přes pdf-lib do public/eldee-brandbook.pdf.
//
// ⚠️ Seznam stránek se sem NEPÍŠE ručně. Bere se ze `src/data/sekce.ts`, což je
// jediný zdroj pravdy o struktuře knihy — ručně psaný seznam tady zapomněl na
// novou sekci /produkt a v PDF by chyběla.

import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { poradiStranek, blokyProBuild } from '../src/data/sekce.ts';

// PDF se dělá z interního buildu — má celou knihu včetně bloku I.
const HQ = true;
const PAGES = poradiStranek(HQ);
const PREDELY = new Set(blokyProBuild(HQ).map((b) => b.href));

const OKRAJE = { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' };
// Předěl bloku je plnobarevná stránka od kraje ke kraji. S okraji by kolem
// tmavé plochy zůstal bílý rám a vypadalo by to jako chyba tisku.
const BEZ_OKRAJU = { top: '0', bottom: '0', left: '0', right: '0' };

const PORT = 4322;
const BASE = `http://localhost:${PORT}`;

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
  const kontrola = await fetch(`${BASE}${PAGES[0]}`);
  if (!kontrola.ok) {
    throw new Error(
      `V dist/ není interní build — ${PAGES[0]} vrací ${kontrola.status}. Spusť "npm run generate-pdf".`,
    );
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const merged = await PDFDocument.create();

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
      throw new Error(`Předěl ${path} má ${pocet} stránek místo jedné — zkontroluj min-height v print.css`);
    }
    const copied = await merged.copyPages(src, src.getPageIndices());
    copied.forEach((p) => merged.addPage(p));
  }

  const out = await merged.save();
  const outPath = 'public/eldee-brandbook.pdf';
  await writeFile(outPath, out);
  console.log(`PDF written: ${outPath} (${(out.length / 1024 / 1024).toFixed(2)} MB)`);

  await browser.close();
} finally {
  console.log('Stopping preview server...');
  server.kill('SIGTERM');
  // give it a moment to die
  await new Promise((r) => setTimeout(r, 500));
}
