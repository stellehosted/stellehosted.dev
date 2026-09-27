// Polls the backend's /api/nowplaying (which itself proxies Navidrome) and updates the now-playing pill. Falls back to "not listening" text when nothing is playing, rather than leaving stale/fake track info on screen.

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
      titleEl.textContent = 'Silence...';
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

// The rim is a separate SVG (see home.html), so keep its width and viewBox in sync with the
// pill. One viewBox unit is 1/19.2 rem, which keeps the 23-unit corner radius undistorted.
const pillEl = document.getElementById('np-pill');
const rimEl = document.getElementById('np-rim');
const rimRectEl = document.getElementById('np-rim-rect');

new ResizeObserver(() => {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const widthRem = pillEl.getBoundingClientRect().width / rem;
  const units = Math.round(widthRem * 19.2);
  rimEl.style.width = `${widthRem}rem`;
  rimEl.setAttribute('viewBox', `0 0 ${units} 128`);
  rimRectEl.setAttribute('width', units - 2);
}).observe(pillEl);

pollNowPlaying();
setInterval(pollNowPlaying, NOWPLAYING_POLL_MS);
