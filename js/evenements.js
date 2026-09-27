// Classe les événements terminés sous « Récemment » ; sans JavaScript, tout reste listé.
const upcoming = document.querySelector('#evenements-a-venir');
const past = document.querySelector('#evenements-passes');

if (upcoming && past) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const ended = [...upcoming.querySelectorAll('[data-fin]')].filter((event) => event.dataset.fin < today);
  // Le plus récent d’abord.
  for (const event of ended.reverse()) past.append(event);
  if (ended.length) past.closest('section').hidden = false;
  if (!upcoming.children.length) {
    const empty = document.createElement('li');
    empty.className = 'event-empty';
    empty.textContent = 'Aucun événement annoncé pour le moment. Revenez bientôt ou écrivez-moi pour être avisé.';
    upcoming.append(empty);
  }
}
