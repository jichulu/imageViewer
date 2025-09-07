import './viewer.scss';
import backdropTemplate from './viewer.html';
import { createEl } from './utils/domUtils'
import { ImageItem, ViewerInstance, ViewerOptions } from './interface';

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
    minZoom: 0.25,
    maxZoom: 8
};

class ImageViewer implements ViewerInstance {
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
    private disposes: [fn: () => void, close: boolean][] = []; // event unbinders

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
        const processMutation = (nodes: NodeList, fn: (img: HTMLImageElement) => void) => {
            nodes.forEach(node => {
                if (node.nodeType !== 1) return;
                const el = node as Element;
                if (el.tagName === 'IMG') fn(el as HTMLImageElement);
                el.querySelectorAll?.('img').forEach(img => fn(img as HTMLImageElement));
            });
        }
        const mo = new MutationObserver(muts => {
            for (const m of muts) {
                processMutation(m.addedNodes, node => this.tryAddImage(node));
                processMutation(m.removedNodes, node => this.tryRemoveImage(node));
            }
        });
        mo.observe(root, { childList: true, subtree: true });
        this.disposes.push([() => mo.disconnect(), false]);
    }

    private tryAddImage(img: HTMLImageElement) {
        if (img.dataset.noViewer === 'true' || img.dataset.ivBound === '1') {
            console.log('skip', img);
            return;
        }
        if (this.options.filter && !this.options.filter(img)) {
            console.log('filtered', img);
            return;
        }
        if (!img.src) {
            console.log('no src', img);
            return;
        }
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
            const t = createEl('img', { src: item.src, alt: item.alt || '', loading: 'lazy' });
            t.addEventListener('click', () => {
                const idx = this.images.findIndex(i => i.src === src);
                if (idx >= 0) this.go(idx);
            });
            this.thumbsEl.appendChild(t);
            this.updateCounter();
        }
    }

    private tryRemoveImage(img: HTMLImageElement) {
        if (img.dataset.ivBound !== '1') return;
        const src = img.currentSrc || img.src;
        const idx = this.images.findIndex(i => i.src === src);
        if (idx >= 0) this.images.splice(idx, 1);
        delete img.dataset.ivBound;
        img.style.cursor = '';
        img.removeEventListener('click', () => { });
        if (this.backdrop && this.thumbsEl) {
            const thumbs = Array.from(this.thumbsEl.querySelectorAll('img'));
            const t = thumbs.find(t => (t.currentSrc || t.src) === src);
            if (t) t.remove();
            this.updateCounter();
        }
    }

    // SVG icons & buttons now provided via static HTML template (backdrop.html)

    private render() {
        if (!this.imgEl) return;
        const item = this.images[this.index];
        this.imgEl.src = item.src;
        this.highlightThumb();
        this.resetTransform(true);
        this.updateZoomIndicator();
        this.updateCounter();
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

    private updateCounter() {
        const counter = this.backdrop?.querySelector('.iv-counter');
        if (counter) counter.textContent = `${this.index + 1} / ${this.images.length}`;
    }

    private updateZoomIndicator() {
        const zoomIndicator = this.backdrop?.querySelector('.iv-zoom-indicator');
        if (zoomIndicator) zoomIndicator.textContent = `${Math.round(this.zoom * 100)}%`;
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
        this.disposes.push([() => window.removeEventListener('keydown', handle), true]);
    }

    private installWheel(stage: HTMLElement) {
        stage.addEventListener('wheel', e => {
            // Direct wheel zoom (no Ctrl/⌘ required)
            e.preventDefault();
            // Derive scale factor from wheel delta, clamp extremes
            const step = Math.max(-1, Math.min(1, e.deltaY / 100));
            const factor = step < 0 ? 1 - step * 0.25 : 1 / (1 + step * 0.25); // smooth scaling
            const origin = this.calculateZoomOrigin(e.clientX, e.clientY);
            this.adjustZoom(factor, origin);
        }, { passive: false });
    }

    private calculateZoomOrigin(clientX: number, clientY: number) {
        const parent = this.imgEl!.parentElement;
        const rect = parent!.getBoundingClientRect();
        const style = window.getComputedStyle(parent!);
        const paddings = { left: parseFloat(style.paddingLeft), top: parseFloat(style.paddingTop) };
        const cx = clientX - rect.left - paddings.left;
        const cy = clientY - rect.top - paddings.top;
        return { x: cx, y: cy };
    }

    private installInteractions(stage: HTMLElement) {
        // Mouse drag for panning
        stage.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            this.isPanning = true;
            this.panStart = { ...this.pan };
            this.pointerStart = { x: e.clientX, y: e.clientY };
            this.clickMoved = false;
            stage.classList.add('iv-grabbing');
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
            stage.classList.remove('iv-grabbing');
        });

        // Touch: single-finger pan, two-finger pinch zoom
        stage.addEventListener('touchstart', e => {
            if (e.touches.length === 1) {
                this.isPanning = true;
                this.panStart = { ...this.pan };
                this.pointerStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                stage.classList.add('iv-grabbing');
            } else if (e.touches.length === 2) {
                this.isPanning = false;
                this.multiTouchDist = this.distance(e.touches[0], e.touches[1]);
                const midpoint = this.midpoint(e.touches[0], e.touches[1]);
                this.origin = this.calculateZoomOrigin(midpoint.x, midpoint.y);
                e.preventDefault();
            }
        }, { passive: false });
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
        stage.addEventListener('touchend', () => {
            this.isPanning = false;
            stage.classList.remove('iv-grabbing');
        }, { passive: true });
    }

    private distance(a: Touch, b: Touch) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }

    private midpoint(a: Touch, b: Touch) { return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; }

    private adjustZoom(factor: number, origin?: { x: number; y: number }) { this.adjustZoomRaw(this.zoom * factor, origin); }

    private adjustZoomRaw(nextZoom: number, origin?: { x: number; y: number }) {
        nextZoom = Math.min(this.options.maxZoom, Math.max(this.options.minZoom, nextZoom));
        const prev = this.zoom;
        this.zoom = nextZoom;
        if (origin && this.imgEl) {
            const parent = this.imgEl.parentElement!;
            const pan = this.pan;
            const scale = this.zoom / prev;
            if (scale !== 1) {
                const centerX = (parent.clientWidth * 0.5) + pan.x;
                const centerY = (parent.clientHeight * 0.5) + pan.y;
                const dx = origin.x - centerX;
                const dy = origin.y - centerY;
                const k = 1 - scale;
                this.pan = { x: pan.x + dx * k, y: pan.y + dy * k };
            }
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
        const { x, y, z, r } = { x: this.pan.x, y: this.pan.y, z: this.zoom, r: this.rotation };
        this.imgEl.style.transform = `translate(${x}px, ${y}px) scale(${z}) rotate(${r}deg)`;
        this.updateZoomIndicator();
    }

    private go(i: number) {
        if (i < 0 || i >= this.images.length) return;
        this.index = i;
        this.render();
    }

    public open(startIndex = 0) {
        if (!this.images.length) return;
        this.index = Math.min(Math.max(0, startIndex), this.images.length - 1);
        if (this.backdrop) return;

        document.body.classList.add('iv-lock');
        // Build from template
        const wrap = document.createElement('div');
        wrap.innerHTML = backdropTemplate.trim();
        const backdrop = wrap.firstElementChild as HTMLElement | null;
        if (!backdrop) return;
        if (this.options.className) backdrop.classList.add(...this.options.className.split(/\s+/).filter(Boolean));
        const stage = backdrop.querySelector<HTMLElement>('.iv-stage');
        const imgEl = backdrop.querySelector<HTMLImageElement>('.iv-stage img');
        let thumbs = backdrop.querySelector<HTMLElement>('.iv-thumbs');
        if (!stage || !imgEl) return;
        // thumbnails handling
        if (this.options.thumbnails) {
            if (thumbs) {
                thumbs.replaceChildren();
                this.images.forEach((it, i) => {
                    const t = createEl('img', { src: it.src, alt: it.alt || '', loading: 'lazy' });
                    t.addEventListener('click', () => this.go(i));
                    thumbs.appendChild(t);
                });
                this.thumbsEl = thumbs;
            }
        } else {
            thumbs?.remove();
            this.thumbsEl = undefined;
        }
        // backdrop close
        if (this.options.closeOnBackdrop) {
            backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) this.close(); });
        }
        // stage blank click close
        stage.addEventListener('click', e => { if (!this.clickMoved) this.close(); });
        // delegate buttons
        backdrop.querySelectorAll<HTMLElement>('[data-action]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                switch (btn.dataset.action) {
                    case 'prev': this.prev(); break;
                    case 'next': this.next(); break;
                    case 'zoom-in': this.adjustZoom(1.25); break;
                    case 'zoom-out': this.adjustZoom(0.8); break;
                    case 'rotate-left': this.rotate(-90); break;
                    case 'rotate-right': this.rotate(90); break;
                    case 'reset': this.resetTransform(true); break;
                }
            });
        });
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add('iv-active'));
        this.backdrop = backdrop;
        this.imgEl = imgEl;

        this.installInteractions(stage);
        if (this.options.keyboard) this.installKeyboard();
        if (this.options.wheelZoom) this.installWheel(stage);
        this.render();
        this.options.onOpen?.();
    }

    public next() { this.go(this.index + 1); }

    public prev() { this.go(this.index - 1); }

    public close() {
        if (!this.backdrop) return;
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
        this.disposes.forEach(item => item[1] && item[0]());
    }

    public destroy() {
        this.close();
        // Clean up event listeners
        this.disposes.forEach(item => item[0]());
        this.disposes = [];
    }
}

/** Factory function, returns a singleton instance */
function createImageViewer(options?: ViewerOptions): ViewerInstance { return new ImageViewer(options); }

export { createImageViewer, ImageItem, ViewerOptions, ViewerInstance };
