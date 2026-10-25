/* -- Dialog ----------------------
  The Sketch "Dialog": a modal with a carousel on the left and the title, date and markdown description on the right. Styles are in dialog.css.

  Usage
    <head>       <link rel="stylesheet" href="/lib/font/font.css">, text.css, glass.css and dialog.css
    <body> end   <script src="/lib/vendor/marked.umd.js"> (optional, for markdown), /lib/styles/text.js, glass.js, then dialog.js
    openDialog({ title, date: 'YYYY-MM-DD' (optional), description: markdown (optional), images: [{ src }, ...] })

  Notes
  - The markup is built the first time it is opened. Everything is built with DOM nodes / textContent, never innerHTML, except the description, which comes out of marked (see markdown())
  - Without marked, descriptions are plain text
  - Fixed layout: inset 150 units from the viewport, art left, text right
*/

(() => {
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svg = (viewBox, path) => {
    const root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    root.setAttribute('viewBox', viewBox);
    const d = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    d.setAttribute('d', path);
    root.append(d);
    return root;
  };
  const button = (className, label, icon) => {
    const node = el('button', className);
    node.type = 'button';
    node.setAttribute('aria-label', label);
    if (icon) node.append(icon);
    return node;
  };

  // "2026-05-07" -> "5/7/26"
  const shortDate = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${+m}/${+d}/${y.slice(2)}`;
  };

  // Descriptions are markdown (lib/marked.umd.js). Raw HTML in them is dropped and only http(s) or
  // site-relative links / images survive, so a description can't inject script.
  if (window.marked) {
    marked.use({
      breaks: true,   // single line breaks are kept
      renderer: { html: () => '' },
      walkTokens(token) {
        if ((token.type === 'link' || token.type === 'image') && !/^(https?:\/\/|\/|#)/i.test(token.href)) token.href = '';
      },
    });
  }
  function markdown(text) {
    if (!window.marked) return text.split(/\n{2,}/).filter(Boolean).map((p) => el('p', '', p));
    const t = document.createElement('template');
    t.innerHTML = marked.parse(text);
    for (const a of t.content.querySelectorAll('a[href]')) { a.target = '_blank'; a.rel = 'noopener'; }
    return [...t.content.childNodes];
  }

  let dialog, sheet, stage, image, dots, title, date, desc;
  let shown = null;   // the entry being shown
  let slide = 0;

  function build() {
    dialog = el('dialog', 'dialog');
    dialog.setAttribute('aria-labelledby', 'dialog-title');
    sheet = el('div', 'dialog-sheet glass-secondary');
    sheet.tabIndex = -1;   // focus lands on the sheet when it opens, not on a button
    sheet.autofocus = true;

    stage = el('div', 'dialog-stage');
    image = el('img');
    image.alt = '';
    dots = el('div', 'dialog-dots');
    const prev = button('dialog-nav dialog-prev', 'Previous image', svg('-2 -2 12 28', 'M8 0L0 12l8 12'));
    const next = button('dialog-nav dialog-next', 'Next image', svg('-2 -2 12 28', 'M0 0l8 12-8 12'));
    stage.append(image, prev, next, dots);

    const info = el('div', 'dialog-info');
    title = el('h2', 'heading dialog-title');
    title.id = 'dialog-title';
    date = el('time', 'subtitle dialog-date');
    desc = el('div', 'body-text dialog-desc');
    info.append(title, date, desc);

    const close = button('dialog-close', 'Close', svg('-2 -2 20 20', 'M0 0l16 16M16 0L0 16'));
    sheet.append(stage, info, close);
    dialog.append(sheet);
    document.body.append(dialog);
    window.glassRims?.();   // the sheet's rim

    image.addEventListener('load', () => { image.classList.add('ready'); fitArt(); });
    new ResizeObserver(fitArt).observe(sheet);
    prev.addEventListener('click', () => show(slide - 1));
    next.addEventListener('click', () => show(slide + 1));
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });   // the dim area around the sheet
    dialog.addEventListener('close', () => {
      image.removeAttribute('src');
      dialog.querySelectorAll('.glass-rim-pop').forEach((p) => p.hidePopover());
    });
    dialog.addEventListener('keydown', (e) => {
      if (shown.images.length < 2) return;
      if (e.key === 'ArrowLeft') show(slide - 1);
      if (e.key === 'ArrowRight') show(slide + 1);
    });
    // Swipe left / right on touch screens.
    let swipeX = null;
    stage.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') swipeX = e.clientX; });
    stage.addEventListener('pointerup', (e) => {
      if (swipeX === null || shown.images.length < 2) return;
      const dx = e.clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 50) show(slide + (dx < 0 ? 1 : -1));
    });
  }

  function show(i) {
    const images = shown.images;
    slide = (i + images.length) % images.length;
    image.classList.remove('ready');
    image.src = images[slide].src;
    image.alt = images.length > 1 ? `${shown.title}, image ${slide + 1} of ${images.length}` : shown.title;
    [...dots.children].forEach((dot, n) => dot.setAttribute('aria-current', n === slide));
  }

  // As large as the photo can be: it fills the art column's height (50 units of padding above and
  // below), centred in a column that is always half the content box minus the 64-unit gap, so the
  // text column always starts in the same place (a bit right of the sheet's middle). With several
  // images the arrows take 40 units on each side of the column, and sit 32 units outside the widest
  // photo that could ever fit (--art-w), so they are in the same place for every entry and slide.
  function fitArt() {
    if (!shown || !sheet.clientWidth) return;
    const cs = getComputedStyle(sheet);
    const unit = parseFloat(cs.fontSize) / 19.2;
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const inset = shown.images.length > 1 ? 40 * unit : 0;
    const maxW = (sheet.clientWidth - padX - parseFloat(cs.columnGap)) / 2 - 2 * inset;
    const { naturalWidth: nw, naturalHeight: nh } = image;
    if (!nw || !nh) return;
    const scale = Math.min(maxW / nw, (sheet.clientHeight - padY) / nh);
    image.style.width = `${nw * scale}px`;
    image.style.height = `${nh * scale}px`;
    dialog.style.setProperty('--art-w', `${maxW}px`);   // places the arrows
  }

  window.openDialog = (entry) => {
    if (!dialog) build();
    shown = entry;
    dialog.classList.toggle('single', entry.images.length === 1);
    dots.replaceChildren(...entry.images.map((_, n) => {
      const dot = el('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Image ${n + 1}`);
      dot.addEventListener('click', () => show(n));
      return dot;
    }));
    setGradientText(title, entry.title);
    date.textContent = entry.date ? shortDate(entry.date) : '';
    date.hidden = !entry.date;
    if (entry.date) date.dateTime = entry.date;
    desc.replaceChildren(...markdown(entry.description || ''));
    show(0);
    dialog.showModal();
    // After showModal, so the rim popovers land above the dialog in the top layer (see glass.js).
    dialog.querySelectorAll('.glass-rim-pop').forEach((p) => p.showPopover());
  };
})();
