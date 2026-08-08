# Kometa Poster Creator

Personal fork of `ricoloic/Kometa-PMM-Poster-Creator`. Generates poster images
for Kometa collections in Plex.

## What it is

A p5.js sketch served as static files. `index.js` is an Express static server on
port 3001 — all rendering happens client-side in the browser canvas. Its
non-static routes are `/api/wallhaven` and `/api/kometa/*`, both proxies for
APIs the browser cannot reach directly (see below). Plex is contacted straight
from the browser and never touches the server.

- `public/posters.js` — data. Arrays of poster definitions, exported via the
  `POSTERS` object at the bottom, which drives the collection buttons in the UI.
- `public/poster-builder.js` — `PosterBuilder` class. Draws the background
  (`url` image, flat `color`, or a generated `pattern`), the dim wash, the text
  and its plate, and the white border.
- `public/sketch.js` — p5 lifecycle, all UI wiring, and the loops:
  `drawPoster(poster)` renders one, `runExport(list, name)` zips a batch,
  `runUpload(list)` pushes a batch to Plex. Also holds the Store/Undo/Backup,
  Plex, Wallhaven, Kometa and KometaFonts modules.
- `public/index.html`, `public/style.css` — markup and styling.
- The default font is Bebas Neue, fetched from jsDelivr in `preload()`. Nothing
  is bundled: the original FF Good Condensed is a commercial face and could not
  be redistributed once this repo went public. Falls back to `sans-serif` if the
  CDN is unreachable.

Run with `npm start` (or `node index.js`). A plain static server still serves
the app, but the wallhaven and Kometa pickers need the Express routes.

**Wallhaven background search.** `/api/wallhaven` proxies wallhaven's search API
because that API sends no CORS headers. The image CDN *does* send
`access-control-allow-origin: *`, so pictures load straight from it: p5's
`loadImage` sets `crossOrigin="anonymous"`, the canvas stays untainted, and
`toDataURL()` keeps working for zip export. Custom posters store the CDN URL
rather than the bytes, so `localStorage` stays small but the images need the
network at export time.

Filters (category, purity, sort, ratio, min size) are whitelisted in `index.js`
before being forwarded — `bits()` for the three-bit flag strings, `oneOf()` for
the enums — so a malformed value falls back rather than reaching wallhaven.
Results scroll infinitely via an `IntersectionObserver` on `#wh-sentinel`, rooted
to the grid. `random` sorting pins `meta.seed` from page 1, otherwise later pages
reshuffle and repeat.

Anonymous requests can reach SFW and sketchy content. **NSFW returns zero results
with a 200 and no error unless an API key is present**, so the proxy adds an
explicit `warning` for that case. The rate ceiling is 45 requests/minute.

The key is optional and per-browser: typed into the Filters panel, kept in
`localStorage` under `kometa-wallhaven-key`, and sent to the proxy as an
`X-Wallhaven-Key` header — not a query param, so it stays out of URLs and access
logs. `index.js` shape-checks it (`/^[A-Za-z0-9]{10,64}$/`) and falls back to the
`WALLHAVEN_API_KEY` env var, so the repo never needs a key committed to it.

## Conventions I've established

**Poster `name` is the Plex collection name, and the export path is derived from
it.** `assetPath()` in `sketch.js` always produces
`<collection name>/poster.png`, which is the layout Kometa expects; JSZip treats
`/` as a folder separator, so the archive unpacks straight into the asset
directory. Folder names must match Plex collection names exactly.

`collectionFolder()` strips any existing `/poster` suffix and `.png` extension
first, so the suffix is added exactly once. This matters because `posters.js` is
inconsistent: 278 entries are bare (`"Action"`) and 4 already carry the suffix
(`"Current Season/poster"`). The editor shows and stores the bare name; the
suffix only appears at export.

**Text styling is per-poster and optional.** `PosterBuilder.text(lines, style)`
merges `style` over `TEXT_DEFAULTS`, whose values are the original hard-coded
look (72/40, white, uppercase, no effects) — so `posters.js` entries render
unchanged. Fields: `font` (`poster`/`sans`/`serif`/`mono`/a Kometa TTF name),
`sizeBig`, `sizeSmall`, `textColor`, `uppercase`, `tracking`, `gap`, `autoFit`,
`align`, `rotate`, `opacity`, `textX`, `textY`, `swap`, `strokeWidth`,
`strokeColor`, `shadowBlur`, `shadowY`, `shadowOpacity`, `bloom`, and the plate
(`plate`, `plateColor`, `plateOpacity`, `platePad`, `plateRadius`). The whole
poster object is passed as the style, same as with the image adjustments.

