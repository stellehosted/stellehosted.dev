// Sets --ui-base, the size of 1rem on this display: the 1920x1080 Sketch canvas "contain"-fitted to
// the screen, not the window. Resizing a window on the same display therefore never rescales the
// page; only moving it to another display does. Pages cap it by window width (see --ui).
(function () {
  var root = document.documentElement;
  function set() {
    // iOS reports screen.width/height in portrait whatever the orientation, so sort them: the long side is the canvas width.
    var long = Math.max(screen.width, screen.height), short = Math.min(screen.width, screen.height);
    root.style.setProperty('--ui-base', Math.min(long / 100, short * 0.017778) + 'px');
  }
  set();
  addEventListener('resize', set);
})();
