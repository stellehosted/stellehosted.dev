// Static file server for stellehosted.dev + a small Navidrome now-playing proxy.

// Why a proxy at all: Subsonic (Navidrome's API) auth requires a password-derived token on every request. That can never be sent to the browser, so this server holds the credentials, calls Navidrome over localhost, and hands the page back only the sanitized track info (and a re-proxied cover art image).

// Run with env vars set, e.g.:
//   NAVIDROME_URL=http://127.0.0.1:4533 NAVIDROME_USER=stelle NAVIDROME_PASSWORD=... node server.js

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const PORT = process.env.PORT || 8080;
const NAVIDROME_URL = (process.env.NAVIDROME_URL || 'http://127.0.0.1:4533').replace(/\/$/, '');
const NAVIDROME_USER = process.env.NAVIDROME_USER;
const NAVIDROME_PASSWORD = process.env.NAVIDROME_PASSWORD;
// Optional: Only show now-playing entries from this Subsonic username (if others share the same server).
const NAVIDROME_USERNAME_FILTER = process.env.NAVIDROME_USERNAME_FILTER;

const SITE_ROOT = path.join(__dirname, '..');
// Uploaded content (art, later photos/blog). A volume in Docker (./content), so it can be a Samba share.
const CONTENT_DIR = path.join(SITE_ROOT, 'content');
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
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
};

// ---- Art content -----------------------------------------------------------------------------
// No database and no metadata files: the folder *is* the content. Drop files in and they show up.
//   content/art/ocs/<Name>.png            one OC card each. A leading "01 " sets the order.
//   content/art/ocs/colors.json           card gradients (none if missing): { "Stelle": ["#b39ef2", "#6248b3"] }
//   content/art/<YYYY-MM-DD Title>.png    one timeline stop each. No date in the name = file's modified date.
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.heic', '.heif']);
// Browsers (other than Safari) can't show HEIC, so those files are converted to JPEG when served.
const NEEDS_CONVERSION = new Set(['.heic', '.heif']);
const byName = new Intl.Collator(undefined, { numeric: true }).compare;

const contentUrl = (...parts) => '/content/' + parts.map(encodeURIComponent).join('/');

// Image filenames in a folder, skipping dotfiles (.DS_Store, Samba/macOS "._*" droppings).
async function listImages(dir) {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && !e.name.startsWith('.') && IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort(byName);
  } catch {
    return [];   // folder doesn't exist yet
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.promises.readFile(file, 'utf8'));
  } catch {
    return {};
  }
}

// Display size of an image, read from its header (no dependencies, no decoding). The page needs it
// to reserve each stop's box before the image loads: with lazy loading an unsized <img> is 0px tall,
// so every image would count as "on screen" and load at once, and the layout would jump as they arrive.
// Returns { width, height } as the browser will show it (EXIF rotation and HEIC irot applied), or null.
const sizeCache = new Map();

function jpegSize(b) {
  let pos = 2, orientation = 1;
  while (pos + 9 < b.length) {
    if (b[pos] !== 0xff) { pos++; continue; }
    const marker = b[pos + 1];
    if (marker === 0xff) { pos++; continue; }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { pos += 2; continue; }
    const len = b.readUInt16BE(pos + 2);
    if (marker === 0xe1 && b.toString('latin1', pos + 4, pos + 10) === 'Exif\0\0') {
      const tiff = pos + 10;
      const le = b.toString('latin1', tiff, tiff + 2) === 'II';
      const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
      const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
      const ifd = tiff + u32(tiff + 4);
      for (let i = 0, n = u16(ifd); i < n; i++) {
        if (u16(ifd + 2 + i * 12) === 0x0112) orientation = u16(ifd + 2 + i * 12 + 8);
      }
    }
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      const height = b.readUInt16BE(pos + 5), width = b.readUInt16BE(pos + 7);
      return orientation >= 5 ? { width: height, height: width } : { width, height };
    }
    pos += 2 + len;
  }
  return null;
}

