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

# Library Components (`/lib`)
### UI

| Name | File | Description | Usage | Notes |
|---|---|---|---|---|
| **Glass** | `glass.*` | "Glass" and "Glass (Secondary)" styles | - `<head>`: `<link rel="stylesheet" href="/lib/glass.css">`<br>- `<body>` End: `<script src="/lib/glass.js"></script>`<br>- `class="glass"` or `class="glass-secondary"` | **Includes:** Fill, 16px background blur, outer + inner glow, and the overlay-blended rim<br>- Give elements `position` and size<br>- Optional: `--glass-radius` (in `--u` units, default 1.25), `--s` (scale, e.g. on mobile), `--rim-stroke` (canvas px, default 2)<br>- Keep the rim's container free of `transform` / `z-index` / `position: fixed`, or the overlay blend can't see the page behind it |
| **Dock** | `dock.*` | The navigation Dock at the bottom of the page | - `<body>` End: `<script src="/lib/dock.js"></script>`<br>- `position: relative` | |
| **Sidebar** | `sidebar.*` | Sidebars used across portfolio pages | - `<head>`: `<link rel="stylesheet" href="/lib/sidebar.css">`<br>- `<nav class="sidebar">` after the page content (the markup and classes are documented at the top of `sidebar.css`: `.sidebar-title`, `.sidebar-heading`, `.sidebar-group`, `.sidebar-list` / `.sidebar-text`)<br>- `<body>` End: `<script src="/lib/sidebar.js"></script>` | **Includes:** Title/Heading text styles, selection/hover FX, body-text links, & background<br>- `sidebar.css` also defines `.glow-text`, the gradient-glow heading style, which pages can use for their own headings |
| **Fonts** | `font.*`, `font/` | Futura Now Headline | - `<head>`: `<link rel="stylesheet" href="/lib/font.css">`<br>- Use `font-family: 'FuturaNowHeadline'` with the `font-weight` / `font-style` you want | |

<br>

### Effects

| Name | File | Description | Usage | Notes |
|---|---|---|---|---|
| **glowFx** | `glowFx.*` | Scale up and outer glow on hover/focus | **Used:** Text & icons w/o a style<br>- `<body>` End: `<script src="/lib/glowFx.js"></script>` (it loads `glowFx.css` itself; `dock.js` includes it too, so it's safe twice)<br>- Put `class="glow-fx-hit"` on whatever should react to the pointer and `class="glow-fx"` on the thing inside it that scales and glows (in SVG, the `.glow-fx` follows its hitbox as a sibling) | - Optional: `--glow-fx-scale`<br>- The hitbox itself never moves, so the hover area doesn't shrink while it animates |
| **cardFx** | `cardFx.*` | Brightens a card's inner glow on hover/focus | **Used:** Cards ("Glass" or "Glass (Secondary)" style)<br>- `<head>`: `<link rel="stylesheet" href="/lib/cardFx.css">`<br>- Put `class="card-fx"` on the card and `class="card-fx-hit"` on whatever should react to the pointer (the card itself, or a wrapper around it) | - Optional: `--card-fx-color`, `--card-fx-size` (default `2.5rem`), `--card-fx-time`<br>- It uses the card's `::after`, so the card shouldn't have its own |

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

- Formats supported: `png`, `jpg`, `webp`, `avif`, `gif` and `heic` 
- Server lists the folder on each request via `/api/art`, and serves the files from `/content/...`.