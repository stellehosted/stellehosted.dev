// The /content/ images and the art/photos listings built from the manifests.

const fs = require('fs');
const path = require('path');
const { CONTENT_DIR, MIME } = require('./config');
const { manifest, isAllowed, cleanPath, listImages, contentUrl, NEEDS_CONVERSION } = require('./manifests');
const { imageSize, jpegFor, thumbnailFor, THUMB_WIDTHS } = require('./images');

// Fills in each entry's images (a `dir` is listed now, so new files show up without touching the
// YAML) with their served URL and display size. An image the manifest names but the share doesn't
// have is dropped (and an entry left with none is too), so one typo can't break the page.
async function withSizes(entries) {
  const sized = await Promise.all(entries.map(async ({ dir, image, ...entry }) => {
    const rels = dir ? (await listImages(dir)).map((name) => `${dir}/${name}`) : [image];
    const images = (await Promise.all(rels.map(async (rel) => {
      try {
        const size = await imageSize(path.join(CONTENT_DIR, rel));
        return { src: contentUrl(rel), width: size?.width ?? null, height: size?.height ?? null };
      } catch {
        console.warn(`[content] "${rel}" is in the manifest but not on disk, skipped`);
        return null;
      }
    }))).filter(Boolean);
    if (!images.length && dir) console.warn(`[content] "${dir}" has no images, skipped`);
    return images.length ? { ...entry, images } : null;
  }));
  return sized.filter(Boolean);
}

async function withSizedGalleries(list) {
  const sized = await Promise.all(list.map(async (g) => {
    const [pieces, galleries] = await Promise.all([withSizes(g.pieces), withSizedGalleries(g.galleries)]);
    return pieces.length || galleries.length ? { name: g.name, pieces, galleries } : null;
  }));
  return sized.filter(Boolean);
}

async function scanArt() {
  const { ocs, galleries } = manifest('art').view;
  const [sizedOcs, sizedGalleries] = await Promise.all([withSizes(ocs), withSizedGalleries(galleries)]);
  return { ocs: sizedOcs, galleries: sizedGalleries };
}

async function scanPhotos() {
  return { galleries: await withSizedGalleries(manifest('photos').view.galleries) };
}

// Serves the images the manifests name. Unlike the site's own files these are big, so revalidate with
// Last-Modified (304 when unchanged) instead of re-sending the image on every visit.
function serveContent(req, res, urlPath) {
  let rel;
  try {
    rel = cleanPath(decodeURIComponent(urlPath.slice('/content/'.length)));
  } catch {
    res.writeHead(400).end();
    return;
  }
  // Only files a manifest names are served. Everything else on the share is invisible: 404, not 403.
  const filePath = rel && path.resolve(CONTENT_DIR, rel);
  if (!rel || !isAllowed(rel) || !filePath.startsWith(CONTENT_DIR + path.sep)) {
    res.writeHead(404).end('Not found');
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
    const asked = Number(new URL(req.url, 'http://x').searchParams.get('w'));
    if (asked > 0) {
      try {
        const width = THUMB_WIDTHS.find((w) => w >= asked) ?? THUMB_WIDTHS.at(-1);
        const thumb = await thumbnailFor(sendPath, stat, width);
        if (thumb) {
          sendPath = thumb.path;
          size = thumb.size;
          headers['Content-Type'] = thumb.type;
        }
      } catch (e) {
        console.error('[content] resize failed for', rel, '-', e.message);   // falls back to the original
      }
    }
    res.writeHead(200, { ...headers, 'Content-Length': size });
    fs.createReadStream(sendPath).on('error', () => res.destroy()).pipe(res);
  });
}

module.exports = { scanArt, scanPhotos, serveContent };
