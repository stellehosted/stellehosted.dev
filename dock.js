// Dock component: the complete "Dock" symbol from Sketch (the glass pill + icons AND the
// progressive-blur BG strip behind it). A page only needs
//   <script src="/dock.js"></script>
// at the end of <body>. This script loads its own stylesheet and builds everything else, so no
// page carries any dock markup or CSS. Assets are resolved relative to this file, so it works
// from any page URL.

const BASE = document.currentScript.src;
const asset = (name) => new URL(name, BASE).href;

// Where each dock icon goes, keyed by the icon group's id in dock.svg. Icons without an entry
// (Photos, Design, SpaceStation) aren't wired up until their pages exist.
const DOCK_LINKS = { Center: '/', Art: '/art' };

// Wait for the stylesheet before inserting the svg, or it flashes at full size for a frame.
const stylesReady = new Promise((resolve) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = asset('dock.css');
  link.onload = link.onerror = resolve;
  document.head.appendChild(link);
});

// The dock is anchored to the bottom of the *viewport*, so it's a direct child of <body>, added
// last so it paints on top. Pages don't need to place it themselves.
if (!document.querySelector('.dock-wrap')) {
  const wrap = document.createElement('div');
  wrap.className = 'dock-wrap';
  document.body.appendChild(wrap);
}

// Sketch "BG" layer: 176px band, progressive glass blur 0->16px (6 stacked backdrop-blur
// layers, each masked to a triangle), plus a 100%->0% black gradient wash. See .dock-bg in dock.css.
// It is its own position:fixed layer rather than a child of .dock-wrap: Safari only blurs the
// page behind a backdrop-filter that sits in a fixed layer like this one.
function buildBackground() {
  const bg = document.createElement('div');
  bg.className = 'dock-bg';
  bg.setAttribute('aria-hidden', 'true');
  for (let i = 1; i <= 6; i++) {
    const layer = document.createElement('div');
    layer.className = 'layer';
    layer.style.setProperty('--i', i);
    bg.appendChild(layer);
  }
  const tint = document.createElement('div');
  tint.className = 'tint';
  bg.appendChild(tint);
  return bg;
}

// Sketch gives each pill (L, C, R) its own 16px background blur ("Glass"). SVG can't blur what's
// behind it, so each shape gets an HTML div with backdrop-filter, masked to the shape's outline.
// The outline and its transform are read from dock.svg (the fill <use> of each shape), so a
// re-export stays in sync. Boxes are in % of the viewBox, so they scale with .dock-glass.
// Like the rims and the BG strip, this has to be a position:fixed layer for Safari.
function buildGlass(svg) {
  const glass = document.createElement('div');
  glass.className = 'dock-glass';
  glass.setAttribute('aria-hidden', 'true');
  const vb = svg.viewBox.baseVal;
  const toRoot = svg.getScreenCTM().inverse();
  svg.querySelectorAll('use[fill-opacity="0.2"]').forEach((use) => {
    const shape = svg.querySelector(use.href.baseVal);
    const m = toRoot.multiply(use.getScreenCTM());
    const b = use.getBBox();
    const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
      .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
    const x0 = Math.min(...pts.map((p) => p.x)), x1 = Math.max(...pts.map((p) => p.x));
    const y0 = Math.min(...pts.map((p) => p.y)), y1 = Math.max(...pts.map((p) => p.y));

    const outline = shape.cloneNode(true);
    outline.removeAttribute('id');
    outline.setAttribute('fill', '#000');
    outline.setAttribute('fill-rule', 'evenodd');
    outline.setAttribute('transform', `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e - x0} ${m.f - y0})`);
    const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x1 - x0} ${y1 - y0}" preserveAspectRatio="none">${outline.outerHTML}</svg>`;

    const pane = document.createElement('div');
    pane.style.left = `${(x0 - vb.x) / vb.width * 100}%`;
    pane.style.top = `${(y0 - vb.y) / vb.height * 100}%`;
    pane.style.width = `${(x1 - x0) / vb.width * 100}%`;
    pane.style.height = `${(y1 - y0) / vb.height * 100}%`;
    pane.style.webkitMaskImage = pane.style.maskImage = `url("data:image/svg+xml,${encodeURIComponent(mask)}")`;
    glass.appendChild(pane);
  });
  return glass;
}

document.querySelectorAll('.dock-wrap').forEach(async (el) => {
  const [res] = await Promise.all([fetch(asset('dock.svg')), stylesReady]);
  el.innerHTML = await res.text();
  el.before(buildBackground());
  el.before(buildGlass(el.querySelector('svg')));   // after the BG strip, before the dock itself

  // Safari ignores mix-blend-mode on elements *inside* an inline SVG, but honors it on the
  // <svg> element itself. So the rims are moved into an identical overlay SVG (same viewBox,
  // same group transforms) and the blend is applied to that element instead.
  const dock = el.querySelector('svg');
  const rims = dock.cloneNode(true);
  rims.classList.add('dock-rims');
  rims.setAttribute('aria-hidden', 'true');
  rims.querySelector('defs').remove();           // gradients are referenced from the main svg
  rims.querySelector('title')?.remove();
  const root = rims.querySelector('#Dock');
  [...root.children].forEach((g, i) => { if (i > 0) g.remove(); });   // icons/hitboxes stay in main svg
  root.querySelectorAll(':scope > g > g').forEach((group) => {
    [...group.children].forEach((c) => { if (!c.classList.contains('dock-rim')) c.remove(); });
  });
  dock.querySelectorAll('.dock-rim').forEach((r) => r.remove());
  el.appendChild(rims);

  // Each hitbox is drawn right before its icon group (or, for SpaceStation, lives inside it).
  dock.querySelectorAll('.hitbox').forEach((hit) => {
    const id = hit.nextElementSibling?.id || hit.parentElement.id;
    const href = DOCK_LINKS[id];
    if (!href) return;
    const go = () => { if (location.pathname !== href) location.href = href; };
    hit.setAttribute('role', 'link');
    hit.setAttribute('aria-label', id === 'Center' ? 'Home' : id);
    hit.setAttribute('tabindex', '0');
    hit.addEventListener('click', go);
    hit.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  });
});
