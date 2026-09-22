// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import { cp, access } from 'node:fs/promises';

// Interní PDF leží mimo `public/`, aby se nemohlo dostat do veřejného buildu
// (do 22. 9. 2026 leželo v public/ a logomanuál ho nabízel ke stažení i s celým
// blokem I). Do dist/ se kopíruje jen tady a jen když běží interní build.
const interniPdf = {
  name: 'eldee-interni-pdf',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      if (process.env.PUBLIC_HQ_BUILD !== '1') {
        logger.info('veřejný build — interní PDF se nekopíruje');
        return;
      }
      const zdroj = new URL('./pdf-interni/eldee-brandbook.pdf', import.meta.url);
      try {
        await access(zdroj);
      } catch {
        logger.warn('pdf-interni/eldee-brandbook.pdf chybí — spusť npm run generate-pdf');
        return;
      }
      await cp(zdroj, new URL('./eldee-brandbook.pdf', dir));
      logger.info('interní PDF zkopírováno do dist/');
    },
  },
};

// https://astro.build/config
export default defineConfig({
  // brand.eldee.cz nikdy nemělo nastavené DNS. Dokud se doména neřeší
  // (rozhodnuto 10. 9. — čeká se na stěhování hlavního webu na eldeeworld.com),
  // musí `site` ukazovat na adresu, kde build opravdu běží: jinak vedou
  // canonical odkazy i sitemap do prázdna — a přesměrování skrytých sekcí taky.
  site:
    process.env.PUBLIC_HQ_BUILD === '1'
      ? 'https://eldee-interni-brandbook.vercel.app'
      : 'https://eldee-logomanual.vercel.app',
  integrations: [sitemap(), interniPdf],
  vite: {
    plugins: [tailwindcss()],
  },
});