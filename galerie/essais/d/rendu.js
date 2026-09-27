// Essai D · Salle obscure : une scène par toile, piste horizontale et pellicule.
Galerie.demarrer((serie, conteneur, outils) => {
  const salle = document.createElement('section');
  salle.className = 'salle';
  salle.setAttribute('aria-label', `Œuvres de la série ${serie.titre}`);
  salle.setAttribute('aria-roledescription', 'carrousel');

  const piste = document.createElement('div');
  piste.className = 'salle-piste';
  piste.tabIndex = 0;
  const pellicule = document.createElement('div');
  pellicule.className = 'salle-pellicule';
  const compte = document.createElement('p');
  compte.className = 'salle-compte';

  const scenes = serie.oeuvres.map((oeuvre, i) => {
    const scene = document.createElement('figure');
    scene.className = 'salle-scene';
    scene.setAttribute('aria-roledescription', 'diapositive');
    scene.setAttribute('aria-label', `${i + 1} sur ${serie.oeuvres.length}`);
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.setAttribute('aria-label', `Agrandir ${oeuvre.titre}`);
    bouton.append(outils.image(oeuvre, 'grand', { loading: i < 2 ? 'eager' : 'lazy' }));
    bouton.addEventListener('click', () => outils.ouvrir(serie.oeuvres, i));
    const legende = document.createElement('figcaption');
    legende.className = 'salle-legende';
    legende.innerHTML = `<b></b><small>${outils.formatLisible(oeuvre)}</small>`;
    legende.firstChild.textContent = oeuvre.titre;
    scene.append(bouton, legende);
    piste.append(scene);

    const vignette = document.createElement('button');
    vignette.type = 'button';
    vignette.setAttribute('aria-label', `Voir ${oeuvre.titre}`);
    vignette.append(outils.image(oeuvre, 'vignette', { loading: 'lazy', alt: '' }));
    vignette.addEventListener('click', () => aller(i));
    pellicule.append(vignette);
    return scene;
  });

  let actif = 0;
  function aller(i) {
    const cible = Math.max(0, Math.min(scenes.length - 1, i));
    piste.scrollTo({ left: scenes[cible].offsetLeft - piste.offsetLeft });
  }
  function marquer(i) {
    actif = i;
    scenes.forEach((scene, n) => scene.classList.toggle('is-active', n === i));
    [...pellicule.children].forEach((b, n) => (n === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    // Centre la vignette sans faire défiler la page elle-même.
    const vignette = pellicule.children[i];
    pellicule.scrollLeft = vignette.offsetLeft - pellicule.offsetLeft - (pellicule.clientWidth - vignette.offsetWidth) / 2;
    compte.textContent = `${String(i + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`;
  }
  const observateur = new IntersectionObserver((entrees) => {
    for (const entree of entrees) if (entree.isIntersecting) marquer(scenes.indexOf(entree.target));
  }, { root: piste, threshold: 0.6 });
  scenes.forEach((scene) => observateur.observe(scene));

  const fleche = (classe, texte, pas) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `salle-fleche ${classe}`;
    b.setAttribute('aria-label', texte);
    b.textContent = pas < 0 ? '←' : '→';
    b.addEventListener('click', () => aller(actif + pas));
    return b;
  };
  piste.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); aller(actif + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); aller(actif - 1); }
  });

  salle.append(fleche('salle-precedent', 'Œuvre précédente', -1), piste, fleche('salle-suivant', 'Œuvre suivante', 1), compte, pellicule);
  conteneur.append(salle);
  marquer(0);
});