Shadow and bloom come from `drawingContext.shadow*` — p5 renders loaded fonts as
canvas paths, so native canvas shadows apply to them. Bloom is the same
mechanism with the shadow colour set to the text colour, zero offset, and the
glyph painted repeatedly to build intensity. **Reset the shadow state after
drawing** or it bleeds into every later canvas operation. Letter spacing is
applied by hand, glyph by glyph, because p5 has no letter-spacing for loaded
fonts; `PosterBuilder.measure()` mirrors that maths so the overflow warning
stays accurate.

Defaults are declared in three places that must agree: `TEXT_DEFAULTS`,
`TEXT_CONTROLS` in `sketch.js`, and the `value=` attributes in `index.html`.

**Two text formats coexist.** A poster with a `lineSizes` array is multi-line:
`lines` reads **top to bottom**, one size per line in `lineSizes`, optional
per-line colours in `lineColors`, and the block is centred vertically. Without
`lineSizes` the legacy path below applies, kept byte-identical so untouched
`posters.js` entries do not move. The editor always writes the new format, so
saving a legacy poster converts it — and because the two layouts derive baselines
differently, a converted two-line poster can shift a few pixels vertically. Text Y
compensates.

**`lines` renders inverted (legacy format only).** In `PosterBuilder.text()`, `lines[1]` draws small
(40px) *above* `lines[0]` large (72px). So `["2024 Summer", "season"]` reads as
"SEASON" over "2024 SUMMER". Text is uppercased at draw time.

**Overflow is handled two ways.** There is still no wrapping: a long line runs
off the 600x900 canvas (25px borders, so 550px usable). `posterOverflows()`
badges offending rows in the item list and counts them in the toolbar, and the
per-poster `autoFit` flag shrinks the offending line at draw time via
`PosterBuilder.fitSize()`.

**Backgrounds are cover-fitted.** `PosterBuilder.url()` scales by
`max(600/w, 900/h)` and crops the overhang, so any source resolution works. The
committed `assets/` PNGs are all exactly 600x900, where this is a no-op.

**Poster entries may carry image adjustments.** `fit` (`cover`/`stretch`/
`contain`), `zoom`, `offsetX`, `offsetY` and `dim` (0–100 black wash, drawn
between background and text). All are optional and their defaults reproduce the
old plain-cover render, so nothing in `posters.js` needs them. The whole poster
object is passed to `PosterBuilder.url()` as its options argument.

**`PosterBuilder.cache` memoises decoded images by path, and is bounded.** The
editor's sliders redraw on every `input` event and re-decoding a 4K wallpaper
each time makes them unusable. It used to be unbounded, which was fine for the
600x900 PNGs in `assets/` but not for wallhaven originals: those are
full-resolution, and a 1920x3413 PNG decodes to ~26MB of RGBA *whatever its file
size*. A browsing session held hundreds of megabytes, the browser eventually
refused to decode any more, and — because a failed load resolved `null` and
`url()` simply drew nothing — backgrounds silently stopped appearing. It is now
LRU with `CACHE_LIMIT` entries; a cache hit re-inserts so the image being edited
can't be evicted mid-drag. `load()` also de-duplicates in-flight decodes via
`pending`.

**Nothing fails silently.** `PosterBuilder` collects a `warnings` array per
draw — a background that wouldn't load, an overlay icon that wouldn't load, Plex
artwork that couldn't be fetched. `drawPoster` returns the builder so callers can
report them: the preview puts them in the caption and the warning line, the
wallhaven picker says so on the thumbnail it just tried, and `runExport` counts
them in the final message rather than shipping black rectangles unnoticed.

Preview redraws are coalesced via `previewing`/`previewDirty`, and
`previewDraft()` hands a coalescing caller the **in-flight** promise. Returning
an immediately-resolved one made a slow background read as a failed one: the
wallhaven "Loading…" status cleared before the image had arrived.

**Colours come from the `COLORS` array in sketch.js.** Seasons use `#FFA133`,
Simkl trending uses `#33A1FF`. Entries with no `url` and no `color` get a random
colour each run, which makes output non-reproducible.

## Kometa Default-Images

`Kometa-Team/Default-Images` supplies ~16k background images across 21
categories and 13 TTFs (Bebas Neue, Comfortaa, Inter).

The repo listing comes from GitHub's git-trees API in one recursive call, but
that response is ~5MB and unauthenticated GitHub allows only 60 requests/hour —
so `index.js` fetches it once and holds it in memory for 6 hours, serving
`/api/kometa/categories` and `/api/kometa/images` (filter + paginate) from the
cache. Set `GITHUB_TOKEN` to raise the limit. Files whose name starts with `!`
are contact sheets of a folder, not posters, and are filtered out.

