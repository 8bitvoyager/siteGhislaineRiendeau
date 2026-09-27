# Ghislaine Riendeau — site v2

Direction visuelle actuelle : `reference/1a-22sept.png` (refonte du 22 septembre 2026). Aperçus : `reference/apercu-1440.png` et `reference/apercu-390.png`.

Site statique (HTML, CSS et JavaScript vanilla) publié sur **v2.ghislaineriendeau.com** par Cloudflare Workers Static Assets. Les textes, les événements et la galerie sont modifiables par un CMS ([Sveltia CMS](https://github.com/sveltia/sveltia-cms)) sur `/admin/`. Provenance des images : [SOURCES.md](assets/images/SOURCES.md) et [l’inventaire](assets/images/INVENTORY.md).

## Organisation

| Dossier | Rôle |
|---|---|
| `contenu/` | Textes et listes du site, en JSON. **C’est ce que le CMS modifie.** |
| `contenu/galerie/` | Une fiche par série : titre, sous-titre, ordre et œuvres (titre, format, photo). |
| `assets/uploads/` | Photos et documents déposés par le CMS. `assets/uploads/galerie/` contient la photo source de chaque œuvre. |
| `modeles/` | Gabarits [Nunjucks](https://mozilla.github.io/nunjucks/) des pages ; `modeles/partiels/` contient l’en-tête et le pied de page communs. |
| `admin/` | Page et configuration du CMS (`config.yml`). |
| `css/`, `js/`, `assets/images/`, `assets/fonts/` | Styles, scripts, images fixes du design et polices. |
| `galerie/essais/` | Styles et scripts des quatre essais de galerie. |

`npm run build` assemble gabarits et contenu dans `dist/`, génère pour chaque œuvre une vignette (640 px) et un grand format (1600 px) en WebP, ainsi que `galerie/oeuvres.json` pour les scripts de la galerie. Les images déposées ailleurs dans `assets/uploads/` sont réduites à 1600 px et converties en WebP. Les conversions sont mises en cache dans `.cache/images/`.

Les textes saisis dans le CMS acceptent l’italique (`*comme ceci*`) et les retours à la ligne ; le reste est affiché tel quel.

## Démarrer

Node.js 22 ou version ultérieure.

```sh
npm ci
npm run dev
```

Ouvrir http://127.0.0.1:8787. Dans un second terminal, `npm run surveiller` reconstruit `dist/` à chaque modification du contenu ou des gabarits. Un fichier **nouveau** (photo ajoutée) n’est vu par wrangler qu’après un redémarrage de `npm run dev`.

## Modifier le contenu avec le CMS

**En local, sans connexion GitHub** : ouvrir http://127.0.0.1:8787/admin/ dans Chrome ou Edge, cliquer sur « Travailler avec un dépôt local » et sélectionner le dossier du projet. Les modifications sont écrites directement dans `contenu/` et `assets/uploads/` ; les commiter ensuite comme d’habitude.

**En ligne** : le CMS enregistre chaque modification par un commit sur la branche indiquée dans `admin/config.yml` (`backend.branch`). Cloudflare reconstruit alors le site. La connexion GitHub nécessite :

1. une [application OAuth GitHub](https://github.com/settings/developers) ;
2. le Worker d’authentification [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth), déployé sur Cloudflare avec l’identifiant et le secret de cette application ;
3. l’adresse de ce Worker dans `backend.base_url` de `admin/config.yml`.

Solution plus simple pour un essai : « Se connecter avec un jeton d’accès », avec un jeton GitHub à portée fine limité à ce dépôt (permission *Contents : lecture et écriture*). Aucun Worker n’est alors nécessaire.

Toute personne qui modifie le contenu en ligne doit être collaboratrice du dépôt GitHub.

## Vérifier et déployer

Chaque commit sur `main` est déployé par Cloudflare Workers Builds (commande de build `npm run build`, déploiement `npx wrangler deploy`). Les autres branches produisent une version de prévisualisation (`preview_urls`).

```sh
npm run check:deploy
```

Le déploiement associe uniquement **v2.ghislaineriendeau.com** au Worker `ghislaine-home-v2`. Aucune route ne cible le domaine racine ou `www`. Le site porte `noindex` via HTML et en-têtes HTTP, ainsi qu’un robots.txt restrictif.

Documentation : [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [Sveltia CMS](https://github.com/sveltia/sveltia-cms).
