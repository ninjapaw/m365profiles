const input = document.querySelector<HTMLInputElement>(".ref-search");
const count = document.querySelector<HTMLElement>(".ref-search__count");

if (input && count) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".ref-card[data-search]"));
  const sections = Array.from(document.querySelectorAll<HTMLElement>(".ref-section"));
  const total = cards.length;

  const render = () => {
    const query = input.value.trim().toLowerCase();
    let visible = 0;

    for (const card of cards) {
      const matches = query === "" || (card.dataset.search ?? "").includes(query);
      card.hidden = !matches;
      if (matches) visible += 1;
    }

    for (const section of sections) {
      const sectionCards = section.querySelectorAll<HTMLElement>(".ref-card[data-search]");
      const hasVisibleCard = Array.from(sectionCards).some((card) => !card.hidden);
      section.hidden = sectionCards.length > 0 && !hasVisibleCard;
    }

    count.textContent = query ? `${visible} of ${total} match` : `${total} results`;
  };

  input.addEventListener("input", render);
  render();
}