Images and fonts load in the browser **straight from jsDelivr**
(`cdn.jsdelivr.net/gh/Kometa-Team/Default-Images@master/`), which sends
`access-control-allow-origin: *` — so the canvas stays untainted and p5 can
parse the TTFs. Only paths pass through Express; no image bytes do. Posters
store the CDN URL, so they cost almost nothing in localStorage.

`KometaFonts.ensure(name)` must be awaited **before** any text is drawn —
`drawPoster` does this — otherwise the poster silently renders in the fallback
font. Concurrent requests for the same font are de-duplicated via a `pending`
map, since a slider drag can ask for one many times before the first resolves.

## Icon overlays (Iconify)

Posters may carry an `overlays` array of icon layers, drawn between the dim wash
and the text so text stays legible on top. Each entry is
`{icon, color, size, x, y, rotate, opacity, flipX}`; only `icon` (an Iconify name
like `mdi:star`) is required, and `PosterBuilder.OVERLAY_DEFAULTS` fills the rest.
The key is **absent** on posters without overlays, so every existing entry renders
byte-identical and `posters.js` needs no change.

`api.iconify.design` sends `access-control-allow-origin: *` on both the search
and SVG endpoints, so unlike wallhaven this needs **no proxy route in
`index.js`**, no API key and no account — which is also why it doesn't run into
the objection that killed the Puter.js idea. ~200k icons across 150+ open-source
sets; licences vary per set and the search response carries them, so the picker
puts the licence in each thumbnail's tooltip.

**SVG source is fetched as text, not pointed at with `loadImage`.** Two reasons.
Recolouring is then a local `currentColor` replace, so dragging the colour picker
costs no network round trip. And the `data:` URL built from it is same-origin —
a cross-origin SVG on the canvas risks tainting it, and a tainted canvas makes
`toDataURL()` throw for *every* poster in the run, not just that one. Same
reasoning as `Plex.thumbUrl()`.

Iconify serves monochrome icons as `fill="currentColor"`, so the replace is a
true recolour rather than a tint — the thing a PNG database could not offer.
Multi-colour sets (twemoji, noto, the `-poly` sets) carry real fills and are
deliberately left alone; the picker flags them via the `palette` flag in the
search response.

The source is sized `1em`, which an `<img>` decode cannot resolve, so real pixels
are substituted — **scoped to the opening `<svg>` tag**, because a bare
first-match replace would rewrite a child `<rect>`'s width on any icon whose root
carries none. Non-square viewBoxes letterbox inside the square under the default
`preserveAspectRatio`, which makes `size` the longest side rather than a
distortion.

Two caches, because they have different lifetimes: `iconSources` holds raw SVG
text per icon forever (tiny), while `iconCache` holds decoded images per
name+colour+size and is capped at `ICON_LIMIT` with oldest-first eviction — a
colour drag mints a new key on every input event. Keep that limit low: a
1024px raster is ~4MB, so the cap is a memory budget, not a convenience.
Raster size is rounded up to a 128px bucket so a size drag reuses a handful of
decodes. `PosterBuilder.decode()`
was split out of `load()` for this: `load()`'s cache is unbounded by design and
icons must not land in it.

`overlays` is copied by **Apply style to selected**, deep-copied per poster —
sharing one array would make editing a single poster's overlay silently change
every other poster it was applied to. It rides along in backups automatically.

## Plex integration

Entirely client-side — no proxy route, unlike wallhaven. Both plex.tv and a
user's own server send `access-control-allow-origin: *`, verified against the
live API.

**Every `X-Plex-*` value goes in the query string, never a header.** That keeps
each request a CORS "simple request", so no preflight is issued — which matters
most against the user's own server, where preflight behaviour can't be tested in
advance. Creating a PIN is a `POST` with no custom headers for the same reason.

Auth is the PIN flow (`POST /api/v2/pins` → user approves at app.plex.tv → poll
`/api/v2/pins/{id}` for `authToken`), so the app never handles a password. The
popup is opened *synchronously* in the click handler and its location set after
the await; opening it post-await gets blocked.

Server discovery walks `connections[]` from `/api/v2/resources`, sorted direct
before relay, and probes `/identity` on each until one answers — a server can
advertise LAN addresses unreachable from the browser.

