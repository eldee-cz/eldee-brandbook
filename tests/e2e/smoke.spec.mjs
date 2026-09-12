import { test, expect } from '@playwright/test';
import { SEKCE, BLOKY, sekceProBuild, blokyProBuild, jeVerejna } from '../../src/data/sekce.ts';

// Sada si seznam stránek NEDRŽÍ vlastní. Bere ho ze `sekce.ts`, což je jediný
// zdroj pravdy o struktuře knihy — dřív tu byl ručně psaný seznam a rozešel se
// s knihou hned při prvním přejmenování sekcí (9 testů padalo na anglických
// názvech z doby před v3.0).
const isHQ = process.env.PUBLIC_HQ_BUILD === '1';
const stranky = sekceProBuild(isHQ);
const bloky = blokyProBuild(isHQ);
const interni = SEKCE.filter((s) => !jeVerejna(s) && s.href !== '/');

test.describe(`build: ${isHQ ? 'interní brand book' : 'veřejný logomanuál'}`, () => {
  for (const s of stranky) {
    test(`${s.href} — načte se a má hlavičku`, async ({ page }) => {
      const res = await page.goto(s.href);
      expect(res?.status(), `${s.href} musí vrátit 200`).toBe(200);

      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible();
      await expect(h1).not.toBeEmpty();

      // V menu musí být právě tahle sekce označená jako aktuální.
      await expect(page.locator(`nav a[aria-current="page"][href="${s.href}"]`).first()).toHaveCount(1);
    });
  }

  test('žádná stránka nepřetéká na šířku telefonu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const problemy = [];
    for (const s of stranky) {
      await page.goto(s.href);
      const r = await page.evaluate(() => ({
        pretece: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        mainLeft: Math.round(document.querySelector('main')?.getBoundingClientRect().left ?? -1),
      }));
      if (r.pretece || r.mainLeft > 0) problemy.push(`${s.href} (left ${r.mainLeft})`);
    }
    expect(problemy, 'stránky rozbité na mobilu').toEqual([]);
  });

  test('menu na telefonu má dost velké dotykové cíle', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(stranky[0].href);
    const tlacitko = page.locator('[data-tlacitko="sekce"]');
    const box = await tlacitko.boundingBox();
    expect(box.height, 'tlačítko SEKCE min. 44 px').toBeGreaterThanOrEqual(44);

    await page.locator('details summary').click();
    const odkazy = page.locator('details nav a');
    const n = await odkazy.count();
    // Sekce + hlavička každého bloku, která vede na jeho předěl.
    expect(n).toBe(stranky.length + bloky.length);
    for (let i = 0; i < n; i++) {
      const b = await odkazy.nth(i).boundingBox();
      expect(b.height, `odkaz ${i} min. 44 px`).toBeGreaterThanOrEqual(44);
    }
  });
});

// Předěl bloku je jediná stránka knihy, která musí být stejně dobrá na papíře
// jako na webu — proto se tiskové chování testuje, ne prohlíží.
test.describe('předěly bloků', () => {
  for (const b of bloky) {
    test(`${b.href} — manifest, sekce bloku a barevný pruh`, async ({ page }) => {
      const res = await page.goto(b.href);
      expect(res?.status(), `${b.href} musí vrátit 200`).toBe(200);

      await expect(page.locator('h1')).toHaveText(b.nazev);
      await expect(page.locator('.predel-veta')).toContainText(b.manifest.veta);
      await expect(page.locator('.predel-veta')).toContainText(b.manifest.dovetek);

      // Odkazy na všechny sekce bloku, každý s dotykovým cílem 44 px.
      const sekceBloku = stranky.filter((s) => s.blok === b.id);
      const odkazy = page.locator('.predel nav a');
      await expect(odkazy).toHaveCount(sekceBloku.length);
      for (let i = 0; i < sekceBloku.length; i++) {
        const box = await odkazy.nth(i).boundingBox();
        expect(box.height, `odkaz ${i} na ${b.href} min. 44 px`).toBeGreaterThanOrEqual(44);
      }

      await expect(page.locator('.predel-pruh')).toBeVisible();
    });

    test(`${b.href} — na papíře zůstává tmavý a vejde se na jednu stránku`, async ({ page }) => {
      await page.goto(b.href);
      await page.emulateMedia({ media: 'print' });

      const r = await page.evaluate(() => {
        const el = document.querySelector('.predel');
        const cs = getComputedStyle(el);
        const nazev = document.querySelector('.predel-nazev');
        return {
          pozadi: cs.backgroundColor,
          barvaTextu: getComputedStyle(nazev).color,
          vyskaMM: el.getBoundingClientRect().height / 3.779527559,
        };
      });

      // Zbytek knihy se na papíře převrací do bílé. Předěl ne — jinak je
      // z barevného listu, který odděluje kapitolu, prázdná bílá stránka.
      expect(r.pozadi, 'plocha předělu musí zůstat tmavá').toBe('rgb(10, 10, 10)');
      expect(r.barvaTextu, 'název musí zůstat světlý').toBe('rgb(245, 245, 240)');
      expect(r.vyskaMM, 'předěl se musí vejít na A4 (297 mm)').toBeLessThan(297);
      expect(r.vyskaMM, 'předěl musí vyplnit stránku, ne být proužek').toBeGreaterThan(270);
    });
  }
});

