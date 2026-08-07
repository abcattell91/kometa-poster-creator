var font;
var zip;
var cvn;
var COLORS = [
    "#FF5733",
    "#3357FF",
    "#FF33A1",
    "#FF8C33",
    "#8C33FF",
    "#FF3333",
    "#FF33F5",
    "#33A1FF",
    "#DB33FF",
    "#FFDB33",
    "#337BFF",
    "#FF337B",
    "#7BFF33",
    "#FF5733",
    "#5733FF",
    "#7B33FF",
    "#FF5733",
    "#33A1FF",
    "#A1FF33",
    "#FF33A1",
    "#33FFA1",
    "#FFA133"
]

// Active collection, the subset ticked in the items list, and the label used
// for the downloaded zip.
var posters = [];
var selected = new Set();
var collectionName = 'images';
var activeIsCustom = false;

// User-made collections, `{ [name]: poster[] }`, mirrored into localStorage.
var customCollections = {};
// Edited copies of the built-in collections from posters.js, keyed the same way
// as the pills. posters.js is never written to; an override simply shadows it,
// so "revert" is just dropping the key.
var builtinOverrides = {};
// Flat lookup of the pristine posters.js data, `{ "Show Genre": poster[] }`.
var BUILTIN = {};
var STORAGE_KEY = 'kometa-custom-collections';
var OVERRIDE_STORAGE = 'kometa-builtin-overrides';
var KEY_STORAGE = 'kometa-wallhaven-key';

// Index of the poster the editor is currently modifying; null means the form
// is composing a new one.
var editingIndex = null;
// Data URL of an uploaded background, held until the poster is saved.
var pendingImage = null;
// Plex thumb path of the poster being edited, preserved across an edit that
// doesn't replace the background.
var pendingPlexThumb = null;
// True while editing a poster imported from Plex, whose name must keep matching
// the Plex collection exactly.
var editingPlexPoster = false;
// Coalesce preview redraws while a slider is being dragged.
var previewing = false;
var previewDirty = false;

// Set while an export/preview run is in flight so the buttons can lock and
// Cancel has something to flip.
var running = false;
var cancelled = false;

// The default typeface. Bebas Neue is one of the fonts Kometa itself ships, and
// is loaded from a CDN rather than bundled — the previous default was a
// commercial face that could not be redistributed with this repo.
var DEFAULT_FONT_URL =
    'https://cdn.jsdelivr.net/gh/Kometa-Team/Default-Images@master/BebasNeue-Regular.ttf';

function preload() {
    // Falls back to a system face if the CDN is unreachable, so the app still
    // runs offline rather than failing to start.
    font = loadFont(DEFAULT_FONT_URL, undefined, () => { font = 'sans-serif'; });
}

function setup() {
    cvn = createCanvas(600, 900, document.getElementById('poster-canvas'));
    Store.load();
    ElementBuiler.renderPills();
    ElementBuiler.itemControls();
    ElementBuiler.editor();
    ElementBuiler.download();
    ElementBuiler.cancel();
    ElementBuiler.uploadToPlex();
    Plex.attach();
    Kometa.attach();
}

/* ------------------------------------------------------------------ */
/* persistence                                                         */
/* ------------------------------------------------------------------ */

const Store = {
    load() {
        const read = (key) => {
            try {
                return JSON.parse(localStorage.getItem(key)) ?? {};
            } catch {
                return {};
            }
        };
        customCollections = read(STORAGE_KEY);
        builtinOverrides = read(OVERRIDE_STORAGE);

        for (const [library, collections] of Object.entries(POSTERS)) {
            for (const [collection, data] of Object.entries(collections)) {
                BUILTIN[`${library} ${collection}`] = data;
            }
        }
    },
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(customCollections));
            localStorage.setItem(OVERRIDE_STORAGE, JSON.stringify(builtinOverrides));
            return true;
        } catch (err) {
            // Uploaded backgrounds are inlined as data URLs, so a few large
            // images can exhaust the ~5MB localStorage budget.
            console.error(err);
            UI.caption('Could not save — browser storage is full. Try smaller background images.');
            return false;
        }
    },
    /** Unique key so "My Collection" twice doesn't clobber itself. */
    uniqueName(base) {
        let name = base;
        let n = 2;
        while (name in customCollections || name in BUILTIN) name = `${base} ${n++}`;
        return name;
    }
};

/**
 * Single-level undo for deletions — the only destructive actions that aren't
 * confirmed. Holds a deep copy, so a later edit can't corrupt what gets
 * restored.
 */
const Undo = {
    entry: null,

    remember(label, restore) {
        this.entry = { label, restore };
        this.render();
    },
    clear() {
        this.entry = null;
        this.render();
    },
    apply() {
        if (!this.entry) return;
        const { restore, label } = this.entry;
        this.entry = null;
        restore();
        Store.save();
        ElementBuiler.renderItems();
        ElementBuiler.refreshPill();
        this.render();
        UI.caption(`Restored ${label}.`);
    },
    render() {
        const button = document.querySelector('#undo');
        button.hidden = !this.entry;
        button.textContent = this.entry ? `Undo delete: ${this.entry.label}` : 'Undo';
    }
};