function webpSize(b) {
  const kind = b.toString('latin1', 12, 16);
  if (kind === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (kind === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  return null;
}

// AVIF / HEIC: the "ispe" boxes hold image extents (the largest is the full image; the rest are
// thumbnails or tiles) and "irot" says whether it's displayed rotated by a quarter turn.
function isobmffSize(b) {
  let best = null;
  for (let i = b.indexOf('ispe'); i !== -1 && i + 16 <= b.length; i = b.indexOf('ispe', i + 4)) {
    const width = b.readUInt32BE(i + 8), height = b.readUInt32BE(i + 12);
    if (!best || width * height > best.width * best.height) best = { width, height };
  }
  const irot = b.indexOf('irot');
  if (best && irot !== -1 && (b[irot + 4] & 1)) best = { width: best.height, height: best.width };
  return best;
}

async function imageSize(file) {
  const stat = await fs.promises.stat(file);
  const key = `${file}|${stat.mtimeMs}|${stat.size}`;
  if (sizeCache.has(key)) return sizeCache.get(key);
  let size = null;
  try {
    const fh = await fs.promises.open(file, 'r');
    const b = Buffer.alloc(512 * 1024);
    const { bytesRead } = await fh.read(b, 0, b.length, 0);
    await fh.close();
    const head = b.subarray(0, bytesRead);
    if (head.toString('latin1', 1, 4) === 'PNG') size = { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
    else if (head.toString('latin1', 0, 3) === 'GIF') size = { width: head.readUInt16LE(6), height: head.readUInt16LE(8) };
    else if (head[0] === 0xff && head[1] === 0xd8) size = jpegSize(head);
    else if (head.toString('latin1', 0, 4) === 'RIFF' && head.toString('latin1', 8, 12) === 'WEBP') size = webpSize(head);
    else if (head.toString('latin1', 4, 8) === 'ftyp') size = isobmffSize(head);
  } catch {
    size = null;   // truncated or odd file: the page falls back to a default shape
  }
  sizeCache.set(key, size);
  return size;
}

async function scanArt() {
  const artDir = path.join(CONTENT_DIR, 'art');
  const ocsDir = path.join(artDir, 'ocs');

  const colors = await readJson(path.join(ocsDir, 'colors.json'));
  const colorFor = (name) => {
    const key = Object.keys(colors).find((k) => k.toLowerCase() === name.toLowerCase());
    return key && Array.isArray(colors[key]) ? colors[key] : null;
  };
  const ocs = (await listImages(ocsDir)).map((file) => {
    const name = path.parse(file).name.replace(/^\d+[\s._-]+/, '');
    const [from, to] = colorFor(name) || [null, null];   // no entry in colors.json = no gradient
    return { name, image: contentUrl('art', 'ocs', file), from, to };
  });

  const pieces = await Promise.all((await listImages(artDir)).map(async (file) => {
    const base = path.parse(file).name;
    const m = base.match(/^(\d{4}-\d{2}-\d{2})(?:[\s_-]+(.*))?$/);
    const date = m ? m[1] : (await fs.promises.stat(path.join(artDir, file))).mtime.toISOString().slice(0, 10);
    const title = (m ? m[2] : base) || 'Untitled';
    const size = await imageSize(path.join(artDir, file));
    return { title, date, image: contentUrl('art', file), width: size?.width ?? null, height: size?.height ?? null };
  }));
  pieces.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : byName(a.title, b.title)));

  return { ocs, pieces };
}

// ---- HEIC -> JPEG ----------------------------------------------------------------------------
// iPhone photos are HEIC. Node can't decode them, so shell out: `heif-convert` (Alpine package
// libheif-tools, installed in server/Dockerfile) or, when developing on a Mac, the built-in `sips`.
// Results are cached by source path + mtime + size, so each file is converted once, and
// concurrent requests for the same file share one conversion.
const run = promisify(execFile);
const HEIC_CACHE_DIR = path.join(os.tmpdir(), 'stellehosted-heic');
const conversions = new Map();

async function convertHeic(src, dest) {
  const work = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'heic-'));
  try {
    const out = path.join(work, 'out.jpg');
    try {
      await run('heif-convert', ['-q', '88', src, out]);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      await run('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '88', src, '--out', out]);
    }
    // heif-convert writes out-1.jpg, out-2.jpg... for files holding several images (bursts, Live Photos).
    const made = (await fs.promises.readdir(work)).filter((f) => f.endsWith('.jpg')).sort(byName)[0];
    await fs.promises.mkdir(HEIC_CACHE_DIR, { recursive: true });
    await fs.promises.rename(path.join(work, made), dest);
  } finally {
    fs.promises.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

// Path of the cached JPEG for a HEIC file, converting first if needed.
async function jpegFor(filePath, stat) {
  const key = crypto.createHash('sha1').update(`${filePath}|${stat.mtimeMs}|${stat.size}`).digest('hex');
  const dest = path.join(HEIC_CACHE_DIR, `${key}.jpg`);
  if (fs.existsSync(dest)) return dest;
  if (!conversions.has(dest)) {
    conversions.set(dest, convertHeic(filePath, dest).finally(() => conversions.delete(dest)));
  }
  await conversions.get(dest);
  return dest;
}

// Serves uploaded files. Unlike the site's own files these are big, so revalidate with
// Last-Modified (304 when unchanged) instead of re-sending the image on every visit.
function serveContent(req, res, urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath.slice('/content/'.length));
  } catch {
    res.writeHead(400).end();
    return;
  }
  const filePath = path.resolve(CONTENT_DIR, rel);
  if (!filePath.startsWith(CONTENT_DIR + path.sep) || path.basename(filePath).startsWith('.')) {
    res.writeHead(403).end();
    return;
  }
  fs.stat(filePath, async (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': NEEDS_CONVERSION.has(ext) ? 'image/jpeg' : MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Last-Modified': stat.mtime.toUTCString(),
    };
    const since = Date.parse(req.headers['if-modified-since']);
    if (since && Math.floor(stat.mtimeMs / 1000) * 1000 <= since) {
      res.writeHead(304, headers).end();
      return;
    }
    let sendPath = filePath;
    let size = stat.size;
    if (NEEDS_CONVERSION.has(ext)) {
      try {
        sendPath = await jpegFor(filePath, stat);
        size = (await fs.promises.stat(sendPath)).size;
      } catch (e) {
        console.error('[content] HEIC conversion failed for', rel, '-', e.message);
        res.writeHead(415).end('Could not convert HEIC');
        return;
      }
    }
    res.writeHead(200, { ...headers, 'Content-Length': size });
    fs.createReadStream(sendPath).on('error', () => res.destroy()).pipe(res);
  });
}

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
    const data = await fetchNowPlaying();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
    return;
  }

  if (url.pathname === '/api/coverart') {
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

  if (url.pathname.startsWith('/content/')) {
    serveContent(req, res, url.pathname);
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`stellehosted.dev listening on :${PORT} (Navidrome: ${NAVIDROME_URL}, content: ${CONTENT_DIR})`);
});

process.on('SIGTERM', () => process.exit(0));