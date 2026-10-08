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

---
# Shared components
### Dock (`dock.js`, `dock.css`, `dock.svg`)
The Dock symbol from Sketch: the glass pill, the icons, and the progressive-blur background strip behind it. To use it on a page, add `<script src="/dock.js"></script>` at the end of `<body>` (which should be `position: relative`)

### Fonts (`font.css`)
Every cut of Futura Now Headline in `font/` (Thin 100 → ExtraBlack 950, each with an italic), declared once. Add `<link rel="stylesheet" href="/font.css">` to a page's `<head>`, then use `font-family: 'FuturaNowHeadline'` with the `font-weight` / `font-style` you want. Dropping a new weight into `font/` also means adding a `@font-face` for it here.