/** Export/import everything the app keeps in this browser. */
const Backup = {
    VERSION: 1,

    download() {
        const payload = {
            app: 'kometa-poster-creator',
            version: this.VERSION,
            exportedAt: new Date().toISOString(),
            // Deliberately excludes the Plex token and wallhaven key: a backup
            // file gets copied around and shared, and credentials should not
            // travel with it.
            customCollections,
            builtinOverrides
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `kometa-poster-creator-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        UI.caption('Backup downloaded.');
    },

    async restore(file) {
        let payload;
        try {
            payload = JSON.parse(await file.text());
        } catch {
            UI.caption('That file is not valid JSON.');
            return;
        }
        if (payload?.app !== 'kometa-poster-creator') {
            UI.caption('That does not look like a Kometa Poster Creator backup.');
            return;
        }

        const incoming = Object.keys(payload.customCollections ?? {});
        const edits = Object.keys(payload.builtinOverrides ?? {});
        const clashes = incoming.filter((name) => name in customCollections);
        const message = [
            `Restore ${incoming.length} custom collection(s) and edits to ${edits.length} built-in(s)?`,
            clashes.length ? `\n${clashes.length} will overwrite what you have now: ${clashes.join(', ')}.` : '',
            '\nAnything not in the backup is left alone.'
        ].join('');
        if (!confirm(message)) return;

        Object.assign(customCollections, payload.customCollections ?? {});
        Object.assign(builtinOverrides, payload.builtinOverrides ?? {});
        if (!Store.save()) return;

        Undo.clear();
        ElementBuiler.renderPills();
        // The active collection may have been replaced underneath us.
        if (collectionName !== 'images') {
            ElementBuiler.select(collectionName, collectionData(collectionName), activeIsCustom);
        }
        UI.caption(`Restored ${incoming.length} collection(s) from backup.`);
    }
};

/** The posters a collection should show: an override if one exists. */
function collectionData(key) {
    return customCollections[key] ?? builtinOverrides[key] ?? BUILTIN[key] ?? [];
}

/**
 * Make the active collection safe to mutate. Built-ins are cloned into
 * `builtinOverrides` on first edit so the arrays in posters.js stay pristine.
 */
function ensureEditable() {
    if (!activeIsCustom && !builtinOverrides[collectionName]) {
        builtinOverrides[collectionName] = JSON.parse(JSON.stringify(posters));
        posters = builtinOverrides[collectionName];
    }
    return posters;
}

/* ------------------------------------------------------------------ */
/* rendering                                                           */
/* ------------------------------------------------------------------ */

/** Draw a single poster onto the shared canvas. */
async function drawPoster(poster) {
    const builder = PosterBuilder.init(poster.type ?? 'default');
    // Wipe the previous poster first. Many Kometa images are PNGs with
    // transparency, and 'contain' leaves letterboxed edges — without an opaque
    // base, each draw composites onto the last one instead of replacing it.
    background(0);
    // Must resolve before any text is drawn, or the poster silently renders in
    // the fallback font.
    await KometaFonts.ensure(poster.font);

    // A Plex-imported poster carries a thumb path instead of a url; resolve it
    // to a blob URL, falling back to the flat colour if the server is
    // unreachable or refuses the request.
    // Not named `background`: that would shadow p5's global background() for
    // the whole function scope.
    let imageSource = poster.url;
    if (!imageSource && poster.plexThumb) {
        try {
            imageSource = await Plex.thumbUrl(poster.plexThumb);
        } catch {
            imageSource = null;
        }
    }

    if (imageSource) {
        await builder.url(imageSource, poster);
    } else if (poster.pattern) {
        builder.pattern(poster.pattern, {
            colorA: poster.patternA,
            colorB: poster.patternB,
            colorC: poster.patternC,
            seed: poster.patternSeed,
            scale: poster.patternScale
        });
    } else if (poster.color) {
        builder.color(poster.color);
        builder.overlay(true);
    } else {
        builder.color(COLORS[Math.floor(Math.random() * COLORS.length)]);
        builder.overlay(true);
    }
    if (poster.overlay) {
        builder.overlay(false);
    }
    if (poster.dim) builder.dim(poster.dim / 100);
    // The poster doubles as the style object; unset fields fall back to the
    // defaults in PosterBuilder.TEXT_DEFAULTS, so posters.js entries are
    // unaffected.
    if (poster.lines) builder.text(poster.lines, poster);
    // Imported Plex artwork already has its own framing, so the white border is
    // opt-out. Everything else defaults to drawing it, as before.
    if (poster.border !== false) builder.side();
}

/**
 * Render `list` one poster at a time into a fresh zip, then hand it to the
 * browser. Previewing a single poster is just `drawPoster` — the editor and the
 * items list both call it directly.
 */
async function runExport(list, filename = 'images') {
    if (running || !list.length) return;
    running = true;
    cancelled = false;
    // Fresh archive per run — a shared one accumulates across downloads.
    zip = new JSZip();
    UI.runStart(list.length);

    for (let i = 0; i < list.length; i++) {
        if (cancelled) break;
        const poster = list[i];
        UI.progress(i, list.length, poster.name);
        await drawPoster(poster);

        const dataURL = cvn.elt.toDataURL('image/png');
        zip.file(assetPath(poster.name), dataURL.split(',')[1], { base64: true });
        // Yield one frame so the progress bar actually repaints. Image loading
        // is already awaited all the way down, so no delay beyond this is
        // needed — awaiting a cached image resolves in a microtask, which never
        // lets the page paint.
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    if (!cancelled) {
        UI.progress(list.length, list.length, 'zipping…');
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.zip`;
        link.click();
        URL.revokeObjectURL(url);
    }

    running = false;
    UI.runEnd(cancelled ? 'Cancelled' : `Done — ${list.length} poster${list.length === 1 ? '' : 's'}`);
}

/**
 * Kometa wants `<Plex collection name>/poster.png`, so every export lands in a
 * folder of its own. Names in posters.js are inconsistent — most are bare
 * ("Action"), a few already carry the suffix ("Summer 2024/poster") — so strip
 * any existing suffix before adding it back exactly once.
 */
function collectionFolder(name) {
    return String(name ?? '')
        .trim()
        .replace(/\.png$/i, '')
        .replace(/\/+poster$/i, '')
        .replace(/^\/+|\/+$/g, '');
}

function assetPath(name) {
    const folder = collectionFolder(name);
    return folder ? `${folder}/poster.png` : 'poster.png';
}

/**
 * Render each poster and set it as the artwork on its Plex collection. Same
 * loop shape as runExport, but writing to the user's server instead of a zip.
 */
async function runUpload(list) {
    if (running || !list.length) return;

    // Partition before doing anything: an ambiguous name is never guessed at.
    const targets = [];
    const ambiguous = [];
    let unmatched = 0;
    for (const poster of list) {
        const found = Plex.resolve(poster);
        if (!found) unmatched++;
        else if (found.ambiguous) ambiguous.push({ poster, found });
        else targets.push({ poster, found });
    }

    if (!targets.length) {
        UI.caption(ambiguous.length
            ? `${ambiguous.length} poster name(s) exist in more than one library — import the library you mean, then upload.`
            : 'None of the selected posters match a Plex collection.');
        if (ambiguous.length) console.warn('Ambiguous poster names:\n'
            + ambiguous.map(({ poster, found }) =>
                `  ${poster.name} → ${found.libraries.join(', ')}`).join('\n'));
        return;
    }

    // Show exactly which collection in which library each poster will hit.
    const byLibrary = {};
    for (const { found } of targets) byLibrary[found.library] = (byLibrary[found.library] ?? 0) + 1;
    const lock = document.querySelector('#plex-lock').checked;

    const message = [
        `Upload ${targets.length} poster(s) to Plex?`,
        '',
        ...Object.entries(byLibrary).map(([library, n]) => `  ${n} → ${library}`),
        '',
        'This replaces the current artwork on those collections. Plex keeps the old',
        "poster in each collection's poster list, so you can switch back there.",
        lock ? '\nThe poster field will also be locked against Plex metadata refreshes.' : '',
        ambiguous.length
            ? `\n${ambiguous.length} skipped — the name exists in more than one library: `
                + ambiguous.map(({ poster }) => poster.name).join(', ')
            : '',
        unmatched ? `\n${unmatched} skipped — no matching collection.` : ''
    ].join('\n');
    if (!confirm(message)) return;

    running = true;
    cancelled = false;
    UI.runStart(targets.length);
    const failures = [];
    const lockFailures = [];

    for (let i = 0; i < targets.length; i++) {
        if (cancelled) break;
        const { poster, found } = targets[i];
        UI.progress(i, targets.length, `${poster.name} → ${found.library}`);
        await drawPoster(poster);

        try {
            const blob = await new Promise((resolve) => cvn.elt.toBlob(resolve, 'image/png'));
            await Plex.uploadPoster(found.key, await blob.arrayBuffer());
            if (lock) {
                // A failed lock must not read as a failed upload.
                try {
                    await Plex.lockPoster(found.key);
                } catch (err) {
                    lockFailures.push(`${poster.name}: ${err.message}`);
                }
            }
        } catch (err) {
            failures.push(`${poster.name}: ${err.message}`);
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    running = false;
    const done = targets.length - failures.length;
    UI.runEnd([
        cancelled ? 'Cancelled' : `Uploaded ${done} of ${targets.length}`,
        failures.length ? `${failures.length} failed` : '',
        lockFailures.length ? `${lockFailures.length} could not be locked` : ''
    ].filter(Boolean).join(' · '));

    if (failures.length) console.error('Plex upload failures:\n' + failures.join('\n'));
    if (lockFailures.length) {
        console.warn('Uploaded, but locking failed (the PUT needs a CORS preflight your '
            + 'server may not answer):\n' + lockFailures.join('\n'));
    }
    ElementBuiler.renderItems();
}

/** Posters currently ticked, in collection order. */
function selectedPosters() {
    return posters.filter((_, i) => selected.has(i));
}

/**
 * Text-style controls, declared once and driven by id.
 * [selector, poster field, default, output selector, output suffix]
 */
const TEXT_CONTROLS = [
    ['#edit-font', 'font', 'poster'],
    ['#edit-size-big', 'sizeBig', 72, '#out-size-big'],
    ['#edit-size-small', 'sizeSmall', 40, '#out-size-small'],
    ['#edit-autofit', 'autoFit', false],
    ['#edit-tracking', 'tracking', 0, '#out-tracking'],
    ['#edit-gap', 'gap', 0, '#out-gap'],
    ['#edit-text-x', 'textX', 0, '#out-text-x'],
    ['#edit-text-y', 'textY', 0, '#out-text-y'],
    ['#edit-swap', 'swap', false],
    ['#edit-align', 'align', 'center'],
    ['#edit-rotate', 'rotate', 0, '#out-rotate', '°'],
    ['#edit-textcolor', 'textColor', '#ffffff'],
    ['#edit-upper', 'uppercase', true],
    ['#edit-smallcolor', 'smallColor', '#ffffff'],
    ['#edit-smalllink', 'smallColorLink', true],
    ['#edit-opacity', 'opacity', 100, '#out-opacity', '%'],
    ['#edit-plate', 'plate', 'none'],
    ['#edit-platecolor', 'plateColor', '#000000'],
    ['#edit-plateopacity', 'plateOpacity', 55, '#out-plateopacity', '%'],
    ['#edit-platepad', 'platePad', 18, '#out-platepad'],
    ['#edit-stroke-w', 'strokeWidth', 0, '#out-stroke-w'],
    ['#edit-stroke-c', 'strokeColor', '#000000'],
    ['#edit-shadow-blur', 'shadowBlur', 0, '#out-shadow-blur'],
    ['#edit-shadow-y', 'shadowY', 0, '#out-shadow-y'],
    ['#edit-shadow-o', 'shadowOpacity', 60, '#out-shadow-o', '%'],
    ['#edit-bloom', 'bloom', 0, '#out-bloom', '%']
];

const controlValue = (el) =>
    el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;

/**
 * Fields copied by "Apply style to selected" — look, not content. Text, name,
 * background and Plex linkage are deliberately excluded.
 */
const STYLE_FIELDS = [...TEXT_CONTROLS.map(([, key]) => key), 'dim', 'border'];
/** Only meaningful on a poster that actually has an image. */
const IMAGE_STYLE_FIELDS = ['fit', 'zoom', 'offsetX', 'offsetY'];

/** Does either line of `poster` run past the canvas border? */
function posterOverflows(poster) {
    if (!poster.lines?.length || poster.autoFit) return false;
    const style = { ...PosterBuilder.TEXT_DEFAULTS, ...poster };
    const cased = (s) => (style.uppercase ? String(s).toUpperCase() : String(s));
    if (poster.lines[0] && PosterBuilder.overflows(cased(poster.lines[0]), style.sizeBig, style)) {
        return true;
    }
    return Boolean(poster.lines[1])
        && PosterBuilder.overflows(cased(poster.lines[1]), style.sizeSmall, style);
}

/* ------------------------------------------------------------------ */
/* Kometa Default-Images: fonts and backgrounds                        */
/* ------------------------------------------------------------------ */

/**
 * The Kometa TTFs, loaded on demand from jsDelivr (which sends CORS headers, so
 * p5 can parse them). Cached per session; `ensure()` must be awaited before
 * drawing or the poster silently falls back to the built-in font.
 */
const KometaFonts = {
    CDN: 'https://cdn.jsdelivr.net/gh/Kometa-Team/Default-Images@master/',
    cache: new Map(),
    pending: new Map(),

    isKometa(name) {
        return typeof name === 'string' && /^(BebasNeue|Comfortaa|Inter)-/.test(name);
    },

    ensure(name) {
        if (!this.isKometa(name) || this.cache.has(name)) return Promise.resolve();
        // De-duplicate: a slider drag can request the same font many times
        // before the first load resolves.
        if (!this.pending.has(name)) {
            this.pending.set(name, new Promise((resolve) => {
                loadFont(`${this.CDN}${name}.ttf`,
                    (loaded) => { this.cache.set(name, loaded); resolve(); },
                    () => resolve());
            }));
        }
        return this.pending.get(name);
    },

    get(name) {
        return this.cache.get(name);
    }
};

/** Browser for the ~16k Kometa default background images. */
const Kometa = {
    page: 1,
    lastPage: 1,
    busy: false,
    count: 0,

    status(message, show = true) {
        const node = document.querySelector('#km-status');
        node.hidden = !show;
        node.textContent = message;
    },

    get loaded() {
        return document.querySelector('#km-category').options.length > 1;
    },

    async loadCategories() {
        if (this.loaded) return true;
        try {
            const response = await fetch('/api/kometa/categories');
            const body = await response.json();
            if (!response.ok) throw new Error(body.error ?? 'Could not list categories.');
            const select = document.querySelector('#km-category');
            for (const { name, count } of body) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = `${name.replace(/_/g, ' ')} (${count})`;
                select.appendChild(option);
            }
            this.status('', false);
            return true;
        } catch (err) {
            // Recoverable: retried whenever the picker is next used, so a blip
            // at startup doesn't disable it until the page is reloaded.
            this.status(`${err.message} Click here to retry.`);
            document.querySelector('#km-status').classList.add('retry');
            return false;
        }
    },

    async search(page = 1) {
        if (this.busy) return;
        if (page > 1 && page > this.lastPage) return;
        this.busy = true;
        this.page = page;
        this.status(page === 1 ? 'Loading…' : 'Loading more…');

        try {
            const params = new URLSearchParams({
                category: document.querySelector('#km-category').value,
                q: document.querySelector('#km-query').value.trim(),
                page
            });
            const response = await fetch(`/api/kometa/images?${params}`);
            const body = await response.json();
            if (!response.ok) throw new Error(body.error ?? 'Search failed.');

            this.lastPage = body.lastPage;
            if (page === 1) this.count = 0;
            this.count += body.data.length;
            this.render(body.data, page > 1);
            this.status(body.total
                ? `${this.count} of ${body.total.toLocaleString()} shown`
                : 'Nothing matched.');
        } catch (err) {
            this.status(`${err.message} (is the Express server running?)`);
            this.lastPage = 0;
        } finally {
            this.busy = false;
            requestAnimationFrame(() => this.topUp());
        }
    },

    topUp() {
        const grid = document.querySelector('#km-results');
        const sentinel = document.querySelector('#km-sentinel');
        if (this.busy || this.page >= this.lastPage || !this.count) return;
        if (sentinel.offsetTop <= grid.scrollTop + grid.clientHeight) this.search(this.page + 1);
    },

    observe() {
        const grid = document.querySelector('#km-results');
        new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) this.search(this.page + 1);
        }, { root: grid, rootMargin: '150px' }).observe(document.querySelector('#km-sentinel'));
    },

    render(items, append) {
        const grid = document.querySelector('#km-results');
        const sentinel = document.querySelector('#km-sentinel');
        if (!append) grid.querySelectorAll('.wh-thumb').forEach((node) => node.remove());

        for (const item of items) {
            const thumb = document.createElement('button');
            thumb.type = 'button';
            thumb.className = 'wh-thumb';
            thumb.style.backgroundImage = `url("${item.url}")`;
            thumb.title = `${item.path} — click to use`;
            thumb.innerHTML = `<span class="wh-res">${item.name}</span>`;
            thumb.onclick = () => {
                grid.querySelector('.wh-thumb[data-picked="true"]')?.removeAttribute('data-picked');
                thumb.dataset.picked = 'true';
                pendingImage = item.url;
                pendingPlexThumb = null;
                document.querySelector('input[name="bg"][value="image"]').checked = true;
                document.querySelector('#clear-image').hidden = false;
                ElementBuiler.defaultDim();
                ElementBuiler.previewDraft();
            };
            grid.insertBefore(thumb, sentinel);
        }
    },

    /** Re-fetch the category list if a startup failure left it empty. */
    async retry() {
        document.querySelector('#km-status').classList.remove('retry');
        this.status('Retrying…');
        if (await this.loadCategories()) this.search(1);
    },

    attach() {
        const category = document.querySelector('#km-category');
        const query = document.querySelector('#km-query');

        category.onchange = () => this.search(1);
        query.oninput = () => {
            clearTimeout(this.debounce);
            this.debounce = setTimeout(() => this.search(1), 250);
        };
        // Any attempt to use the picker retries a failed startup fetch.
        category.onfocus = () => { if (!this.loaded) this.retry(); };
        query.onfocus = () => { if (!this.loaded) this.retry(); };
        document.querySelector('#km-status').onclick = () => {
            if (!this.loaded) this.retry();
        };

        this.observe();
        this.loadCategories();
    }
};

