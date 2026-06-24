// Režim buildu eldee:
//   PUBLIC_HQ_BUILD=1  → plný interní BRAND BOOK (všechny stránky) — 2. Vercel deploy (noindex)
//   nenastaveno        → veřejný LOGOMANUAL (osekaný: jen public stránky) — hlavní Vercel deploy
//
// Oba buildy běží od kořene (base "/"), takže se nepřepisují žádné cesty k assetům.
export const isHQ = import.meta.env.PUBLIC_HQ_BUILD === '1';
