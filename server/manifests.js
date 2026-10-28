// Content manifests (art.yaml, photos.yaml): what is on the site, and which files may be served.

const fs = require('fs');
const path = require('path');
const { CONTENT_DIR } = require('./config');

// ---- Content manifests -----------------------------------------------------------------------
// The content folder (a NAS share) holds far more than the site shows, so nothing is discovered by
// listing folders. Two YAML files in its root say what is on the site, and ONLY the images they
// name can be served from /content/ (see README, "Adding Content"):
//   art.yaml     { ocs: [...], gallery: [...] }
//   photos.yaml  { gallery: [...] }
// A gallery is { name, folder, cards: [...] }. Its name is its heading on the page and in the sidebar,
// and the headings are in the order listed. Its cards are paths relative to `folder` (a path
// relative to the content folder), and the subfolders they sit in become the subheadings (years,
// grade levels...). A card is an image path, or { image | dir, description }: `dir` is a folder whose
// images are all the card (a carousel), and everything directly in it can be served.
const YAML = require('../lib/vendor/yaml');
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.heic', '.heif']);
// Browsers (other than Safari) can't show HEIC, so those files are converted to JPEG when served.
const NEEDS_CONVERSION = new Set(['.heic', '.heif']);
const byName = new Intl.Collator(undefined, { numeric: true }).compare;
const MANIFEST_CHECK_MS = 1000;   // don't stat the share on every image request

const contentUrl = (rel) => '/content/' + rel.split('/').map(encodeURIComponent).join('/');

// A manifest (or request) path -> normalized path relative to the content folder, or null if it
// can't be served: absolute, climbing out of the folder, or containing a dotfile.
function cleanRel(p) {
  if (typeof p !== 'string') return null;
  const rel = path.posix.normalize(p.trim().replace(/\\/g, '/')).replace(/\/+$/, '');
  if (!rel || rel.startsWith('/') || rel === '..' || rel.startsWith('../')) return null;
  return rel.split('/').some((seg) => seg.startsWith('.')) ? null : rel;
}

function cleanPath(p) {
  const rel = cleanRel(p);
  return rel && IMAGE_EXT.has(path.extname(rel).toLowerCase()) ? rel : null;
}

// What a manifest lets the server show: the image files it names, and the folders it names (only
// the images directly inside those).
const newAllowed = () => ({ files: new Set(), dirs: new Set() });
const isAllowedIn = (allowed, rel) => allowed.files.has(rel) || allowed.dirs.has(path.posix.dirname(rel));