// Nejdražší chyba, jaká se v tomhle repu může stát: interní obsah na veřejné
// adrese. Proto se to testuje, ne prohlíží.
test.describe('veřejné vs. interní dělení', () => {
  test.skip(isHQ, 'platí jen pro veřejný build');

  for (const s of interni) {
    test(`${s.href} (blok ${s.blok}) se veřejně nezobrazuje`, async ({ page }) => {
      await page.goto(s.href);
      const html = await page.content();
      expect(html, `${s.href} musí být jen přesměrování`).toContain('Redirecting');
      expect(html.length, `${s.href} nesmí nést obsah`).toBeLessThan(2000);
    });
  }

  test('domovská stránka je rozcestník, ne interní sekce 01', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toContainText(/Logomanual/i);
    expect(await page.content()).not.toContain('One of Us.');
  });
});

// ── Vlastní pravidlo knihy o barvě ────────────────────────────────────────
// Sekce Barvy vyhlašuje: „Blood Red nikdy na drobný text na černé." Kniha to
// sama porušovala na 121 místech — včetně legendy pod tabulkou barev, kde ta
// věta stála napsaná krvavou v 9 px. Od v3.0 na to jsou signální barvy.
//
// Dvě výjimky, obě vědomé:
//   · obsah uvnitř `Ukazka` — mockup krabičky nebo IG profilu ukazuje, jak
//     vypadá SKUTEČNÝ materiál; zesvětlit ho by znamenalo, že ukázka lže
//   · řetězce bez písmen (šipka „↓" u souboru ke stažení) — pozná se tvarem,
//     nečte se jako text
test('drobný text nikde nejede ve značkové červené', async ({ page }) => {
  const problemy = [];
  for (const s of stranky) {
    await page.goto(s.href);
    const nalezy = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('main *').forEach((el) => {
        if (el.children.length > 0) return;
        if (el.closest('[data-ukazka]')) return;
        const t = (el.textContent || '').trim();
        if (!t || !/\p{L}/u.test(t)) return;
        const st = getComputedStyle(el);
        const m = st.color.match(/\d+/g);
        if (!m) return;
        const [r, g, b] = m.map(Number);
        const krvava = (Math.abs(r - 185) < 12 && Math.abs(g - 28) < 12 && Math.abs(b - 28) < 12)
                    || (Math.abs(r - 220) < 12 && Math.abs(g - 38) < 12 && Math.abs(b - 38) < 12);
        if (!krvava) return;
        const px = parseFloat(st.fontSize);
        const tucne = parseInt(st.fontWeight, 10) >= 700;
        // „velký nápis": 24 px normálně, 18.66 px tučně
        if (px >= 24 || (tucne && px >= 18.66)) return;
        out.push(`${px.toFixed(1)}px „${t.slice(0, 30)}"`);
      });
      return out;
    });
    for (const n of nalezy) problemy.push(`${s.href} — ${n}`);
  }
  expect(problemy, 'drobný text v Blood Red (kontrast 3.06)').toEqual([]);
});

test('Loga a fonty jsou dostupné', async ({ request }) => {
  const soubory = [
    '/logo/wordmark-light.svg',
    '/logo/wordmark-dark.svg',
    '/logo/monogram-ld.svg',
    '/logo/hole-pattern.svg',
    '/logo/halo.svg',
    '/fonts/BigShouldersDisplay-Black.woff2',
    '/fonts/SpaceGrotesk-Regular.woff2',
    '/fonts/SpaceGrotesk-Bold.woff2',
    '/fonts/CaveatBrush-Regular.woff2',
  ];
  for (const f of soubory) {
    const res = await request.get(f);
    expect(res.status(), `${f} má vrátit 200`).toBe(200);
  }
});

// Kontrasty v sekci Barvy se počítají z HEX, ne opisují z dat — dřív byly
// vypsané ručně a sedm z jedenácti hodnot nesedělo. Tohle to hlídá.
test.describe('kontrasty v sekci Barvy', () => {
  test('čísla v tabulce sedí na skutečný kontrast barvy', async ({ page }) => {
    await page.goto('/colors');

    const radky = await page.locator('.tabulka-barev tbody tr').evaluateAll((trs) =>
      trs.map((tr) => {
        const bunky = tr.querySelectorAll('td');
        return {
          hex: bunky[2].textContent.trim(),
          naInk: parseFloat(bunky[5].textContent),
          naBone: parseFloat(bunky[6].textContent),
        };
      }),
    );

    const kanal = (v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const jas = (hex) => {
      const h = hex.replace('#', '');
      return (
        0.2126 * kanal(parseInt(h.slice(0, 2), 16)) +
        0.7152 * kanal(parseInt(h.slice(2, 4), 16)) +
        0.0722 * kanal(parseInt(h.slice(4, 6), 16))
      );
    };
    const pomer = (a, b) => {
      const l1 = Math.max(jas(a), jas(b));
      const l2 = Math.min(jas(a), jas(b));
      return (l1 + 0.05) / (l2 + 0.05);
    };

    expect(radky.length, 'tabulka musí mít řádky').toBeGreaterThan(0);
    for (const r of radky) {
      expect(r.naInk, `${r.hex} na černé`).toBeCloseTo(pomer(r.hex, '#0A0A0A'), 1);
      expect(r.naBone, `${r.hex} na světlé`).toBeCloseTo(pomer(r.hex, '#F5F5F0'), 1);
    }
  });

  test('Blood Red je označená jako nevhodná pro drobný text na černé', async ({ page }) => {
    await page.goto('/colors');
    const bunka = page.locator('.tabulka-barev tbody tr', { hasText: 'Blood Red' }).first().locator('td').nth(5);
    await expect(bunka).toHaveText('3.1');
    await expect(bunka).toHaveClass(/text-gold/);
  });
});
