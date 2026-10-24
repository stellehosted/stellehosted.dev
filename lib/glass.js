// Glass rims. Surfaces get their look from glass.css (.glass / .glass-secondary); this script adds
// the rim light, which has to be a separate overlay-blended svg (see .glass-rim in glass.css).
// For every glass element it inserts a rim after the outermost glass ancestor (so a glass element
// nested in another one still gets a rim outside the parent's backdrop-filter group) and keeps it
// matched to the surface: box, corner radius and stroke, redone whenever the surface resizes.
// A surface with no box (display:none) hides its rim. Safe to include twice.
// Glass added later: call glassRims() again; it skips surfaces that already have a rim.

(() => {
  const SELECTOR = '.glass, .glass-secondary';
  const pairs = [];
  let n = 0;

  // offsetParent doesn't exist on svg elements, so find the positioned ancestor by hand.
  const containingBlock = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (getComputedStyle(a).position !== 'static') return a;
    }
    return document.documentElement;
  };

  const sync = () => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    for (const { rim, rect, target } of pairs) {
      const t = target.getBoundingClientRect();
      if (!t.width || !t.height) { rim.style.display = 'none'; continue; }
      rim.style.display = '';
      const p = containingBlock(rim).getBoundingClientRect();
      rim.style.left = `${t.left - p.left}px`;
      rim.style.top = `${t.top - p.top}px`;
      rim.style.width = `${t.width}px`;
      rim.style.height = `${t.height}px`;

      const stroke = 2 * (rem / 19.2);   // 2 canvas px
      const r = getComputedStyle(target).borderTopLeftRadius;
      const radius = Math.min(r.endsWith('%') ? parseFloat(r) / 100 * t.width : parseFloat(r), t.width / 2, t.height / 2);
      rim.setAttribute('viewBox', `0 0 ${t.width} ${t.height}`);
      rect.setAttribute('x', stroke / 2);
      rect.setAttribute('y', stroke / 2);
      rect.setAttribute('width', Math.max(t.width - stroke, 0));
      rect.setAttribute('height', Math.max(t.height - stroke, 0));
      rect.setAttribute('rx', Math.max(radius - stroke / 2, 0));
      rect.setAttribute('stroke-width', stroke);
    }
  };

  const ro = new ResizeObserver(sync);

  window.glassRims = () => {
    document.querySelectorAll(SELECTOR).forEach((target) => {
      if (pairs.some((p) => p.target === target)) return;
      let root = target;
      while (root.parentElement?.closest(SELECTOR)) root = root.parentElement.closest(SELECTOR);
      const id = `glass-rim-${++n}`;
      const holder = document.createElement('div');
      holder.innerHTML = `<svg class="glass-rim" aria-hidden="true" preserveAspectRatio="none">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff"></stop>
          <stop offset="50%" stop-color="#fff" stop-opacity="0"></stop>
          <stop offset="100%" stop-color="#fff"></stop>
        </linearGradient></defs>
        <rect fill="none" stroke="url(#${id})"></rect></svg>`;
      const rim = holder.firstElementChild;
      // After the root, and after any rims already placed there, so paint order follows DOM order.
      let anchor = root;
      while (anchor.nextElementSibling?.classList.contains('glass-rim')) anchor = anchor.nextElementSibling;
      anchor.after(rim);
      pairs.push({ rim, rect: rim.querySelector('rect'), target });
      ro.observe(target);
    });
    sync();
  };

  window.addEventListener('resize', sync);
  document.fonts?.ready.then(sync);
  window.glassRims();
})();
