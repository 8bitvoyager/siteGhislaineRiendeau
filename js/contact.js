// Formulaire de contact : œuvre présélectionnée (?oeuvre=identifiant) et envoi.
//
// ENVOI : Web3Forms (https://web3forms.com). La clé d’accès est publique par
// conception : elle permet seulement d’envoyer vers l’adresse liée au compte.
// Tant qu’elle est vide, le message est préparé dans le logiciel de courriel
// du visiteur, adressé à Ghislaine.
const ENVOI = {
  url: 'https://api.web3forms.com/submit',
  champs: { access_key: '96357849-4623-4d98-8a98-96bd21b45aab' },
};
const COURRIEL = 'grcr77@hotmail.com';

const form = document.querySelector('#contact-form');
if (form) {
  const statut = form.querySelector('#form-statut');
  const sujet = form.querySelector('#champ-sujet');
  const champOeuvre = form.querySelector('#champ-oeuvre');
  const carte = form.querySelector('#oeuvre-choisie');
  const bouton = form.querySelector('button[type="submit"]');

  // 1. Œuvre demandée depuis la galerie.
  const id = new URLSearchParams(location.search).get('oeuvre');
  if (id) {
    fetch('/galerie/oeuvres.json')
      .then((reponse) => reponse.json())
      .then(({ series }) => {
        const oeuvre = series.flatMap((s) => s.oeuvres).find((o) => o.id === id);
        if (!oeuvre) return;
        const format = `${oeuvre.format} po`;
        sujet.value = `Œuvre : ${oeuvre.titre} (${format})`;
        champOeuvre.value = `${oeuvre.titre}, ${format}`;
        carte.querySelector('img').src = oeuvre.vignette;
        carte.querySelector('.oeuvre-choisie-titre').textContent = oeuvre.titre;
        carte.querySelector('.oeuvre-choisie-format').textContent = format;
        carte.hidden = false;
        const message = form.querySelector('#champ-message');
        if (!message.value) message.placeholder = `Bonjour Ghislaine, j’aimerais en savoir plus sur « ${oeuvre.titre} » : disponibilité, prix, livraison…`;
      })
      .catch(() => {});
  }
  carte.querySelector('.oeuvre-choisie-retirer').addEventListener('click', () => {
    carte.hidden = true;
    champOeuvre.value = '';
    if (sujet.value.startsWith('Œuvre :')) sujet.value = '';
    history.replaceState(null, '', location.pathname + '#formulaire');
    sujet.focus();
  });

  // 2. Validation, puis envoi.
  const afficher = (texte, type) => {
    statut.textContent = texte;
    statut.dataset.type = type;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const invalide = [...form.querySelectorAll('[required]')].find((champ) => !champ.checkValidity());
    if (invalide) {
      const libelle = form.querySelector(`label[for="${invalide.id}"]`).firstChild.textContent.trim();
      afficher(invalide.type === 'email' && invalide.value
        ? 'Vérifiez l’adresse courriel : elle semble incomplète.'
        : `Le champ « ${libelle} » est requis.`, 'erreur');
      invalide.focus();
      return;
    }
    const donnees = Object.fromEntries(new FormData(form));
    // Champ piège rempli : un robot. On fait comme si de rien n’était.
    if (donnees._gotcha) { form.reset(); afficher('Merci ! Votre message a été envoyé.', 'succes'); return; }
    delete donnees._gotcha;

    const configure = ENVOI.url && Object.values(ENVOI.champs).every(Boolean);
    if (!configure) {
      const corps = [donnees.message, '', `${donnees.nom}`, donnees.email, donnees.telephone].filter((l) => l !== undefined).join('\n');
      location.href = `mailto:${COURRIEL}?subject=${encodeURIComponent(donnees.sujet)}&body=${encodeURIComponent(corps)}`;
      afficher('Votre logiciel de courriel s’ouvre avec le message prêt à envoyer. S’il ne s’ouvre pas, écrivez directement à ' + COURRIEL + '.', 'info');
      return;
    }

    bouton.disabled = true;
    afficher('Envoi en cours…', 'info');
    try {
      const reponse = await fetch(ENVOI.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          ...ENVOI.champs,
          ...donnees,
          // Noms attendus par Web3Forms : objet du courriel, nom et adresse de réponse.
          subject: donnees.sujet,
          name: donnees.nom,
          from_name: 'Site de Ghislaine Riendeau',
        }),
      });
      const resultat = await reponse.json().catch(() => ({}));
      if (!reponse.ok || resultat.success === false) throw new Error(resultat.message || `HTTP ${reponse.status}`);
      form.reset();
      carte.hidden = true;
      afficher('Merci ! Votre message a bien été envoyé. Je vous répondrai personnellement.', 'succes');
    } catch {
      afficher(`L’envoi n’a pas fonctionné. Réessayez dans un instant, ou écrivez directement à ${COURRIEL}.`, 'erreur');
    } finally {
      bouton.disabled = false;
    }
  });
}
