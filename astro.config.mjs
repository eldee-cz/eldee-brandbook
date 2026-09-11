// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

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
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});