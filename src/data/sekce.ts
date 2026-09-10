// Jediný zdroj pravdy o struktuře brand booku (v3.0).
//
// Dřív žil seznam sekcí na třech místech (NavSidebar, TableOfContents, rozcestník
// logomanuálu) a rozešel se — čísla si neodpovídala a Maskot v obsahu vůbec nebyl.
// Teď se všechno bere odsud.
//
// Veřejnost se NEurčuje u jednotlivé stránky, ale blokem: blok I je interní,
// bloky II a III veřejné. Nová sekce tak patří někam automaticky.

export const VERZE = 'v3.0';

export type BlokId = 'I' | 'II' | 'III';

export interface Blok {
  id: BlokId;
  nazev: string;
  otazka: string;
  verejny: boolean;
}

export const BLOKY: Record<BlokId, Blok> = {
  I: {
    id: 'I',
    nazev: 'Kdo jsme',
    otazka: 'Proč nám na tom záleží',
    verejny: false,
  },
  II: {
    id: 'II',
    nazev: 'Jak vypadáme',
    otazka: 'Jak značka vypadá a zní',
    verejny: true,
  },
  III: {
    id: 'III',
    nazev: 'Jak to používáme',
    otazka: 'Co s tím smím dělat',
    verejny: true,
  },
};

export interface Sekce {
  cislo: string;
  nazev: string;
  href: string;
  blok: BlokId;
  popis: string;
}

export const SEKCE: Sekce[] = [
  // I — Kdo jsme (interní)
  { cislo: '01', nazev: 'One of Us.',    href: '/',            blok: 'I',   popis: 'Jádro značky, claim, razítko.' },
  { cislo: '02', nazev: 'Příběh',        href: '/story',       blok: 'I',   popis: 'Odkud se eldee vzalo.' },
  { cislo: '03', nazev: 'DNA',           href: '/dna',         blok: 'I',   popis: 'Povaha, hodnoty, archetypy.' },
  { cislo: '04', nazev: 'Pro koho',      href: '/audience',    blok: 'I',   popis: 'Hráč a klub — kdo nosí eldee.' },
  { cislo: '05', nazev: 'Positioning',   href: '/positioning', blok: 'I',   popis: 'Kde eldee stojí na trhu.' },
  { cislo: '06', nazev: 'Produkt',       href: '/produkt',     blok: 'I',   popis: 'Střihy, díry, kapsa, velikosti.' },
  { cislo: '07', nazev: 'Hlas a tón',    href: '/voice',       blok: 'I',   popis: 'Jak eldee mluví.' },

  // II — Jak vypadáme (veřejné)
  { cislo: '08', nazev: 'Logo',          href: '/logo',        blok: 'II',  popis: 'Logo, varianty, monogram, wordmark.' },
  { cislo: '09', nazev: 'Logo — co ne',  href: '/logo/misuse', blok: 'II',  popis: 'Zakázané úpravy loga.' },
  { cislo: '10', nazev: 'Barvy',         href: '/colors',      blok: 'II',  popis: 'HEX, RGB, CMYK, Pantone, kontrasty.' },
  { cislo: '11', nazev: 'Typografie',    href: '/typography',  blok: 'II',  popis: 'Fonty a jejich použití.' },
  { cislo: '12', nazev: 'Maskot',        href: '/mascot',      blok: 'II',  popis: 'Eldee — lenochod.' },
  { cislo: '13', nazev: 'Vzor',          href: '/patterns',    blok: 'II',  popis: 'Hole pattern, svatozář, brush.' },
  { cislo: '14', nazev: 'Vizuální styl', href: '/photography', blok: 'II',  popis: 'Co fotit a co ne.' },

  // III — Jak to používáme (veřejné)
  { cislo: '15', nazev: 'Tisk',          href: '/print',       blok: 'III', popis: 'Vizitka, krabička, hangtag, etiketa.' },
  { cislo: '16', nazev: 'Digitál',       href: '/digital',     blok: 'III', popis: 'Web, Instagram, TikTok, e-mail.' },
  { cislo: '17', nazev: 'Co-branding',   href: '/co-branding', blok: 'III', popis: 'Klub, ambasador, sponzor.' },
  { cislo: '—',  nazev: 'Assety',        href: '/assets',      blok: 'III', popis: 'Loga, fonty, podklady ke stažení.' },
];

/** Je sekce ve veřejném logomanuálu? Rozhoduje blok, ne jednotlivá stránka. */
export function jeVerejna(sekce: Sekce): boolean {
  return BLOKY[sekce.blok].verejny;
}

/**
 * Sekce pro daný build. Plný brand book má všechno a drží čísla 01–17.
 * Logomanuál má jen veřejné bloky, a protože by jinak začínal osmičkou,
 * přečísluje se od jedničky. Assety si drží pomlčku v obou případech.
 */
export function sekceProBuild(hq: boolean): Sekce[] {
  if (hq) return SEKCE;
  let poradi = 0;
  return SEKCE.filter(jeVerejna).map((s) => {
    if (s.cislo === '—') return s;
    poradi += 1;
    return { ...s, cislo: String(poradi).padStart(2, '0') };
  });
}

/** Sekce podle cesty — pro hlavičku stránky (číslo, název, blok). */
export function najdiSekci(href: string, hq: boolean): Sekce | undefined {
  const cista = href.replace(/\/$/, '') || '/';
  return sekceProBuild(hq).find((s) => s.href === cista);
}

/** Štítek do hlavičky sekce: „Blok I · kdo jsme / 01 · one of us." */
export function stitekSekce(sekce: Sekce): string {
  const blok = BLOKY[sekce.blok];
  const cislo = sekce.cislo === '—' ? '' : `${sekce.cislo} · `;
  return `Blok ${blok.id} · ${blok.nazev} / ${cislo}${sekce.nazev}`;
}

/**
 * Má se stránka ve veřejném logomanuálu schovat? Rozhoduje blok sekce,
 * takže se to nemusí hlídat stránku po stránce — nová sekce se schová
 * nebo zveřejní automaticky podle toho, do kterého bloku ji zařadíš.
 */
export function skryvatVeVerejnem(path: string): boolean {
  const cista = path.replace(/\/$/, '') || '/';
  const sekce = SEKCE.find((s) => s.href === cista);
  return sekce ? !jeVerejna(sekce) : false;
}
