// ImageViewer: modal image viewer (thumbnails / zoom / pan / keyboard navigation)

export interface ImageItem {
    src: string;
    alt?: string;
    title?: string;
}

export interface ViewerOptions {
    /** CSS selector or element that bounds the DOM scan */
    scope?: string | HTMLElement;
    /** Show thumbnail strip */
    thumbnails?: boolean;
    /** Close when clicking backdrop */
    closeOnBackdrop?: boolean;
    /** Enable keyboard navigation */
    keyboard?: boolean;
    /** Enable wheel zoom (no Ctrl/⌘ needed) */
    wheelZoom?: boolean;
    /** Extra class names for root element */
    className?: string;
    onOpen?: () => void;
    onClose?: () => void;
    /** Provide images directly; skip DOM scan if set */
    images?: ImageItem[];
    /** Filter function: return true to include an <img> */
    filter?: (img: HTMLImageElement) => boolean;
}

const DEFAULTS: Required<Omit<ViewerOptions, 'onOpen' | 'onClose' | 'images' | 'scope'>> & {
    scope: HTMLElement | null;
    onOpen?: () => void;
    onClose?: () => void;
    images?: ImageItem[];
} = {
    scope: null,
    thumbnails: true,
    closeOnBackdrop: true,
    keyboard: true,
    wheelZoom: true,
    className: '',
    filter: () => true,
    onOpen: undefined,
    onClose: undefined,
    images: undefined,
};

export class ImageViewer {
    private options: typeof DEFAULTS;
    private images: ImageItem[] = [];
    private index = 0;
    private backdrop?: HTMLElement;
    private imgEl?: HTMLImageElement;
    private thumbsEl?: HTMLElement;
    private zoom = 1;
    private rotation = 0; // rotation angle (deg)
    private pan = { x: 0, y: 0 };
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private pointerStart = { x: 0, y: 0 };
    private multiTouchDist = 0;
    private origin = { x: 0, y: 0 }; // pinch origin
    private clickMoved = false; // track if dragged to suppress click-close

    constructor(opts: ViewerOptions = {}) {
        const scope = typeof opts.scope === 'string' ? document.querySelector<HTMLElement>(opts.scope) : opts.scope ?? null;
        this.options = { ...DEFAULTS, ...opts, scope };
        this.collect();
        this.observeNewImages();
    }

    // Collect images from DOM
    private collect() {
        if (this.options.images) {
            this.images = [...this.options.images];
            return;
        }
        this.images = [];
        const root = this.options.scope || document.body;
        const nodes = root.querySelectorAll<HTMLImageElement>('img');
        nodes.forEach(img => {
            this.tryAddImage(img);
        });
    }

