# stellehosted.dev
My personal website, and a perpetual work in progress...

<br>

# Deployment
1. Make `.env` & `docker-compose.yml` from their `.example` files
2. Put Navidrome into the `stellehosted.dev` Docker network
3. `docker compose up -d --build`

### Local Testing
```bash
PORT=3000 node server/server.js
```
Set `NOWPLAYING_MOCK=1` in `.env` to seed test nowPlaying data

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
- Both YAML & served content are in the root folder `content/`
- `art.yaml` (`/art`) & `photos.yaml` (`/photos`)
- **Image Formats:** `png`, `jpg`, `webp`, `avif`, `gif` and `heic`

### `gallery:`
Manually ordered sections of `cards`
| Gallery | Description |
|---|---|
| `name` | Page content & sidebar heading  
| `folder` | Where the cards are, relative to `content/`<br>- Subfolders in `folder` are sidebar subheadings, sorted by name |

<br>

### `cards:`
The images in a `gallery`, relative to `folder`, sorted by name
| Cards | Description |
|---|---|
| `image` | Single-image card<br>`[yyyy-mm-dd] imageName` |
| `dir` | Multi-image directory<br>`[yyyy-mm-dd] multiImage` |
| `description` | (optional) Markdown |

<br>

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
