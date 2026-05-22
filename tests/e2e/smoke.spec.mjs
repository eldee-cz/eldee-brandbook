import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/',              title: 'Manifesto',                 heading: /Holy Socks/ },
  { path: '/story',         title: 'Brand Story',               heading: /Origin/ },
  { path: '/dna',           title: 'Brand DNA',                 heading: /Personality/ },
  { path: '/audience',      title: 'Target Audience',           heading: /Kdo nosí eldee/ },
  { path: '/positioning',   title: 'Positioning',               heading: /Where eldee stands/ },
  { path: '/voice',         title: 'Voice & Tone',              heading: /Jak eldee mluví/ },
  { path: '/logo',          title: 'Logo System',               heading: /Tři vrstvy log/ },
  { path: '/logo/misuse',   title: 'Logo Misuse',               heading: /Takhle ne/ },
  { path: '/colors',        title: 'Color System',              heading: /11 barev/ },
  { path: '/typography',    title: 'Typography',                heading: /Čtyři fonty/ },
  { path: '/photography',   title: 'Photography',               heading: /Vizuální styl/ },
  { path: '/patterns',      title: 'Patterns',                  heading: /Hole pattern/i },
  { path: '/print',         title: 'Print Applications',        heading: /Print materials/ },
  { path: '/digital',       title: 'Digital Applications',      heading: /Digital materials/ },
  { path: '/co-branding',   title: 'Co-branding',               heading: /Spojení s partnery/ },
  { path: '/assets',        title: 'Asset Index',               heading: /Stáhnout/ },
];

for (const p of PAGES) {
  test(`${p.path} loads and shows expected content`, async ({ page }) => {
    const response = await page.goto(p.path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(new RegExp(p.title));
    await expect(page.locator('h1').first()).toContainText(p.heading);
  });
}

test('PDF download is reachable', async ({ request }) => {
  const res = await request.get('/eldee-brandbook.pdf');
  expect(res.status()).toBe(200);
  const contentType = res.headers()['content-type'] || '';
  expect(contentType.toLowerCase()).toContain('pdf');
});

test('Logo SVGs are reachable', async ({ request }) => {
  const assets = [
    '/logo/wordmark-light.svg',
    '/logo/wordmark-dark.svg',
    '/logo/monogram-ld.svg',
    '/logo/hole-pattern.svg',
    '/logo/halo.svg',
  ];
  for (const a of assets) {
    const res = await request.get(a);
    expect(res.status(), `${a} should return 200`).toBe(200);
  }
});

test('Fonts are reachable', async ({ request }) => {
  const fonts = [
    '/fonts/BigShouldersDisplay-Black.woff2',
    '/fonts/SpaceGrotesk-Regular.woff2',
    '/fonts/SpaceGrotesk-Bold.woff2',
    '/fonts/CaveatBrush-Regular.woff2',
  ];
  for (const f of fonts) {
    const res = await request.get(f);
    expect(res.status(), `${f} should return 200`).toBe(200);
  }
});
