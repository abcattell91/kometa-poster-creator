# Kometa Poster Creator

Generate collection posters for [Kometa](https://kometa.wiki) in the browser.
Pick or create a collection, style the poster live on a canvas, and download the
whole set as a zip laid out the way Kometa expects.

A personal fork of [ricoloic/Kometa-PMM-Poster-Creator](https://github.com/ricoloic/Kometa-PMM-Poster-Creator),
substantially rebuilt.

## Running it

Requires Node 18 or newer (the server uses the built-in `fetch`).

```bash
npm install
npm start
```

Then open <http://localhost:3001>.

Rendering happens entirely in the browser canvas. The Node server exists only to
serve the static files and to proxy two APIs that can't be called directly from
a page (see below).

## What it does

- **Collections** — ships with the built-in sets (genres, decades, charts,
  resolutions, anime seasons 2000–2050…), and lets you create your own. Every
  collection is editable, built-ins included.
- **Editing** — per-poster text, colour or image background, crop/zoom/pan,
  darkening, and full text styling: font, sizes, letter spacing, colour,
  outline, drop shadow, bloom and line order. Everything previews live.
- **Backgrounds** — search [wallhaven.cc](https://wallhaven.cc) or browse the
  ~16,000 images in
  [Kometa-Team/Default-Images](https://github.com/Kometa-Team/Default-Images),
  or upload your own.
- **Fonts** — the bundled poster font plus the 13 Kometa defaults (Bebas Neue,
  Comfortaa, Inter).
- **Plex** — sign in to pull your real collection names as autocomplete, or
  import a whole library's collections along with their current artwork.

## Output

Every poster exports as `<collection name>/poster.png`, so the zip unpacks
straight into your Kometa assets directory:

```
Action/poster.png
Best of 1980s/poster.png
Summer 2024/poster.png
```

**Folder names must match your Plex collection names exactly** — a mismatch
means Kometa silently applies the poster to nothing. Connecting Plex is the
easiest way to avoid that: imported names are taken from Plex and locked.

## Environment variables

Both are optional; everything works without them.

| Variable | Effect |
| --- | --- |
| `WALLHAVEN_API_KEY` | Enables NSFW results in the wallhaven picker. Without a key, wallhaven returns SFW and sketchy only — NSFW comes back empty with no error. A key can also be entered per-browser under **Filters** instead of set here. |
| `GITHUB_TOKEN` | Raises the GitHub API rate limit used to list the Kometa image repo. The listing is fetched once and cached for six hours, so the unauthenticated limit of 60 requests/hour is rarely a problem. |

```bash
WALLHAVEN_API_KEY=... GITHUB_TOKEN=... npm start
```

## Run this locally only

**Do not host this on a shared or public server.**

Signing in to Plex stores an authentication token in the browser's
`localStorage`. That token grants full access to your Plex account, not just
read access to collection names. On a machine only you can use, that is a
reasonable trade — the token goes only to plex.tv and your own Plex server, and
**Sign out** removes it. On a shared host, any script running on that origin can
read it, and it would need to move server-side behind a session first.

Your wallhaven key, custom collections and edits to the built-in collections are
stored the same way, so they live in one browser on one machine and are cleared
along with site data.

## Licensing

Please read this before reusing anything here.

- **My changes** (the editor, the Plex/wallhaven/Kometa integrations, the server
  routes) are offered freely — do what you like with them.
- **The upstream project** this forks,
  [ricoloic/Kometa-PMM-Poster-Creator](https://github.com/ricoloic/Kometa-PMM-Poster-Creator),
  carries **no licence**, which under default copyright means all rights
  reserved. That covers the original poster definitions in `public/posters.js`
  and the background art in `public/assets/`. I can't grant you rights over
  those, so treat them as the original author's.
- **No font is bundled.** The default typeface is Bebas Neue, fetched at runtime
  from the Kometa Default-Images repo. An earlier version shipped FF Good
  Condensed, a commercial face that shouldn't be redistributed.
- **Kometa's images and fonts** are loaded from
  [Kometa-Team/Default-Images](https://github.com/Kometa-Team/Default-Images) at
  runtime and are not redistributed here.
- **wallhaven images** belong to their respective artists. The picker is a
  search front-end; check the source before using anything publicly.

If you want to build on this properly, the clean path is asking the upstream
author to add a licence.

## Notes

- Plex is contacted directly from the browser — both plex.tv and Plex Media
  Server send permissive CORS headers. Nothing Plex-related passes through the
  Node server.
- wallhaven's search API sends no CORS headers, so it is proxied via
  `/api/wallhaven`. Its image CDN does send them, so pictures load directly.
- Kometa images and fonts load from jsDelivr; only the file listing passes
  through `/api/kometa`.
- Serving `public/` with any static file server also works, but the wallhaven
  and Kometa pickers need the Express routes.
