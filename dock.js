document.querySelectorAll('.dock-wrap').forEach(async (el) => {
  const res = await fetch('dock.svg');
  el.innerHTML = await res.text();
});
