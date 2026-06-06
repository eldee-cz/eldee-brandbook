// Odvozené assety pro stránku Logo Misuse — generuje z aktuálního wordmark-light.svg.
// (old-wordmark-v1.svg je statický historický artefakt z git show 9b0d2c6, neregeneruje se.)
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const src = await readFile('public/logo/wordmark-light.svg', 'utf8');
await mkdir('public/logo/misuse', { recursive: true });

// 1) Špatné barvy — toxic green písmena + růžová svatozář
const wrongColor = src
  .replaceAll('#F5F5F0', '#39FF14')
  .replaceAll('#C9A227', '#FF2D9A')
  .replace('<!-- eldee wordmark v2', '<!-- MISUSE ukázka: špatné barvy. NIKDY nepoužívat. Odvozeno z wordmark-light.svg');
await writeFile('public/logo/misuse/wrong-colors.svg', wrongColor);

// 2) Zalitá spára — odstraníme mask atribut z D → knockout zmizí, písmena splynou
const filled = src
  .replace(/ mask="url\(#wm-ko-light\)"/, '')
  .replace('<!-- eldee wordmark v2', '<!-- MISUSE ukázka: zalitá knockout spára. NIKDY. Odvozeno z wordmark-light.svg');
await writeFile('public/logo/misuse/filled-spara.svg', filled);

console.log('Misuse assety: wrong-colors.svg, filled-spara.svg');