    // Observe newly added images
    private observeNewImages() {
        if (this.options.images) return; // skip if images provided directly
        const root = this.options.scope || document.body;
        const mo = new MutationObserver(muts => {
            for (const m of muts) {
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    const el = node as Element;
                    if (el.tagName === 'IMG') this.tryAddImage(el as HTMLImageElement);
                    el.querySelectorAll?.('img').forEach(img => this.tryAddImage(img as HTMLImageElement));
                });
            }
        });
        mo.observe(root, { childList: true, subtree: true });
        (this as any)._mo = mo;
    }

    private tryAddImage(img: HTMLImageElement) {
        if (img.dataset.noViewer === 'true' || img.dataset.ivBound === '1') return;
        if (this.options.filter && !this.options.filter(img)) return;
        if (!img.src) return;
        const src = img.currentSrc || img.src;
        const item: ImageItem = { src, alt: img.alt, title: img.title || img.alt };
        this.images.push(item);
        img.style.cursor = 'zoom-in';
        img.dataset.ivBound = '1';
        img.addEventListener('click', e => {
            e.preventDefault();
            const idx = this.images.findIndex(i => i.src === src);
            if (idx >= 0) this.open(idx);
        });
        if (this.backdrop && this.thumbsEl) {
            const t = document.createElement('img');
            t.src = item.src; t.alt = item.alt || ''; t.loading = 'lazy';
            t.addEventListener('click', () => {
                const idx = this.images.findIndex(i => i.src === src);
                if (idx >= 0) this.go(idx);
            });
            this.thumbsEl.appendChild(t);
            const counter = this.backdrop.querySelector('.iv-counter');
            if (counter) counter.textContent = `${this.index + 1} / ${this.images.length}`;
        }
    }

    open(startIndex = 0) {
        if (!this.images.length) return;
        this.index = Math.min(Math.max(0, startIndex), this.images.length - 1);
        if (this.backdrop) return;

        document.body.classList.add('iv-lock');
        const backdrop = document.createElement('div');
        backdrop.className = `iv-backdrop ${this.options.className}`.trim();
        if (this.options.closeOnBackdrop) backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) this.close(); });

        const shell = document.createElement('div'); shell.className = 'iv-shell';
        const stage = document.createElement('div'); stage.className = 'iv-stage';
        const imgEl = document.createElement('img'); imgEl.draggable = false; stage.appendChild(imgEl);

    // Click blank stage area to close
        stage.addEventListener('click', e => { if (e.target === stage) this.close(); });
    // Single click on image closes if not dragged
        imgEl.addEventListener('click', () => { if (!this.clickMoved) this.close(); });

        const zoomIndicator = document.createElement('div'); zoomIndicator.className = 'iv-zoom-indicator'; stage.appendChild(zoomIndicator);
        const closeBtn = document.createElement('button'); closeBtn.className = 'iv-close'; closeBtn.innerHTML = '&#10005;'; closeBtn.addEventListener('click', () => this.close()); shell.appendChild(closeBtn);
        const counter = document.createElement('div'); counter.className = 'iv-counter'; stage.appendChild(counter);

    // Side navigation buttons
        stage.appendChild(this.sideBtn('‹', () => this.prev(), 'left'));
        stage.appendChild(this.sideBtn('›', () => this.next(), 'right'));

    // Control buttons (zoom / rotate / reset)
        const controls = document.createElement('div'); controls.className = 'iv-controls';
        controls.append(
            this.ctrlBtn('+', 'Zoom In', () => this.adjustZoom(1.25)),
            this.ctrlBtn('-', 'Zoom Out', () => this.adjustZoom(0.8)),
            this.ctrlBtn('⟲', 'Rotate Left', () => this.rotate(-90)),
            this.ctrlBtn('⟳', 'Rotate Right', () => this.rotate(90)),
            this.ctrlBtn('⤾', 'Reset', () => this.resetTransform(true)),
        );
        stage.appendChild(controls);

        shell.appendChild(stage);
        if (this.options.thumbnails) {
            const thumbs = document.createElement('div'); thumbs.className = 'iv-thumbs';
            this.images.forEach((it, i) => {
                const t = document.createElement('img'); t.src = it.src; t.alt = it.alt || ''; t.loading = 'lazy';
                t.addEventListener('click', () => this.go(i));
                thumbs.appendChild(t);
            });
            shell.appendChild(thumbs); this.thumbsEl = thumbs;
        }

        backdrop.appendChild(shell); document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add('iv-active'));
        this.backdrop = backdrop; this.imgEl = imgEl;

        this.installInteractions(stage);
        if (this.options.keyboard) this.installKeyboard();
        if (this.options.wheelZoom) this.installWheel(stage);
        this.render(counter, zoomIndicator);
        this.options.onOpen?.();
    }

    private sideBtn(label: string, fn: () => void, side: 'left' | 'right') {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `iv-nav-btn iv-nav-btn-${side}`;
        b.textContent = label;
        b.addEventListener('click', e => { e.stopPropagation(); fn(); });
        return b;
    }

    private ctrlBtn(label: string, title: string, fn: () => void) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.title = title;
        b.addEventListener('click', e => { e.stopPropagation(); fn(); });
        return b;
    }

    private render(counter?: HTMLElement, zoomIndicator?: HTMLElement) {
        if (!this.imgEl) return;
        const item = this.images[this.index];
        this.imgEl.src = item.src;
        this.imgEl.alt = item.alt || '';
        this.imgEl.title = item.title || item.alt || '';
        if (counter) counter.textContent = `${this.index + 1} / ${this.images.length}`;
        this.highlightThumb();
        this.resetTransform();
        this.updateZoomIndicator(zoomIndicator);
    }

    private highlightThumb() {
        if (!this.thumbsEl) return;
        const imgs = Array.from(this.thumbsEl.querySelectorAll('img'));
        imgs.forEach((el, idx) => { el.dataset.active = String(idx === this.index); });
        const active = imgs[this.index];
        if (active) {
            const r = active.getBoundingClientRect();
            const pr = this.thumbsEl.getBoundingClientRect();
            if (r.left < pr.left || r.right > pr.right) active.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
        }
    }

    private updateZoomIndicator(el?: HTMLElement) {
        if (el) el.textContent = `${Math.round(this.zoom * 100)}%`;
    }

    private installKeyboard() {
        const handle = (e: KeyboardEvent) => {
            if (!this.backdrop) return;
            switch (e.key) {
                case 'Escape': this.close(); break;
                case 'ArrowRight': this.next(); break;
                case 'ArrowLeft': this.prev(); break;
                case '+': case '=': this.adjustZoom(1.25); break;
                case '-': this.adjustZoom(0.8); break;
                case '0': this.resetTransform(); break;
            }
        };
        window.addEventListener('keydown', handle, { passive: true });
        (this as any)._kbd = handle;
    }

    private installWheel(stage: HTMLElement) {
        stage.addEventListener('wheel', e => {
            // Direct wheel zoom (no Ctrl/⌘ required)
            e.preventDefault();
            // Derive scale factor from wheel delta, clamp extremes
            const step = Math.max(-1, Math.min(1, e.deltaY / 100));
            const factor = step < 0 ? 1 - step * 0.25 : 1 / (1 + step * 0.25); // smooth scaling
            const rect = this.imgEl!.getBoundingClientRect();
            const cx = e.clientX - rect.left - rect.width / 2;
            const cy = e.clientY - rect.top - rect.height / 2;
            this.adjustZoom(factor, { x: cx, y: cy });
        }, { passive: false });
    }

    private installInteractions(stage: HTMLElement) {
        // Mouse drag for panning
        stage.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            this.isPanning = true;
            this.panStart = { ...this.pan };
            this.pointerStart = { x: e.clientX, y: e.clientY };
            this.clickMoved = false;
            stage.style.cursor = 'grabbing';
        });
        window.addEventListener('mousemove', e => {
            if (!this.isPanning) return;
            const dx = e.clientX - this.pointerStart.x;
            const dy = e.clientY - this.pointerStart.y;
            this.pan = { x: this.panStart.x + dx, y: this.panStart.y + dy };
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.clickMoved = true;
            this.applyTransform();
        });
        window.addEventListener('mouseup', () => {
            this.isPanning = false;
            stage.style.cursor = 'default';
        });

        // Touch: single-finger pan, two-finger pinch zoom
        stage.addEventListener('touchstart', e => {
            if (e.touches.length === 1) {
                this.isPanning = true;
                this.panStart = { ...this.pan };
                this.pointerStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                this.isPanning = false;
                this.multiTouchDist = this.distance(e.touches[0], e.touches[1]);
                this.origin = this.midpoint(e.touches[0], e.touches[1]);
            }
        }, { passive: true });
        stage.addEventListener('touchmove', e => {
            if (e.touches.length === 1 && this.isPanning) {
                const dx = e.touches[0].clientX - this.pointerStart.x;
                const dy = e.touches[0].clientY - this.pointerStart.y;
                this.pan = { x: this.panStart.x + dx, y: this.panStart.y + dy };
                this.applyTransform();
            } else if (e.touches.length === 2) {
                const dist = this.distance(e.touches[0], e.touches[1]);
                const factor = dist / this.multiTouchDist;
                this.adjustZoomRaw(this.zoom * factor, this.origin);
                this.multiTouchDist = dist;
            }
        }, { passive: true });
        stage.addEventListener('touchend', () => { this.isPanning = false; }, { passive: true });
    }

    private distance(a: Touch, b: Touch) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
    private midpoint(a: Touch, b: Touch) { return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; }

    private adjustZoom(factor: number, origin?: { x: number; y: number }) { this.adjustZoomRaw(this.zoom * factor, origin); }
    private adjustZoomRaw(nextZoom: number, origin?: { x: number; y: number }) {
        nextZoom = Math.min(8, Math.max(0.25, nextZoom));
        const prev = this.zoom;
        this.zoom = nextZoom;
        if (origin && this.imgEl) {
            const scale = this.zoom / prev;
            this.pan = {
                x: origin.x + (this.pan.x - origin.x) * scale,
                y: origin.y + (this.pan.y - origin.y) * scale,
            };
        }
        this.applyTransform();
    }

    private rotate(delta: number) {
        this.rotation = (this.rotation + delta);
        this.applyTransform();
    }

    private resetTransform(resetRotation = false) {
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        if (resetRotation) this.rotation = 0;
        this.applyTransform();
    }

    private applyTransform() {
        if (!this.imgEl) return;
        this.imgEl.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom}) rotate(${this.rotation}deg)`;
        const indicator = this.backdrop?.querySelector<HTMLElement>('.iv-zoom-indicator');
        this.updateZoomIndicator(indicator || undefined);
    }

    private go(i: number) {
        if (i < 0 || i >= this.images.length) return;
        this.index = i;
        this.render(this.backdrop?.querySelector('.iv-counter') as HTMLElement | undefined, this.backdrop?.querySelector('.iv-zoom-indicator') as HTMLElement | undefined);
    }
    next() { this.go(this.index + 1); }
    prev() { this.go(this.index - 1); }

    close() {
        if (!this.backdrop) return;
    // Remove keyboard event handler if it exists
        const handle = ((this as any)._kbd as ((e: KeyboardEvent) => void) | undefined);
        if (handle) window.removeEventListener('keydown', handle);
    // Play closing animation
        const bd = this.backdrop;
        bd.classList.remove('iv-active');
        bd.classList.add('iv-leave');
        const done = () => {
            bd.removeEventListener('transitionend', done);
            bd.remove();
            this.backdrop = undefined;
            this.imgEl = undefined;
            document.body.classList.remove('iv-lock');
            this.options.onClose?.();
        };
        bd.addEventListener('transitionend', done);
    }

    destroy() {
        const mo = (this as any)._mo as MutationObserver | undefined;
        mo?.disconnect();
        this.close();
    }
}

// Factory function
export function createImageViewer(options?: ViewerOptions) { return new ImageViewer(options); }
