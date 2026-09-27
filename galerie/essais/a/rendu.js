// Essai A · Cimaise : chaque toile est dessinée à l’échelle de ses vraies dimensions.
Galerie.demarrer((serie, conteneur, outils) => {
  const mur = document.createElement('section');
  mur.className = 'cimaise';
  mur.setAttribute('aria-label', `Œuvres de la série ${serie.titre}, à l’échelle`);
  conteneur.append(mur);

  function dessiner() {
    mur.innerHTML = '';
    const plusGrand = Math.max(...serie.oeuvres.flatMap((o) => Object.values(outils.dimensionsReelles(o))));
    // La plus grande toile de la série occupe environ 420 px (ou 80 % de l’écran sur mobile).
    const cible = Math.min(420, window.innerWidth * 0.8);
    const pixelsParPouce = cible / plusGrand;
    const repere = plusGrand > 20 ? 12 : 4;

    const inner = document.createElement('div');
    inner.className = 'container';
    inner.innerHTML = `<p class="cimaise-echelle"><i style="width:${Math.round(repere * pixelsParPouce)}px"></i>${repere} po · ${Math.round(repere * 2.54)} cm — toiles à l’échelle</p>`;
    const rangee = document.createElement('div');
    rangee.className = 'cimaise-mur';
    serie.oeuvres.forEach((oeuvre, i) => {
      const { largeur, hauteur } = outils.dimensionsReelles(oeuvre);
      const figure = document.createElement('figure');
      figure.className = 'cimaise-oeuvre';
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.setAttribute('aria-label', `Agrandir ${oeuvre.titre}`);
      const img = outils.image(oeuvre, 'vignette', { loading: i < 6 ? 'eager' : 'lazy' });
      img.style.width = `${Math.round(largeur * pixelsParPouce)}px`;
      img.style.height = `${Math.round(hauteur * pixelsParPouce)}px`;
      img.style.objectFit = 'cover';
      bouton.append(img);
      bouton.addEventListener('click', () => outils.ouvrir(serie.oeuvres, i));
      const cartel = document.createElement('figcaption');
      cartel.className = 'cartel';
      cartel.innerHTML = `<p></p><p>${outils.formatLisible(oeuvre)}</p>`;
      cartel.firstChild.textContent = oeuvre.titre;
      figure.append(bouton, cartel);
      rangee.append(figure);
    });
    inner.append(rangee);
    mur.append(inner);
  }

  dessiner();
  let largeurPrecedente = window.innerWidth;
  window.onresize = () => {
    if (Math.abs(window.innerWidth - largeurPrecedente) < 40) return;
    largeurPrecedente = window.innerWidth;
    dessiner();
  };
});
