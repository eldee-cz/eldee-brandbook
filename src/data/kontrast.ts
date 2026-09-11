// Kontrastní poměry podle WCAG 2.1 — počítané, ne psané ručně.
//
// Proč: v `colors.json` byly kontrasty vypsané rukou a sedm z jedenácti
// nesedělo. Dvě čísla přitom nesla pravidlo:
//   Blood Red #B91C1C na černé  — v datech 4.7, ve skutečnosti 3.1
//   Blood Red Dark #7F1D1D      — v datech 7.3, ve skutečnosti 2.0
// Brand book, který udává kontrasty, je nesmí mít vymyšlené. Odsud se berou
// pro tabulku i pro verdikt, takže se s barvou rozejít nemůžou.

export const INK = '#0A0A0A';
export const BONE = '#F5F5F0';

function kanal(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relativní jas podle WCAG. */
export function jas(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
}

/** Kontrastní poměr dvou barev, 1 až 21. */
export function pomer(a: string, b: string): number {
  const l1 = Math.max(jas(a), jas(b));
  const l2 = Math.min(jas(a), jas(b));
  return (l1 + 0.05) / (l2 + 0.05);
}

export type Verdikt = 'bezny' | 'velky' | 'zadny';

/**
 * Na co barva na daném podkladu stačí.
 *   bezny — 4.5+, projde i na drobný text (AA)
 *   velky — 3.0+, jen nadpisy od 24 px, nebo 19 px tučně
 *   zadny — pod 3.0, jako text vůbec; zbývá plocha, pruh, ikona
 */
export function verdikt(p: number): Verdikt {
  if (p >= 4.5) return 'bezny';
  if (p >= 3) return 'velky';
  return 'zadny';
}

export const POPIS_VERDIKTU: Record<Verdikt, string> = {
  bezny: 'i drobný text',
  velky: 'jen velké nápisy',
  zadny: 'jako text ne',
};