/* ------------------------------------------------------------------ */
/* plex                                                                */
/* ------------------------------------------------------------------ */

/**
 * Talks to plex.tv and the user's own server directly from the browser — both
 * send `access-control-allow-origin: *`. Every `X-Plex-*` value goes in the
 * query string rather than a header, which keeps each request a CORS "simple
 * request" and avoids preflight against the user's server entirely.
 *
 * Auth uses the PIN flow, so this never sees a password. The resulting token is
 * kept in localStorage and sent only to plex.tv and the user's own server.
 */
const Plex = {
    PRODUCT: 'Kometa Poster Creator',
    // [{ title, thumb, key }] for the selected library.
    collections: [],
    // Library sections, and every collection on the server indexed by name.
    sections: [],
    index: null,
    // Plex thumb path -> blob URL, resolved lazily and kept for the session.
    thumbs: new Map(),

    get clientId() {
        let id = localStorage.getItem('kometa-plex-client');
        if (!id) {
            id = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)) + '-kometa';
            localStorage.setItem('kometa-plex-client', id);
        }
        return id;
    },
    get token() { return localStorage.getItem('kometa-plex-token') ?? ''; },
    set token(value) {
        if (value) localStorage.setItem('kometa-plex-token', value);
        else localStorage.removeItem('kometa-plex-token');
    },
    get server() { return localStorage.getItem('kometa-plex-server') ?? ''; },
    set server(value) {
        if (value) localStorage.setItem('kometa-plex-server', value);
        else localStorage.removeItem('kometa-plex-server');
    },

    status(message) {
        document.querySelector('#plex-status').textContent = message;
    },

    params(extra = {}) {
        return new URLSearchParams({
            'X-Plex-Product': this.PRODUCT,
            'X-Plex-Client-Identifier': this.clientId,
            ...(this.token ? { 'X-Plex-Token': this.token } : {}),
            ...extra
        });
    },

    async get(url, timeout = 8000) {
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), timeout);
        try {
            const response = await fetch(url, {
                headers: { Accept: 'application/json' },
                signal: abort.signal
            });
            if (response.status === 401) throw new Error('Plex rejected the token — sign in again.');
            if (!response.ok) throw new Error(`Plex returned ${response.status}.`);
            return await response.json();
        } finally {
            clearTimeout(timer);
        }
    },

    /** PIN flow: open plex.tv to authorise, then poll until the pin is claimed. */
    async signIn() {
        // Opened synchronously — a popup blocked after an await is the usual
        // way this flow fails.
        const win = window.open('', '_blank');
        try {
            this.status('Requesting a sign-in code…');
            const pin = await (await fetch(
                `https://plex.tv/api/v2/pins?strong=true&${this.params()}`,
                { method: 'POST', headers: { Accept: 'application/json' } }
            )).json();

            const authParams = new URLSearchParams({
                clientID: this.clientId,
                code: pin.code,
                'context[device][product]': this.PRODUCT
            });
            win.location = `https://app.plex.tv/auth#?${authParams}`;
            this.status('Waiting for you to approve in the Plex tab…');

            // Poll for up to three minutes.
            for (let i = 0; i < 90; i++) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                const check = await this.get(
                    `https://plex.tv/api/v2/pins/${pin.id}?${this.params()}`);
                if (check.authToken) {
                    this.token = check.authToken;
                    win.close();
                    await this.loadServers();
                    return;
                }
            }
            throw new Error('Timed out waiting for approval.');
        } catch (err) {
            win?.close();
            this.status(err.message);
        }
    },

    signOut() {
        this.token = '';
        this.server = '';
        this.collections = [];
        this.syncDatalist();
        this.render();
        this.status('Signed out. The token has been removed from this browser.');
    },

    async loadServers() {
        this.status('Finding your servers…');
        const resources = await this.get(
            `https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1&${this.params()}`);
        const servers = resources.filter((r) => r.provides?.includes('server'));
        if (!servers.length) throw new Error('No Plex servers on this account.');

        const select = document.querySelector('#plex-server');
        select.innerHTML = '';
        for (const server of servers) {
            // Prefer a direct connection; relay is slow but works from anywhere.
            const connections = [...(server.connections ?? [])]
                .sort((a, b) => (a.relay - b.relay) || (b.local - a.local));
            if (!connections.length) continue;
            const option = document.createElement('option');
            option.value = JSON.stringify(connections.map((c) => c.uri));
            option.textContent = server.name;
            select.appendChild(option);
        }
        this.render();
        await this.connect();
    },

    /** Try each candidate URI until one answers, then load its libraries. */
    async connect() {
        const select = document.querySelector('#plex-server');
        const uris = JSON.parse(select.value || '[]');
        this.status(`Connecting to ${select.selectedOptions[0]?.textContent ?? 'server'}…`);

        for (const uri of uris) {
            try {
                await this.get(`${uri}/identity?${this.params()}`, 4000);
                this.server = uri;
                await this.loadLibraries();
                return;
            } catch {
                // Try the next connection.
            }
        }
        this.status('Could not reach that server from this browser.');
    },

    async loadLibraries() {
        const body = await this.get(`${this.server}/library/sections?${this.params()}`);
        const sections = body.MediaContainer?.Directory ?? [];
        this.sections = sections;
        const select = document.querySelector('#plex-library');
        select.innerHTML = '';
        for (const section of sections) {
            const option = document.createElement('option');
            option.value = section.key;
            option.textContent = `${section.title} (${section.type})`;
            select.appendChild(option);
        }
        this.render();
        // Index every library up front so uploads can detect a name that exists
        // in more than one of them.
        await this.buildIndex();
        await this.loadCollections();
    },

    async loadCollections() {
        const key = document.querySelector('#plex-library').value;
        if (!key) return;
        const body = await this.get(
            `${this.server}/library/sections/${key}/collections?${this.params()}`);
        this.collections = (body.MediaContainer?.Metadata ?? [])
            .map((m) => ({ title: m.title, thumb: m.thumb, key: m.ratingKey }));
        this.syncDatalist();
        // Without this the Import button stays hidden, which is the only
        // visible entry point to the collections just fetched.
        this.render();
        this.status(this.collections.length
            ? `${this.collections.length} collections found — click “Import collections” to make a `
                + `poster for each, or pick one by name when editing any poster.`
            : 'That library has no collections.');
    },

    /**
     * Resolve a Plex `thumb` path to a usable image URL.
     *
     * Fetched as a blob rather than pointed at directly: a cross-origin image
     * drawn onto the canvas taints it, and a tainted canvas makes toDataURL()
     * throw — which would break every export, not just this poster. A blob URL
     * is same-origin, so the canvas stays exportable.
     */
    async thumbUrl(path) {
        if (this.thumbs.has(path)) return this.thumbs.get(path);
        const response = await fetch(`${this.server}${path}?${this.params()}`);
        if (!response.ok) throw new Error(`thumb ${response.status}`);
        const url = URL.createObjectURL(await response.blob());
        this.thumbs.set(path, url);
        return url;
    },

    /**
     * Index every library's collections by name, so a name match can tell
     * whether it is unique across the whole server. "Action" commonly exists in
     * Movies, TV *and* Anime; resolving against one library alone would upload
     * to whichever happened to be selected.
     */
    async buildIndex() {
        this.index = new Map();
        const results = await Promise.all(this.sections.map(async (section) => {
            try {
                const body = await this.get(
                    `${this.server}/library/sections/${section.key}/collections?${this.params()}`);
                return (body.MediaContainer?.Metadata ?? [])
                    .map((m) => ({ key: m.ratingKey, title: m.title, library: section.title }));
            } catch {
                return [];
            }
        }));
        for (const entry of results.flat()) {
            const name = entry.title.toLowerCase();
            if (!this.index.has(name)) this.index.set(name, []);
            this.index.get(name).push(entry);
        }
    },

    /**
     * Work out which Plex collection a poster targets.
     *
     * An imported poster carries a ratingKey, which is unique server-wide and
     * therefore unambiguous. Anything else is matched by name — and a name that
     * exists in more than one library is reported as ambiguous rather than
     * guessed at.
     */
    resolve(poster) {
        if (poster.plexKey) {
            const known = [...(this.index?.values() ?? [])].flat()
                .find((entry) => entry.key === poster.plexKey);
            return { key: poster.plexKey, library: known?.library ?? 'Plex', exact: true };
        }
        const matches = this.index?.get(collectionFolder(poster.name).toLowerCase()) ?? [];
        if (matches.length === 1) return { ...matches[0], exact: false };
        if (matches.length > 1) {
            return { ambiguous: true, libraries: matches.map((m) => m.library) };
        }
        return null;
    },

    /**
     * Upload a PNG and make it the collection's selected poster.
     *
     * Posted as a bare ArrayBuffer with no Content-Type: an `image/png` header
     * is not CORS-safelisted and would force a preflight against the user's own
     * server. Without it this stays a simple request. Plex sniffs the image
     * anyway, and keeps the previous poster in the collection's poster list, so
     * this is reversible from Plex itself.
     */
    async uploadPoster(ratingKey, buffer) {
        const response = await fetch(
            `${this.server}/library/metadata/${ratingKey}/posters?${this.params()}`,
            { method: 'POST', body: buffer });
        if (!response.ok) {
            throw new Error(response.status === 401
                ? 'Plex rejected the token — sign in again.'
                : `Plex returned ${response.status}.`);
        }
        // The cached thumb is now stale.
        for (const [path, url] of this.thumbs) {
            if (path.includes(`/${ratingKey}/`)) {
                URL.revokeObjectURL(url);
                this.thumbs.delete(path);
            }
        }
    },

    /**
     * Lock the poster field so Plex's own agents won't replace it on a metadata
     * refresh. Unlike the upload this is a PUT, which is not a CORS-simple
     * method and does need a preflight — so it can fail where the upload
     * succeeded, and is reported separately.
     */
    async lockPoster(ratingKey) {
        const response = await fetch(
            `${this.server}/library/metadata/${ratingKey}?${this.params({ 'thumb.locked': '1' })}`,
            { method: 'PUT' });
        if (!response.ok) throw new Error(`lock returned ${response.status}`);
    },

    /** Feeds the native autocomplete on the poster name field. */
    syncDatalist() {
        const list = document.querySelector('#plex-collections');
        list.innerHTML = '';
        for (const { title } of this.collections) {
            const option = document.createElement('option');
            option.value = title;
            list.appendChild(option);
        }
    },

    /** Build a custom collection with one poster per Plex collection. */
    importCollections() {
        if (!this.collections.length) return;
        const library = document.querySelector('#plex-library').selectedOptions[0]?.textContent ?? 'Plex';
        const name = Store.uniqueName(`Plex ${library.replace(/\s*\(.*\)$/, '')}`);
        // Imported as the collection's *current* Plex artwork: no text overlay
        // and no white frame, so what you see is what Plex has today. Only the
        // thumb path is stored — the bytes are fetched on demand, since 86
        // inlined images would blow the localStorage budget many times over.
        customCollections[name] = this.collections.map(({ title, thumb, key }) => ({
            type: 'collection',
            name: title,
            // Marks the name as owned by Plex, so the editor locks it.
            plex: true,
            plexKey: key,
            lines: [],
            plexThumb: thumb,
            border: false,
            color: '#333333'
        }));
        if (!Store.save()) return;
        ElementBuiler.renderPills();
        ElementBuiler.select(name, customCollections[name], true);
        this.status(`Imported ${this.collections.length} collections as "${name}".`);
    },

    render() {
        const connected = Boolean(this.token);
        document.querySelector('#plex-connect').hidden = connected;
        document.querySelector('#plex-signout').hidden = !connected;
        document.querySelector('#plex-server').hidden = !connected;
        document.querySelector('#plex-library').hidden = !connected;
        document.querySelector('#plex-import').hidden = !this.collections.length;
        // Signing in or changing library changes what can be uploaded.
        UI.selectionCount();
    },

    attach() {
        document.querySelector('#plex-connect').onclick = () => this.signIn();
        document.querySelector('#plex-signout').onclick = () => this.signOut();
        document.querySelector('#plex-server').onchange = () =>
            this.connect().catch((err) => this.status(err.message));
        document.querySelector('#plex-library').onchange = () =>
            this.loadCollections().catch((err) => this.status(err.message));
        document.querySelector('#plex-import').onclick = () => this.importCollections();

        this.render();
        if (this.token) {
            this.status('Reconnecting…');
            this.loadServers().catch((err) => this.status(err.message));
        }
    }
};