**Import collections** builds a custom collection from the selected library,
carrying each collection's *current* artwork: the poster stores `plexThumb` (the
Plex path), with `lines: []` and `border: false` so it renders as Plex has it
today. `drawPoster` resolves the path lazily via `Plex.thumbUrl()`, which fetches
the image **as a blob** and hands back an object URL — pointing the canvas at the
cross-origin URL directly would taint it, and a tainted canvas makes
`toDataURL()` throw for *every* subsequent poster, not just that one. Only the
path is persisted; 86 inlined images would exceed the localStorage budget many
times over.

**Upload to Plex** (`runUpload`) renders each selected poster and POSTs it to
`/library/metadata/{ratingKey}/posters`, making it the collection's artwork —
an alternative to the zip, not a replacement for it. The body is a bare
`ArrayBuffer` with **no `Content-Type`**: `image/png` is not a CORS-safelisted
value and would force a preflight against the user's own server, whereas
omitting the header keeps it a simple request. Plex sniffs the image regardless,
and retains the previous poster in the collection's poster list, so the change
is reversible from Plex itself.

`Plex.resolve()` picks the target. A `plexKey` captured at import is unique
server-wide and used directly. Otherwise the name is looked up in
`Plex.index`, built by `buildIndex()` across **every** library — resolving
against the selected library alone was a bug: "Action" exists in Movies, TV and
Anime, so a poster would upload to whichever library happened to be selected. A
name found in more than one library returns `{ambiguous: true}` and is skipped
with a report rather than guessed at.

`lockPoster()` sets `thumb.locked=1` so Plex's agents leave the image alone. It
is a **PUT**, which is not a CORS-simple method and does need a preflight — so
it can fail where the upload succeeded, and its failures are tracked separately
so they never read as a failed upload. It does not stop other API clients
(Kometa, *arr*) from overwriting or unlocking.

The token lives in localStorage (`kometa-plex-token`) and goes only to plex.tv
and the user's own server. It grants full account access, so this is safe for
the intended local-only use and **not** safe if the app is ever hosted publicly.

## Bulk styling, backup, overflow, undo

**Apply style to selected** copies `STYLE_FIELDS` (every `TEXT_CONTROLS` key plus
`dim` and `border`) from the editor onto each ticked poster, leaving text, name,
background and Plex linkage alone. `IMAGE_STYLE_FIELDS` (fit/zoom/offsets) are
copied only onto posters that actually have an image.

**Backup** writes `{customCollections, builtinOverrides}` as JSON and restore
merges it. The Plex token and wallhaven key are deliberately excluded — backup
files get copied around, and credentials should not travel with them. Restore
checks the `app` marker before touching anything.

**Overflow** is flagged two ways: `posterOverflows()` badges individual rows and
counts them in the toolbar, so a bulk export can't quietly ship clipped text.
`autoFit` instead shrinks the offending line at draw time via
`PosterBuilder.fitSize()` — one proportional step (glyph width is linear in
point size) then a correction loop for the stroke width, which does not scale.
Line positions still use the *requested* sizes, so enabling auto-fit never
shifts the layout.

**Undo** is single-level and covers the two deletions (a poster row, a custom
collection). It stores a deep copy so later edits can't corrupt it, and clears
on collection change — restoring into a collection you've navigated away from
would be invisible.

## Editing built-in collections

Every pill is editable, not just custom ones. `posters.js` is treated as
read-only: the first edit to a built-in deep-clones it into `builtinOverrides`
(localStorage `kometa-builtin-overrides`), keyed by pill name, and that shadows
the original from then on. Reverting is just `delete builtinOverrides[key]`.

`collectionData(key)` resolves custom → override → pristine, and every mutation
must go through `ensureEditable()`, which does the clone-on-write. Mutating
`posters` directly would write straight into the `posters.js` arrays.

Pills mark their state: `✎` for a custom collection, `•` for an edited built-in.

## What I've done so far

- Replaced the hand-written `ANIME.SEASON` array with a generated loop covering
  2010–2035, since upstream stopped at 2024 Spring and the author's asset repo
  no longer publishes those PNGs. Seasons need no background art — they're
  colour + text only.
- Added an `ANIME_TRENDING` array for Simkl trending collections
  (today / week / month), registered under `POSTERS.Anime.Trending`.

- **UI rebuild.** Per-item checkboxes with search + select-all, a progress bar
  with cancel, and a clickable row to preview one poster. Dropped the Tailwind
  CDN and the shadcn-copied class strings entirely — all styling now lives in
  `style.css` behind CSS custom properties, with a dark mode via
  `prefers-color-scheme`. Markup uses short semantic classes (`.pill`, `.item`,
  `.btn`).
