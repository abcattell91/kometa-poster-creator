const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.static('public'));

const SORTINGS = ['relevance', 'date_added', 'views', 'favorites', 'toplist', 'random'];
const RATIOS = ['', 'portrait', 'landscape', '9x16', '2x3', '3x4', '16x9'];
const ATLEAST = ['', '1000x1500', '1200x1800', '1600x2400', '2000x3000'];

/** Three-bit flag string like "101"; falls back if malformed or all-zero. */
const bits = (value, fallback) =>
    /^[01]{3}$/.test(value) && value !== '000' ? value : fallback;

const oneOf = (value, allowed) => (allowed.includes(value) ? value : allowed[0]);

// Wallhaven sends no CORS headers, so the browser cannot call its API directly.
// This proxies the search endpoint; the image CDN does send `access-control-
// allow-origin: *`, so the pictures themselves are loaded straight from it.
app.get('/api/wallhaven', async (req, res) => {
    const purity = bits(req.query.purity, '100');
    // Key comes from the browser (per-user, typed into the picker) or falls
    // back to the server environment. Sent as a header so it stays out of URLs
    // and access logs.
    const headerKey = req.get('x-wallhaven-key');
    const apiKey = /^[A-Za-z0-9]{10,64}$/.test(headerKey ?? '')
        ? headerKey
        : process.env.WALLHAVEN_API_KEY;
    const hasKey = Boolean(apiKey);

    const params = new URLSearchParams({
        q: req.query.q ?? '',
        page: req.query.page ?? '1',
        categories: bits(req.query.categories, '111'),
        purity,
        sorting: oneOf(req.query.sorting, req.query.q ? SORTINGS : ['toplist', ...SORTINGS])
    });

    const ratios = oneOf(req.query.ratios, RATIOS);
    if (ratios) params.set('ratios', ratios);

    const atleast = oneOf(req.query.atleast, ATLEAST);
    if (atleast) params.set('atleast', atleast);

    // `random` reshuffles per request, so pages 2+ need the first page's seed
    // or results repeat.
    if (req.query.seed) params.set('seed', req.query.seed);
    if (hasKey) params.set('apikey', apiKey);

    try {
        const upstream = await fetch(`https://wallhaven.cc/api/v1/search?${params}`);
        if (!upstream.ok) {
            return res.status(upstream.status).json({
                error: upstream.status === 429
                    ? 'Rate limited by wallhaven (45 requests/minute). Wait a moment.'
                    : upstream.status === 401
                        ? 'Wallhaven rejected the API key.'
                        : `Wallhaven returned ${upstream.status}.`
            });
        }
        const body = await upstream.json();
        res.json({
            meta: body.meta,
            // Without an API key wallhaven drops NSFW results silently rather
            // than erroring, which just looks like a broken search.
            warning: purity[2] === '1' && !hasKey
                ? 'NSFW needs an API key — add one under Filters to include those results.'
                : undefined,
            data: (body.data ?? []).map((w) => ({
                id: w.id,
                thumb: w.thumbs?.small,
                full: w.path,
                resolution: w.resolution,
                purity: w.purity,
                page: w.url
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(502).json({ error: 'Could not reach wallhaven.' });
    }
});

/* ------------------------------------------------------------------ */
/* Kometa Default-Images                                               */
/* ------------------------------------------------------------------ */

const KOMETA_CDN = 'https://cdn.jsdelivr.net/gh/Kometa-Team/Default-Images@master/';
const KOMETA_TREE =
    'https://api.github.com/repos/Kometa-Team/Default-Images/git/trees/master?recursive=1';

let kometaCache = null;
let kometaCachedAt = 0;

/**
 * The repo listing is ~5MB and GitHub allows only 60 unauthenticated requests
 * an hour, so it is fetched once here and held in memory rather than by each
 * browser on every page load. Images themselves come straight from jsDelivr.
 */
async function kometaFiles() {
    if (kometaCache && Date.now() - kometaCachedAt < 6 * 60 * 60 * 1000) return kometaCache;

    // GitHub 5xxs intermittently on this endpoint, and a single failure would
    // otherwise leave the picker empty until the page is reloaded.
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, 400 * attempt));
        try {
            response = await fetch(KOMETA_TREE, {
                headers: {
                    Accept: 'application/vnd.github+json',
                    'User-Agent': 'kometa-poster-creator',
                    ...(process.env.GITHUB_TOKEN
                        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
                }
            });
        } catch (err) {
            response = null;
        }
        // A 4xx won't change on retry; only server-side faults are worth repeating.
        if (response && (response.ok || response.status < 500)) break;
    }

    if (!response) throw new Error('Could not reach GitHub.');
    if (!response.ok) {
        throw new Error(response.status === 403
            ? 'GitHub rate limit reached (60/hour). Try again later, or set GITHUB_TOKEN.'
            : `GitHub is having trouble (${response.status}) — this is usually temporary.`);
    }
    const body = await response.json();
    kometaCache = (body.tree ?? [])
        .filter((node) => node.type === 'blob' && /\.(jpe?g|png|webp)$/i.test(node.path))
        // Files beginning "!" are contact sheets of a whole folder, not posters.
        .filter((node) => !node.path.split('/').pop().startsWith('!'))
        .map((node) => node.path);
    kometaCachedAt = Date.now();
    return kometaCache;
}

const cdnUrl = (p) => KOMETA_CDN + p.split('/').map(encodeURIComponent).join('/');
const prettyName = (p) => p.split('/').pop().replace(/\.[^.]+$/, '');

app.get('/api/kometa/categories', async (req, res) => {
    try {
        const files = await kometaFiles();
        const counts = {};
        for (const path of files) {
            const dir = path.includes('/') ? path.split('/')[0] : 'misc';
            counts[dir] = (counts[dir] ?? 0) + 1;
        }
        res.json(Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

app.get('/api/kometa/images', async (req, res) => {
    try {
        const files = await kometaFiles();
        const category = req.query.category ?? '';
        const query = (req.query.q ?? '').trim().toLowerCase();
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const per = 60;

        const matches = files.filter((path) =>
            (!category || path.startsWith(`${category}/`))
            && (!query || path.toLowerCase().includes(query)));

        res.json({
            total: matches.length,
            page,
            lastPage: Math.max(1, Math.ceil(matches.length / per)),
            data: matches.slice((page - 1) * per, page * per).map((path) => ({
                path,
                url: cdnUrl(path),
                name: prettyName(path)
            }))
        });
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
