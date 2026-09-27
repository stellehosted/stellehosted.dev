// Polls the backend's /api/nowplaying (which itself proxies Navidrome) and
// updates the now-playing pill. Falls back to "not listening" text when
// nothing is playing, rather than leaving stale/fake track info on screen.

const NOWPLAYING_POLL_MS = 15000;

const titleEl = document.getElementById('np-title');
const metaEl = document.getElementById('np-meta');
const coverEl = document.getElementById('np-cover');

let lastCoverArtId = undefined;

async function pollNowPlaying() {
  try {
    const res = await fetch('/api/nowplaying', { cache: 'no-store' });
    const data = await res.json();

    if (data.playing) {
      titleEl.textContent = data.title || 'Unknown title';
      metaEl.textContent = [data.artist, data.album].filter(Boolean).join(' | ');
      if (data.coverArtId !== lastCoverArtId) {
        coverEl.src = `/api/coverart?id=${encodeURIComponent(data.coverArtId)}`;
        lastCoverArtId = data.coverArtId;
      }
    } else {
      titleEl.textContent = 'Not listening right now';
      metaEl.textContent = '';
      if (lastCoverArtId !== null) {
        coverEl.src = 'album.jpg';
        lastCoverArtId = null;
      }
    }
  } catch (err) {
    // Network hiccup or backend not running yet — leave whatever is on screen.
    console.error('nowplaying poll failed:', err);
  }
}

pollNowPlaying();
setInterval(pollNowPlaying, NOWPLAYING_POLL_MS);
