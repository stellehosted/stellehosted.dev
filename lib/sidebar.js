// Sidebar component: adds the progressive-blur + tint strip behind a page's <nav class="sidebar">,
// builds each heading's pill parts, and marks the heading whose section is on screen. The nav
// markup and its classes are documented in sidebar.css. A page needs
//   <link rel="stylesheet" href="/lib/text.css"> and <link rel="stylesheet" href="/lib/sidebar.css">   in <head> (so the nav is styled on first paint)
//   <script src="/lib/sidebar.js"></script>           at the end of <body>
// The strip is inserted directly before the nav, so the nav should come after the page content.

(() => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar || document.querySelector('.sidebar-bg')) return;

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

  // Heading parts, in paint order: glow, light, then the text (the pill itself is ::before).
  const span = (className) => {
    const node = document.createElement('span');
    node.className = className;
    return node;
  };
  const headings = [...sidebar.querySelectorAll('.sidebar-heading')];
  for (const heading of headings) {
    const text = span('heading sidebar-heading-text');
    text.append(...heading.childNodes);
    const glow = span('sidebar-glow');
    const light = span('sidebar-light');
    glow.setAttribute('aria-hidden', 'true');
    light.setAttribute('aria-hidden', 'true');
    heading.append(glow, light, text);
  }

  // Active heading: the last one whose section has scrolled up past 40% of the window (the first
  // one before that). Listens in the capture phase so it also hears pages that scroll an inner
  // element instead of the document.
  const targets = headings
    .map((heading) => ({ heading, section: document.getElementById(decodeURIComponent(heading.hash.slice(1))) }))
    .filter((t) => t.section);
  if (!targets.length) return;
  let frame = 0;
  const update = () => {
    frame = 0;
    const line = innerHeight * 0.4;
    let active = targets[0];
    for (const t of targets) if (t.section.getBoundingClientRect().top <= line) active = t;
    // At the very bottom, the last section wins even if it's too short to reach the line.
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) active = targets[targets.length - 1];
    for (const t of targets) {
      t.heading.classList.toggle('is-active', t === active);
      if (t === active) t.heading.setAttribute('aria-current', 'location');
      else t.heading.removeAttribute('aria-current');
    }
  };
  const schedule = () => { frame ||= requestAnimationFrame(update); };
  document.addEventListener('scroll', schedule, { capture: true, passive: true });
  addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(document.body);   // content that loads in later moves sections
  update();
})();
