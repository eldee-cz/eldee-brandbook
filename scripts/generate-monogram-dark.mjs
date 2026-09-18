// Tmavé varianty monogramu — odvozené ze schválených masterů, ne kreslené znovu.
//
// Proč zvlášť a ne v generate-monogram.mjs: ten generátor je z v1 (jiná geometrie,
// viewBox 0 0 320 420). Masterům v2.1 by přepsal tvar. Tady se mění JEN barva
// písmen (atribut `color` → currentColor), tvar zůstává bajt po bajtu stejný.
//
//   monogram-ld-dark.svg   — tmavá písmena, zlatá svatozář. Pro papír (print.css).
//   monogram-mono-dark.svg — celé tmavé, i svatozář. Pro kraft: zlatá má na kraftu
//                            kontrast jen 1,1 : 1 a zmizí (revize 18. 9. 2026).
//
// Spusť po každé změně masteru:  node scripts/generate-monogram-dark.mjs
import { readFile, writeFile } from 'node:fs/promises';

const SVETLA = 'color="#F5F5F0"';
const TMAVA = 'color="#0A0A0A"';

for (const jmeno of ['monogram-ld', 'monogram-mono']) {
  const master = await readFile(`public/logo/${jmeno}.svg`, 'utf8');
  const vyskyty = master.split(SVETLA).length - 1;
  if (vyskyty !== 1) throw new Error(`${jmeno}.svg: čekal jsem právě jedno ${SVETLA}, našel jsem ${vyskyty}`);
  const tmavy = master
    .replace(SVETLA, TMAVA)
    .replace('<!-- eldee LD monogram', '<!-- TMAVÁ VARIANTA (odvozeno skriptem generate-monogram-dark.mjs) · eldee LD monogram');
  await writeFile(`public/logo/${jmeno}-dark.svg`, tmavy);
  console.log(`public/logo/${jmeno}-dark.svg`);
}
