// Static file server for stellehosted.dev + a small Navidrome now-playing proxy.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { SITE_ROOT, CONTENT_DIR, MIME } = require('./config');
const { fetchNowPlaying, handleCoverArt, NAVIDROME_URL } = require('./navidrome');
const { scanArt, scanPhotos, serveContent } = require('./content');

const PORT = process.env.PORT || 8080;

// Test data instead of Navidrome: see server/mock.js.
const MOCK = process.env.NOWPLAYING_MOCK ? require('./mock') : null;

function serveStatic(req, res, urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    res.writeHead(400).end();
    return;
  }
  // Clean URLs: "/" is the home page, and extensionless paths map to a page ("/art" -> art.html).
  if (rel === '/') rel = '/home.html';
  else if (!path.extname(rel)) rel = rel.replace(/\/$/, '') + '.html';
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
    const data = MOCK ? MOCK.mockNowPlaying() : await fetchNowPlaying();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
    return;
  }

  if (url.pathname === '/api/coverart') {
    if (MOCK) { MOCK.mockCoverArt(res, url.searchParams.get('id')); return; }
    await handleCoverArt(req, res, url.searchParams.get('id'));
    return;
  }

  if (url.pathname === '/api/art') {
    try {
      const data = await scanArt();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(data));
    } catch (err) {
      console.error('[art] scan failed:', err.message);
      res.writeHead(500).end();
    }
    return;
  }

  if (url.pathname === '/api/photos') {
    try {
      const data = await scanPhotos();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(data));
    } catch (err) {
      console.error('[photos] scan failed:', err.message);
      res.writeHead(500).end();
    }
    return;
  }

  if (url.pathname.startsWith('/content/')) {
    serveContent(req, res, url.pathname);
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  require('./sync').start();
  console.log(`stellehosted.dev listening on :${PORT} (Navidrome: ${NAVIDROME_URL}, content: ${CONTENT_DIR})`);
});

process.on('SIGTERM', () => process.exit(0));