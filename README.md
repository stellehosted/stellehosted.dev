# stellehosted.dev
My personal website, and a perpetual work in progress...

---
# Deployment
- `stellehosted.dev` & `navidrome` → Docker network (stellehosted.dev)

---
# Pages
### home.html
Hello World~! Here's everything you should know about me. Did I mention the Now Playing widget that hooks up to Navidrome on my home server?

More pages coming soon...

### art.html
My art portfolio over the years!

---
# Adding Content
Drop everything in `content/` (Docker: `./content` -> `/app/content`)

### Art (`/art`)
```
content/art/
  ocs/
    01 Stelle.png         one card per image; the name is the filename, a leading number sets the order
    02 Ace.png
    colors.json           optional gradients behind transparent art: {"Stelle": ["#b39ef2", "#6248b3"]}
  2026-05-07 Everything I Learned and Loved.png    one timeline stop per image: "date title"
  2025-03-14 Untitled.jpg                          no date in the name = the file's modified date
```
Newest stops come first, and the sidebar's year links are built from them. `png`, `jpg`, `webp`, `avif` and `gif` all work. Files starting with `.` (macOS/Samba junk) are ignored. The server lists the folder on each request via `/api/art`, and serves the files from `/content/...`.

---
# Shared components
### Dock (`dock.js`, `dock.css`, `dock.svg`)
The navigation Dock at the bottom of the page. Includes the glass pill, the icons, and the progressive-blur background. To use it on a page, add `<script src="/dock.js"></script>` at the end of `<body>` (which should be `position: relative`)

### Sidebar (`sidebar.css`, `sidebar.js`)
Sidebars used across portfolio pages. Includes title, headings, body-text links, and the progressive-blur background. Add `<link rel="stylesheet" href="/sidebar.css">` to `<head>`, put a `<nav class="sidebar">` after the page content (the markup and classes are documented at the top of `sidebar.css`: `.sidebar-title`, `.sidebar-heading`, `.sidebar-group`, `.sidebar-list` / `.sidebar-text`), and add `<script src="/sidebar.js"></script>` at the end of `<body>`. The script builds the blur strip. `sidebar.css` also defines `.glow-text`, the gradient-glow heading style, which pages can use for their own headings.

### Fonts (`font.css`)
Futura Now Headline in `font/` (Thin 100 → ExtraBlack 950, each with an italic). Add `<link rel="stylesheet" href="/font.css">` to a page's `<head>`, then use `font-family: 'FuturaNowHeadline'` with the `font-weight` / `font-style` you want.