/* ------------------------------------------------------------------ */
/* wallhaven background picker                                         */
/* ------------------------------------------------------------------ */

const Wallhaven = {
    query: '',
    page: 1,
    lastPage: 1,
    total: 0,
    seed: null,
    busy: false,
    seen: new Set(),

    status(message, show = true) {
        const node = document.querySelector('#wh-status');
        node.hidden = !show;
        node.textContent = message;
    },

    /**
     * The user's wallhaven API key, kept in this browser only. It is sent as a
     * request header to the local proxy, which forwards it to wallhaven; it is
     * never written into a poster or a URL.
     */
    apiKey() {
        return localStorage.getItem(KEY_STORAGE) ?? '';
    },

    setApiKey(value) {
        const key = value.trim();
        if (key) localStorage.setItem(KEY_STORAGE, key);
        else localStorage.removeItem(KEY_STORAGE);
        document.querySelector('#wh-key-clear').hidden = !key;
    },

    restoreApiKey() {
        const key = this.apiKey();
        document.querySelector('#wh-apikey').value = key;
        document.querySelector('#wh-key-clear').hidden = !key;
    },

    /** Read the filter controls into query parameters. */
    filters() {
        const flags = (attr) => [0, 1, 2]
            .map((i) => document.querySelector(`#wh-filters input[data-${attr}="${i}"]`).checked ? '1' : '0')
            .join('');
        return {
            categories: flags('cat'),
            purity: flags('pur'),
            sorting: document.querySelector('#wh-sorting').value,
            ratios: document.querySelector('#wh-ratios').value,
            atleast: document.querySelector('#wh-atleast').value
        };
    },

    async search(page = 1) {
        if (this.busy) return;
        // Nothing left to page through.
        if (page > 1 && page > this.lastPage) return;

        this.busy = true;
        this.page = page;
        this.query = document.querySelector('#wh-query').value.trim();
        if (page === 1) {
            this.seed = null;
            this.seen.clear();
        }
        this.status(page === 1 ? 'Searching…' : 'Loading more…');

        try {
            const params = new URLSearchParams({ q: this.query, page, ...this.filters() });
            if (this.seed) params.set('seed', this.seed);

            const key = this.apiKey();
            const response = await fetch(`/api/wallhaven?${params}`,
                key ? { headers: { 'X-Wallhaven-Key': key } } : undefined);
            const body = await response.json();
            if (!response.ok) throw new Error(body.error ?? 'Search failed.');

            this.lastPage = body.meta?.last_page ?? 1;
            this.total = body.meta?.total ?? 0;
            // Keeps `random` sorting stable while paging.
            this.seed = this.seed ?? body.meta?.seed ?? null;

            const fresh = body.data.filter((item) => !this.seen.has(item.id));
            fresh.forEach((item) => this.seen.add(item.id));
            this.render(fresh, page > 1);

            const shown = this.seen.size;
            this.status([
                this.total
                    ? `${shown} of ${this.total.toLocaleString()} shown`
                    : 'No wallpapers matched these filters.',
                body.warning
            ].filter(Boolean).join(' · '));
        } catch (err) {
            // The proxy lives in index.js, so this also fires under a plain
            // static server (e.g. python -m http.server).
            this.status(`${err.message} (is the Express server running?)`);
            this.lastPage = 0;
        } finally {
            this.busy = false;
            // The sentinel may still be on screen if the new rows didn't fill
            // the scroller, so re-check rather than wait for a scroll event.
            requestAnimationFrame(() => this.topUp());
        }
    },

    /** Load another page if the sentinel is still visible. */
    topUp() {
        const grid = document.querySelector('#wh-results');
        const sentinel = document.querySelector('#wh-sentinel');
        if (this.busy || this.page >= this.lastPage || !this.seen.size) return;
        if (sentinel.offsetTop <= grid.scrollTop + grid.clientHeight) {
            this.search(this.page + 1);
        }
    },

    observe() {
        const grid = document.querySelector('#wh-results');
        new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                this.search(this.page + 1);
            }
        }, { root: grid, rootMargin: '150px' }).observe(document.querySelector('#wh-sentinel'));
    },

    render(items, append) {
        const grid = document.querySelector('#wh-results');
        const sentinel = document.querySelector('#wh-sentinel');
        if (!append) {
            grid.querySelectorAll('.wh-thumb').forEach((node) => node.remove());
        }

        for (const item of items) {
            const thumb = document.createElement('button');
            thumb.type = 'button';
            thumb.className = 'wh-thumb';
            thumb.style.backgroundImage = `url("${item.thumb}")`;
            thumb.title = `${item.resolution} · ${item.purity} — click to use`;
            thumb.innerHTML = `<span class="wh-res">${item.resolution}</span>` +
                (item.purity && item.purity !== 'sfw'
                    ? `<span class="wh-purity" data-purity="${item.purity}">${item.purity}</span>`
                    : '');
            thumb.onclick = () => {
                grid.querySelector('.wh-thumb[data-picked="true"]')?.removeAttribute('data-picked');
                thumb.dataset.picked = 'true';
                // Store the CDN URL, not the bytes: it keeps localStorage tiny,
                // and the CDN allows cross-origin reads so the canvas stays
                // exportable.
                pendingImage = item.full;
                document.querySelector('input[name="bg"][value="image"]').checked = true;
                document.querySelector('#clear-image').hidden = false;
                ElementBuiler.defaultDim();
                this.status(`Loading ${item.resolution} image…`);
                ElementBuiler.previewDraft().then(() => this.status('', false));
            };
            grid.insertBefore(thumb, sentinel);
        }
    },

    clear() {
        document.querySelector('#wh-results')
            .querySelectorAll('.wh-thumb').forEach((node) => node.remove());
        this.seen.clear();
        this.page = 1;
        this.lastPage = 1;
        this.status('', false);
    }
};

