import { mkdir, copyFile, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Liste explicite : ni références, ni originaux, ni outils dans les assets publiés.
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
for (const file of ['index.html', '_headers', 'robots.txt']) {
  await copyFile(path.join(root, file), path.join(output, file));
}
for (const folder of ['css', 'js']) {
  await mkdir(path.join(output, folder), { recursive: true });
  for (const file of await readdir(path.join(root, folder))) {
    if (!file.endsWith(folder === 'css' ? '.css' : '.js')) continue;
    await copyFile(path.join(root, folder, file), path.join(output, folder, file));
  }
}
const manifest = JSON.parse(await readFile(path.join(root, 'assets/images/manifest.json'), 'utf8'));
await mkdir(path.join(output, 'assets/fonts'), { recursive: true });
for (const file of await readdir(path.join(root, 'assets/fonts'))) {
  if (!file.endsWith('.woff2') && !file.endsWith('-OFL.txt')) continue;
  await copyFile(path.join(root, 'assets/fonts', file), path.join(output, 'assets/fonts', file));
}
for (const image of manifest) {
  const target = path.join(output, image.local);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, image.local), target);
}
console.log(`Site statique préparé dans dist/ : ${manifest.length} images locales.`);
