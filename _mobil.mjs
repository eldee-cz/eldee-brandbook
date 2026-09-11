import { chromium } from 'playwright';
const b = await chromium.launch();
const STRANKY = ['/', '/logo/', '/colors/', '/print/', '/digital/', '/co-branding/', '/assets/'];

console.log('=== TELEFON 390×844 ===');
for (const c of STRANKY) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://localhost:8765' + c, { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => ({
    mainLeft: Math.round(document.querySelector('main').getBoundingClientRect().left),
    pretece: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth,
  }));
  console.log(c.padEnd(15), `main zacina na ${r.mainLeft}px · sirka dokumentu ${r.scrollW} · pretece: ${r.pretece}`);
  await p.close();
}

console.log('\n=== DOTYKOVE CILE (telefon, panel otevreny) ===');
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://localhost:8765/digital/', { waitUntil: 'networkidle' });
const tlacitko = await p.evaluate(() => {
  const s = document.querySelector('details summary span:last-of-type');
  const r = s.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), text: s.textContent.trim() };
});
console.log('tlacitko "SEKCE":', JSON.stringify(tlacitko));
await p.click('details summary');
await p.waitForTimeout(300);
const odkazy = await p.evaluate(() => {
  const a = [...document.querySelectorAll('details nav a')];
  const v = a.map(e => Math.round(e.getBoundingClientRect().height));
  return { pocet: a.length, min: Math.min(...v), max: Math.max(...v),
           panelVyska: Math.round(document.querySelector('details nav').getBoundingClientRect().height),
           pretece: document.documentElement.scrollWidth > document.documentElement.clientWidth };
});
console.log('odkazy v panelu:', JSON.stringify(odkazy));
await p.screenshot({ path: '/Users/lukashledik/Documents/Claude-code/07-eldee-business/brand/v3-nahledy-rozvrzeni/etapa2/mobil-menu-otevrene.png' });
await p.click('details summary');
await p.waitForTimeout(300);
await p.screenshot({ path: '/Users/lukashledik/Documents/Claude-code/07-eldee-business/brand/v3-nahledy-rozvrzeni/etapa2/16-digital-mobil.png', fullPage: true });
await p.close();

console.log('\n=== MONITOR 1440 (menu musi zustat vlevo) ===');
const d = await b.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto('http://localhost:8765/digital/', { waitUntil: 'networkidle' });
console.log(await d.evaluate(() => {
  const n = document.querySelector('nav:not([class*="lg:hidden"])');
  return JSON.stringify({ sirkaMenu: Math.round(n.getBoundingClientRect().width),
    mainLeft: Math.round(document.querySelector('main').getBoundingClientRect().left),
    listaSkryta: getComputedStyle(document.querySelector('details')).display,
    menuScroll: n.scrollHeight, menuVidi: n.clientHeight });
}));
await b.close();
