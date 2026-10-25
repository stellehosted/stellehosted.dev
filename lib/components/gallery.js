/* -- Gallery ---------------------
  The Sketch "Gallery": a heading over a wrapping run of Cards. Styles are in gallery.css.

  Usage
    <head>       <link rel="stylesheet" href="/lib/font/font.css">, text.css, glass.css, card.css and gallery.css  (+ cardFx.css for the hover glow)
    <body> end   <script src="/lib/styles/text.js">, card.js, then gallery.js, before the script that makes galleries, then glass.js
    createGallery({ title, items, onOpen })
      title   the heading's text
      items   [{ title, date: 'YYYY-MM-DD' (optional), images: [{ src, width, height }, ...] }, ...]. The first image is the card's cover
      onOpen  called with the item when its card is clicked
      returns the gallery: add it to the page, then call glassRims() for the new cards' rims
    createHit(content, { label, badge, onOpen })
      the hitbox the gallery wraps each card in, for anything else that opens something: an invisible
      button over content (aria-label label), a pill reading badge (optional), onOpen on click

  Notes
  - With no items it says so instead
  - A card is as wide as its art (cardWidth() in card.js), 160 at least and never wider than the gallery
  - The hitbox is a .card-fx-hit, so the card lights up on hover
*/

(() => {
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const GALLERY_W = 67.708, MIN_W = 8.333;   // rem: 1300 and 160 canvas units

  window.createHit = (content, { label, badge, onOpen }) => {
    if (badge) content.append(el('span', 'gallery-badge', badge));
    const button = el('button', 'gallery-open');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.addEventListener('click', onOpen);
    const hit = el('div', 'gallery-hit card-fx-hit');
    hit.append(content, button);
    return hit;
  };

  window.createGallery = ({ title, items, onOpen }) => {
    const gallery = el('div', 'gallery');
    const heading = el('h2', 'heading');
    setGradientText(heading, title);
    gallery.append(heading);
    if (!items.length) {
      gallery.append(el('p', 'gallery-empty', 'Nothing here yet.'));
      return gallery;
    }
    const cards = el('div', 'gallery-cards');
    for (const item of items) {
      const cover = item.images[0];
      const width = Math.min(GALLERY_W, Math.max(MIN_W, cardWidth(cover)));
      const card = createCard({ title: item.title, date: item.date, image: cover, width });
      cards.append(createHit(card, {
        label: `View ${item.title}`,
        badge: item.images.length > 1 ? `${item.images.length} images` : null,
        onOpen: () => onOpen(item),
      }));
    }
    gallery.append(cards);
    return gallery;
  };
})();
