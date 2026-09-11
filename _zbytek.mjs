import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
for (const c of ['/print/', '/co-branding/']) {
  await p.goto('http://localhost:8765' + c, { waitUntil: 'networkidle' });
  const v = await p.evaluate(() => {
    const W = document.documentElement.clientWidth;
    return [...document.querySelectorAll('main *')]
      .filter(e => e.getBoundingClientRect().right > W + 1)
      .slice(0, 4)
      .map(e => ({ tag: e.tagName.toLowerCase(), cls: e.className.toString().slice(0, 55),
                   w: Math.round(e.getBoundingClientRect().width) }));
  });
  console.log(c); console.table(v);
}
const d = await b.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto('http://localhost:8765/digital/', { waitUntil: 'networkidle' });
console.log('MONITOR:', await d.evaluate(() => {
  const boc = document.querySelector('body > nav');
  return JSON.stringify({ bocniMenu: Math.round(boc.getBoundingClientRect().width),
    mainLeft: Math.round(document.querySelector('main').getBoundingClientRect().left),
    listaNaMobil: getComputedStyle(document.querySelector('details')).display,
    menuObsah: boc.scrollHeight, menuOkno: boc.clientHeight,
    odsekne: boc.scrollHeight > boc.clientHeight });
}));
await b.close();
