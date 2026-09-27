// Essai B · Mosaïque : rangées justifiées qui gardent les proportions de chaque toile.
Galerie.demarrer((serie, conteneur, outils) => {
  const mosaique = document.createElement('section');
  mosaique.className = 'mosaique container';
  mosaique.setAttribute('aria-label', `Œuvres de la série ${serie.titre}`);
  conteneur.append(mosaique);

  const tuiles = serie.oeuvres.map((oeuvre, i) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'mosaique-tuile galerie-oeuvre';
    bouton.setAttribute('aria-label', `Agrandir ${oeuvre.titre}`);
    bouton.append(outils.image(oeuvre, 'vignette', { loading: i < 8 ? 'eager' : 'lazy' }));
    const legende = document.createElement('span');
    legende.className = 'mosaique-legende';
    legende.innerHTML = `<b></b><small>${outils.formatLisible(oeuvre)}</small>`;
    legende.firstChild.textContent = oeuvre.titre;
    bouton.append(legende);
    bouton.addEventListener('click', () => outils.ouvrir(serie.oeuvres, i));
    return { bouton, ratio: oeuvre.largeur / oeuvre.hauteur };
  });

  function disposer() {
    const largeur = mosaique.clientWidth;
    if (!largeur) return;
    const espace = largeur < 600 ? 6 : 12;
    const hauteurCible = largeur < 600 ? 170 : largeur < 1000 ? 240 : 320;
    mosaique.style.setProperty('--espace', `${espace}px`);
    mosaique.replaceChildren();

    // 1. Répartir les tuiles en rangées d’environ la hauteur cible.
    const rangees = [[]];
    let somme = 0;
    for (const tuile of tuiles) {
      const courante = rangees.at(-1);
      courante.push(tuile);
      somme += tuile.ratio;
      if (somme * hauteurCible + espace * (courante.length - 1) >= largeur) {
        rangees.push([]);
        somme = 0;
      }
    }
    if (!rangees.at(-1).length) rangees.pop();
    // 2. Une dernière rangée à moitié vide rejoint la précédente, pour ne pas laisser de toile isolée.
    const derniere = rangees.at(-1);
    const remplissage = derniere.reduce((s, t) => s + t.ratio, 0) * hauteurCible / largeur;
    const incomplete = remplissage < 1;
    if (incomplete && remplissage < 0.6 && rangees.length > 1) rangees.at(-2).push(...rangees.pop());

    // 3. Justifier chaque rangée sur toute la largeur.
    rangees.forEach((rangee, n) => {
      const ratios = rangee.reduce((s, t) => s + t.ratio, 0);
      const disponible = largeur - espace * (rangee.length - 1);
      const estDerniere = n === rangees.length - 1 && incomplete && remplissage >= 0.6;
      const hauteur = estDerniere ? Math.min(hauteurCible, disponible / ratios) : disponible / ratios;
      const ligne = document.createElement('div');
      ligne.className = 'mosaique-rangee';
      for (const tuile of rangee) {
        tuile.bouton.style.width = `${Math.floor(tuile.ratio * hauteur)}px`;
        tuile.bouton.style.height = `${Math.floor(hauteur)}px`;
        ligne.append(tuile.bouton);
      }
      mosaique.append(ligne);
    });
  }

  // Ne recalculer que si la largeur change (la hauteur varie à chaque disposition).
  let largeurPrecedente = 0;
  new ResizeObserver(() => {
    if (mosaique.clientWidth === largeurPrecedente) return;
    largeurPrecedente = mosaique.clientWidth;
    disposer();
  }).observe(mosaique);
});
