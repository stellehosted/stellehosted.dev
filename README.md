# stellehosted.dev
My personal website, and a perpetual work in progress...

<br>

# Deployment
1. Make `.env` & `docker-compose.yml` from their `.example` files
2. Put `stellehosted.dev` & `navidrome` into the same Docker network (stellehosted.dev)
3. `docker compose up -d --build`

### Local Testing
`PORT=3000 node server/server.js`
- Set `NOWPLAYING_MOCK=1` in `.env` to seed test nowPlaying data

<br>

# Pages
### home.html
Hello World~! Here's everything you should know about me. Did I mention the Now Playing widget that hooks up to Navidrome on my home server?

More pages coming soon...

### art.html
My art portfolio over the years!

<br>

# Library (`/lib`)
### Styles
| Name | File | Description | Usage | Notes |
|---|---|---|---|---|
| **Glass** | `glass.*` | "Glass" and "Glass (Secondary)" styles | - `<head>`: `<link rel="stylesheet" href="/lib/styles/glass.css">`<br>- `<body>` End: `<script src="/lib/styles/glass.js"></script>`<br>- `class="glass"` or `class="glass-secondary"` | - Give elements `position` and size<br>- **Fixed:** Fill, blur, glows, rim<br>- **Customizable:** `--glass-radius` (in `--u` units, default 1.25) and `--s` (scale, e.g. on mobile)<br>- Keep the rim's container free of `transform` / `z-index` / `position: fixed`, or the overlay blend can't see the page behind it |
| **Text** | `text.css` | `.title`, `.heading`, `.subheading`, `.subtitle`, `.body-text` | - `<head>`: `<link rel="stylesheet" href="/lib/styles/text.css">`<br>- `class="title"`, `"heading"`, `"subheading"`, `"subtitle"` or `"body-text"` | |
| **Fonts** | `font/` | Futura Now Headline; Avenir (Book + Heavy) | - `<head>`: `<link rel="stylesheet" href="/lib/font/font.css">`<br>- Use `font-family: 'FuturaNowHeadline'` with the `font-weight` / `font-style` you want | |

### Components
| Name | File | Description | Usage | Notes |
|---|---|---|---|---|
| **Dock** | `dock.*` | Navigation Dock at the bottom of the page | - `<body>` End: `<script src="/lib/components/dock.js"></script>`<br>- `position: relative` | |
| **Dialog** | `dialog.*` | | - `<head>`: `font.css`, `text.css`, `glass.css`, `dialog.css`<br>- `<body>` End: `marked.umd.js` (optional, for markdown), `glass.js`, then `dialog.js`<br>- `openDialog({ title, date, description, images: [{ src }] })` | - Builds its own markup on first open; `date` (`YYYY-MM-DD`) and `description` are optional<br>- Without marked, descriptions are plain text<br>- Fixed layout: inset 150 units from the viewport, art left, text right |
| **Sidebar** | `sidebar.*` | | - `<head>`: `<link rel="stylesheet" href="/lib/styles/text.css">` and `<link rel="stylesheet" href="/lib/components/sidebar.css">` (text.css first)<br>- `<nav class="sidebar">` after the page content (the markup and classes are documented at the top of `sidebar.css`: `.sidebar-title`, `.sidebar-heading`, `.sidebar-group`, `.sidebar-list` / `.sidebar-text`)<br>- `<body>` End: `<script src="/lib/components/sidebar.js"></script>` | |

<br>

### Effects
| Name | File | Description | Usage | Notes |
|---|---|---|---|---|
| **glowFx** | `glowFx.*` | Scale up and outer glow on hover/focus | - `<body>` End: `<script src="/lib/effects/glowFx.js"></script>` (it loads `glowFx.css` itself; `dock.js` includes it too, so it's safe twice)<br>- Put `class="glow-fx-hit"` on whatever should react to the pointer and `class="glow-fx"` on the thing inside it that scales and glows (in SVG, the `.glow-fx` follows its hitbox as a sibling) | - **Used:** Text & icons (not cards)<br>- **Optional:** `--glow-fx-scale`<br>- The hitbox itself never moves, so the hover area doesn't shrink while it animates |
| **cardFx** | `cardFx.*` | Brightens a card's inner glow on hover/focus | - `<head>`: `<link rel="stylesheet" href="/lib/effects/cardFx.css">`<br>- Put `class="card-fx"` on the card and `class="card-fx-hit"` on whatever should react to the pointer (the card itself, or a wrapper around it) | - **Optional:** `--card-fx-size` (default `2.5rem`)<br>- It uses the card's `::after`, so the card shouldn't have its own |

<br>

# Adding Content (`content/`)
docker-compose: `./content` → `/app/content`

### Art (`/art`)
```
content/art/
  ocs/
    01 OC1.png              oc name = filename; shown in order by number
    01 OC1.md               (optional) description
    02 OC2.png
    colors.json             card BG gradient { "OC1": [ "#start", "#end" ] }
    
  [2026-05-07] artwork.png  [date] title
  [2026-05-07] artwork.md   (optional) description
  noDate.jpg                no [date] in filename falls back to modification date

  [2024-08-02] multi-art/   multi-piece carousel
    1.png  2.png  3.png     shown in filename order
    description.md          (optional) description
```

- **Image Formats:** `png`, `jpg`, `webp`, `avif`, `gif` and `heic` 
- Server lists the folder on each request via `/api/art`, and serves the files from `/content/...`.