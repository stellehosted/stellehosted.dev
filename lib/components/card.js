/* -- Card ------------------------
  The Sketch "Card": a Glass card with the art on top and its title + date under it. Styles are in card.css.

  Usage
    <head>       <link rel="stylesheet" href="/lib/font/font.css">, text.css, glass.css and card.css  (+ cardFx.css for the hover glow)
    <body> end   <script src="/lib/styles/text.js">, then card.js, before the script that makes cards, then glass.js
    createCard({ title, date: 'YYYY-MM-DD' (optional), image: { src, width, height }, width: rem (optional) })
      returns the card's .card-box: add it to the page, then call glassRims() for its rim

  Notes
  - Fixed: 465 tall, with the image 400 tall (cropped to fill)
  - The width follows the art, cardWidth(image) in rem, unless a width is given
  - The title is 20 at most and shrinks a unit at a time until it fits on one line
  - Uploaded images are requested resized to the card (thumbSrc), not at full size
  - Images load as they near the screen and unload once they're a screen away. The blur behind the image stays off until the image has loaded
  - The card is a .card-fx, so a .card-fx-hit around it lights it up on hover
*/

(() => {
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // "2026-05-07" -> "5/7/26"
  const shortDate = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${+m}/${+d}/${y.slice(2)}`;
  };

  // Images get their src as the card approaches the screen, and lose it (so the browser can drop the
  // decoded bitmap) a screen away. The card's box is sized up front, so none of this moves the layout.
  const lazy = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      for (const image of target.querySelectorAll('img[data-src]')) {
        if (isIntersecting) image.src = image.dataset.src;
        else { image.removeAttribute('src'); image.classList.remove('loaded'); }
      }
    }
  }, { rootMargin: '100% 0px' });
  // .loaded (which turns the blur on, see .card-blur) waits for the decode and one more frame.
  const img = (src, alt) => {
    const node = el('img');
    node.dataset.src = src; node.alt = alt;
    node.decoding = 'async';
    node.addEventListener('load', () => {
      node.decode().catch(() => {}).then(() => requestAnimationFrame(() => {
        if (node.getAttribute('src')) node.classList.add('loaded');
      }));
    });
    return node;
  };

  // Title: the largest whole unit size, 20 at most, that keeps it on one line (1 unit = 1/19.2 rem).
  const MAX = 20, MIN = 8;
  const fit = (title) => {
    let size = MAX;
    title.style.fontSize = '';
    while (size > MIN && title.scrollWidth > title.clientWidth) title.style.fontSize = `${--size / 19.2}rem`;
  };
  // The card's own size doesn't depend on the title, so watching it can't loop. Refit when a font
  // finishes loading too: the text was measured in the fallback until then.
  const resize = new ResizeObserver((entries) => {
    for (const { target } of entries) fit(target.querySelector('.card-title'));
  });
  document.fonts?.addEventListener('loadingdone', () => document.querySelectorAll('.card-title').forEach(fit));

  // Width (rem) of the card for an image: the art at 400 tall plus 8 + 8 padding, 320 if the size is unknown.
  const IMAGE_H = 20.833, PAD = 0.833;
  window.cardWidth = (image) => image.width && image.height
    ? IMAGE_H * image.width / image.height + PAD
    : 16.667;

  // Uploaded art is asked for at the size it's shown (the server resizes, see "Thumbnails" in server.js)
  // instead of the full original: the card's width in device pixels. The blur behind it is tiny anyway.
  window.thumbSrc = (src, rem) => {
    if (!src.startsWith('/content/')) return src;
    const px = Math.ceil(rem * parseFloat(getComputedStyle(document.documentElement).fontSize) * (window.devicePixelRatio || 1));
    return `${src}?w=${px}`;
  };

  window.createCard = ({ title, date, image, width }) => {
    const rem = width ?? cardWidth(image);
    const blur = img(thumbSrc(image.src, rem / 4), '');
    blur.className = 'card-blur';
    const photo = el('div', 'card-image');
    photo.append(img(thumbSrc(image.src, rem), title));
    const info = el('div', 'card-info');
    const heading = el('h3', 'decorative card-title');
    setGradientText(heading, title);
    info.append(heading);
    if (date) {
      const time = el('time', 'subtitle card-date', shortDate(date));
      time.dateTime = date;
      info.append(time);
    }
    const card = el('article', 'card glass card-fx');
    card.append(blur, photo, info);
    const box = el('div', 'card-box');
    box.style.width = `${rem}rem`;
    box.append(card);
    lazy.observe(card);
    resize.observe(card);
    return box;
  };
})();
