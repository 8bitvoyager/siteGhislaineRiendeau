// Construit le site dans dist/ à partir des gabarits (modeles/) et du contenu (contenu/),
// que le CMS (/admin/) modifie. Les images de la galerie sont générées ici :
// une vignette et un grand format WebP par œuvre, mis en cache dans .cache/images/.
import { copyFile, cp, mkdir, readdir, readFile, rm, stat, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import nunjucks from 'nunjucks';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist');
const cache = path.join(root, '.cache/images');
const existe = (f) => access(f).then(() => true, () => false);
const lireJson = async (f) => JSON.parse(await readFile(path.join(root, f), 'utf8'));
const disque = (publicPath) => path.join(root, publicPath.replace(/^\//, ''));
const slug = (texte) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Repartir d’un dossier vide : aucun ancien fichier ne doit être déployé.
await mkdir(output, { recursive: true });
for (const entry of await readdir(output)) await rm(path.join(output, entry), { recursive: true, force: true });
await mkdir(cache, { recursive: true });

// 1. Contenu.
const [site, accueil, demarche, propos, contact, evenements, medias] = await Promise.all(
  ['site', 'accueil', 'demarche', 'a-propos', 'contact', 'evenements', 'medias'].map((nom) => lireJson(`contenu/${nom}.json`)),
);
const fichiersSeries = (await readdir(path.join(root, 'contenu/galerie'))).filter((f) => f.endsWith('.json'));
const series = (await Promise.all(fichiersSeries.map(async (f) => ({ id: f.replace(/\.json$/, ''), ...await lireJson(`contenu/galerie/${f}`) }))))
  .sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99));

// « 20 x 16 », « 20X16 » ou « 20 × 16 » deviennent « 20 × 16 ».
const normaliserFormat = (format) => {
  const nombres = String(format).match(/\d+(?:[.,]\d+)?/g);
  if (!nombres || nombres.length !== 2) throw new Error(`Format illisible : « ${format} » (attendu : 20 × 16)`);
  return nombres.map((n) => n.replace(',', '.')).join(' × ');
};

// 2. Images. Une variante WebP est produite une seule fois par contenu d’image (cache).
async function variante(source, largeurMax, qualite, destination) {
  const contenu = await readFile(source);
  const cle = createHash('sha1').update(contenu).update(`${largeurMax}-${qualite}`).digest('hex').slice(0, 16);
  const enCache = path.join(cache, `${cle}.webp`);
  if (!await existe(enCache)) {
    const meta = await sharp(contenu).metadata();
    const dejaBon = meta.format === 'webp' && Math.max(meta.width, meta.height) <= largeurMax;
    if (dejaBon) await copyFile(source, enCache);
    else await sharp(contenu).rotate().resize({ width: largeurMax, height: largeurMax, fit: 'inside', withoutEnlargement: true }).webp({ quality: qualite }).toFile(enCache);
  }
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(enCache, destination);
  const { width, height } = await sharp(destination).metadata();
  return { largeur: width, hauteur: height };
}

// Galerie : identifiant stable (titre + format), vignette et grand format.
const oeuvresTraitees = new Map();
for (const serie of series) {
  for (const oeuvre of serie.oeuvres ?? []) {
    oeuvre.format = normaliserFormat(oeuvre.format);
    oeuvre.id = `${slug(oeuvre.titre)}-${slug(oeuvre.format.replace('×', 'x'))}`;
    if (!oeuvresTraitees.has(oeuvre.id)) {
      const source = disque(oeuvre.image);
      if (!await existe(source)) throw new Error(`Image introuvable pour « ${oeuvre.titre} » : ${oeuvre.image}`);
      const vignette = `/assets/images/galerie/${oeuvre.id}-vignette.webp`;
      const grand = `/assets/images/galerie/${oeuvre.id}-grand.webp`;
      await variante(source, 640, 72, path.join(output, vignette));
      const dimensions = await variante(source, 1600, 78, path.join(output, grand));
      oeuvresTraitees.set(oeuvre.id, { vignette, grand, ...dimensions });
    }
    Object.assign(oeuvre, oeuvresTraitees.get(oeuvre.id));
  }
}
await mkdir(path.join(output, 'galerie'), { recursive: true });
await writeFile(path.join(output, 'galerie/oeuvres.json'), JSON.stringify({
  series: series.map(({ id, titre, sousTitre, oeuvres }) => ({
    id, titre, sousTitre,
    oeuvres: (oeuvres ?? []).map(({ titre: t, format, id: oid, vignette, grand, largeur, hauteur }) => ({ titre: t, format, id: oid, vignette, grand, largeur, hauteur })),
  })),
}));

// Autres images citées dans le contenu : dimensions lues ; celles déposées par le CMS
// (assets/uploads/) sont en plus réduites et converties en WebP.
const imagesDuContenu = new Set();
const parcourir = (valeur) => {
  if (typeof valeur === 'string' && /^\/assets\/.+\.(webp|jpe?g|png|gif|avif)$/i.test(valeur)) imagesDuContenu.add(valeur);
  else if (valeur && typeof valeur === 'object') Object.values(valeur).forEach(parcourir);
};
[site, accueil, demarche, propos, contact, evenements, medias].forEach(parcourir);
const images = new Map();
for (const src of imagesDuContenu) {
  if (!await existe(disque(src))) throw new Error(`Image introuvable dans le contenu : ${src}`);
  if (src.startsWith('/assets/uploads/')) {
    const cible = src.replace(/\.[a-z]+$/i, '.webp');
    images.set(src, { src: cible, ...await variante(disque(src), 1600, 80, path.join(output, cible)) });
  } else {
    const { width, height } = await sharp(disque(src)).metadata();
    images.set(src, { src, largeur: width, hauteur: height });
  }
}

// 3. Gabarits.
const env = nunjucks.configure(path.join(root, 'modeles'), { autoescape: true, trimBlocks: true, lstripBlocks: true, throwOnUndefined: false });
const echapper = nunjucks.lib.escape;
const sur = (html) => new nunjucks.runtime.SafeString(html);
const date = (iso) => new Date(`${iso}T12:00:00`);
const mois = (iso) => new Intl.DateTimeFormat('fr-CA', { month: 'short' }).format(date(iso));
const annee = (iso) => iso.slice(0, 4);

// Texte saisi dans le CMS : *italique* et retours à la ligne ; tout le reste est échappé.
env.addFilter('enrichi', (texte) => sur(echapper(String(texte ?? '')).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\r?\n/g, '<br>')));
env.addFilter('pouces', (format) => `${normaliserFormat(format)} po`);
env.addFilter('chiffres', (texte) => String(texte).replace(/\D/g, ''));
env.addFilter('jour', (iso) => String(date(iso).getDate()));
env.addFilter('moisAnnee', (iso) => `${mois(iso)} ${annee(iso)}`);
env.addFilter('dateLongue', (iso) => new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }).format(date(iso)));
env.addFilter('sansDates', (entrees) => (entrees ?? []).every((e) => !e.date));
// « 24 oct. au 20 déc. 2026 », ou une seule date si l’événement dure un jour.
env.addFilter('periode', ({ debut, fin }) => {
  const court = (iso) => `${date(iso).getDate()} ${mois(iso)}`;
  if (!fin || fin === debut) return sur(`<time datetime="${debut}">${court(debut)} ${annee(debut)}</time>`);
  const premier = annee(debut) === annee(fin) ? court(debut) : `${court(debut)} ${annee(debut)}`;
  return sur(`<time datetime="${debut}">${premier}</time> au <time datetime="${fin}">${court(fin)} ${annee(fin)}</time>`);
});
env.addGlobal('image', (src, alt, options = {}) => {
  const info = images.get(src);
  if (!info) throw new Error(`Image non préparée : ${src}`);
  const attributs = [
    options.classe ? ` class="${echapper(options.classe)}"` : '',
    ` src="${echapper(info.src)}" alt="${echapper(alt ?? '')}" width="${info.largeur}" height="${info.hauteur}"`,
    options.chargement ? ` loading="${options.chargement}"` : '',
    options.priorite ? ' fetchpriority="high"' : '',
  ];
  return sur(`<img${attributs.join('')}>`);
});

