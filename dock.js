document.querySelectorAll('.dock-wrap').forEach(async (el) => {
  const res = await fetch('dock.svg');
  el.innerHTML = await res.text();

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
});
