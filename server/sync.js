// Keeps each manifest's `cards:` in step with the disk: a dated image or folder dropped into a
// gallery's `folder` is added as a card (so a description can be written under it), and a card whose
// file is gone is removed. The YAML is edited in place, so comments, order and descriptions stay.

const fs = require('fs');
const path = require('path');
const { CONTENT_DIR, MANIFEST_DIR } = require('./config');
const { cleanRel, DATED, IMAGE_EXT } = require('./manifests');
const YAML = require('../lib/vendor/yaml');

const SYNC_MS = 5000;

// Every card the folder holds, as paths relative to it: dated images, and dated folders that hold an
// image (a carousel, not searched any deeper). Other folders (years, grades...) are searched.
async function scan(folder, sub = '') {
  const found = [];
  const entries = await fs.promises.readdir(path.join(CONTENT_DIR, folder, sub), { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!DATED.test(e.name)) { found.push(...await scan(folder, rel)); continue; }
      const inside = await fs.promises.readdir(path.join(CONTENT_DIR, folder, rel));
      if (inside.some((n) => !n.startsWith('.') && IMAGE_EXT.has(path.extname(n).toLowerCase()))) found.push({ dir: rel });
    } else if (e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()) && DATED.test(path.parse(e.name).name)) {
      found.push({ image: rel });
    }
  }
  return found;
}

const quoted = (s) => Object.assign(new YAML.Scalar(s), { type: 'QUOTE_DOUBLE' });
const dateOf = (rel) => path.posix.basename(rel).match(/\[(\d{4}-\d{2}-\d{2})\]/)?.[1] ?? '';

// A card node -> [kind, path] ('image' | 'dir'), or null if it's not one.
function cardTarget(node) {
  if (YAML.isScalar(node)) return typeof node.value === 'string' ? ['image', node.value] : null;
  for (const kind of ['image', 'dir']) {
    const v = YAML.isMap(node) ? node.get(kind) : null;
    if (typeof v === 'string') return [kind, v];
  }
  return null;
}

async function syncGallery(g) {
  if (g.get('sync') === false) return false;   // curated by hand
  const folder = cleanRel(String(g.get('folder') ?? ''));
  if (!folder) return false;
  let found;
  try { found = await scan(folder); } catch { return false; }   // share not there: touch nothing
  if (!found.length) return false;                              // ...or looks empty (unmounted?)

  let cards = g.get('cards');
  if (!YAML.isSeq(cards)) { cards = new YAML.YAMLSeq(); g.set('cards', cards); }

  let changed = false;
  const have = new Set();
  for (let i = cards.items.length - 1; i >= 0; i--) {
    const target = cardTarget(cards.items[i]);
    const rel = target && cleanRel(target[1]);
    if (!rel) continue;
    if (fs.existsSync(path.join(CONTENT_DIR, folder, rel))) { have.add(rel); continue; }
    cards.items.splice(i, 1);
    changed = true;
  }

  for (const f of found.sort((a, b) => (dateOf(b.image ?? b.dir) < dateOf(a.image ?? a.dir) ? -1 : 1))) {
    const kind = f.image ? 'image' : 'dir';
    const rel = f[kind];
    if (have.has(rel)) continue;
    const card = new YAML.YAMLMap();
    card.set(kind, quoted(rel));
    // keep the list newest first: go in before the first card that is older
    const at = cards.items.findIndex((c) => dateOf(cardTarget(c)?.[1] ?? '') < dateOf(rel));
    cards.items.splice(at < 0 ? cards.items.length : at, 0, card);
    changed = true;
    console.log(`[sync] added "${rel}" to ${folder}`);
  }
  return changed;
}

async function syncManifest(name) {
  const file = path.join(MANIFEST_DIR, `${name}.yaml`);
  let before;
  try { before = await fs.promises.stat(file); } catch { return; }
  const doc = YAML.parseDocument(await fs.promises.readFile(file, 'utf8'));
  if (doc.errors.length) return;   // a broken file is left for the person to fix

  const list = doc.get('gallery');
  if (!YAML.isSeq(list)) return;
  let changed = false;
  for (const g of list.items) if (YAML.isMap(g) && await syncGallery(g)) changed = true;
  if (!changed) return;

  // Don't overwrite an edit made while we were scanning; the next pass picks it up.
  if ((await fs.promises.stat(file)).mtimeMs !== before.mtimeMs) return;
  // Via a temp file + rename so a reader never sees half a file (manifests/ is the writable mount).
  const tmp = `${file}.sync.tmp`;
  await fs.promises.writeFile(tmp, doc.toString());
  await fs.promises.rename(tmp, file);
}

let running = false;
function start(names = ['art', 'photos']) {
  const pass = async () => {
    if (running) return;
    running = true;
    for (const name of names) {
      try { await syncManifest(name); } catch (err) { console.error(`[sync] ${name}.yaml: ${err.message}`); }
    }
    running = false;
  };
  pass();
  setInterval(pass, SYNC_MS).unref();
}

module.exports = { start, syncManifest };
