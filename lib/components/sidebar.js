/* -- Sidebar ---------------------
  The left column from the Sketch pages. Adds the progressive-blur + tint strip behind a page's <nav class="sidebar">, builds each heading's pill parts, and marks the heading whose section is on screen. The nav markup and its classes (.sidebar-title, .sidebar-heading, .sidebar-group, .sidebar-list / .sidebar-text) are documented at the top of sidebar.css.

  Usage
    <head>       <link rel="stylesheet" href="/lib/styles/text.css"> and <link rel="stylesheet" href="/lib/components/sidebar.css">  (text.css first, so the nav is styled on first paint)
    <nav class="sidebar"> after the page content
    <body> end   <script src="/lib/components/sidebar.js"></script>

  Notes
  - The strip is inserted directly before the nav, so the nav should come after the page content
*/

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

  // Shrink-to-fit: a heading too long for its pill scales its font down until it fits on one line.
  // The ratio is the same at any canvas scale (everything is rem), but fonts and resizes can change it.
  const fit = () => {
    for (const heading of headings) {
      const text = heading.querySelector('.sidebar-heading-text');
      text.style.fontSize = '';
      const room = heading.clientWidth - parseFloat(getComputedStyle(heading).paddingLeft) * 1.4;   // leaves a right margin
      const width = text.getBoundingClientRect().width;
      if (width > room) text.style.fontSize = `calc(1.6667rem * ${room / width})`;
    }
  };
  fit();
  document.fonts?.ready.then(fit);
  addEventListener('resize', fit);

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
