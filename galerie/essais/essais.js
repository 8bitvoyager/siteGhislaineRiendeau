// Garde la série affichée quand on passe d’un style à l’autre.
document.querySelectorAll('[data-garder-ancre]').forEach((lien) => {
  lien.addEventListener('click', () => { lien.hash = location.hash; });
});
