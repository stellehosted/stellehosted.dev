// Sets --ui-base, the size of 1rem on this display: the 1920x1080 Sketch canvas "contain"-fitted to
// the screen, not the window. Resizing a window on the same display therefore never rescales the
// page; only moving it to another display does. Pages cap it by window width (see --ui).
(function () {
  var root = document.documentElement;
  function set() {
    root.style.setProperty('--ui-base', Math.min(screen.width / 100, screen.height * 0.017778) + 'px');
  }
  set();
  addEventListener('resize', set);
})();
