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

pollNowPlaying();
setInterval(pollNowPlaying, NOWPLAYING_POLL_MS);