const UI = {
    runStart(total) {
        document.querySelector('#progress').hidden = false;
        document.querySelector('#cancel').hidden = false;
        document.querySelector('#download').disabled = true;
        document.querySelector('#upload-plex').disabled = true;
        this.progress(0, total, '');
    },
    progress(done, total, label) {
        document.querySelector('#progress-bar').style.width = `${(done / total) * 100}%`;
        document.querySelector('#progress-label').textContent = `${done}/${total}${label ? ` · ${label}` : ''}`;
    },
    runEnd(message) {
        document.querySelector('#cancel').hidden = true;
        document.querySelector('#progress-label').textContent = message;
        document.querySelector('#download').disabled = false;
    },
    caption(text) {
        document.querySelector('#preview-caption').textContent = text;
    },
    selectionCount() {
        const n = selected.size;
        const clipped = posters.filter(posterOverflows).length;
        document.querySelector('#selection-count').textContent =
            `${n} of ${posters.length} selected${clipped ? ` · ⚠ ${clipped} clipped` : ''}`;
        const all = document.querySelector('#select-all');
        all.checked = n > 0 && n === posters.length;
        all.indeterminate = n > 0 && n < posters.length;
        document.querySelector('#download').disabled = running || n === 0;

        // Only offered when signed in; the count says how many of the ticked
        // posters actually match a collection in the chosen library.
        const upload = document.querySelector('#upload-plex');
        upload.hidden = !Plex.token || !Plex.server;
        document.querySelector('#plex-lock-row').hidden = upload.hidden;
        if (!upload.hidden) {
            const resolved = selectedPosters().map((poster) => Plex.resolve(poster));
            const ready = resolved.filter((r) => r && !r.ambiguous).length;
            const clashes = resolved.filter((r) => r?.ambiguous).length;
            upload.disabled = running || ready === 0;
            upload.textContent = ready && ready !== n ? `Upload ${ready} to Plex` : 'Upload to Plex';
            upload.title = [
                ready ? `${ready} of ${n} selected match a Plex collection.` : 'No matching Plex collections.',
                clashes ? `${clashes} skipped: the name exists in more than one library.` : ''
            ].filter(Boolean).join(' ');
        }
    }
};

class ElementBuiler {
    /** Built-in collections, then custom ones, then the "new" button. */
    static renderPills() {
        const container = document.getElementById('collection-list');
        container.innerHTML = '';

        for (const key of Object.keys(BUILTIN)) {
            container.appendChild(ElementBuiler.pill(key, collectionData(key), false));
        }
        for (const name of Object.keys(customCollections)) {
            container.appendChild(ElementBuiler.pill(name, collectionData(name), true));
        }

        const add = document.createElement('button');
        add.className = 'pill pill-new';
        add.type = 'button';
        add.textContent = '+ New collection';
        add.onclick = () => {
            if (running) return;
            const name = Store.uniqueName('My Collection');
            customCollections[name] = [];
            Store.save();
            ElementBuiler.renderPills();
            ElementBuiler.select(name, customCollections[name], true);
        };
        container.appendChild(add);
    }

    static pill(name, data, isCustom) {
        const node = document.createElement('button');
        node.className = 'pill';
        node.type = 'button';
        node.setAttribute('role', 'tab');
        node.dataset.key = name;
        node.setAttribute('data-state', name === collectionName ? 'active' : 'inactive');
        // ✎ marks a user-made collection, • an edited built-in.
        const mark = isCustom ? '✎ ' : builtinOverrides[name] ? '• ' : '';
        node.innerHTML = `${mark}${name}<span class="pill-count">${data.length}</span>`;
        node.onclick = () => {
            if (running) return;
            ElementBuiler.select(name, data, isCustom);
        };
        return node;
    }

