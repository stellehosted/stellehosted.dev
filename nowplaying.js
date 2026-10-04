// Polls the backend's /api/nowplaying (which itself proxies Navidrome) and updates the now-playing pill. Keeps the last track (with a pause icon) once something has played; shows "Silence..." only if nothing has played since page load.

const NOWPLAYING_POLL_MS = 15000;

const titleEl = document.getElementById('np-title');
const metaEl = document.getElementById('np-meta');
const coverEl = document.getElementById('np-cover');
const vizEl = document.getElementById('np-viz');
const pillEl = document.getElementById('np-pill');

vizEl.classList.add('paused');

let lastCoverArtId = undefined;
let hasTrack = false;

async function pollNowPlaying() {
  try {
    const res = await fetch('/api/nowplaying', { cache: 'no-store' });
    const data = await res.json();

    if (data.playing) {
      const paused = data.state === 'paused' || data.state === 'stopped';
      vizEl.classList.toggle('playing', !paused);
      vizEl.classList.toggle('paused', paused);
      hasTrack = true;
      pillEl.classList.remove('no-art');
      titleEl.textContent = data.title || 'Unknown title';
      metaEl.textContent = [data.artist, data.album].filter(Boolean).join(' • ');
      if (data.coverArtId !== lastCoverArtId) {
        coverEl.src = `/api/coverart?id=${encodeURIComponent(data.coverArtId)}`;
        lastCoverArtId = data.coverArtId;
      }
    } else {
      // Entry expired from Navidrome's now-playing list (client sent no state): treat as paused and keep the last track on screen.
      vizEl.classList.remove('playing');
      vizEl.classList.add('paused');
      if (!hasTrack) {
        titleEl.textContent = 'Silence...';
        metaEl.textContent = '';
        pillEl.classList.add('no-art');
      }
    }
  } catch (err) {
    // Network hiccup or backend not running yet — leave whatever is on screen.
    console.error('nowplaying poll failed:', err);
  }
}

// The rims are separate SVGs (see home.html), so keep each one's width and viewBox in sync with
// the element it outlines. One viewBox unit is 1/19.2 rem, which keeps the 23-unit corner radius
// undistorted.
function syncRim(targetEl, rimEl, rimRectEl) {
  new ResizeObserver(() => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const widthRem = targetEl.getBoundingClientRect().width / rem;
    const units = Math.round(widthRem * 19.2);
    rimEl.style.width = `${widthRem}rem`;
    rimEl.setAttribute('viewBox', `0 0 ${units} 128`);
    rimRectEl.setAttribute('width', units - 2);
  }).observe(targetEl);
}

syncRim(pillEl, document.getElementById('np-rim'), document.getElementById('np-rim-rect'));
syncRim(document.querySelector('.album-art'), document.getElementById('np-album-rim'), document.getElementById('np-album-rim-rect'));

pollNowPlaying();
setInterval(pollNowPlaying, NOWPLAYING_POLL_MS);
