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
    renderGalleries(galleries, { main, nav, emptyTitle, onOpen })
      builds a page's galleries and their sidebar entries from the server's lists (/api/art, /api/photos)
      galleries   [{ name, pieces: [...], galleries: [...] }, ...], as the API returns them
      main        the element the galleries are added to, one <section> each
      nav         the <nav class="sidebar"> the headings are added to (its other children stay)
      emptyTitle  heading of the empty gallery shown when there are no galleries
      onOpen      called with a piece when its card is clicked
      then load sidebar.js, which reads the headings once when it runs
    createHit(content, { label, badge, onOpen })
      the hitbox the gallery wraps each card in, for anything else that opens something: an invisible
      button over content (aria-label label), a pill reading badge (optional), onOpen on click

  Notes
  - With no items it says so instead
  - A card is as wide as its art (cardWidth() in card.js), 160 at least and never wider than the gallery
  - The hitbox is a .card-fx-hit, so the card lights up on hover
  - In renderGalleries, a gallery's name is both its heading and its sidebar heading. Its cards are its own
    pieces, then each sub-gallery's; a sub-gallery is a sidebar link to its first card (years, grade levels...)
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

  const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'gallery';
  const link = (className, href, text) => {
    const node = el('a', className, text);
    node.href = href;
    return node;
  };
  const flatten = (g) => [...g.pieces, ...g.galleries.flatMap(flatten)];

  window.renderGalleries = (galleries, { main, nav, emptyTitle, onOpen }) => {
    if (!galleries.length) {
      main.append(createGallery({ title: emptyTitle, items: [] }));
      return;
    }
    for (const g of galleries) {
      const id = slug(g.name);
      const gallery = createGallery({ title: g.name, items: flatten(g), onOpen });
      const section = el('section');
      section.id = id;
      main.appendChild(section).append(gallery);

      const navGroup = el('div', 'sidebar-group');
      navGroup.append(link('sidebar-heading', '#' + id, g.name));
      if (g.galleries.length) {
        const cards = gallery.querySelectorAll('.gallery-hit');
        const list = el('ul', 'sidebar-list');
        let first = g.pieces.length;
        for (const sub of g.galleries) {
          cards[first].id = `${id}-${slug(sub.name)}`;
          list.appendChild(el('li')).append(link('', '#' + cards[first].id, sub.name));
          first += flatten(sub).length;
        }
        navGroup.append(list);
      }
      nav.append(navGroup);
    }
  };
})();