    static select(name, data, isCustom) {
        // Undo is scoped to the collection it was captured in — restoring into
        // one you've navigated away from would be invisible and confusing.
        if (name !== collectionName) Undo.clear();
        posters = data;
        collectionName = name;
        activeIsCustom = isCustom;
        selected = new Set(data.map((_, i) => i));

        document
            .querySelector('#collection-list button[data-state="active"]')
            ?.setAttribute('data-state', 'inactive');
        document
            .querySelector(`#collection-list .pill[data-key="${CSS.escape(name)}"]`)
            ?.setAttribute('data-state', 'active');

        // Every collection is editable now; only the collection-level actions
        // differ between a user-made one and a built-in.
        document.querySelector('#editor').hidden = false;
        const nameField = document.querySelector('#edit-collection');
        nameField.value = name;
        nameField.disabled = !isCustom;
        nameField.title = isCustom ? '' : 'Built-in collection names are fixed.';
        document.querySelector('#delete-collection').hidden = !isCustom;

        const revert = document.querySelector('#revert-collection');
        revert.hidden = isCustom;
        revert.disabled = !builtinOverrides[name];
        revert.textContent = builtinOverrides[name] ? 'Revert to original' : 'Unmodified';

        ElementBuiler.resetForm();
        ElementBuiler.renderItems();
        UI.caption(`${name} — ${data.length} poster${data.length === 1 ? '' : 's'}`);
    }

    /** Rebuild the items list, honouring the current search filter. */
    static renderItems() {
        const list = document.querySelector('#items-list');
        const query = document.querySelector('#item-search').value.trim().toLowerCase();
        list.innerHTML = '';

        const matches = posters
            .map((poster, i) => ({ poster, i }))
            .filter(({ poster }) => !query || poster.name.toLowerCase().includes(query));

        if (!matches.length) {
            const message = posters.length ? 'No items match that filter.'
                : collectionName === 'images'
                    ? 'Pick a collection above to edit its posters, or start one with “+ New collection”.'
                    : 'Empty collection — add your first poster above.';
            list.innerHTML = `<p class="empty">${message}</p>`;
            UI.selectionCount();
            return;
        }

        for (const { poster, i } of matches) {
            const row = document.createElement('div');
            row.className = 'item';
            row.dataset.selected = selected.has(i);

            const box = document.createElement('input');
            box.type = 'checkbox';
            box.checked = selected.has(i);
            box.onclick = (event) => event.stopPropagation();
            box.onchange = () => {
                box.checked ? selected.add(i) : selected.delete(i);
                row.dataset.selected = box.checked;
                UI.selectionCount();
            };

            const swatch = document.createElement('span');
            swatch.className = 'swatch';
            if (poster.url) {
                swatch.style.backgroundImage = `url("${poster.url}")`;
            } else if (poster.plexThumb) {
                if (poster.color) swatch.style.background = poster.color;
                Plex.thumbUrl(poster.plexThumb)
                    .then((url) => { swatch.style.backgroundImage = `url("${url}")`; })
                    .catch(() => { /* leave the colour placeholder */ });
            } else if (poster.color) {
                swatch.style.background = poster.color;
            }

            const body = document.createElement('div');
            body.className = 'item-body';
            body.innerHTML = `<div class="item-title"></div><div class="item-meta"></div>`;
            body.querySelector('.item-title').textContent = poster.lines?.[0] ?? poster.name;
            body.querySelector('.item-meta').textContent =
                [poster.type, poster.name].filter(Boolean).join(' · ');

            row.append(box, swatch, body);

            // Pre-flight: the editor warns for the poster being edited, but a
            // bulk export would otherwise ship clipped text unnoticed.
            if (posterOverflows(poster)) {
                const warn = document.createElement('span');
                warn.className = 'item-warn';
                warn.textContent = '⚠';
                warn.title = 'Text runs past the border and will be cut off. '
                    + 'Shorten it, reduce the size, or turn on Auto-fit.';
                row.appendChild(warn);
            }

            const remove = document.createElement('button');
            remove.className = 'btn btn-ghost danger';
            remove.type = 'button';
            remove.textContent = '✕';
            remove.title = 'Delete poster';
            remove.onclick = (event) => {
                event.stopPropagation();
                const list = ensureEditable();
                const [removed] = list.splice(i, 1);
                const snapshot = JSON.parse(JSON.stringify(removed));
                const key = collectionName;
                Undo.remember(snapshot.name || 'poster', () => {
                    // Put it back where it was, in whichever collection it left.
                    const target = customCollections[key] ?? builtinOverrides[key];
                    target?.splice(Math.min(i, target.length), 0, snapshot);
                    selected = new Set((customCollections[key] ?? builtinOverrides[key] ?? [])
                        .map((_, n) => n));
                });
                // Indices shifted, so rebuild the selection wholesale.
                selected = new Set(posters.map((_, n) => n));
                Store.save();
                ElementBuiler.resetForm();
                ElementBuiler.renderItems();
                ElementBuiler.refreshPill();
            };
            row.appendChild(remove);

            // Clicking a row opens it in the editor, which also previews it.
            row.onclick = () => {
                if (running) return;
                ElementBuiler.loadForm(i);
            };

            list.appendChild(row);
        }
        UI.selectionCount();
    }

    /** Count and the edited-marker can both change after a mutation. */
    static refreshPill() {
        const pill = document.querySelector(
            `#collection-list .pill[data-key="${CSS.escape(collectionName)}"]`);
        if (!pill) return;
        const mark = activeIsCustom ? '✎ ' : builtinOverrides[collectionName] ? '• ' : '';
        pill.innerHTML =
            `${mark}${collectionName}<span class="pill-count">${posters.length}</span>`;

        const revert = document.querySelector('#revert-collection');
        if (!activeIsCustom) {
            revert.disabled = !builtinOverrides[collectionName];
            revert.textContent = builtinOverrides[collectionName] ? 'Revert to original' : 'Unmodified';
        }
    }

    /* -------------------- editor -------------------- */

