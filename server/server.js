// Static file server for stellehosted.dev + a small Navidrome now-playing proxy.

// Why a proxy at all: Subsonic (Navidrome's API) auth requires a password-derived token on every request. That can never be sent to the browser, so this server holds the credentials, calls Navidrome over localhost, and hands the page back only the sanitized track info (and a re-proxied cover art image).

// Run with env vars set, e.g.:
//   NAVIDROME_URL=http://127.0.0.1:4533 NAVIDROME_USER=stelle NAVIDROME_PASSWORD=... node server.js

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const NAVIDROME_URL = (process.env.NAVIDROME_URL || 'http://127.0.0.1:4533').replace(/\/$/, '');
const NAVIDROME_USER = process.env.NAVIDROME_USER;
const NAVIDROME_PASSWORD = process.env.NAVIDROME_PASSWORD;
// Optional: Only show now-playing entries from this Subsonic username (if others share the same server).
const NAVIDROME_USERNAME_FILTER = process.env.NAVIDROME_USERNAME_FILTER;

const SITE_ROOT = path.join(__dirname, '..');
const NOWPLAYING_CACHE_MS = 8000;

if (!NAVIDROME_USER || !NAVIDROME_PASSWORD) {
  console.warn('[nowplaying] NAVIDROME_USER / NAVIDROME_PASSWORD not set — /api/nowplaying will always report nothing playing.');
}

function subsonicAuthParams() {
  const salt = crypto.randomBytes(6).toString('hex');
  const token = crypto.createHash('md5').update(NAVIDROME_PASSWORD + salt).digest('hex');
  return new URLSearchParams({
    u: NAVIDROME_USER,
    t: token,
    s: salt,
    v: '1.16.1',
    c: 'stellehosted.dev',
  });
}

// Navidrome joins multi-artist tracks into one display string ("A • B"). Prefer the structured
// OpenSubsonic artists list; otherwise split the string on the separators Navidrome/taggers use.
// Commas are left alone because they appear inside real names ("Tyler, The Creator").
function firstArtist(entry) {
  const structured = entry.artists?.[0]?.name;
  if (structured) return structured;
  return entry.artist?.split(/\s+[•\/;]\s+|;\s*/)[0];
}

let nowPlayingCache = { at: 0, data: null };

async function fetchNowPlaying() {
  if (Date.now() - nowPlayingCache.at < NOWPLAYING_CACHE_MS) {
    return nowPlayingCache.data;
  }

  let result = { playing: false };

  if (NAVIDROME_USER && NAVIDROME_PASSWORD) {
    try {
      const params = subsonicAuthParams();
      params.set('f', 'json');
      const res = await fetch(`${NAVIDROME_URL}/rest/getNowPlaying.view?${params}`);
      const json = await res.json();
      const entries = json?.['subsonic-response']?.nowPlaying?.entry;
      const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
      const entry = NAVIDROME_USERNAME_FILTER
        ? list.find((e) => e.username === NAVIDROME_USERNAME_FILTER)
        : list[0];

      if (entry) {
        result = {
          playing: true,
          title: entry.title,
          artist: firstArtist(entry),
          album: entry.album,
          coverArtId: entry.coverArt || null,
          // OpenSubsonic playbackReport extension: starting | playing | paused | stopped. Absent if the server/client doesn't report it.
          state: entry.state || null,
        };
      }
    } catch (err) {
      console.error('[nowplaying] Navidrome request failed:', err.message);
    }
  }

  nowPlayingCache = { at: Date.now(), data: result };
  return result;
}

async function handleCoverArt(req, res, id) {
  if (!id || !NAVIDROME_USER || !NAVIDROME_PASSWORD) {
    res.writeHead(404).end();
    return;
  }
  try {
    const params = subsonicAuthParams();
    params.set('id', id);
    const upstream = await fetch(`${NAVIDROME_URL}/rest/getCoverArt.view?${params}`);
    if (!upstream.ok) {
      res.writeHead(upstream.status).end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=300',
    });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.error('[nowplaying] cover art request failed:', err.message);
    res.writeHead(502).end();
  }
}

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.ttf': 'font/ttf', '.json': 'application/json',
};

function serveStatic(req, res, urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (rel === '/') rel = '/home.html';
  const filePath = path.normalize(path.join(SITE_ROOT, rel));
  if (!filePath.startsWith(SITE_ROOT)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404).end('Not found');
      return;
    }
    // no-cache = always revalidate: stops Safari and Cloudflare serving a stale nowplaying.js/home.html after a deploy.
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/nowplaying') {
    const data = await fetchNowPlaying();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
    return;
  }

  if (url.pathname === '/api/coverart') {
    await handleCoverArt(req, res, url.searchParams.get('id'));
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`stellehosted.dev listening on :${PORT} (Navidrome: ${NAVIDROME_URL})`);
});

process.on('SIGTERM', () => process.exit(0));