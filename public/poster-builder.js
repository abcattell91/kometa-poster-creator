class PosterBuilder {
    static cache = new Map();

    // Iconify: ~200k open-source icons, no API key, and every response carries
    // `access-control-allow-origin: *` — so unlike wallhaven this needs no proxy
    // route in index.js.
    static ICON_API = 'https://api.iconify.design';
    // Raw SVG text, keyed by icon name ("mdi:star"), plus the usual in-flight
    // de-duplication.
    static iconSources = new Map();
    static iconPending = new Map();
    // Rasterised icons, keyed by name + colour + pixel size. Bounded: dragging
    // the colour picker mints a new key on every input event.
    static iconCache = new Map();
    static ICON_LIMIT = 24;

    // In-flight decodes, so the same image is never fetched twice at once.
    static pending = new Map();
    /**
     * Decoded backgrounds held at once. Unbounded was fine for the 600x900
     * PNGs in assets/, but a wallhaven original is nothing like those: a
     * 1920x3413 PNG decodes to ~26MB of RGBA whatever its file size, so a
     * browsing session used to hold hundreds of megabytes and eventually fail
     * to decode anything more — which showed up as backgrounds silently not
     * appearing. Only the image being edited needs to stay cached for the
     * sliders, so a small window costs nothing.
     */
    static CACHE_LIMIT = 12;

    constructor(type) {
        this.type = type;
        // Things that failed to load during this draw. A blank area of canvas
        // cannot tell "black background" apart from "image never arrived", so
        // callers report these rather than let a poster fail silently.
        this.warnings = [];
    }

    static init(type = "default") {
        return new PosterBuilder(type);
    }

    /**
     * Draw a background image.
     *
     * `fit` is 'cover' (fill, crop the overhang), 'contain' (fit whole image,
     * letterbox) or 'stretch' (fill exactly, ignoring aspect ratio). `zoom` and
     * the offsets then pan and scale within that, which is how cropping is
     * chosen. Defaults reproduce plain cover, so existing 600x900 assets in
     * `assets/` render exactly as before.
     */
    async url(imagepath, { fit = 'cover', zoom = 1, offsetX = 0, offsetY = 0 } = {}) {
        const img = await PosterBuilder.load(imagepath);
        push();
        noStroke();
        translate(width / 2, height / 2);
        imageMode(CENTER);
        if (img) {
            let w, h;
            if (fit === 'stretch') {
                w = width;
                h = height;
            } else {
                // Not `scale`: that shadows p5's scale().
                const factor = fit === 'contain'
                    ? Math.min(width / img.width, height / img.height)
                    : Math.max(width / img.width, height / img.height);
                w = img.width * factor;
                h = img.height * factor;
            }
            image(img, offsetX, offsetY, w * zoom, h * zoom);
        } else {
            // Leaves the canvas on whatever drew before it — usually black —
            // which is indistinguishable from a deliberate dark poster.
            this.warnings.push('the background image could not be loaded');
        }
        pop();
        return this;
    }

    /**
     * Decoded images are cached by path: preview sliders redraw on every input
     * event, and re-decoding a 4K wallpaper each time makes them unusable.
     */
    static load(imagepath) {
        if (PosterBuilder.cache.has(imagepath)) {
            // Re-insert so the *least* recently used entry is the one evicted.
            const hit = PosterBuilder.cache.get(imagepath);
            PosterBuilder.cache.delete(imagepath);
            PosterBuilder.cache.set(imagepath, hit);
            return Promise.resolve(hit);
        }
        // De-duplicate: a slider drag, or clicking the same thumbnail twice,
        // can ask for the same multi-megabyte wallpaper several times before
        // the first decode finishes.
        if (!PosterBuilder.pending.has(imagepath)) {
            PosterBuilder.pending.set(imagepath, PosterBuilder.decode(imagepath).then((img) => {
                PosterBuilder.pending.delete(imagepath);
                if (img) PosterBuilder.remember(imagepath, img);
                return img;
            }));
        }
        return PosterBuilder.pending.get(imagepath);
    }

    /** Cache one image, dropping the least recently used past the limit. */
    static remember(path, img) {
        // Map iterates in insertion order, so this is the oldest entry.
        if (PosterBuilder.cache.size >= PosterBuilder.CACHE_LIMIT) {
            PosterBuilder.cache.delete(PosterBuilder.cache.keys().next().value);
        }
        PosterBuilder.cache.set(path, img);
    }

    /**
     * Decode without caching. Icons keep their own bounded cache, so they must
     * not land in `PosterBuilder.cache`, which is unbounded by design.
     */
    static decode(src) {
        return new Promise((resolve) => {
            loadImage(src, (img) => resolve(img), () => resolve(null));
        });
    }

    /**
     * Per-overlay defaults. Every field is optional on a poster entry, and a
     * poster with no `overlays` array draws exactly as it always did.
     */
    static get OVERLAY_DEFAULTS() {
        return {
            icon: '', color: '#ffffff', size: 220, x: 0, y: 0,
            rotate: 0, opacity: 100, flipX: false
        };
    }

    /**
     * Iconify SVG source for one icon name, cached for the session.
     *
     * Fetched as *text* rather than pointed at with loadImage, for two reasons.
     * Recolouring is then a local `currentColor` replace, so dragging the colour
     * picker costs no network round trip. And the data: URL built from it is
     * same-origin — a cross-origin SVG drawn onto the canvas risks tainting it,
     * and a tainted canvas makes toDataURL() throw for every poster in the run,
     * not just this one.
     */
    static iconSource(name) {
        if (PosterBuilder.iconSources.has(name)) {
            return Promise.resolve(PosterBuilder.iconSources.get(name));
        }
        if (!PosterBuilder.iconPending.has(name)) {
            // "mdi:star" -> "mdi/star.svg".
            const [prefix, ...rest] = String(name).split(':');
            const remember = (svg) => {
                PosterBuilder.iconSources.set(name, svg);
                return svg;
            };
            PosterBuilder.iconPending.set(name, fetch(
                `${PosterBuilder.ICON_API}/${prefix}/${rest.join(':')}.svg`)
                .then((response) => (response.ok ? response.text() : ''))
                // An unknown icon answers with a plain-text body, not an SVG.
                .then((text) => remember(text.trimStart().startsWith('<svg') ? text : ''))
                .catch(() => remember('')));
        }
        return PosterBuilder.iconPending.get(name);
    }

    /**
     * Rasterise one icon at `px` square in `colour`.
     *
     * Iconify serves monochrome icons as `fill="currentColor"`, so the replace
     * is a true recolour rather than a tint. Multi-colour sets (twemoji, noto,
     * the `-poly` sets) carry real fills and are deliberately left alone.
     *
     * The source is sized `1em`, which an <img> decode cannot resolve, so real
     * pixels are substituted. Non-square viewBoxes letterbox inside the square
     * under the SVG default preserveAspectRatio, which makes `size` the longest
     * side rather than a distortion.
     */
    static async loadIcon(name, colour, px) {
        const key = `${name}|${colour}|${px}`;
        if (PosterBuilder.iconCache.has(key)) return PosterBuilder.iconCache.get(key);

        const source = await PosterBuilder.iconSource(name);
        if (!source) return null;
        // Scoped to the opening tag: a bare first-match replace would rewrite a
        // child <rect>'s width on any icon whose root carries none.
        const svg = source
            .replace(/currentColor/g, colour)
            .replace(/<svg\b[^>]*>/, (tag) => tag
                .replace(/\s(?:width|height)="[^"]*"/g, '')
                .replace('<svg', `<svg width="${px}" height="${px}"`));
        const img = await PosterBuilder.decode(
            `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);

        if (img) {
            // Map iterates in insertion order, so this evicts the oldest entry.
            if (PosterBuilder.iconCache.size >= PosterBuilder.ICON_LIMIT) {
                PosterBuilder.iconCache.delete(PosterBuilder.iconCache.keys().next().value);
            }
            PosterBuilder.iconCache.set(key, img);
        }
        return img;
    }

    /**
     * Draw icon overlays, in list order, each on its own layer. Drawn between
     * the dim wash and the text so the text stays legible on top.
     */
    async overlays(list = []) {
        for (const entry of list) {
            const o = { ...PosterBuilder.OVERLAY_DEFAULTS, ...entry };
            if (!o.icon) continue;
            // Rounded up to a 128px bucket so a size drag reuses a handful of
            // decodes instead of minting one per pixel.
            const px = Math.min(1024, Math.max(128, Math.ceil(o.size / 128) * 128));
            const img = await PosterBuilder.loadIcon(o.icon, o.color, px);
            if (!img) {
                this.warnings.push(`the “${o.icon}” overlay could not be loaded`);
                continue;
            }

            push();
            translate(width / 2 + o.x, height / 2 + o.y);
            if (o.rotate) rotate(radians(o.rotate));
            if (o.flipX) scale(-1, 1);
            imageMode(CENTER);
            const alpha = Math.max(0, Math.min(100, o.opacity)) / 100;
            // push()/pop() restores tint, so this can't leak into the next draw.
            if (alpha < 1) tint(255, alpha * 255);
            image(img, 0, 0, o.size, o.size);
            pop();
        }
        return this;
    }

    /** Flat black wash over the background, for text legibility. */
    dim(amount = 0) {
        if (amount <= 0) return this;
        noStroke();
        fill(0, Math.min(255, 255 * amount));
        rect(0, 0, width, height);
        return this;
    }

    /**
     * Draw a generated background. Everything is seeded, so the same seed and
     * settings always reproduce the same image — unlike the random colours
     * elsewhere, these are safe to use in a bulk export.
     */
    pattern(name, {
        colorA = '#1b2a4a', colorB = '#c2410c', colorC = '#f5c451',
        seed = 1, scale = 50
    } = {}) {
        const a = color(colorA);
        const b = color(colorB);
        const c = color(colorC);
        randomSeed(seed);
        noiseSeed(seed);
        push();
        noStroke();

        // Three-stop ramp, so every pattern uses all three colours.
        const ramp = (t) => {
            const v = Math.max(0, Math.min(1, t));
            return v < 0.5 ? lerpColor(a, b, v * 2) : lerpColor(b, c, (v - 0.5) * 2);
        };
        // Density derived from `scale` so one slider drives every pattern.
        const density = Math.max(3, Math.round(scale / 4));
        const step = Math.max(14, scale);
        const wash = () => { fill(a); rect(0, 0, width, height); };

        // Native canvas gradients: smoother than banding it by hand, and fast.
        const stops = (grad) => {
            grad.addColorStop(0, a.toString());
            grad.addColorStop(Math.max(0.1, Math.min(0.9, scale / 120)), b.toString());
            grad.addColorStop(1, c.toString());
            drawingContext.fillStyle = grad;
            drawingContext.fillRect(0, 0, width, height);
        };

        if (name === 'gradient') {
            // Seed picks the angle, scale moves the midpoint.
            const angle = random(TWO_PI);
            const reach = Math.max(width, height);
            stops(drawingContext.createLinearGradient(
                width / 2 - Math.cos(angle) * reach / 2, height / 2 - Math.sin(angle) * reach / 2,
                width / 2 + Math.cos(angle) * reach / 2, height / 2 + Math.sin(angle) * reach / 2));
        } else if (name === 'radial') {
            // Seed offsets the centre, scale sets how far the glow reaches.
            const cx = width * random(0.25, 0.75);
            const cy = height * random(0.25, 0.75);
            stops(drawingContext.createRadialGradient(
                cx, cy, 0, cx, cy, height * (0.45 + scale / 120)));
        } else if (name === 'mesh') {
            wash();
            drawingContext.filter = `blur(${Math.max(30, scale)}px)`;
            for (let i = 0; i < density; i++) {
                fill(ramp(random()));
                circle(random(width), random(height), random(width / 3, width));
            }
            drawingContext.filter = 'none';
        } else if (name === 'waves') {
            wash();
            const phase = random(TWO_PI);
            for (let i = 0; i < density; i++) {
                fill(ramp(i / density));
                beginShape();
                vertex(0, height);
                for (let x = 0; x <= width; x += 8) {
                    vertex(x, height * (i / density)
                        + Math.sin((x / width) * TWO_PI + i + phase) * (scale / 2) + scale);
                }
                vertex(width, height);
                endShape(CLOSE);
            }
        } else if (name === 'rings') {
            const cx = width * random(0.3, 0.7);
            const cy = height * random(0.3, 0.7);
            for (let i = density; i > 0; i--) {
                fill(ramp(i / density));
                circle(cx, cy, (i / density) * height * 1.6);
            }
        } else if (name === 'grid') {
            wash();
            const ox = random(step);
            const oy = random(step);
            for (let x = ox - step; x < width + step; x += step) {
                for (let y = oy - step; y < height + step; y += step) {
                    fill(ramp(y / height));
                    circle(x, y, step * 0.34);
                }
            }
        } else if (name === 'checker') {
            const shift = random(step);
            let row = 0;
            for (let y = -shift; y < height; y += step, row++) {
                let col = 0;
                for (let x = 0; x < width; x += step, col++) {
                    fill((row + col) % 2 ? ramp(x / width) : a);
                    rect(x, y, step, step);
                }
            }
        } else if (name === 'stripes') {
            wash();
            push();
            translate(width / 2, height / 2);
            rotate(radians(random(-70, 70)));
            let i = 0;
            for (let x = -height; x < height; x += step, i++) {
                fill(ramp(i / (height / step)));
                rect(x, -height, step * 0.62, height * 2.4);
            }
            pop();
        } else if (name === 'triangles') {
            const s = Math.max(40, scale * 2);
            for (let x = -s; x < width + s; x += s) {
                for (let y = -s; y < height + s; y += s) {
                    fill(ramp(random()));
                    triangle(x, y, x + s, y, x, y + s);
                    fill(ramp(random()));
                    triangle(x + s, y, x + s, y + s, x, y + s);
                }
            }
        } else if (name === 'noise') {
            const px = 4;
            const zoom = 0.002 * (scale / 25);
            for (let x = 0; x < width; x += px) {
                for (let y = 0; y < height; y += px) {
                    fill(ramp(noise(x * zoom, y * zoom)));
                    rect(x, y, px, px);
                }
            }
        } else if (name === 'topo') {
            // Band a noise field into contour steps.
            const px = 3;
            const zoom = 0.0025 * (scale / 25);
            const levels = Math.max(4, Math.round(scale / 6));
            for (let x = 0; x < width; x += px) {
                for (let y = 0; y < height; y += px) {
                    const band = Math.floor(noise(x * zoom, y * zoom) * levels) / levels;
                    fill(ramp(band));
                    rect(x, y, px, px);
                }
            }
        } else if (name === 'stars') {
            // Gradient sky first, then enough stars to actually read as a
            // starfield — a sparse scatter of 1px dots vanishes once the
            // preview is scaled down.
            for (let y = 0; y < height; y++) {
                stroke(lerpColor(a, color(0), 0.35 * (y / height)));
                line(0, y, width, y);
            }
            noStroke();
            for (let i = 0; i < 220 + density * 60; i++) {
                const bright = random();
                fill(ramp(0.5 + bright * 0.5));
                circle(random(width), random(height), random(1.2, 2.6) * (0.6 + bright));
            }
            // A few brighter ones with a glow, for depth.
            for (let i = 0; i < density; i++) {
                const x = random(width);
                const y = random(height);
                drawingContext.shadowColor = c.toString();
                drawingContext.shadowBlur = 14;
                fill(c);
                circle(x, y, random(3.5, 6));
            }
            drawingContext.shadowBlur = 0;
            drawingContext.shadowColor = 'rgba(0,0,0,0)';
        } else if (name === 'burst') {
            wash();
            push();
            translate(width / 2, height / 2);
            rotate(random(TWO_PI));
            const rays = Math.max(8, density * 2);
            for (let i = 0; i < rays; i++) {
                fill(ramp(i / rays));
                const from = (i / rays) * TWO_PI;
                const to = ((i + 0.5) / rays) * TWO_PI;
                const r = height * 1.2;
                triangle(0, 0, Math.cos(from) * r, Math.sin(from) * r,
                    Math.cos(to) * r, Math.sin(to) * r);
            }
            pop();
        } else if (name === 'bokeh') {
            for (let y = 0; y < height; y++) {
                stroke(ramp(y / height));
                line(0, y, width, y);
            }
            noStroke();
            for (let i = 0; i < density * 3; i++) {
                const shade = color(c.toString());
                shade.setAlpha(random(20, 70));
                fill(shade);
                circle(random(width), random(height), random(scale, scale * 4));
            }
        } else if (name === 'confetti') {
            wash();
            for (let i = 0; i < density * 14; i++) {
                push();
                translate(random(width), random(height));
                rotate(random(TWO_PI));
                fill(ramp(random()));
                rect(0, 0, random(6, scale / 3), random(3, 10), 2);
                pop();
            }
        }

        pop();
        return this;
    }

    color(colorargs) {
        noStroke();
        if (typeof colorargs === 'string' || typeof colorargs === 'number')
            fill(color(colorargs));
        else
            fill(color(...colorargs));
        rect(0, 0, width, height);
        return this;
    }

    overlay(gradient = false) {
        if (gradient) {
            fillGradient('radial', {
                from: [width / 2, height / 2, 0], // x, y, radius
                to: [width / 2, height / 2, 900], // x, y, radius
                steps: [color(0, 50), color(0, 125), color(0, 255)]
            });
        } else {
            fill(0, 50);
        }
        noStroke();
        rect(0, 0, width, height);
        return this;
    }

    side() {
        stroke(255);
        strokeWeight(25);
        line(0, 0, width, 0);
        line(width, 0, width, height);
        line(width, height, 0, height);
        line(0, height, 0, 0);
        return this;
    }

    /** Defaults here reproduce the original hard-coded look exactly. */
    static get TEXT_DEFAULTS() {
        return {
            font: 'poster', sizeBig: 72, sizeSmall: 40, textColor: '#ffffff',
            uppercase: true, tracking: 0, gap: 0, autoFit: false,
            textX: 0, textY: 0, swap: false, align: 'center',
            opacity: 100, rotate: 0,
            // smallColorLink keeps the second line following textColor, which
            // is what every existing poster expects.
            smallColorLink: true, smallColor: '#ffffff',
            plate: 'none', plateColor: '#000000', plateOpacity: 55, platePad: 18,
            plateRadius: 0,
            strokeWidth: 0, strokeColor: '#000000',
            shadowBlur: 0, shadowY: 0, shadowOpacity: 60, bloom: 0
        };
    }

    /**
     * `poster` is the bundled TTF, the Kometa names are TTFs fetched at runtime
     * (see `KometaFonts`), and the rest are CSS families p5 accepts directly.
     * Falls back to the bundled font if a Kometa one hasn't loaded yet.
     */
    static fontFor(name) {
        const kometa = typeof KometaFonts !== 'undefined' && KometaFonts.get(name);
        if (kometa) return kometa;
        return { sans: 'sans-serif', serif: 'serif', mono: 'monospace' }[name] ?? font;
    }

    /**
     * Width of `str`, honouring letter spacing. Tracking is applied manually
     * (see `line()`), so textWidth() alone would under-measure.
     */
    static measure(str, size, style) {
        push();
        textFont(PosterBuilder.fontFor(style.font));
        textSize(size);
        const chars = [...str];
        const w = style.tracking
            ? chars.reduce((sum, c) => sum + textWidth(c), 0) + style.tracking * Math.max(0, chars.length - 1)
            : textWidth(str);
        pop();
        return w + (style.strokeWidth ?? 0);
    }

    /** Usable width: the canvas less the 25px border on each side. */
    static get TEXT_LIMIT() {
        return 600 - 50;
    }

    /** True if `str` would run past the border at `size`. */
    static overflows(str, size, style) {
        return PosterBuilder.measure(str, size, style) > PosterBuilder.TEXT_LIMIT;
    }

    /**
     * Largest size at or below `size` that fits. Glyph width scales linearly
     * with point size, so one proportional step lands very close; the loop then
     * corrects for the stroke width, which does not scale.
     */
    static fitSize(str, size, style) {
        const limit = PosterBuilder.TEXT_LIMIT;
        const width0 = PosterBuilder.measure(str, size, style);
        if (width0 <= limit) return size;

        let fitted = Math.max(8, Math.floor(size * (limit / width0)));
        while (fitted > 8 && PosterBuilder.measure(str, fitted, style) > limit) fitted -= 1;
        return fitted;
    }

    /**
     * Draw one line centred on x=0. p5 renders loaded fonts as canvas paths, so
     * `drawingContext` shadows apply to them — that gives both drop shadow and
     * bloom without any extra compositing.
     */
    /** Rendered width of `str` at `size`, ignoring stroke. */
    static lineWidth(str, size, s) {
        push();
        textFont(PosterBuilder.fontFor(s.font));
        textSize(size);
        const chars = [...str];
        const w = s.tracking
            ? chars.reduce((sum, c) => sum + textWidth(c), 0)
                + s.tracking * Math.max(0, chars.length - 1)
            : textWidth(str);
        pop();
        return w;
    }

    /** Left edge of a line of width `w` under the current alignment. */
    static originX(w, s) {
        const limit = PosterBuilder.TEXT_LIMIT;
        if (s.align === 'left') return -limit / 2;
        if (s.align === 'right') return limit / 2 - w;
        return -w / 2;
    }

    drawLine(str, size, y, s) {
        textSize(size);
        const ctx = drawingContext;

        // Always positioned manually from the left, so alignment and letter
        // spacing are handled by one code path.
        const paint = () => {
            textAlign(LEFT);
            const x0 = PosterBuilder.originX(PosterBuilder.lineWidth(str, size, s), s);
            if (!s.tracking) {
                text(str, x0, y);
                return;
            }
            let x = x0;
            for (const c of [...str]) {
                text(c, x, y);
                x += textWidth(c) + s.tracking;
            }
        };

        // Glow, drawn repeatedly so intensity ramps up.
        if (s.bloom > 0) {
            ctx.shadowColor = s.textColor;
            ctx.shadowBlur = s.bloom / 2;
            ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
            for (let i = 0; i < 1 + Math.floor(s.bloom / 25); i++) paint();
        }

        // Drop shadow.
        if (s.shadowBlur > 0 || s.shadowY !== 0) {
            const shade = color(0);
            shade.setAlpha((s.shadowOpacity / 100) * 255);
            ctx.shadowColor = shade.toString();
            ctx.shadowBlur = s.shadowBlur;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = s.shadowY;
            paint();
        }

        // Crisp pass on top, with no shadow of its own.
        ctx.shadowColor = 'rgba(0,0,0,0)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
        paint();
    }

    /**
     * Panel behind the text. `bar` spans the full width; `box` hugs the widest
     * line. Baselines sit ~0.8em below the cap line, which is what the vertical
     * extents are derived from.
     */
    plate(slots, s) {
        const pad = s.platePad;
        const widest = Math.max(...slots.map((slot) =>
            PosterBuilder.lineWidth(slot.str, slot.size, s)));
        const top = Math.min(...slots.map((slot) => slot.y - slot.size * 0.8));
        const bottom = Math.max(...slots.map((slot) => slot.y + slot.size * 0.22));

        const x = s.plate === 'bar'
            ? -width / 2
            : PosterBuilder.originX(widest, s) - pad;
        const w = s.plate === 'bar' ? width : widest + pad * 2;

        const fillColor = color(s.plateColor);
        fillColor.setAlpha((Math.max(0, Math.min(100, s.plateOpacity)) / 100) * 255);
        push();
        noStroke();
        fill(fillColor);
        // A bar spans the full width, so rounding it would clip at the edges.
        const radius = s.plate === 'bar' ? 0 : Math.max(0, s.plateRadius);
        rect(x, top - pad, w, (bottom - top) + pad * 2, radius);
        pop();
    }

    text(lines, style = {}) {
        const s = { ...PosterBuilder.TEXT_DEFAULTS, ...style };
        const cased = (str) => (s.uppercase ? String(str).toUpperCase() : String(str));

        push();
        translate(width / 2 + s.textX, height / 2 + s.textY);
        if (s.rotate) rotate(radians(s.rotate));
        textFont(PosterBuilder.fontFor(s.font));

        // Shrink to fit if asked. Line positions still use the requested sizes,
        // so turning auto-fit on never shifts the layout — only the glyphs.
        const size = (str, requested) =>
            (s.autoFit ? PosterBuilder.fitSize(cased(str), requested, s) : requested);

        // Work out every line up front: the plate needs their extents.
        const slots = [];
        if (Array.isArray(s.lineSizes) && s.lineSizes.length) {
            // Multi-line: `lines` reads top to bottom, one size per line, and
            // the block is centred vertically.
            const sizes = lines.map((str, i) =>
                size(str, s.lineSizes[i] ?? s.sizeBig));
            const total = sizes.reduce((sum, v) => sum + v, 0) + s.gap * (lines.length - 1);
            let cursor = -total / 2;
            for (const [i, str] of lines.entries()) {
                // 0.78 em puts the baseline under the cap line.
                slots.push({
                    str: cased(str), size: sizes[i], y: cursor + sizes[i] * 0.78,
                    color: s.lineColors?.[i] || s.textColor
                });
                cursor += sizes[i] + s.gap;
            }
        } else if (lines.length === 2) {
            // Legacy two-line: lines[1] sits above lines[0], `swap` exchanges
            // them. Kept exactly so untouched posters.js entries don't move.
            const lower = s.sizeBig / 2 + s.gap / 2;
            const upper = -s.sizeBig / 2 - s.gap / 2;
            slots.push({ str: cased(lines[0]), size: size(lines[0], s.sizeBig), y: s.swap ? upper : lower, color: s.textColor });
            slots.push({
                str: cased(lines[1]), size: size(lines[1], s.sizeSmall), y: s.swap ? lower : upper,
                color: s.smallColorLink ? s.textColor : s.smallColor
            });
        } else if (lines.length === 1) {
            slots.push({ str: cased(lines[0]), size: size(lines[0], s.sizeBig), y: s.sizeBig / 3, color: s.textColor });
        }

        if (s.plate !== 'none' && slots.some((slot) => slot.str)) {
            this.plate(slots, s);
        }

        const alpha = Math.max(0, Math.min(100, s.opacity)) / 100;
        if (s.strokeWidth > 0) {
            // Not `line`: that shadows p5's line().
            const outline = color(s.strokeColor);
            outline.setAlpha(alpha * 255);
            stroke(outline);
            strokeWeight(s.strokeWidth);
        } else {
            noStroke();
        }

        for (const slot of slots) {
            const paint = color(slot.color);
            paint.setAlpha(alpha * 255);
            fill(paint);
            this.drawLine(slot.str, slot.size, slot.y, s);
        }

        // Leave the context clean for whatever draws next.
        drawingContext.shadowColor = 'rgba(0,0,0,0)';
        drawingContext.shadowBlur = 0;
        drawingContext.shadowOffsetY = 0;
        pop();
    }
}