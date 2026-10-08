// Sidebar component: adds the progressive-blur + tint strip behind a page's <nav class="sidebar">.
// The nav markup and its classes are documented in sidebar.css. A page needs
//   <link rel="stylesheet" href="/sidebar.css">   in <head> (so the nav is styled on first paint)
//   <script src="/sidebar.js"></script>           at the end of <body>
// The strip is inserted directly before the nav, so the nav should come after the page content.
// Unlike dock.js there's no asset lookup: the strip is plain divs, all styled in sidebar.css.

const sidebar = document.querySelector('.sidebar');

if (sidebar && !document.querySelector('.sidebar-bg')) {
  // 6 stacked backdrop-blur layers, layer i masked to a triangle peaking i/6 of the way across the
  // 384px, so the blur radius ramps ~linearly from 16px to 0 (see .sidebar-bg in sidebar.css).
  const bg = document.createElement('div');
  bg.className = 'sidebar-bg';
  bg.setAttribute('aria-hidden', 'true');
  const blur = document.createElement('div');
  blur.className = 'blur';
  for (let i = 1; i <= 6; i++) {
    const layer = document.createElement('div');
    layer.className = 'layer';
    layer.style.setProperty('--i', i);
    blur.appendChild(layer);
  }
  bg.appendChild(blur);
  sidebar.before(bg);
}