// Image filenames directly in a folder, sorted by name; dotfiles (.DS_Store, Samba "._*") are skipped.
async function listImages(dir) {
  try {
    const entries = await fs.promises.readdir(path.join(CONTENT_DIR, dir), { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && !e.name.startsWith('.') && IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort(byName);
  } catch {
    return [];
  }
}

// Reads one entry's description and its image (`image:`) or folder of images (`dir:`), adding what
// it names to `allowed`. null = unusable.
function readEntry(raw, where, allowed) {
  if (!raw || typeof raw !== 'object') { console.warn(`[content] ${where}: not an entry, skipped`); return null; }
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  if ((raw.dir == null) === (raw.image == null)) { console.warn(`[content] ${where}: needs an image: or a dir:, skipped`); return null; }
  if (raw.dir != null) {
    const dir = cleanRel(raw.dir);
    if (!dir) { console.warn(`[content] ${where}: dir ${JSON.stringify(raw.dir)} is not a relative path, skipped`); return null; }
    allowed.dirs.add(dir);
    return { description, dir };
  }
  const image = cleanPath(raw.image);
  if (!image) { console.warn(`[content] ${where}: image ${JSON.stringify(raw.image)} is not a relative path to an image, skipped`); return null; }
  allowed.files.add(image);
  return { description, image };
}

// A dated card: { title, date, description, image | dir }. "[2026-05-07] Title" gives the date and
// title: it is the file name of a single image, or the folder name of a `dir` ("[2024-08-02] Trip").
// Galleries are organised by date, so a card without one is left out.
const DATED = /^\[(\d{4}-\d{2}-\d{2})\][\s_-]*(.*)$/;

function readPiece(raw, where, allowed) {
  const entry = readEntry(raw, where, allowed);
  if (!entry) return null;
  const m = (entry.dir ? path.posix.basename(entry.dir) : path.parse(entry.image).name).match(DATED);
  if (!m) { console.warn(`[content] ${where}: no [YYYY-MM-DD] in the ${entry.dir ? 'folder' : 'file'} name, skipped`); return null; }
  return { title: m[2], date: m[1], ...entry };
}

const newestFirst = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : byName(a.title, b.title));
const asList = (v) => (Array.isArray(v) ? v : []);

// A card as written in the manifest -> an entry with its path joined onto the gallery's folder.
function withFolder(card, folder) {
  const raw = typeof card === 'string' ? { image: card } : card;
  if (!raw || typeof raw !== 'object') return raw;
  const join = (p) => (folder && typeof p === 'string' ? `${folder}/${p}` : p);
  return { ...raw, image: join(raw.image), dir: join(raw.dir) };
}

// Subfolders (relative to the gallery's folder) that a card sits in: a single image's folder, or for
// a `dir` the folder above it. [] = directly in the gallery's folder.
function subfolders(piece, prefix) {
  const unit = piece.dir ?? piece.image;
  if (!prefix || !unit.startsWith(prefix)) return [];
  return path.posix.dirname(unit.slice(prefix.length)).split('/').filter((seg) => seg && seg !== '.');
}

// Galleries stay in the order the manifest lists them. Inside one, pieces are newest first, and so
// are the subfolders, by name (names that start with a year or number sort the same way). A
// gallery with nothing in it is left out.
function readGalleries(list, where, allowed) {
  return asList(list).flatMap((raw, i) => {
    const at = `${where}[${i}]`;
    if (!raw?.name) { console.warn(`[content] ${at}: no name, skipped`); return []; }
    const folder = typeof raw.folder === 'string' ? path.posix.normalize(raw.folder.trim().replace(/\\/g, '/')).replace(/\/+$/, '') : '';
    const prefix = folder && folder !== '.' ? folder + '/' : '';

    const root = { pieces: [], subs: new Map() };
    asList(raw.cards).forEach((entry, j) => {
      const piece = readPiece(withFolder(entry, prefix ? folder : ""), `${at}.cards[${j}]`, allowed);
      if (!piece) return;
      let node = root;
      for (const seg of subfolders(piece, prefix)) {
        if (!node.subs.has(seg)) node.subs.set(seg, { pieces: [], subs: new Map() });
        node = node.subs.get(seg);
      }
      node.pieces.push(piece);
    });

    const view = (name, node) => ({
      name,
      pieces: node.pieces.sort(newestFirst),
      galleries: [...node.subs].map(([sub, child]) => view(sub, child)).sort((a, b) => byName(b.name, a.name)),
    });
    return root.pieces.length || root.subs.size ? [view(String(raw.name), root)] : [];
  });
}

// Each builder turns a parsed document into { view, allowed }: `view` is what the API returns once
// image sizes are filled in, `allowed` every file the manifest names.
function buildArt(doc) {
  const allowed = newAllowed();
  const ocs = asList(doc?.ocs).flatMap((raw, i) => {
    const entry = readEntry(raw, `art.yaml ocs[${i}]`, allowed);
    if (!entry) return [];
    if (!raw.name) { console.warn(`[content] art.yaml ocs[${i}]: no name, skipped`); return []; }
    const [from, to] = asList(raw.colors);   // no colors = no gradient
    return [{ name: String(raw.name), from: from ?? null, to: to ?? null, ...entry }];
  });
  return { view: { ocs, galleries: readGalleries(doc?.gallery, 'art.yaml gallery', allowed) }, allowed };
}

function buildPhotos(doc) {
  const allowed = newAllowed();
  return { view: { galleries: readGalleries(doc?.gallery, 'photos.yaml gallery', allowed) }, allowed };
}

// Parsed manifests, re-read when the file's mtime changes. A manifest that fails to parse keeps
// serving the last good version (an error with line and column goes to the log).
const MANIFESTS = { art: buildArt, photos: buildPhotos };
const manifests = {};

function manifest(name) {
  const cached = manifests[name];
  if (cached && Date.now() - cached.checkedAt < MANIFEST_CHECK_MS) return cached.data;
  const file = path.join(CONTENT_DIR, `${name}.yaml`);
  let data = cached?.data ?? MANIFESTS[name](null);   // missing file = nothing to show yet
  let mtimeMs = cached?.mtimeMs;
  try {
    const stat = fs.statSync(file);
    if (stat.mtimeMs !== mtimeMs) {
      mtimeMs = stat.mtimeMs;
      try {
        data = MANIFESTS[name](YAML.parse(fs.readFileSync(file, 'utf8')));
      } catch (err) {
        console.error(`[content] ${name}.yaml: ${err.message}\n(keeping the previous version)`);
      }
    }
  } catch {
    // share not reachable right now: keep what we have
  }
  manifests[name] = { checkedAt: Date.now(), mtimeMs, data };
  return data;
}

const isAllowed = (rel) => Object.keys(MANIFESTS).some((name) => isAllowedIn(manifest(name).allowed, rel));

module.exports = { manifest, isAllowed, cleanPath, listImages, contentUrl, NEEDS_CONVERSION };
