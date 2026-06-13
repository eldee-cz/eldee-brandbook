# DNS — nasměrování `brand.eldee.cz` na Vercel

Návod, jak rozjet brand book na vlastní adrese **`brand.eldee.cz`** místo `eldee-brandbook.vercel.app`.

> **Princip:** Vercelu řekneš „tahle adresa je moje", a u domény eldee.cz (registrátor **web4u**) nastavíš „když někdo napíše brand.eldee.cz, pošli ho na Vercel".

---

## KROK 1 — Vercel (zjistíš, co přesně nastavit)

1. [vercel.com](https://vercel.com) → projekt **eldee-brandbook** → **Settings** → **Domains**
2. Napiš `brand.eldee.cz` → **Add**
3. Vercel ukáže cílovou hodnotu — bude to **`cname.vercel-dns.com`**. Nech okno otevřené.

## KROK 2 — web4u (nastavíš samotné nasměrování)

1. Přihlas se na [www.web4u.cz](https://www.web4u.cz) do klientské sekce
2. Panel **„Vaše služby a jejich administrace"** → **„Správa domén"**
3. Klikni na ikonu **„Online DNS"** a vyber doménu **eldee.cz**
4. Dole v panelu **„Nový záznam"** přidej:

| Pole | Hodnota |
|---|---|
| **Název / subdoména** | `brand` |
| **Typ** | `CNAME` |
| **Hodnota / cíl** | `cname.vercel-dns.com` |

5. Ulož

## KROK 3 — počkat a ověřit

- Vrať se do Vercelu. Za pár minut až ~hodinu (než se DNS rozšíří) naskočí zelená fajfka ✅ a `https://brand.eldee.cz` pojede.
- SSL certifikát (https) si Vercel vyřeší automaticky.

---

## Na co pozor

- **Subdoménu `brand` to zvládne bez problému** — omezení CNAME (dle RFC1912) platí jen pro „holou" doménu (samotné `eldee.cz`), což tu neřešíme.
- Kdyby web4u chtěl u hodnoty tečku na konci (`cname.vercel-dns.com.`), nech ji tam — bývá to tak správně.
- Pokud něco v panelu web4u vypadá jinak, pošli screenshot a doladíme.

---

## Zdroje

- [Jak nasměrovat doménu pomocí DNS záznamů — Web4u](https://support.web4u.cz/cs/articles/6549631-jak-nasmerovat-domenu-pomoci-dns-zaznamu)
- [Online DNS — návod | Web4u](https://support.web4u.cz/cs/articles/6549629-online-dns-navod)

---

_Vytvořeno 2026-06-13 jako součást brandbook roadmapy (bod DNS)._