    static editor() {
        const fields = ['#edit-line0', '#edit-line1', '#edit-name'];
        for (const sel of fields) {
            document.querySelector(sel).oninput = () => ElementBuiler.previewDraft();
        }
        document.querySelector('#edit-color').oninput = () => {
            document.querySelector('input[name="bg"][value="color"]').checked = true;
            ElementBuiler.previewDraft();
        };

        for (const radio of document.querySelectorAll('input[name="bg"]')) {
            radio.onchange = () => ElementBuiler.previewDraft();
        }

        // `input` rather than `change` so the canvas tracks the drag live.
        for (const sel of ['#edit-zoom', '#edit-x', '#edit-y', '#edit-dim', '#edit-fit',
            '#edit-border', '#edit-pattern', '#edit-pattern-a', '#edit-pattern-b',
            '#edit-pattern-c', '#edit-pattern-scale', '#edit-pattern-seed']) {
            document.querySelector(sel).oninput = () => ElementBuiler.previewDraft();
        }

        document.querySelector('#pattern-shuffle').onclick = () => {
            // A fresh seed plus three hues picked to relate to each other,
            // rather than three independent randoms that usually clash.
            const hex = (h, s, l) => {
                const f = (n) => {
                    const k = (n + h / 30) % 12;
                    const chroma = s * Math.min(l, 1 - l);
                    const v = l - chroma * Math.max(-1, Math.min(k - 3, 9 - k, 1));
                    return Math.round(v * 255).toString(16).padStart(2, '0');
                };
                return `#${f(0)}${f(8)}${f(4)}`;
            };
            const wrap = (h) => ((h % 360) + 360) % 360;
            const base = Math.floor(Math.random() * 360);
            const offsets = {
                complementary: [0, 180, 200],
                analogous: [0, 30, 60],
                triadic: [0, 120, 240],
                mono: [0, 0, 0],
                // Fixed sectors: warm reds/oranges, cool blues/greens.
                warm: [15, 35, 50],
                cool: [190, 215, 250]
            }[document.querySelector('#pattern-harmony').value];
            const fixed = ['warm', 'cool']
                .includes(document.querySelector('#pattern-harmony').value);

            const hues = offsets.map((o) => (fixed ? o : wrap(base + o)));
            document.querySelector('#edit-pattern-a').value = hex(hues[0], 0.5, 0.16);
            document.querySelector('#edit-pattern-b').value = hex(hues[1], 0.65, 0.42);
            document.querySelector('#edit-pattern-c').value = hex(hues[2], 0.8, 0.68);
            document.querySelector('#edit-pattern-seed').value =
                1 + Math.floor(Math.random() * 999);
            document.querySelector('input[name="bg"][value="pattern"]').checked = true;
            ElementBuiler.previewDraft();
        };

        document.querySelector('#adjust-reset').onclick = () => {
            ElementBuiler.resetAdjustments();
            ElementBuiler.previewDraft();
        };

        for (const [sel] of TEXT_CONTROLS) {
            document.querySelector(sel).oninput = () => ElementBuiler.previewDraft();
        }

        for (const [toggleSel, panelSel] of [
            ['#text-toggle', '#text-style'], ['#poster-toggle', '#poster-style']
        ]) {
            const toggle = document.querySelector(toggleSel);
            const panel = document.querySelector(panelSel);
            toggle.onclick = () => {
                panel.hidden = !panel.hidden;
                toggle.setAttribute('aria-expanded', String(!panel.hidden));
            };
        }

        document.querySelector('#text-reset').onclick = () => {
            ElementBuiler.writeTextStyle(null);
            ElementBuiler.previewDraft();
        };

        document.querySelector('#edit-image').onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                pendingImage = reader.result;
                document.querySelector('input[name="bg"][value="image"]').checked = true;
                document.querySelector('#clear-image').hidden = false;
                ElementBuiler.defaultDim();
                ElementBuiler.previewDraft();
            };
            reader.readAsDataURL(file);
        };

        document.querySelector('#clear-image').onclick = () => {
            pendingImage = null;
            pendingPlexThumb = null;
            document.querySelector('#edit-image').value = '';
            document.querySelector('#wh-results .wh-thumb[data-picked="true"]')
                ?.removeAttribute('data-picked');
            document.querySelector('#clear-image').hidden = true;
            document.querySelector('input[name="bg"][value="color"]').checked = true;
            ElementBuiler.previewDraft();
        };

        document.querySelector('#wh-go').onclick = () => Wallhaven.search(1);
        document.querySelector('#wh-query').onkeydown = (event) => {
            if (event.key === 'Enter') { event.preventDefault(); Wallhaven.search(1); }
        };

        const filterPanel = document.querySelector('#wh-filters');
        const filterToggle = document.querySelector('#wh-toggle-filters');
        filterToggle.onclick = () => {
            filterPanel.hidden = !filterPanel.hidden;
            filterToggle.setAttribute('aria-expanded', String(!filterPanel.hidden));
        };

        const keyInput = document.querySelector('#wh-apikey');
        keyInput.onchange = () => {
            Wallhaven.setApiKey(keyInput.value);
            // Re-run so newly permitted results appear immediately.
            if (Wallhaven.seen.size || keyInput.value.trim()) Wallhaven.search(1);
        };
        document.querySelector('#wh-key-clear').onclick = () => {
            keyInput.value = '';
            Wallhaven.setApiKey('');
            Wallhaven.search(1);
        };
        Wallhaven.restoreApiKey();

        // Any filter change restarts the search from page 1.
        for (const control of filterPanel.querySelectorAll('input, select')) {
            if (control.id === 'wh-apikey') continue;
            control.onchange = () => {
                const purity = Wallhaven.filters().purity;
                if (purity === '000') {
                    // Wallhaven treats an empty purity as "all"; keep it explicit.
                    document.querySelector('#wh-filters input[data-pur="0"]').checked = true;
                }
                Wallhaven.search(1);
            };
        }

        Wallhaven.observe();

        document.querySelector('#edit-save').onclick = () => ElementBuiler.savePoster();
        document.querySelector('#apply-style').onclick = () => ElementBuiler.applyStyleToSelected();
        document.querySelector('#edit-reset').onclick = () => {
            ElementBuiler.resetForm();
            ElementBuiler.previewDraft();
        };

        document.querySelector('#edit-collection').onchange = (event) => {
            const next = event.target.value.trim();
            if (!next || next === collectionName) {
                event.target.value = collectionName;
                return;
            }
            if (next in customCollections || next in BUILTIN) {
                event.target.value = collectionName;
                UI.caption(`A collection called "${next}" already exists.`);
                return;
            }
            // Rebuild the map so the pill keeps its position in the row.
            const renamed = {};
            for (const [key, value] of Object.entries(customCollections)) {
                renamed[key === collectionName ? next : key] = value;
            }
            customCollections = renamed;
            collectionName = next;
            Store.save();
            ElementBuiler.renderPills();
        };

        document.querySelector('#revert-collection').onclick = () => {
            const key = collectionName;
            if (!builtinOverrides[key]) return;
            const count = builtinOverrides[key].length;
            if (!confirm(`Discard your edits to "${key}"?\n\nIt will go back to the original `
                + `${BUILTIN[key].length} posters (you currently have ${count}). This cannot be undone.`)) {
                return;
            }
            delete builtinOverrides[key];
            Store.save();
            ElementBuiler.renderPills();
            ElementBuiler.select(key, collectionData(key), false);
        };

        document.querySelector('#delete-collection').onclick = () => {
            const count = posters.length;
            const detail = count
                ? `Its ${count} poster${count === 1 ? '' : 's'} will be lost.`
                : 'It is empty.';
            if (!confirm(`Delete the collection "${collectionName}"?\n\n${detail} This cannot be undone.`)) return;
            const removedName = collectionName;
            const removedData = JSON.parse(JSON.stringify(customCollections[removedName]));
            Undo.remember(`collection “${removedName}”`, () => {
                customCollections[removedName] = removedData;
                ElementBuiler.renderPills();
                ElementBuiler.select(removedName, customCollections[removedName], true);
            });
            delete customCollections[collectionName];
            Store.save();
            posters = [];
            selected = new Set();
            collectionName = 'images';
            activeIsCustom = false;
            document.querySelector('#editor').hidden = true;
            ElementBuiler.renderPills();
            ElementBuiler.renderItems();
            UI.caption('Pick a collection to begin');
        };
    }

    /** Read the form into a poster object. */
    static draftPoster() {
        const line0 = document.querySelector('#edit-line0').value.trim();
        const line1 = document.querySelector('#edit-line1').value.trim();
        const imageSelected = document.querySelector('input[name="bg"][value="image"]').checked;
        const useImage = imageSelected && pendingImage;
        // An imported poster has no `url` of its own — its image is a Plex
        // thumb path — so it has to survive an edit that doesn't replace it.
        const keepThumb = imageSelected && !pendingImage && pendingPlexThumb;

        const num = (sel) => Number(document.querySelector(sel).value);
        const poster = {
            type: 'custom',
            name: collectionFolder(document.querySelector('#edit-name').value || line0),
            lines: line1 ? [line0, line1] : line0 ? [line0] : [],
            dim: num('#edit-dim'),
            border: document.querySelector('#edit-border').checked,
            ...(editingPlexPoster ? { plex: true } : {}),
            ...ElementBuiler.readTextStyle()
        };
        const patternSelected =
            document.querySelector('input[name="bg"][value="pattern"]').checked;

        if (useImage || keepThumb) {
            if (useImage) poster.url = pendingImage;
            else poster.plexThumb = pendingPlexThumb;
            poster.fit = document.querySelector('#edit-fit').value;
            poster.zoom = num('#edit-zoom') / 100;
            poster.offsetX = num('#edit-x');
            poster.offsetY = num('#edit-y');
        } else if (patternSelected) {
            poster.pattern = document.querySelector('#edit-pattern').value;
            poster.patternA = document.querySelector('#edit-pattern-a').value;
            poster.patternB = document.querySelector('#edit-pattern-b').value;
            poster.patternC = document.querySelector('#edit-pattern-c').value;
            poster.patternSeed = num('#edit-pattern-seed');
            poster.patternScale = num('#edit-pattern-scale');
        } else {
            poster.color = document.querySelector('#edit-color').value;
        }
        return poster;
    }

    static readTextStyle() {
        return Object.fromEntries(TEXT_CONTROLS.map(([sel, key]) =>
            [key, controlValue(document.querySelector(sel))]));
    }

    static writeTextStyle(source) {
        for (const [sel, key, fallback] of TEXT_CONTROLS) {
            const el = document.querySelector(sel);
            const value = source?.[key] ?? fallback;
            if (el.type === 'checkbox') el.checked = Boolean(value);
            else el.value = value;
        }
    }

    /** Show the crop/zoom controls only when there is an image to adjust. */
    static syncAdjustVisibility() {
        const useImage = document.querySelector('input[name="bg"][value="image"]').checked
            && (pendingImage || pendingPlexThumb);
        document.querySelector('#img-adjust').hidden = !useImage;
        document.querySelector('#pattern-rows').hidden =
            !document.querySelector('input[name="bg"][value="pattern"]').checked;

        for (const [slider, output, suffix] of [
            ['#edit-pattern-scale', '#out-pattern-scale', ''],
            ['#edit-pattern-seed', '#out-pattern-seed', '']
        ]) {
            document.querySelector(output).textContent =
                document.querySelector(slider).value + suffix;
        }

        for (const [slider, output, suffix] of [
            ['#edit-zoom', '#out-zoom', '%'], ['#edit-x', '#out-x', ''],
            ['#edit-y', '#out-y', ''], ['#edit-dim', '#out-dim', '%']
        ]) {
            document.querySelector(output).textContent =
                document.querySelector(slider).value + suffix;
        }

        for (const [sel, , , output, suffix = ''] of TEXT_CONTROLS) {
            if (!output) continue;
            document.querySelector(output).textContent =
                document.querySelector(sel).value + suffix;
        }
    }

    static async previewDraft() {
        // Sliders fire far faster than a draw completes; coalesce rather than
        // interleaving async draws, which would land out of order.
        if (previewing) { previewDirty = true; return; }
        previewing = true;
        let poster;
        try {
            do {
                previewDirty = false;
                poster = ElementBuiler.draftPoster();
                ElementBuiler.syncAdjustVisibility();
                // Always draw: picking a colour or background with no text yet
                // should still show it. Empty lines render as nothing.
                await drawPoster(poster);
            } while (previewDirty);
        } catch (err) {
            // A throw here used to leave the canvas blank with no explanation.
            console.error('Preview failed:', err);
            UI.caption(`Preview failed: ${err.message}`);
            return;
        } finally {
            previewing = false;
        }
        document.querySelector('#path-preview').textContent = assetPath(poster.name);
        UI.caption(poster.name || (poster.lines[0] ? poster.lines[0] : 'Untitled — add some text'));

        // No wrapping or auto-fit in PosterBuilder, so warn before export.
        // Measured at the poster's own size/spacing, not the old fixed 72/40.
        const limit = 600 - 50; // canvas minus the 25px border each side
        const cased = (s) => (poster.uppercase ? String(s).toUpperCase() : String(s));
        const over = [];
        if (PosterBuilder.measure(cased(poster.lines[0]), poster.sizeBig, poster) > limit) {
            over.push('big text');
        }
        if (poster.lines[1]
            && PosterBuilder.measure(cased(poster.lines[1]), poster.sizeSmall, poster) > limit) {
            over.push('small text');
        }

        const warning = document.querySelector('#edit-warning');
        warning.hidden = !over.length;
        warning.textContent = over.length
            ? `⚠ ${over.join(' and ')} runs off the canvas — it will be cut off.`
            : '';
    }

    static loadForm(i) {
        const poster = posters[i];
        editingIndex = i;
        document.querySelector('#edit-line0').value = poster.lines?.[0] ?? '';
        document.querySelector('#edit-line1').value = poster.lines?.[1] ?? '';
        // Show the bare collection name; the /poster suffix is added at export.
        document.querySelector('#edit-name').value = collectionFolder(poster.name);
        ElementBuiler.setNameLock(poster.plex === true);
        pendingImage = poster.url ?? null;
        pendingPlexThumb = poster.plexThumb ?? null;
        const hasImage = Boolean(poster.url || poster.plexThumb);
        document.querySelector('#edit-color').value = poster.color ?? '#FFA133';
        document.querySelector('#edit-pattern').value = poster.pattern ?? 'gradient';
        document.querySelector('#edit-pattern-a').value = poster.patternA ?? '#1b2a4a';
        document.querySelector('#edit-pattern-b').value = poster.patternB ?? '#c2410c';
        document.querySelector('#edit-pattern-c').value = poster.patternC ?? '#f5c451';
        document.querySelector('#edit-pattern-seed').value = poster.patternSeed ?? 1;
        document.querySelector('#edit-pattern-scale').value = poster.patternScale ?? 50;
        const mode = hasImage ? 'image' : poster.pattern ? 'pattern' : 'color';
        document.querySelector(`input[name="bg"][value="${mode}"]`).checked = true;
        document.querySelector('#clear-image').hidden = !hasImage;
        document.querySelector('#edit-border').checked = poster.border !== false;
        document.querySelector('#edit-fit').value = poster.fit ?? 'cover';
        document.querySelector('#edit-zoom').value = Math.round((poster.zoom ?? 1) * 100);
        document.querySelector('#edit-x').value = poster.offsetX ?? 0;
        document.querySelector('#edit-y').value = poster.offsetY ?? 0;
        document.querySelector('#edit-dim').value = poster.dim ?? 0;
        ElementBuiler.writeTextStyle(poster);
        ElementBuiler.syncAdjustVisibility();
        document.querySelector('#edit-save').textContent = 'Save changes';
        document.querySelector('#edit-reset').hidden = false;
        ElementBuiler.previewDraft();
    }

    /**
     * Text over an untouched photo is usually unreadable, so a new image gets
     * some darkening — but only if the slider is still at zero, so it never
     * overrides a value the user has set.
     */
    static defaultDim() {
        const dim = document.querySelector('#edit-dim');
        if (Number(dim.value) === 0) dim.value = 30;
    }

    static resetAdjustments() {
        document.querySelector('#edit-fit').value = 'cover';
        document.querySelector('#edit-zoom').value = 100;
        document.querySelector('#edit-x').value = 0;
        document.querySelector('#edit-y').value = 0;
        document.querySelector('#edit-dim').value = 0;
        ElementBuiler.syncAdjustVisibility();
    }

    /**
     * A name imported from Plex has to keep matching the collection exactly —
     * a typo means Kometa silently applies the poster to nothing.
     */
    static setNameLock(locked) {
        editingPlexPoster = locked;
        const field = document.querySelector('#edit-name');
        field.readOnly = locked;
        field.title = locked ? 'Locked to your Plex collection name.' : '';
        document.querySelector('#name-lock').hidden = !locked;
    }

    static resetForm() {
        editingIndex = null;
        pendingImage = null;
        pendingPlexThumb = null;
        ElementBuiler.setNameLock(false);
        document.querySelector('#edit-border').checked = true;
        ElementBuiler.resetAdjustments();
        ElementBuiler.writeTextStyle(null);
        for (const sel of ['#edit-line0', '#edit-line1', '#edit-name', '#edit-image']) {
            document.querySelector(sel).value = '';
        }
        document.querySelector('input[name="bg"][value="color"]').checked = true;
        document.querySelector('#clear-image').hidden = true;
        document.querySelector('#wh-results .wh-thumb[data-picked="true"]')
            ?.removeAttribute('data-picked');
        document.querySelector('#edit-save').textContent = 'Add poster';
        document.querySelector('#edit-reset').hidden = true;
        document.querySelector('#edit-warning').hidden = true;
    }

    /**
     * Copy the editor's current look onto every ticked poster, leaving their
     * text, name and background alone. Image framing only applies to posters
     * that have an image.
     */
    static applyStyleToSelected() {
        const style = ElementBuiler.draftPoster();
        const targets = [...selected].sort((a, b) => a - b);
        if (!targets.length) {
            UI.caption('Tick some posters first.');
            return;
        }
        if (!confirm(`Apply this poster's style to ${targets.length} selected poster(s)?\n\n`
            + 'Their text, names and backgrounds are left unchanged.')) {
            return;
        }

        const list = ensureEditable();
        for (const i of targets) {
            const target = list[i];
            if (!target) continue;
            for (const key of STYLE_FIELDS) target[key] = style[key];
            if (target.url || target.plexThumb) {
                for (const key of IMAGE_STYLE_FIELDS) target[key] = style[key];
            }
        }
        if (!Store.save()) return;
        ElementBuiler.renderItems();
        ElementBuiler.refreshPill();
        UI.caption(`Styled ${targets.length} poster${targets.length === 1 ? '' : 's'}.`);
    }

    static savePoster() {
        const poster = ElementBuiler.draftPoster();
        // An imported Plex poster is artwork with no text, so a background is
        // reason enough to save.
        if (!poster.lines[0] && !poster.url && !poster.plexThumb) {
            UI.caption('Give the poster some big text, or a background image.');
            return;
        }
        if (!poster.name) {
            UI.caption('Give the poster a collection name first.');
            return;
        }
        const list = ensureEditable();
        if (editingIndex === null) {
            list.push(poster);
            selected.add(list.length - 1);
        } else {
            list[editingIndex] = poster;
        }
        if (!Store.save()) return;
        ElementBuiler.resetForm();
        ElementBuiler.renderItems();
        ElementBuiler.refreshPill();
        UI.caption(`Saved "${poster.name}"`);
    }

    /* -------------------- list + run controls -------------------- */

    static itemControls() {
        document.querySelector('#item-search').oninput = () => ElementBuiler.renderItems();
        document.querySelector('#undo').onclick = () => Undo.apply();

        document.querySelector('#backup').onclick = () => Backup.download();
        const file = document.querySelector('#restore-file');
        document.querySelector('#restore').onclick = () => file.click();
        file.onchange = () => {
            if (file.files[0]) Backup.restore(file.files[0]);
            // Reset so re-picking the same file fires change again.
            file.value = '';
        };
        document.querySelector('#select-all').onchange = (event) => {
            // Select-all applies to what the filter is currently showing.
            const query = document.querySelector('#item-search').value.trim().toLowerCase();
            posters.forEach((poster, i) => {
                if (query && !poster.name.toLowerCase().includes(query)) return;
                event.target.checked ? selected.add(i) : selected.delete(i);
            });
            ElementBuiler.renderItems();
        };
    }

    static download() {
        document.querySelector('#download').onclick = () =>
            runExport(selectedPosters(), collectionName);
    }

    static cancel() {
        document.querySelector('#cancel').onclick = () => { cancelled = true; };
    }

    static uploadToPlex() {
        document.querySelector('#upload-plex').onclick = () => runUpload(selectedPosters());
    }
}
