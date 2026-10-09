# stellehosted.dev
My personal website, and a perpetual work in progress...

---
# Deployment
1. Make `.env` & `docker-compose.yml` from their example files
2. Put `stellehosted.dev` & `navidrome` into the same Docker network (stellehosted.dev)
3. `docker compose up -d --build`

---
# Pages
### home.html
Hello World~! Here's everything you should know about me. Did I mention the Now Playing widget that hooks up to Navidrome on my home server?

More pages coming soon...

### art.html
My art portfolio over the years!

---
# Adding Content
All contents are in `content/` (docker-compose: `./content` → `/app/content`)

### Art (`/art`)
```
content/art/
  ocs/
    01 OC1.png     one card per image; the name is the filename, a leading number sets the order
    02 OC2.png
    01 OC1.txt     optional description (shown in the popup)
    colors.json    gradient behind each card's art: { "Stelle": [ "#b39ef2", "#6248b3" ] }
    
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

---
# Shared components
### Dock (`dock.js`, `dock.css`, `dock.svg`)
The navigation Dock at the bottom of the page. Includes the glass pill, the icons, and the progressive-blur background. To use it on a page, add `<script src="/dock.js"></script>` at the end of `<body>` (which should be `position: relative`)

### Sidebar (`sidebar.css`, `sidebar.js`)
Sidebars used across portfolio pages
- Title, headings, body-text links, and progressive-blur background
- Add `<link rel="stylesheet" href="/sidebar.css">` to `<head>`, put a `<nav class="sidebar">` after the page content (the markup and classes are documented at the top of `sidebar.css`: `.sidebar-title`, `.sidebar-heading`, `.sidebar-group`, `.sidebar-list` / `.sidebar-text`), and add `<script src="/sidebar.js"></script>` at the end of `<body>
- `sidebar.css` also defines `.glow-text`, the gradient-glow heading style, which pages can use for their own headings

### Fonts (`font.css`)
Add `<link rel="stylesheet" href="/font.css">` to a page's `<head>`, then use `font-family: 'FuturaNowHeadline'` with the `font-weight` / `font-style` you want