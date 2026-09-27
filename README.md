# Ghislaine Riendeau — accueil v2

Direction visuelle actuelle : `reference/1a-22sept.png` (refonte du 22 septembre 2026). Aperçus : `reference/apercu-1440.png` et `reference/apercu-390.png`.

Page statique en HTML, CSS et JavaScript vanilla. Les pages intérieures restent sur le WordPress principal. Images réelles téléchargées et optimisées localement ; voir [SOURCES.md](assets/images/SOURCES.md) et [l’inventaire](assets/images/INVENTORY.md).

## Démarrer

Node.js 22 ou version ultérieure.

```sh
npm ci
npm run dev
```

Ouvrir http://127.0.0.1:8787. Après modification des fichiers sources, relancer la commande pour reconstruire `dist/`.

## Vérifier et déployer

```sh
npm run check:deploy
npx wrangler login
npm run deploy
```

Le compte Cloudflare connecté doit gérer la zone `ghislaineriendeau.com` et disposer des autorisations Workers et domaines personnalisés. Le déploiement associe uniquement **v2.ghislaineriendeau.com** au Worker `ghislaine-home-v2`. Si ce sous-domaine possède déjà un enregistrement incompatible, résoudre ce conflit dans Cloudflare avant de déployer. Aucune route ne cible le domaine racine ou `www`.

La configuration utilise Workers Static Assets et `compatibility_date: 2026-09-19`, sans code Worker. Le dépôt est préparé pour le déploiement ; aucun déploiement distant n’a été effectué pendant la préparation.

`npm run build` copie uniquement HTML, CSS, JS, en-têtes, robots et les WebP du manifeste. Les maquettes, captures, originaux, documents de provenance et images de la première version ne sont pas publiés. La preview porte `noindex` via HTML et en-têtes HTTP, ainsi qu’un robots.txt restrictif.

Documentation : [Static Assets](https://developers.cloudflare.com/workers/static-assets/) et [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
