/* -- Glow FX 
  Scale up and outer glow on hover/focus
  
  Usage
    <body> end   <script src="/lib/effects/glowFx.js"></script>
    class="glow-fx-hit" on whatever should react to the pointer, and class="glow-fx" on the thing inside it that scales and glows (in SVG, the .glow-fx follows its hitbox as a sibling). See glowFx.css

  Notes
  - It loads glowFx.css next to itself and adds the SVG glow filter that Safari needs for SVG elements. Safe to include twice (dock.js includes it too)
  - Used on text & icons, not cards (see cardFx.css)
  - Optional: --glow-fx-scale (default 1.12)
  - The hitbox itself never moves, so the hover area doesn't shrink while it animates

*/

(() => {
  if (document.querySelector('link[data-glow-fx]')) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('glowFx.css', document.currentScript.src).href;
  link.dataset.glowFx = '';
  document.head.appendChild(link);

  // Same glow as CSS drop-shadow(0 0 0.417rem rgba(255,255,255,.9)): an 8-unit white blur of the
  // element's alpha, merged under the element. Referenced from glowFx.css as filter: url(#glow-fx).
  // Zero-size rather than display:none, because filters inside display:none svgs don't render.
  const holder = document.createElement('div');
  holder.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <filter id="glow-fx" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="glowBlur"/>
      <feFlood flood-color="#FFFFFF" flood-opacity="0.9"/>
      <feComposite in2="glowBlur" operator="in" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter></defs></svg>`;
  document.body.appendChild(holder.firstElementChild);
})();
