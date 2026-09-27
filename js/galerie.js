// Galerie : données, onglets de séries et visionneuse communs aux mises en page.
// Chaque page de style appelle Galerie.demarrer(rendu), où rendu(serie, conteneur)
// construit la série courante. La série est gardée dans l’ancre (#nouveautes).
(() => {
  const pouces = (format) => format.split('×').map((n) => parseFloat(n));

  // Formats en pouces orientés comme l’image : le plus grand côté va au plus long.
  function dimensionsReelles(oeuvre) {
    const [a, b] = pouces(oeuvre.format);
    const paysage = oeuvre.largeur >= oeuvre.hauteur;
    const [long, court] = a >= b ? [a, b] : [b, a];
    return paysage ? { largeur: long, hauteur: court } : { largeur: court, hauteur: long };
  }

  function formatLisible(oeuvre) {
    return `${oeuvre.format.replace(/\s*×\s*/, ' × ')} po`;
  }

  // Mène au formulaire de contact avec l’œuvre présélectionnée.
  function lienInformation(oeuvre) {
    return `/contact/?oeuvre=${encodeURIComponent(oeuvre.id)}#formulaire`;
  }

  function image(oeuvre, taille = 'vignette', attributs = {}) {
    const img = document.createElement('img');
    img.src = oeuvre[taille];
    img.alt = `${oeuvre.titre} — œuvre de Ghislaine Riendeau, ${formatLisible(oeuvre)}.`;
    img.width = taille === 'grand' ? oeuvre.largeur : Math.round(oeuvre.largeur * 640 / Math.max(oeuvre.largeur, oeuvre.hauteur));
    img.height = taille === 'grand' ? oeuvre.hauteur : Math.round(oeuvre.hauteur * 640 / Math.max(oeuvre.largeur, oeuvre.hauteur));
    img.decoding = 'async';
    Object.assign(img, attributs);
    return img;
  }

  // Visionneuse plein écran : clavier, balayage, précédent et suivant.
  function creerVisionneuse() {
    const dialog = document.createElement('dialog');
    dialog.className = 'visionneuse';
    dialog.innerHTML = `
      <div class="visionneuse-cadre">
        <figure class="visionneuse-oeuvre"><img alt=""></figure>
        <div class="visionneuse-infos">
          <p class="visionneuse-compte"></p>
          <h2 class="visionneuse-titre"></h2>
          <p class="visionneuse-format"></p>
          <a class="visionneuse-contact" href="#">S’informer sur cette œuvre <span aria-hidden="true">⟶</span></a>
        </div>
        <button class="visionneuse-bouton visionneuse-precedent" type="button" aria-label="Œuvre précédente">←</button>
        <button class="visionneuse-bouton visionneuse-suivant" type="button" aria-label="Œuvre suivante">→</button>
        <button class="visionneuse-bouton visionneuse-fermer" type="button" aria-label="Fermer">✕</button>
      </div>`;
    document.body.append(dialog);
    const img = dialog.querySelector('img');
    let liste = [];
    let index = 0;

    function afficher(i) {
      index = (i + liste.length) % liste.length;
      const oeuvre = liste[index];
      img.src = oeuvre.grand;
      img.alt = `${oeuvre.titre} — œuvre de Ghislaine Riendeau.`;
      img.width = oeuvre.largeur;
      img.height = oeuvre.hauteur;
      dialog.querySelector('.visionneuse-compte').textContent = `${index + 1} / ${liste.length}`;
      dialog.querySelector('.visionneuse-titre').textContent = oeuvre.titre;
      dialog.querySelector('.visionneuse-format').textContent = formatLisible(oeuvre);
      dialog.querySelector('.visionneuse-contact').href = lienInformation(oeuvre);
      // Précharge la suivante pour un défilement sans attente.
      new Image().src = liste[(index + 1) % liste.length].grand;
    }

    dialog.querySelector('.visionneuse-precedent').addEventListener('click', () => afficher(index - 1));
    dialog.querySelector('.visionneuse-suivant').addEventListener('click', () => afficher(index + 1));
    dialog.querySelector('.visionneuse-fermer').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') afficher(index - 1);
      if (event.key === 'ArrowRight') afficher(index + 1);
    });
    let depart = null;
    dialog.addEventListener('pointerdown', (event) => { depart = event.clientX; });
    dialog.addEventListener('pointerup', (event) => {
      if (depart === null) return;
      const ecart = event.clientX - depart;
      if (Math.abs(ecart) > 50) afficher(index + (ecart < 0 ? 1 : -1));
      depart = null;
    });
    dialog.addEventListener('close', () => document.documentElement.classList.remove('visionneuse-ouverte'));

    return {
      ouvrir(oeuvres, i) {
        liste = oeuvres;
        afficher(i);
        document.documentElement.classList.add('visionneuse-ouverte');
        dialog.showModal();
      },
    };
  }

  function onglets(series, courante) {
    const nav = document.querySelector('.galerie-onglets');
    nav.innerHTML = '';
    for (const serie of series) {
      const lien = document.createElement('a');
      lien.href = `#${serie.id}`;
      lien.innerHTML = `<span>${serie.titre}</span><small>${serie.oeuvres.length} œuvres</small>`;
      if (serie.id === courante.id) lien.setAttribute('aria-current', 'true');
      nav.append(lien);
    }
  }

  async function demarrer(rendu) {
    const reponse = await fetch('/galerie/oeuvres.json');
    const { series } = await reponse.json();
    const conteneur = document.querySelector('#galerie');
    const visionneuse = creerVisionneuse();
    const outils = { image, formatLisible, dimensionsReelles, lienInformation, ouvrir: visionneuse.ouvrir };

    function afficherSerie(premierAffichage) {
      const id = location.hash.slice(1);
      const serie = series.find((s) => s.id === id) ?? series[0];
      onglets(series, serie);
      document.querySelectorAll('[data-serie-titre]').forEach((el) => { el.textContent = serie.titre; });
      document.querySelectorAll('[data-serie-soustitre]').forEach((el) => { el.textContent = serie.sousTitre; });
      conteneur.innerHTML = '';
      rendu(serie, conteneur, outils);
      if (!premierAffichage) conteneur.closest('main').scrollIntoView({ block: 'start' });
    }
    window.addEventListener('hashchange', () => afficherSerie(false));
    afficherSerie(true);
  }

  window.Galerie = { demarrer };
})();
