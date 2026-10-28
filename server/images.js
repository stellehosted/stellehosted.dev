// Image handling: reading sizes from file headers, HEIC -> JPEG conversion and thumbnails.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

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

// ---- HEIC -> JPEG ----------------------------------------------------------------------------
// iPhone photos are HEIC, which only Safari can display. Node can't decode them, so shell out:
// `heif-convert` (Alpine package libheif-tools, installed in server/Dockerfile; `brew install libheif`
// on a Mac). Each file is converted once and cached by source path + mtime + size. Simultaneous requests may both convert; they write identical bytes and rename is atomic.
const run = promisify(execFile);
const HEIC_CACHE_DIR = path.join(os.tmpdir(), 'stellehosted-heic');

async function convertHeic(src, dest) {
  await fs.promises.mkdir(HEIC_CACHE_DIR, { recursive: true });
  const tmp = `${dest}.${process.pid}.${Date.now()}.jpg`;
  await run('heif-convert', ['-q', '88', src, tmp]);
  await fs.promises.rename(tmp, dest);
}

// Path of the cached JPEG for a HEIC file, converting first if needed.
async function jpegFor(filePath, stat) {
  const key = crypto.createHash('sha1').update(`${filePath}|${stat.mtimeMs}|${stat.size}`).digest('hex');
  const dest = path.join(HEIC_CACHE_DIR, `${key}.jpg`);
  if (!fs.existsSync(dest)) await convertHeic(filePath, dest);
  return dest;
}

// ---- Thumbnails ------------------------------------------------------------------------------
// Cards show the art at a few hundred pixels, so "/content/...?w=960" serves a copy at most that wide
// instead of the original (the dialog still asks for the original). Widths snap up to a tier so the
// cache stays small. Like HEIC, resizing shells out (and is cached by source + mtime + size + width):
// `vipsthumbnail` (Alpine package vips-tools; `brew install vips` on a Mac) -> WebP.
// Anything that can't be shrunk (GIFs keep their animation, files already small enough, a failed
// resize) is sent as the original.
const THUMB_WIDTHS = [480, 960, 1440, 2000];
const THUMB_CACHE_DIR = path.join(os.tmpdir(), 'stellehosted-thumbs');

async function resize(src, dest, width) {
  const tmp = `${dest}.${process.pid}.${Date.now()}.webp`;
  await run('vipsthumbnail', [src, '--size', `${width}x100000`, '-o', `${tmp}[Q=82]`]);
  await fs.promises.rename(tmp, dest);
}

// { path, size, type } of the thumbnail of `sourcePath` (a file the browser can show), or null.
async function thumbnailFor(sourcePath, stat, width) {
  const ext = path.extname(sourcePath).toLowerCase();
  if (ext === '.gif') return null;
  const natural = await imageSize(sourcePath);
  if (!natural || natural.width <= width) return null;
  const key = crypto.createHash('sha1').update(`${sourcePath}|${stat.mtimeMs}|${stat.size}|${width}`).digest('hex');
  await fs.promises.mkdir(THUMB_CACHE_DIR, { recursive: true });
  const dest = path.join(THUMB_CACHE_DIR, `${key}.webp`);
  if (!fs.existsSync(dest)) await resize(sourcePath, dest, width);
  return { path: dest, size: (await fs.promises.stat(dest)).size, type: 'image/webp' };
}

module.exports = { imageSize, jpegFor, thumbnailFor, THUMB_WIDTHS };