- **Rendering loop.** The recursive `createPoster` and its global `index` are
  gone. `drawPoster(poster)` draws one; `runExport(list, filename)` iterates.
  `zip` is created per run inside `runExport`, which fixes the old accumulation
  bug (the archive used to be built once in `setup()` and reused, so a second
  export included everything from the first).
- **Dropped the wait-time setting** (and the Options tab and Preview button with
  it). Image loading is awaited the whole way down — `drawPoster` →
  `builder.url` → `PosterBuilder.load` — so a poster cannot be captured before
  its background decodes, and the delay was guarding a race that no longer
  exists. `runExport` still yields one `requestAnimationFrame` per poster, which
  is what actually lets the progress bar repaint; awaiting a cached image
  resolves in a microtask and never yields to paint. Removing it took a
  104-poster export from ~45s to a couple of seconds.

## Notes

- `node_modules` is committed upstream. Express is pure JS, so nothing native
  needs rebuilding despite the repo being authored on macOS.
- The `type` field on poster entries is cosmetic — `PosterBuilder` stores it but
  never uses it. It only labels the entry in the UI list.

## Testing without a browser

There is no test suite. Two techniques have earned their keep:

**Run the real page in jsdom.** This is the only check that catches a broken
`setup()` — syntax checks and id-existence greps do not, because they never
execute it. It found a scripted edit that had silently deleted 716 lines
(`KometaFonts`, `Kometa`, `Plex`, `Wallhaven`), which left the preview blank and
Add poster dead while every other check passed.

Install jsdom **outside the repo** — `node_modules` is committed here, so
installing into it dirties the working tree:

```bash
mkdir -p /tmp/jsdomenv && cd /tmp/jsdomenv && npm install jsdom@22
```

jsdom 23+ pulls an ESM-only dependency that breaks under `require` on Node 20.
Load it from an `.mjs` harness via `createRequire('/tmp/jsdomenv/node_modules/jsdom')`,
stub the p5 globals plus `IntersectionObserver`, `CSS.escape` and `JSZip`,
construct the JSDOM with `url: 'http://localhost:3001/'` (localStorage refuses
opaque origins), then `window.eval()` **all three scripts concatenated into one
string** — separate `eval` calls do not share `const` bindings. Then drive
`setup()`, `select()`, `loadForm()`, `draftPoster()` and `savePoster()`.

**Run `PosterBuilder` in a `vm` context** with recording stubs for `fill`,
`rect`, `text` etc. Comparing the emitted draw calls is how the legacy text
layout was proven byte-identical after the multi-line rewrite, and how patterns
were checked to respond to seed and scale and to stay deterministic.

Watch for stubs that lie: a `noise()` stub that added an integer to a value
taken mod 1 reported two patterns as ignoring the seed when they did not.

## Where things stand

Everything below is built, pushed, and working as of the last session. The repo
is public at `abcattell91/kometa-poster-creator`.

Unverified in a real browser, and worth exercising first if touched:

- **Icon overlays.** Driven end to end under jsdom (editor round trip, save/
  reload, draw order, the SVG rewrite against five live icons), but never
  rendered by a real canvas. The one thing jsdom cannot answer is whether the
  browser decodes the `data:` SVG and leaves the canvas exportable — check by
  adding an overlay and hitting Download .zip.

- **Backup → clear site data → restore**, the scenario backup exists for.

**Upload to Plex is confirmed working** against a real server (2026-08-08) — the
no-`Content-Type` simple-request approach holds up in practice, so don't
"helpfully" add an `image/png` header to it. Still unconfirmed: **poster
locking**, which is a `PUT` and so needs a CORS preflight the server may not
answer. Its failures are already tracked separately from upload failures, so a
lock that fails will say so without reading as a failed upload.

Ideas raised and deliberately not built:

- **Puter.js AI image generation.** Declined: it needs every user to hold a
  Puter account, and loading a third-party script onto the same origin as the
  Plex token widens who can read that token. The procedural patterns cover the
  same ground without either problem.
- **Layering a raster image over a base image.** The icon overlay layer above
  covers the vector case. Kometa's `separators/` art is raster and designed for
  stacking, so pointing an overlay entry at an arbitrary image URL instead of an
  Iconify name is the obvious extension — the layer, its transforms and the
  editor rows already exist. A raster overlay can only be *tinted*, not
  recoloured, so the colour control would have to behave differently for it.
- **Dragging an overlay on the canvas.** Position is typed into number boxes
  today. The canvas has no hit-testing of any kind, so this needs real work,
  not a tweak.
- **Rounding the white poster frame.** Only the text plate rounds today; the
  frame is drawn by `side()` and rounding it would leave square PNG corners.
