// Test data for the now-playing pill. Set NOWPLAYING_MOCK in .env (1, or a scenario name below) and restart the server. No Navidrome needed; covers are generated SVGs served from /api/coverart.

const SCENARIOS = {
  playing:  { playing: true, state: 'playing', title: 'Tell Your World', artist: 'livetune', album: 'Tell Your World EP', coverArtId: 'mock-teal' },
  paused:   { playing: true, state: 'paused', title: 'Tell Your World', artist: 'livetune', album: 'Tell Your World EP', coverArtId: 'mock-teal' },
  warm:     { playing: true, state: 'playing', title: 'Sunset Drive', artist: 'Neon Harbor', album: 'Golden Hour', coverArtId: 'mock-warm' },
  dark:     { playing: true, state: 'playing', title: 'Midnight', artist: 'Low Tide', album: 'Nocturne', coverArtId: 'mock-dark' },
  light:    { playing: true, state: 'playing', title: 'Paper Planes', artist: 'Pastel Club', album: 'Daydream', coverArtId: 'mock-light' },
  // Exercises the ellipsis / max-width.
  long:     { playing: true, state: 'playing', title: 'The Disappearance of Hatsune Miku (Extended Orchestral Remix Featuring Many Guests)', artist: 'cosMo@Bousou-P', album: 'Hatsune Miku no Shoushitsu: The Complete Collector\'s Edition', coverArtId: 'mock-warm' },
  short:    { playing: true, state: 'playing', title: 'Hi', artist: 'A', album: '', coverArtId: 'mock-dark' },
  // Server has a track but no cover art (404 from /api/coverart).
  nocover:  { playing: true, state: 'playing', title: 'Untitled', artist: 'Unknown', album: 'Demos', coverArtId: 'mock-missing' },
  nothing:  { playing: false },
};

const COVERS = {
  'mock-teal': ['#39c5bb', '#7a3b8f', '#ff5fa2'],
  'mock-warm': ['#ff9a3c', '#d6336c', '#5f1d6b'],
  'mock-dark': ['#1d2b64', '#0b0b1a', '#6a5acd'],
  'mock-light': ['#f6e6ff', '#bde0fe', '#ffc8dd'],
};

function coverSvg([a, b, c]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="512" height="512" fill="url(#g)"/>
<circle cx="360" cy="150" r="120" fill="${c}" opacity="0.85"/>
<rect x="40" y="300" width="260" height="170" rx="24" fill="${c}" opacity="0.5"/>
<path d="M0 420 Q130 340 260 420 T512 400 V512 H0Z" fill="#fff" opacity="0.25"/>
</svg>`;
}

// NOWPLAYING_MOCK picks the scenario (1 or true = playing).
function mockNowPlaying() {
  return SCENARIOS[process.env.NOWPLAYING_MOCK] || SCENARIOS.playing;
}

// Returns true if it handled the request.
function mockCoverArt(res, id) {
  const colors = COVERS[id];
  if (!colors) { res.writeHead(404).end(); return true; }
  res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
  res.end(coverSvg(colors));
  return true;
}

module.exports = { mockNowPlaying, mockCoverArt, SCENARIOS };
