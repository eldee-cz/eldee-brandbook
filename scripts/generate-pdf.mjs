// Generuje single-file PDF z brand book webu.
// Spouští Astro preview server, navštíví všech 16 stránek, vygeneruje per-page PDF,
// spojí přes pdf-lib do public/eldee-brandbook.pdf.

import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const PAGES = [
  '/',
  '/story',
  '/dna',
  '/audience',
  '/positioning',
  '/voice',
  '/logo',
  '/logo/misuse',
  '/colors',
  '/typography',
  '/photography',
  '/patterns',
  '/print',
  '/digital',
  '/co-branding',
  '/assets',
];

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

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const merged = await PDFDocument.create();

  for (const path of PAGES) {
    console.log(`Rendering ${path}...`);
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    const pdfBytes = await page.pdf({
      format: 'A4',
      margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
      printBackground: true,
    });
    const src = await PDFDocument.load(pdfBytes);
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
