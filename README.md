# stellehosted.dev
My personal website, and a perpetual work in progress...

<br>

# Deployment
1. Make `docker-compose.yml` from `docker-compose.yml.example` & fill in its `environment:`
2. Put Navidrome into the `stellehosted.dev` Docker network
3. `docker compose up -d --build`

### Local Testing
```bash
PORT=3000 node server/server.js
```
Set `NOWPLAYING_MOCK=1` in `environment:` (or the shell) to seed test nowPlaying data

<br>

# Pages
### home.html
Hello World~! Here's everything you should know about me. Did I mention the Now Playing widget that hooks up to Navidrome on my home server?

### art.html
My art portfolio over the years! This has been redesigned a couple too many times, but I guess that's just what design iteration looks like when this happens to be the first content page.

### photos.html
You want photo? We have photo!

More pages coming soon...

<br>

# Adding Content (`content/`)
- Served content is in the root folder `content/`, the YAMLs in `content/manifests/`
- `art.yaml` (`/art`) & `photos.yaml` (`/photos`)
- **Image Formats:** `png`, `jpg`, `webp`, `avif`, `gif` and `heic`

### `gallery:`
Manually ordered sections of `cards`
| Gallery | Description |
|---|---|
| `name` | Page content & sidebar heading  
| `folder` | Where the cards are, relative to `content/`<br>- Subfolders in `folder` are sidebar subheadings, sorted by name |
| `sync` | (optional, default `true`) `false` = [Auto-sync](#auto-sync) leaves this gallery's `cards` alone |

<br>

### `cards:`
The images in a `gallery`, relative to `folder`, sorted by name
| Cards | Description |
|---|---|
| `image` | Single-image card<br>`[yyyy-mm-dd] imageName` |
| `dir` | Multi-image directory<br>`[yyyy-mm-dd] multiImage` |
| `description` | (optional) Markdown |

<br>

### Auto-sync
The server edits `cards:` for you (every ~5s, comments & descriptions kept)
- A `[yyyy-mm-dd]` image or folder dropped in a gallery's `folder` is added as a card (newest first) — write its `description` under it
- A card whose file is gone is removed
- Undated files are ignored
- A card you delete by hand comes back while its file exists: set `sync: false` on the gallery to curate it yourself
- Skipped if the folder is unreachable or empty, or if the YAML has an error
- Only `content/manifests/` needs to be writable: `content/` stays `:ro` in `docker-compose.yml`, with `manifests/` mounted over it

### Example
```yaml
gallery:
  - name: myGallery
    folder: myGallery
    cards:
      - image: "[2026-01-01] image.jpg"

      - image: "2026/[2026-02-01] image2.jpg" # in "2026" subfolder & under "2026" subheading

      - dir: "2026/[2026-03-01] multiImage"
        description: |
          **markdown** descriptions
```

### OC Cards (`/art`, top of `art.yaml`)
```yaml
ocs: # manual order
  - name: oc1
    colors: ["#start", "#end"] # (optional) card bg colors
    image: "oc1.png" # or `dir:`
    description: |
      **markdown** descriptions
```
