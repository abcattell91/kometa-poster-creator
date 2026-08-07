class PosterBuilder {
    static cache = new Map();

    constructor(type) {
        this.type = type;
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
            return Promise.resolve(PosterBuilder.cache.get(imagepath));
        }
        return new Promise((resolve) => {
            loadImage(imagepath, (img) => {
                PosterBuilder.cache.set(imagepath, img);
                resolve(img);
            }, () => resolve(null));
        });
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

        if (name === 'gradient') {
            for (let y = 0; y < height; y++) {
                stroke(ramp(y / height));
                line(0, y, width, y);
            }
        } else if (name === 'radial') {
            fill(c); rect(0, 0, width, height);
            for (let i = 240; i > 0; i--) {
                fill(ramp(1 - i / 240));
                circle(width / 2, height / 2, (i / 240) * height * 1.8);
            }
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
            for (let i = 0; i < density; i++) {
                fill(ramp(i / density));
                beginShape();
                vertex(0, height);
                for (let x = 0; x <= width; x += 8) {
                    vertex(x, height * (i / density)
                        + Math.sin((x / width) * TWO_PI + i) * (scale / 2) + scale);
                }
                vertex(width, height);
                endShape(CLOSE);
            }
        } else if (name === 'rings') {
            for (let i = density; i > 0; i--) {
                fill(ramp(i / density));
                circle(width / 2, height / 2, (i / density) * height * 1.6);
            }
        } else if (name === 'grid') {
            wash();
            for (let x = step / 2; x < width + step; x += step) {
                for (let y = step / 2; y < height + step; y += step) {
                    fill(ramp(y / height));
                    circle(x, y, step * 0.34);
                }
            }
        } else if (name === 'checker') {
            let row = 0;
            for (let y = 0; y < height; y += step, row++) {
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
            rotate(radians(-30));
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
        rect(x, top - pad, w, (bottom - top) + pad * 2);
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

        // Work out both lines up front: the plate needs their extents.
        const slots = [];
        if (lines.length === 2) {
            // lines[1] normally sits above lines[0]; `swap` exchanges the slots.
            const lower = s.sizeBig / 2 + s.gap / 2;
            const upper = -s.sizeBig / 2 - s.gap / 2;
            slots.push({ str: cased(lines[0]), size: size(lines[0], s.sizeBig), y: s.swap ? upper : lower, big: true });
            slots.push({ str: cased(lines[1]), size: size(lines[1], s.sizeSmall), y: s.swap ? lower : upper, big: false });
        } else if (lines.length === 1) {
            slots.push({ str: cased(lines[0]), size: size(lines[0], s.sizeBig), y: s.sizeBig / 3, big: true });
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
            const paint = color(slot.big || s.smallColorLink ? s.textColor : s.smallColor);
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