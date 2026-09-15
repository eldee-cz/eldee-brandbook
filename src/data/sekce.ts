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
  /** Adresa předělové stránky bloku. */
  href: string;
  /**
   * Věta, proč blok existuje — nese ji předělová stránka.
   * Hlas značky, ne popis manuálu: `veta` je úder, `dovetek` ho doříká.
   */
  manifest: { veta: string; dovetek: string };
  /**
   * Akcentní barva bloku. Nese ji svislý pruh na předělu, ne drobný text —
   * `#B91C1C` má na černé kontrast 4.7 a podle vlastního pravidla knihy
   * (sekce Barvy) smí nést jen velké nápisy.
   */
  akcent: 'blood' | 'gold' | 'bone';
}

export const BLOKY: Record<BlokId, Blok> = {
  I: {
    id: 'I',
    nazev: 'Kdo jsme',
    otazka: 'Proč nám na tom záleží',
    verejny: false,
    href: '/blok/kdo-jsme',
    manifest: {
      veta: 'Tuhle část zvenku nevidíš.',
      dovetek: 'A přitom je jediný důvod, proč všechno ostatní dává smysl.',
    },
    akcent: 'blood',
  },
  II: {
    id: 'II',
    nazev: 'Jak vypadáme',
    otazka: 'Jak značka vypadá a zní',
    verejny: true,
    href: '/blok/jak-vypadame',
    manifest: {
      veta: 'Značku poznáš dřív, než si přečteš jméno.',
      dovetek: 'Tohle je všechno, podle čeho nás poznáš — a co se nemění podle nálady.',
    },
    akcent: 'gold',
  },
  III: {
    id: 'III',
    nazev: 'Jak to používáme',
    otazka: 'Co s tím smím dělat',
    verejny: true,
    href: '/blok/jak-to-pouzivame',
    manifest: {
      veta: 'Značka nežije v manuálu.',
      dovetek: 'Žije na krabičce, na profilu a na dresu klubu, co si nás vybral.',
    },
    akcent: 'bone',
  },
};

/** Pořadí bloků v knize. Na jednom místě, ať ho nikdo nepíše ručně podruhé. */
export const PORADI_BLOKU: BlokId[] = ['I', 'II', 'III'];

export interface Sekce {
  cislo: string;
  nazev: string;
  href: string;
  blok: BlokId;
  popis: string;
  /**
   * Podstránky, které nejsou samostatnou sekcí, ale do PDF patří hned za ni
   * (v menu se neukazují). Dřív žily jen v ručním seznamu v generate-pdf.mjs.
   */
  podstranky?: string[];
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
  { cislo: '08', nazev: 'Logo',          href: '/logo',        blok: 'II',  popis: 'Logo, varianty, monogram, wordmark.', podstranky: ['/logo/construction'] },
  { cislo: '09', nazev: 'Logo — co ne',  href: '/logo/misuse', blok: 'II',  popis: 'Zakázané úpravy loga.' },
  { cislo: '10', nazev: 'Barvy',         href: '/colors',      blok: 'II',  popis: 'HEX, RGB, CMYK, Pantone, kontrasty.' },
  { cislo: '11', nazev: 'Typografie',    href: '/typography',  blok: 'II',  popis: 'Fonty a jejich použití.' },
  { cislo: '12', nazev: 'Maskot',        href: '/mascot',      blok: 'II',  popis: 'Eldee — lenochod.' },
  { cislo: '13', nazev: 'Doplňkové prvky', href: '/patterns', blok: 'II', popis: 'Svatozář a brush.' },
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
 * Platí i pro předělové stránky bloků.
 */
export function skryvatVeVerejnem(path: string): boolean {
  const cista = path.replace(/\/$/, '') || '/';
  const blok = Object.values(BLOKY).find((b) => b.href === cista);
  if (blok) return !blok.verejny;
  const sekce = SEKCE.find((s) => s.href === cista);
  return sekce ? !jeVerejna(sekce) : false;
}

/** Bloky, které v daném buildu existují. Veřejný logomanuál nemá blok I. */
export function blokyProBuild(hq: boolean): Blok[] {
  return PORADI_BLOKU.map((id) => BLOKY[id]).filter((b) => hq || b.verejny);
}

/** Blok podle adresy jeho předělové stránky. */
export function najdiBlok(href: string): Blok | undefined {
  const cista = href.replace(/\/$/, '') || '/';
  return Object.values(BLOKY).find((b) => b.href === cista);
}

/**
 * Pořadí stránek, jak jdou v knize za sebou: předěl bloku, jeho sekce,
 * podstránky sekcí. Odsud si bere pořadí PDF — dřív měl vlastní ručně psaný
 * seznam, který zapomněl na novou sekci /produkt.
 */
export function poradiStranek(hq: boolean): string[] {
  const sekce = sekceProBuild(hq);
  const out: string[] = [];
  for (const blok of blokyProBuild(hq)) {
    out.push(blok.href);
    for (const s of sekce.filter((x) => x.blok === blok.id)) {
      out.push(s.href);
      for (const p of s.podstranky ?? []) out.push(p);
    }
  }
  return out;
}
