# Design — Sekce „Maskot Eldee" v brandbooku

**Datum:** 2026-06-23
**Repo:** eldee-brandbook (Astro)
**Zdroj pravdy o podobě:** `07-eldee-business/eshop/maskot/MASKOT-character-bible.md`

## Cíl
Přidat do brandbooku **velkou samostatnou sekci** o maskotovi Eldee (lenochod). Přeložit character bible do hezké brandové stránky. Stavba z **existujících PNG** póz → 0 Higgsfield kreditů.

## Rozhodnutí (schváleno Lukášem 2026-06-23)
- **Umístění:** nová stránka `/mascot` v `NavSidebar`, zařazená do identity bloku **za „Logo Misuse"**; ostatní sekce přečíslovat.
- **Obrázky:** 3 hotové transparentní PNG (`eldee-prodejce`, `eldee-fotbalista`, `eldee-srdicko`) zkopírované do `public/mascot/`. Žádné nové generování, žádná vektorizace.
- **Sezónní série ZÁMĚRNĚ vynechána** — je to tajná drop série, veřejně neukazovat.
- **Status obrázků:** tichý štítek pro tým („ilustrace = pracovní AI verze, finální vektor v přípravě"). Pro web je PNG správný formát; vektor je samostatný budoucí úkol (výšivka/merch/tisk), cesta = ilustrátor dle `MASKOT-brief.md`.

## Struktura stránky (shora dolů)
1. **Hero** — velký Eldee (svatý prodejce) na tmavém pozadí, nadpis „Eldee", podtitul „Maskot = značka sama" + úvod (lenochod, Holy Socks → svatozář).
2. **Kdo je Eldee** — osobnost (chill, cool, drzý ale milý), jméno = název značky (proč), archetyp pohybu pro AI videa.
3. **Galerie póz** — karty: Svatý prodejce (hero), Fotbalista, Srdíčko — obrázek + název + „kdy použít".
4. **Kanonická podoba** — anatomie odshora dolů: svatozář → brýle/výraz → žíhání (espresso #5A3A2A, NE zrzavé) → tělo → 3 drápy → krabice → štulpny (3 půlměsícové díry, červený lem, LD logo).
5. **Barevná paleta maskota** — off-white `#F5F5F0` · espresso `#5A3A2A` · carbon `#0A0A0A` · gold `#C9A227` · blood red `#B91C1C`.
6. **Do / Don't** — off-brand pravidla (ne svalnatý, ne hektický pohyb, svatozář = plochý prstenec ne disk, díry půlměsícové ne kulaté, jen brand barvy, nikdy naštvaný).
7. **Pro tým / produkci** — sbalená poznámka: konzistenční kotvy + EN character-reference prompt pro AI + tichý štítek o statusu + odkazy ke stažení póz.

## Technické provedení
- Nová stránka `src/pages/mascot.astro` — znovupoužít komponenty `Layout`, `SectionTitle`, `LogoVariant`, `AssetDownload`. Obsah česky, nav titul EN „Mascot" (konzistentní se zbytkem).
- `NavSidebar.astro` — přidat položku „Mascot" za „Logo Misuse", přečíslovat sekce.
- **Při tom sjednotit verzi** v1.0 → v1.9 v `NavSidebar` a u PDF labelu v `assets.astro` (nalezený nesoulad).
- Ověření: `npm run build` musí projít; vizuální kontrola stránky.

## Co se NEdělá
- Negeneruje se žádný nový obrázek (0 kreditů).
- Nepřekresluje se vektor.
- Nesahá se na jiné sekce nad rámec přečíslování navigace + sjednocení verze.
- Nepushuje se bez Lukášova souhlasu.
