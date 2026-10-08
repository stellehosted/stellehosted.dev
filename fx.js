// Shared hover effect (scale + glow). A page only needs
//   <script src="/fx.js"></script>
// at the end of <body>. It loads fx.css next to itself and adds the SVG glow filter that Safari
// needs for SVG elements. Safe to include twice (dock.js includes it too). See fx.css for usage.

(() => {
  if (document.querySelector('link[data-fx]')) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('fx.css', document.currentScript.src).href;
  link.dataset.fx = '';
  document.head.appendChild(link);

  // Same glow as CSS drop-shadow(0 0 0.417rem rgba(255,255,255,.9)): an 8-unit white blur of the
  // element's alpha, merged under the element. Referenced from fx.css as filter: url(#fx-glow).
  // Zero-size rather than display:none, because filters inside display:none svgs don't render.
  const holder = document.createElement('div');
  holder.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <filter id="fx-glow" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="glowBlur"/>
      <feFlood flood-color="#FFFFFF" flood-opacity="0.9"/>
      <feComposite in2="glowBlur" operator="in" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter></defs></svg>`;
  document.body.appendChild(holder.firstElementChild);
})();
