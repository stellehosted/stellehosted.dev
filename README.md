# stellehosted.dev
My personal website, and a perpetual work in progress...

<br>

# Deployment
1. Make `.env` & `docker-compose.yml` from their `.example` files
2. Put `stellehosted.dev` & `navidrome` into the same Docker network (stellehosted.dev)
3. `docker compose up -d --build`

### Local Testing
`PORT=3000 node server/server.js`

<br>

# Pages
### home.html
Hello World~! Here's everything you should know about me. Did I mention the Now Playing widget that hooks up to Navidrome on my home server?

More pages coming soon...

### art.html
My art portfolio over the years!

<br>

# Library Components
### Dock (`lib/dock.js`, `dock.css`, `dock.svg`)
The navigation Dock at the bottom of the page
- Add `<script src="/lib/dock.js"></script>` at the end of `<body>`
- `position: relative`

### Sidebar (`lib/sidebar.css`, `sidebar.js`)
Sidebars used across portfolio pages
- Title, headings, body-text links, & progressive-blur background
- Add `<link rel="stylesheet" href="/lib/sidebar.css">` to `<head>`, put a `<nav class="sidebar">` after the page content (the markup and classes are documented at the top of `sidebar.css`: `.sidebar-title`, `.sidebar-heading`, `.sidebar-group`, `.sidebar-list` / `.sidebar-text`), and add `<script src="/lib/sidebar.js"></script>` at the end of `<body>
- `sidebar.css` also defines `.glow-text`, the gradient-glow heading style, which pages can use for their own headings

### Glass (`lib/glass.css`, `lib/glass.js`)
The Sketch "Glass" and "Glass (Secondary)" styles: frosted fill, 16px background blur, outer + inner glow, and the overlay-blended gradient rim
- Add `<link rel="stylesheet" href="/lib/glass.css">` to `<head>` and `<script src="/lib/glass.js"></script>` at the end of `<body>`
- Put `class="glass"` or `class="glass-secondary"` on any element and give it its own `position` and size. Optional: `--glass-radius` (in `--u` units, default 1.25), `--s` (scale, e.g. on mobile), `--rim-stroke` (canvas px, default 2)
- `glass.js` adds and sizes the rim for you (nothing to write in the markup). For glass added later, call `glassRims()`
- Keep the rim's container free of `transform` / `z-index` / `position: fixed`, or the overlay blend can't see the page behind it

### Fonts (`lib/font.css`, `lib/font/`)
- Add `<link rel="stylesheet" href="/lib/font.css">` to a page's `<head>`
- Use `font-family: 'FuturaNowHeadline'` with the `font-weight` / `font-style` you want

<br>

# Adding Content
All contents are in `content/` (docker-compose: `./content` → `/app/content`)

### Art (`/art`)
```
content/art/
  ocs/
    01 OC1.png     one card per image; the name is the filename, a leading number sets the order
    02 OC2.png
    01 OC1.txt     optional description (shown in the popup)
    colors.json    gradient behind each card's art: { "OC1": [ "#start", "#end" ] }
    
  2026-05-07 Everything I Learned and Loved.png    one timeline stop per image: "date title"
  2026-05-07 Everything I Learned and Loved.txt    (optional) description
  2025-03-14 Untitled.jpg                          no date in the name = the file's modified date

  2024-08-02 Three Part Piece/                     multi-piece carousel
    1.png  2.png  3.png                            shown in filename order
    description.txt                                (optional) description
```
- Stops are fixed 375px wide
- Images supported: `png`, `jpg`, `webp`, `avif`, `gif` and `heic` all work 
- Server lists the folder on each request via `/api/art`, and serves the files from `/content/...`.