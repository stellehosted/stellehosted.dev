# stellehosted.dev
My personal website, and a perpetual work in progress...

<br>

# Deployment
1. Make `.env` & `docker-compose.yml` from their `.example` files
2. Put `stellehosted.dev` & `navidrome` into the same Docker network (stellehosted.dev)
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
My art portfolio over the years!

More pages coming soon...

<br>

# Adding Content (`content/`)
docker-compose: `./content` → `/app/content`

### Art (`/art`)
```
content/art/
  ocs/
    1 OC1.png              oc name = filename; shown in order by number
    1 OC1.md               (optional) description
    2 OC2.png
    colors.json             card BG gradient { "OC1": [ "#start", "#end" ] }
    
  [2026-05-07] artwork.png  [date] title
  [2026-05-07] artwork.md   (optional) description
  noDate.jpg                no [date] in filename: skipped

  [2024-08-02] multi-art/   multi-piece carousel
    1.png  2.png  3.png     shown in filename order
    description.md          (optional) description
```

- **Image Formats:** `png`, `jpg`, `webp`, `avif`, `gif` and `heic` 
- Server lists the folder on each request via `/api/art`, and serves the files from `/content/...`.