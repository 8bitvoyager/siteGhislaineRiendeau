// Essai C · Catalogue : un sommaire en vignettes, puis une planche par œuvre.
Galerie.demarrer((serie, conteneur, outils) => {
  const catalogue = document.createElement('section');
  catalogue.className = 'catalogue container';
  catalogue.setAttribute('aria-label', `Catalogue de la série ${serie.titre}`);

  const sommaire = document.createElement('nav');
  sommaire.className = 'sommaire';
  sommaire.setAttribute('aria-label', 'Sommaire des œuvres');
  const total = String(serie.oeuvres.length).padStart(2, '0');
  const planches = document.createElement('div');

  serie.oeuvres.forEach((oeuvre, i) => {
    const ancre = `oeuvre-${oeuvre.id}`;
    const lien = document.createElement('a');
    lien.href = `#${serie.id}`;
    lien.title = oeuvre.titre;
    lien.append(outils.image(oeuvre, 'vignette', { loading: 'lazy' }));
    lien.addEventListener('click', (event) => {
      event.preventDefault();
      document.getElementById(ancre).scrollIntoView({ behavior: 'smooth' });
    });
    sommaire.append(lien);

    const planche = document.createElement('article');
    planche.className = 'planche';
    planche.id = ancre;
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'planche-image';
    bouton.setAttribute('aria-label', `Agrandir ${oeuvre.titre}`);
    bouton.append(outils.image(oeuvre, 'grand', { loading: i < 2 ? 'eager' : 'lazy' }));
    bouton.addEventListener('click', () => outils.ouvrir(serie.oeuvres, i));
    const texte = document.createElement('div');
    texte.className = 'planche-texte';
    texte.innerHTML = `
      <p class="planche-numero">${String(i + 1).padStart(2, '0')}<small>/ ${total}</small></p>
      <h2></h2>
      <p class="planche-format">${outils.formatLisible(oeuvre)}</p>
      <a class="text-link" href="${outils.lienInformation(oeuvre)}">S’informer sur cette œuvre <span aria-hidden="true">⟶</span></a>`;
    texte.querySelector('h2').textContent = oeuvre.titre;
    planche.append(bouton, texte);
    planches.append(planche);
  });

  catalogue.append(sommaire, planches);
  conteneur.append(catalogue);
});
