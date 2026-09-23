// Generuje single-file PDF z brand book webu.
// Spouští Astro preview server, projde stránky v pořadí knihy, vygeneruje
// per-page PDF a spojí je přes pdf-lib do public/eldee-brandbook.pdf.
//
// ⚠️ Seznam stránek se sem NEPÍŠE ručně. Bere se ze `src/data/sekce.ts`, což je
// jediný zdroj pravdy o struktuře knihy — ručně psaný seznam tady zapomněl na
// novou sekci /produkt a v PDF by chyběla.

import { chromium } from 'playwright';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfLib from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import wawoff from 'wawoff2';
import { writeFile, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { poradiStranek, blokyProBuild, sekceProBuild, BLOKY, VERZE, PORADI_BLOKU } from '../src/data/sekce.ts';

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
// Ve veřejné knize není `/` sekcí (je to rozcestník), takže by v PDF chyběl
// obsah úplně — do 23. 9. 2026 logomanuál začínal obálkou a hned blokem II.
// Interní kniha `/` v pořadí má, jako sekci 01.
const ROZCESTNIK = HQ ? [] : ['/'];
const PAGES = [TITULKA, ...ROZCESTNIK, ...poradiStranek(HQ), TIRAZ];
// Stránky bez okrajů a bez čísla: předěly bloků + obálka a tiráž. U všech je to
// plnobarevná plocha od kraje ke kraji, kde by bílý rám vypadal jako chyba tisku.
const PREDELY = new Set([TITULKA, TIRAZ, ...blokyProBuild(HQ).map((b) => b.href)]);

// ⚠️ Tyhle hodnoty Chrome IGNORUJE — skutečné okraje diktuje `@page` v
// print.css (ověřeno 23. 9. 2026: změna 16 → 20 → 24 mm tady nezměnila ani
// počet stran, ani polohu textu). Zůstávají jen proto, že `page.pdf()` bez
// `margin` sáhne po svém výchozím palci. Okraj se mění v print.css.
const OKRAJE = { top: '24mm', bottom: '16mm', left: '14mm', right: '14mm' };
// 14 mm v bodech — záhlaví musí lícovat s levým okrajem textu.
const OKRAJ_PT = (14 / 25.4) * 72;
// Předěl bloku je plnobarevná stránka od kraje ke kraji. S okraji by kolem
// tmavé plochy zůstal bílý rám a vypadalo by to jako chyba tisku.
const BEZ_OKRAJU = { top: '0', bottom: '0', left: '0', right: '0' };

const VYSTUP = HQ ? 'pdf-interni/eldee-brandbook.pdf' : 'public/eldee-logomanual.pdf';

// ── Čísla stránek v obsahu (dvouprůchodové generování) ─────────────────────
// Obsah knihy do 23. 9. 2026 vypisoval sekce a popisky, ale ne kde je najdeš —
// v tištěné knize je takový obsah skoro k ničemu. Čísla se nedají vysázet na
// jeden zátah: dokud není PDF hotové, neví se, na které straně sekce začíná.
// Proto dva průchody jako u LaTeXu — první mapu spočítá, druhý ji vysází.
const MAPA_SOUBOR = 'src/data/strankyPdf.json';
const MAPA_KLIC = HQ ? 'interni' : 'verejny';
const DRUHY_PRUCHOD = process.argv.includes('--druhy-pruchod');

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
// ── Živé záhlaví ───────────────────────────────────────────────────────────
// Do 23. 9. 2026 nesl štítek sekce jen 18 stran ze 110 — ten na první straně
// každé sekce. Na zbylých 92 čtenář uprostřed knihy nevěděl, kde je: vytištěná
// a rozsypaná kniha se nedala složit a hledání pravidla znamenalo listovat
// zpátky na začátek sekce.
//
// Kreslí se stejnou cestou jako čísla stránek (pdf-lib nad hotovým dokumentem),
// protože Chrome neumí `@page` margin boxy ani CSS countery. Na PRVNÍ straně
// sekce se vynechává — tam stojí velký nadpis a štítek pod ním, takže by se
// opakovalo dvakrát pod sebou. Tak to dělá i knižní sazba.
const ZAHLAVI = {
  velikost: 8,
  // 38 pt = 13,4 mm od kraje papíru, 10,6 mm nad textem (ten začíná na 24 mm).
  // Řádek tak sedí zhruba uprostřed horního okraje a dýchá na obě strany.
  odKrajeNahore: 38,
};

const CISLO = {
  velikost: 8,
  // #555555 — stejný tlumený odstín, jaký print.css používá pro drobný text
  // na papíře. Světlejší by na 80g papíře zmizel.
  barva: rgb(0x55 / 255, 0x55 / 255, 0x55 / 255),
  odKrajeDole: 20, // pt, uvnitř 16mm dolního okraje
};

// pdf-lib nemá pro záložky API, takže se strom staví ručně z objektů. Dvě
// úrovně: blok → sekce. Každá položka musí znát rodiče, souseda vlevo i vpravo,
// jinak ji čtečka nevykreslí.
function vytvorZalozky(doc, prvniStrana, hq) {
  // PDFString kóduje PDFDocEncoding (latin-1) a české znaky v něm zmizí —
  // „Příběh" vyšlo jako „PYíb˙h" (naměřeno 23. 9. 2026). Unicode názvy musí
  // jít přes PDFHexString, což je UTF-16BE s BOM.
  const { PDFName, PDFNumber, PDFHexString, PDFArray } = pdfLib;
  const ctx = doc.context;
  const strany = doc.getPages();
  const odkazNaStranu = (cislo) => {
    const idx = Math.min(Math.max(cislo - 1, 0), strany.length - 1);
    const pole = PDFArray.withContext(ctx);
    pole.push(strany[idx].ref);
    pole.push(PDFName.of('Fit'));
    return pole;
  };

  const sekce = sekceProBuild(hq);
  const skupiny = PORADI_BLOKU
    .map((id) => ({ blok: BLOKY[id], polozky: sekce.filter((s) => s.blok === id) }))
    .filter((g) => g.polozky.length > 0 && (hq || g.blok.verejny));

  // Plochý seznam položek nejvyšší úrovně: obálka, bloky, tiráž.
  const vrchol = [];
  vrchol.push({ titul: 'Obálka', strana: 1, deti: [] });
  for (const g of skupiny) {
    const deti = g.polozky
      .filter((s) => prvniStrana[s.href])
      .map((s) => ({
        titul: s.cislo === '—' ? s.nazev : `${s.cislo} · ${s.nazev}`,
        strana: prvniStrana[s.href],
        deti: [],
      }));
    vrchol.push({ titul: `Blok ${g.blok.id} · ${g.blok.nazev}`, strana: prvniStrana[g.blok.href] ?? deti[0]?.strana ?? 1, deti });
  }
  vrchol.push({ titul: 'Tiráž', strana: strany.length, deti: [] });

  const korenRef = ctx.nextRef();

  // Vyrobí řetěz sourozenců a vrátí { first, last, pocet }.
  const postavUroven = (polozky, rodicRef) => {
    if (polozky.length === 0) return null;
    const refy = polozky.map(() => ctx.nextRef());
    let celkem = 0;
    polozky.forEach((p, i) => {
      const dict = new Map();
      dict.set(PDFName.of('Title'), PDFHexString.fromText(p.titul));
      dict.set(PDFName.of('Parent'), rodicRef);
      dict.set(PDFName.of('Dest'), odkazNaStranu(p.strana));
      if (i > 0) dict.set(PDFName.of('Prev'), refy[i - 1]);
      if (i < polozky.length - 1) dict.set(PDFName.of('Next'), refy[i + 1]);
      const potomci = postavUroven(p.deti, refy[i]);
      if (potomci) {
        dict.set(PDFName.of('First'), potomci.first);
        dict.set(PDFName.of('Last'), potomci.last);
        // Záporný počet = větev zabalená; čtenář uvidí bloky a rozbalí si sekci.
        dict.set(PDFName.of('Count'), PDFNumber.of(-potomci.pocet));
        celkem += potomci.pocet;
      }
      ctx.assign(refy[i], ctx.obj(Object.fromEntries([...dict].map(([k, v]) => [k.asString().slice(1), v]))));
      celkem += 1;
    });
    return { first: refy[0], last: refy[refy.length - 1], pocet: celkem };
  };

  const uroven = postavUroven(vrchol, korenRef);
  ctx.assign(korenRef, ctx.obj({
    Type: 'Outlines',
    First: uroven.first,
    Last: uroven.last,
    Count: PDFNumber.of(uroven.pocet),
  }));
  doc.catalog.set(PDFName.of('Outlines'), korenRef);
  doc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
  console.log(`Záložky: ${vrchol.length} na první úrovni, ${uroven.pocet} celkem`);
}

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

let potrebaDruhyPruchod = false;

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
  // Index stránky → { cesta, prvniVSekci }, aby se dalo dopsat živé záhlaví.
  const puvodStranky = new Map();
  // Cesta → číslo první stránky (1-based), podklad pro čísla v obsahu.
  const prvniStrana = {};

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
    copied.forEach((p, i) => {
      if (jePredel) predelIndexy.add(merged.getPageCount());
      if (i === 0) prvniStrana[path] = merged.getPageCount() + 1;
      puvodStranky.set(merged.getPageCount(), { cesta: path, prvniVSekci: i === 0 });
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

  // ── Živé záhlaví na každou stránku uvnitř sekce ────────────────────────
  // Podstránky (/logo/construction) nejsou v SEKCE samostatně — patří pod
  // sekci, která je má v `podstranky`, jinak by zůstaly bez záhlaví.
  const sekce = sekceProBuild(HQ);
  const najdiProCestu = (cesta) =>
    sekce.find((x) => x.href === cesta) ?? sekce.find((x) => (x.podstranky ?? []).includes(cesta));

  const strany = merged.getPages();
  let sZahlavim = 0;
  for (const [i, str] of strany.entries()) {
    const puvod = puvodStranky.get(i);
    if (!puvod || predelIndexy.has(i) || puvod.prvniVSekci) continue;
    const s = najdiProCestu(puvod.cesta);
    if (!s) continue;
    const vlevo = s.cislo === '—' ? s.nazev : `${s.cislo} · ${s.nazev}`;
    const vpravo = `Blok ${BLOKY[s.blok].id} · ${BLOKY[s.blok].nazev}`;
    const { width, height } = str.getSize();
    const y = height - ZAHLAVI.odKrajeNahore;
    str.drawText(vlevo, { x: OKRAJ_PT, y, size: ZAHLAVI.velikost, font: mono, color: CISLO.barva });
    const sirkaVpravo = mono.widthOfTextAtSize(vpravo, ZAHLAVI.velikost);
    str.drawText(vpravo, { x: width - OKRAJ_PT - sirkaVpravo, y, size: ZAHLAVI.velikost, font: mono, color: CISLO.barva });
    sZahlavim += 1;
  }
  console.log(`Živé záhlaví: ${sZahlavim} stran (první strana sekce, předěly, obálka a tiráž ho nemají)`);

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

  // ── Metadata a záložky ─────────────────────────────────────────────────
  // Do 23. 9. 2026 PDF nemělo ani jedno: v záložce čtečky svítilo jen jméno
  // souboru a 110 stran se dalo procházet jen scrollováním. Mapa sekcí už
  // existuje kvůli číslům v obsahu, takže záložky z ní vyjdou skoro zadarmo.
  const nazevDokumentu = `eldee ${HQ ? 'Brand Book' : 'Logomanuál'} ${VERZE}`;
  merged.setTitle(nazevDokumentu);
  merged.setAuthor('eldee');
  merged.setSubject(HQ
    ? 'Interní brand book — kdo jsme, jak vypadáme, jak to používáme.'
    : 'Vizuální identita eldee pro partnery a dodavatele.');
  merged.setCreator('eldee brand book (Astro + Playwright)');
  merged.setProducer('eldee');
  merged.setCreationDate(new Date());
  merged.setModificationDate(new Date());

  vytvorZalozky(merged, prvniStrana, HQ);

  const out = await merged.save();
  const outPath = VYSTUP;
  await writeFile(outPath, out);

  // Sedí mapa, ze které se sázel obsah, s hotovým dokumentem?
  const mapa = JSON.parse(await readFile(MAPA_SOUBOR, 'utf8'));
  if (JSON.stringify(mapa[MAPA_KLIC]) !== JSON.stringify(prvniStrana)) {
    mapa[MAPA_KLIC] = prvniStrana;
    await writeFile(MAPA_SOUBOR, JSON.stringify(mapa, null, 2) + '\n');
    if (DRUHY_PRUCHOD) {
      console.warn('⚠️ Mapa stránek se mění i po druhém průchodu — čísla v obsahu můžou být o stránku vedle. Spusť generování ještě jednou.');
    } else {
      potrebaDruhyPruchod = true;
      console.log('Mapa stránek se změnila → druhý průchod vysází čísla do obsahu.');
    }
  } else {
    console.log('Mapa stránek sedí — čísla v obsahu odpovídají dokumentu.');
  }
  console.log(`PDF written: ${outPath} (${(out.length / 1024 / 1024).toFixed(2)} MB) — ${HQ ? 'INTERNÍ, mimo public/' : 'VEŘEJNÝ'}`);

  await browser.close();
} finally {
  console.log('Stopping preview server...');
  server.kill('SIGTERM');
  // give it a moment to die
  await new Promise((r) => setTimeout(r, 500));
}

// Druhý průchod až tady: preview server musí být po smrti, jinak by si nový
// běh nesáhl na port 4322.
if (potrebaDruhyPruchod) {
  const { spawnSync } = await import('node:child_process');
  const prostredi = HQ ? { ...process.env, PUBLIC_HQ_BUILD: '1' } : process.env;
  console.log('\n── Druhý průchod ──────────────────────────────────────────');
  const build = spawnSync('npx', ['astro', 'build'], { stdio: 'inherit', env: prostredi });
  if (build.status !== 0) throw new Error('Druhý průchod: build selhal');
  const args = ['scripts/generate-pdf.mjs', '--druhy-pruchod', ...(HQ ? [] : ['--verejny'])];
  const znovu = spawnSync('node', args, { stdio: 'inherit', env: prostredi });
  if (znovu.status !== 0) throw new Error('Druhý průchod: generování selhalo');
}