const menu = [
  { id: 'accueil', url: '/', titre: 'Accueil' },
  { id: 'demarche', url: '/demarche-artistique/', titre: 'Démarche artistique' },
  { id: 'a-propos', url: '/a-propos/', titre: 'À propos' },
  { id: 'galerie', url: '/galerie/', titre: 'Galerie' },
  { id: 'evenements', url: '/evenements/', titre: 'Événements' },
  { id: 'medias', url: '/medias/', titre: 'Médias' },
  { id: 'contact', url: '/contact/', titre: 'Contact' },
];
const essais = [
  { lettre: 'a', nom: 'Cimaise' }, { lettre: 'b', nom: 'Mosaïque' },
  { lettre: 'c', nom: 'Catalogue' }, { lettre: 'd', nom: 'Salle obscure' },
];
const evenementsTries = [...(evenements.evenements ?? [])].sort((a, b) => a.debut.localeCompare(b.debut));
const donnees = {
  site, accueil, demarche, propos, contact, evenements, medias, series, menu, essais, evenementsTries,
  evenementsVedette: evenementsTries.filter((e) => e.vedette && e.image),
  totalOeuvres: series.reduce((total, s) => total + (s.oeuvres?.length ?? 0), 0),
  nomsSeries: Object.fromEntries(series.map((s) => [s.id, s.titre])),
  polices: [], styles: [], scripts: [],
};
const pages = [
  ['accueil.njk', 'index.html'],
  ['demarche.njk', 'demarche-artistique/index.html'],
  ['a-propos.njk', 'a-propos/index.html'],
  ['contact.njk', 'contact/index.html'],
  ['evenements.njk', 'evenements/index.html'],
  ['medias.njk', 'medias/index.html'],
  ['galerie.njk', 'galerie/index.html'],
  ...essais.map((essai) => ['galerie-essai.njk', `galerie/essais/${essai.lettre}/index.html`, { essai }]),
];
for (const [modele, cible, extra] of pages) {
  const html = env.render(modele, { ...donnees, ...extra });
  await mkdir(path.dirname(path.join(output, cible)), { recursive: true });
  await writeFile(path.join(output, cible), html);
}

// 4. Fichiers statiques.
for (const file of ['_headers', 'robots.txt']) await copyFile(path.join(root, file), path.join(output, file));
for (const dossier of ['css', 'js', 'admin', 'galerie/essais']) {
  await cp(path.join(root, dossier), path.join(output, dossier), { recursive: true, filter: (f) => !f.endsWith('index.html') || dossier === 'admin' });
}
await cp(path.join(root, 'assets/fonts'), path.join(output, 'assets/fonts'), { recursive: true, filter: (f) => !f.endsWith('.md') });
// Images du site (hors originaux et documentation) et documents déposés (PDF…).
await cp(path.join(root, 'assets/images'), path.join(output, 'assets/images'), {
  recursive: true,
  filter: (f) => !f.includes(`${path.sep}originals`) && !/\.(md|json)$/.test(f),
});
await cp(path.join(root, 'assets/uploads'), path.join(output, 'assets/uploads'), {
  recursive: true,
  filter: async (f) => (await stat(f)).isDirectory() || !/\.(webp|jpe?g|png|gif|avif)$/i.test(f),
});

console.log(`Site préparé dans dist/ : ${pages.length} pages, ${oeuvresTraitees.size} œuvres, ${images.size} autres images.`);
