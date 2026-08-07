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
                const scale = fit === 'contain'
                    ? Math.min(width / img.width, height / img.height)
                    : Math.max(width / img.width, height / img.height);
                w = img.width * scale;
                h = img.height * scale;
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
            uppercase: true, tracking: 0, gap: 0,
            textX: 0, textY: 0, swap: false,
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

    /**
     * Draw one line centred on x=0. p5 renders loaded fonts as canvas paths, so
     * `drawingContext` shadows apply to them — that gives both drop shadow and
     * bloom without any extra compositing.
     */
    drawLine(str, size, y, s) {
        textSize(size);
        const ctx = drawingContext;

        const paint = () => {
            const chars = [...str];
            if (!s.tracking) {
                textAlign(CENTER);
                text(str, 0, y);
                return;
            }
            // Manual tracking: p5 has no letter-spacing for loaded fonts.
            textAlign(LEFT);
            const total = chars.reduce((sum, c) => sum + textWidth(c), 0)
                + s.tracking * Math.max(0, chars.length - 1);
            let x = -total / 2;
            for (const c of chars) {
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

    text(lines, style = {}) {
        const s = { ...PosterBuilder.TEXT_DEFAULTS, ...style };
        const cased = (str) => (s.uppercase ? String(str).toUpperCase() : String(str));

        push();
        translate(width / 2 + s.textX, height / 2 + s.textY);
        textFont(PosterBuilder.fontFor(s.font));
        fill(s.textColor);
        if (s.strokeWidth > 0) {
            stroke(s.strokeColor);
            strokeWeight(s.strokeWidth);
        } else {
            noStroke();
        }

        if (lines.length === 2) {
            // lines[1] normally sits above lines[0]; `swap` exchanges the slots.
            const lower = s.sizeBig / 2 + s.gap / 2;
            const upper = -s.sizeBig / 2 - s.gap / 2;
            this.drawLine(cased(lines[0]), s.sizeBig, s.swap ? upper : lower, s);
            this.drawLine(cased(lines[1]), s.sizeSmall, s.swap ? lower : upper, s);
        } else if (lines.length === 1) {
            this.drawLine(cased(lines[0]), s.sizeBig, s.sizeBig / 3, s);
        }

        // Leave the context clean for whatever draws next.
        drawingContext.shadowColor = 'rgba(0,0,0,0)';
        drawingContext.shadowBlur = 0;
        drawingContext.shadowOffsetY = 0;
        pop();
    }
}