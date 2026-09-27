// Prépare les images de la galerie à partir de galerie/oeuvres.json.
// Pour chaque œuvre : télécharge l’original du WordPress (une seule fois),
// produit une vignette et un grand format WebP, puis complète le JSON
// (identifiant, fichiers, dimensions en pixels). Relancer après tout ajout.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const dataFile = path.join(root, 'galerie/oeuvres.json');
const originals = path.join(root, 'assets/images/originals/galerie');
const output = path.join(root, 'assets/images/galerie');
const wordpress = 'https://ghislaineriendeau.com/wp-content/uploads/';
const sizes = { vignette: 640, grand: 1600 };

const slug = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const exists = (file) => access(file).then(() => true, () => false);

const data = JSON.parse(await readFile(dataFile, 'utf8'));
await mkdir(originals, { recursive: true });
await mkdir(output, { recursive: true });

for (const serie of data.series) {
  for (const oeuvre of serie.oeuvres) {
    oeuvre.id = slug(oeuvre.titre) + '-' + slug(oeuvre.format.replace('×', 'x'));
    const original = path.join(originals, path.basename(oeuvre.source));
    if (!await exists(original)) {
      const response = await fetch(wordpress + oeuvre.source);
      if (!response.ok) throw new Error(`${oeuvre.source} : HTTP ${response.status}`);
      await writeFile(original, Buffer.from(await response.arrayBuffer()));
    }
    for (const [nom, cote] of Object.entries(sizes)) {
      const fichier = `assets/images/galerie/${oeuvre.id}-${nom}.webp`;
      if (!await exists(path.join(root, fichier))) {
        await sharp(original).rotate()
          .resize({ width: cote, height: cote, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: nom === 'grand' ? 78 : 72 }).toFile(path.join(root, fichier));
      }
      oeuvre[nom] = '/' + fichier;
    }
    const meta = await sharp(path.join(root, oeuvre.grand.slice(1))).metadata();
    oeuvre.largeur = meta.width;
    oeuvre.hauteur = meta.height;
    console.log(`${serie.id} · ${oeuvre.titre} (${meta.width} × ${meta.height})`);
  }
}
await writeFile(dataFile, JSON.stringify(data, null, 2) + '\n');
