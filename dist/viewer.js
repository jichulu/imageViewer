// ImageViewer: modal image viewer (thumbnails / zoom / pan / keyboard navigation)
const DEFAULTS = {
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
    constructor(opts = {}) {
        var _a;
        this.images = [];
        this.index = 0;
        this.zoom = 1;
        this.rotation = 0; // rotation angle (deg)
        this.pan = { x: 0, y: 0 };
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        this.pointerStart = { x: 0, y: 0 };
        this.multiTouchDist = 0;
        this.origin = { x: 0, y: 0 }; // pinch origin
        this.clickMoved = false; // track if dragged to suppress click-close
        const scope = typeof opts.scope === 'string' ? document.querySelector(opts.scope) : (_a = opts.scope) !== null && _a !== void 0 ? _a : null;
        this.options = { ...DEFAULTS, ...opts, scope };
        this.collect();
        this.observeNewImages();
    }
    // Collect images from DOM
    collect() {
        if (this.options.images) {
            this.images = [...this.options.images];
            return;
        }
        this.images = [];
        const root = this.options.scope || document.body;
        const nodes = root.querySelectorAll('img');
        nodes.forEach(img => {
            this.tryAddImage(img);
        });
    }
    // Observe newly added images
    observeNewImages() {
        if (this.options.images)
            return; // skip if images provided directly
        const root = this.options.scope || document.body;
        const mo = new MutationObserver(muts => {
            for (const m of muts) {
                m.addedNodes.forEach(node => {
                    var _a;
                    if (node.nodeType !== 1)
                        return;
                    const el = node;
                    if (el.tagName === 'IMG')
                        this.tryAddImage(el);
                    (_a = el.querySelectorAll) === null || _a === void 0 ? void 0 : _a.call(el, 'img').forEach(img => this.tryAddImage(img));
                });
            }
        });
        mo.observe(root, { childList: true, subtree: true });
        this._mo = mo;
    }
    tryAddImage(img) {
        if (img.dataset.noViewer === 'true' || img.dataset.ivBound === '1')
            return;
        if (this.options.filter && !this.options.filter(img))
            return;
        if (!img.src)
            return;
        const src = img.currentSrc || img.src;
        const item = { src, alt: img.alt, title: img.title || img.alt };
        this.images.push(item);
        img.style.cursor = 'zoom-in';
        img.dataset.ivBound = '1';
        img.addEventListener('click', e => {
            e.preventDefault();
            const idx = this.images.findIndex(i => i.src === src);
            if (idx >= 0)
                this.open(idx);
        });
        if (this.backdrop && this.thumbsEl) {
            const t = document.createElement('img');
            t.src = item.src;
            t.alt = item.alt || '';
            t.loading = 'lazy';
            t.addEventListener('click', () => {
                const idx = this.images.findIndex(i => i.src === src);
                if (idx >= 0)
                    this.go(idx);
            });
            this.thumbsEl.appendChild(t);
            const counter = this.backdrop.querySelector('.iv-counter');
            if (counter)
                counter.textContent = `${this.index + 1} / ${this.images.length}`;
        }
    }
    open(startIndex = 0) {
        var _a, _b;
        if (!this.images.length)
            return;
        this.index = Math.min(Math.max(0, startIndex), this.images.length - 1);
        if (this.backdrop)
            return;
        document.body.classList.add('iv-lock');
        const backdrop = document.createElement('div');
        backdrop.className = `iv-backdrop ${this.options.className}`.trim();
        if (this.options.closeOnBackdrop)
            backdrop.addEventListener('mousedown', e => { if (e.target === backdrop)
                this.close(); });
        const shell = document.createElement('div');
        shell.className = 'iv-shell';
        const stage = document.createElement('div');
        stage.className = 'iv-stage';
        const imgEl = document.createElement('img');
        imgEl.draggable = false;
        stage.appendChild(imgEl);
        const tools = document.createElement('div');
        tools.className = 'iv-tools';
        stage.appendChild(tools);
        // Click blank stage area to close
        stage.addEventListener('click', e => { if (e.target === stage)
            this.close(); });
        // Single click on image closes if not dragged
        imgEl.addEventListener('click', () => { if (!this.clickMoved)
            this.close(); });
        const zoomIndicator = document.createElement('div');
        zoomIndicator.className = 'iv-zoom-indicator';
        tools.appendChild(zoomIndicator);
        const counter = document.createElement('div');
        counter.className = 'iv-counter';
        tools.appendChild(counter);
        // Side navigation buttons
        tools.appendChild(this.sideBtn('‹', () => this.prev(), 'left'));
        tools.appendChild(this.sideBtn('›', () => this.next(), 'right'));
        // Control buttons (zoom / rotate / reset)
        const controls = document.createElement('div');
        controls.className = 'iv-controls';
        controls.append(this.ctrlBtn('zoom-in', 'Zoom In', () => this.adjustZoom(1.25)), this.ctrlBtn('zoom-out', 'Zoom Out', () => this.adjustZoom(0.8)), this.ctrlBtn('rotate-left', 'Rotate Left', () => this.rotate(-90)), this.ctrlBtn('rotate-right', 'Rotate Right', () => this.rotate(90)), this.ctrlBtn('reset', 'Reset', () => this.resetTransform(true)));
        tools.appendChild(controls);
        shell.appendChild(stage);
        if (this.options.thumbnails) {
            const thumbs = document.createElement('div');
            thumbs.className = 'iv-thumbs';
            this.images.forEach((it, i) => {
                const t = document.createElement('img');
                t.src = it.src;
                t.alt = it.alt || '';
                t.loading = 'lazy';
                t.addEventListener('click', () => this.go(i));
                thumbs.appendChild(t);
            });
            shell.appendChild(thumbs);
            this.thumbsEl = thumbs;
        }
        backdrop.appendChild(shell);
        const container = document.createElement('div');
        container.className = 'iv-container';
        container.appendChild(backdrop);
        document.body.appendChild(container);
        requestAnimationFrame(() => backdrop.classList.add('iv-active'));
        this.backdrop = backdrop;
        this.imgEl = imgEl;
        this.installInteractions(stage);
        if (this.options.keyboard)
            this.installKeyboard();
        if (this.options.wheelZoom)
            this.installWheel(stage);
        this.render(counter, zoomIndicator);
        (_b = (_a = this.options).onOpen) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    sideBtn(label, fn, side) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `iv-nav-btn iv-nav-btn-${side}`;
        b.setAttribute('aria-label', side === 'left' ? 'Previous image' : 'Next image');
        b.appendChild(this.icon(side === 'left' ? 'arrow-left' : 'arrow-right'));
        b.addEventListener('click', e => { e.stopPropagation(); fn(); });
        return b;
    }
    ctrlBtn(iconName, title, fn) {
        const b = document.createElement('button');
        b.type = 'button';
        b.title = title;
        b.setAttribute('aria-label', title);
        b.appendChild(this.icon(iconName));
        b.addEventListener('click', e => { e.stopPropagation(); fn(); });
        return b;
    }
    // Create an inline SVG icon (stroke based, 24x24 viewBox)
    icon(name) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.classList.add('iv-icon');
        const path = (d, extra = {}) => {
            const p = document.createElementNS(svgNS, 'path');
            p.setAttribute('d', d);
            Object.entries(extra).forEach(([k, v]) => { if (typeof v === 'string')
                p.setAttribute(k, v); });
            return p;
        };
        switch (name) {
            case 'arrow-left':
                svg.append(path('M15 4l-8 8 8 8', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
                break;
            case 'arrow-right':
                svg.append(path('M9 4l8 8-8 8', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
                break;
            case 'zoom-in':
                svg.append(path('M11 17a6 6 0 100-12 6 6 0 000 12z')); // circle
                svg.append(path('M11 9v4M9 11h4', { 'stroke-linecap': 'round' }));
                svg.append(path('M16.5 16.5L21 21', { 'stroke-linecap': 'round' }));
                break;
            case 'zoom-out':
                svg.append(path('M11 17a6 6 0 100-12 6 6 0 000 12z'));
                svg.append(path('M9 11h4', { 'stroke-linecap': 'round' }));
                svg.append(path('M16.5 16.5L21 21', { 'stroke-linecap': 'round' }));
                break;
            case 'rotate-left':
                svg.append(path('M8 4v4h4')); // corner arrow
                svg.append(path('M8 8a6 6 0 016-6 6 6 0 010 12 3 3 0 00-3 3v3', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
                break;
            case 'rotate-right':
                svg.append(path('M16 4v4h-4'));
                svg.append(path('M16 8a6 6 0 00-6-6 6 6 0 000 12 3 3 0 013 3v3', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
                break;
            case 'reset':
                svg.append(path('M12 3v3')); // crosshair
                svg.append(path('M12 18v3'));
                svg.append(path('M3 12h3'));
                svg.append(path('M18 12h3'));
                svg.append(path('M12 8a4 4 0 100 8 4 4 0 000-8z'));
                break;
            default:
                svg.append(path('M4 4h16v16H4z')); // fallback square
        }
        svg.querySelectorAll('path').forEach(p => {
            if (!p.getAttribute('fill'))
                p.setAttribute('fill', 'none');
            p.setAttribute('stroke', 'currentColor');
            p.setAttribute('stroke-width', '2');
        });
        return svg;
    }
    render(counter, zoomIndicator) {
        if (!this.imgEl)
            return;
        const item = this.images[this.index];
        this.imgEl.src = item.src;
        if (counter)
            counter.textContent = `${this.index + 1} / ${this.images.length}`;
        this.highlightThumb();
        this.resetTransform();
        this.updateZoomIndicator(zoomIndicator);
    }
    highlightThumb() {
        if (!this.thumbsEl)
            return;
        const imgs = Array.from(this.thumbsEl.querySelectorAll('img'));
        imgs.forEach((el, idx) => { el.dataset.active = String(idx === this.index); });
        const active = imgs[this.index];
        if (active) {
            const r = active.getBoundingClientRect();
            const pr = this.thumbsEl.getBoundingClientRect();
            if (r.left < pr.left || r.right > pr.right)
                active.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
        }
    }
    updateZoomIndicator(el) {
        if (el)
            el.textContent = `${Math.round(this.zoom * 100)}%`;
    }
    installKeyboard() {
        const handle = (e) => {
            if (!this.backdrop)
                return;
            switch (e.key) {
                case 'Escape':
                    this.close();
                    break;
                case 'ArrowRight':
                    this.next();
                    break;
                case 'ArrowLeft':
                    this.prev();
                    break;
                case '+':
                case '=':
                    this.adjustZoom(1.25);
                    break;
                case '-':
                    this.adjustZoom(0.8);
                    break;
                case '0':
                    this.resetTransform();
                    break;
            }
        };
        window.addEventListener('keydown', handle, { passive: true });
        this._kbd = handle;
    }
    installWheel(stage) {
        stage.addEventListener('wheel', e => {
            // Direct wheel zoom (no Ctrl/⌘ required)
            e.preventDefault();
            // Derive scale factor from wheel delta, clamp extremes
            const step = Math.max(-1, Math.min(1, e.deltaY / 100));
            const factor = step < 0 ? 1 - step * 0.25 : 1 / (1 + step * 0.25); // smooth scaling
            const rect = this.imgEl.getBoundingClientRect();
            const cx = e.clientX - rect.left - rect.width / 2;
            const cy = e.clientY - rect.top - rect.height / 2;
            this.adjustZoom(factor, { x: cx, y: cy });
        }, { passive: false });
    }
    installInteractions(stage) {
        // Mouse drag for panning
        stage.addEventListener('mousedown', e => {
            if (e.button !== 0)
                return;
            this.isPanning = true;
            this.panStart = { ...this.pan };
            this.pointerStart = { x: e.clientX, y: e.clientY };
            this.clickMoved = false;
            stage.classList.add('iv-grabbing');
        });
        window.addEventListener('mousemove', e => {
            if (!this.isPanning)
                return;
            const dx = e.clientX - this.pointerStart.x;
            const dy = e.clientY - this.pointerStart.y;
            this.pan = { x: this.panStart.x + dx, y: this.panStart.y + dy };
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3)
                this.clickMoved = true;
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
            }
            else if (e.touches.length === 2) {
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
            }
            else if (e.touches.length === 2) {
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
    distance(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
    midpoint(a, b) { return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; }
    adjustZoom(factor, origin) { this.adjustZoomRaw(this.zoom * factor, origin); }
    adjustZoomRaw(nextZoom, origin) {
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
    rotate(delta) {
        this.rotation = (this.rotation + delta);
        this.applyTransform();
    }
    resetTransform(resetRotation = false) {
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        if (resetRotation)
            this.rotation = 0;
        this.applyTransform();
    }
    applyTransform() {
        var _a;
        if (!this.imgEl)
            return;
        this.imgEl.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom}) rotate(${this.rotation}deg)`;
        const indicator = (_a = this.backdrop) === null || _a === void 0 ? void 0 : _a.querySelector('.iv-zoom-indicator');
        this.updateZoomIndicator(indicator || undefined);
    }
    go(i) {
        var _a, _b;
        if (i < 0 || i >= this.images.length)
            return;
        this.index = i;
        this.render((_a = this.backdrop) === null || _a === void 0 ? void 0 : _a.querySelector('.iv-counter'), (_b = this.backdrop) === null || _b === void 0 ? void 0 : _b.querySelector('.iv-zoom-indicator'));
    }
    next() { this.go(this.index + 1); }
    prev() { this.go(this.index - 1); }
    close() {
        if (!this.backdrop)
            return;
        // Remove keyboard event handler if it exists
        const handle = this._kbd;
        if (handle)
            window.removeEventListener('keydown', handle);
        // Play closing animation
        const bd = this.backdrop;
        bd.classList.remove('iv-active');
        bd.classList.add('iv-leave');
        const done = () => {
            var _a, _b;
            bd.removeEventListener('transitionend', done);
            bd.remove();
            this.backdrop = undefined;
            this.imgEl = undefined;
            document.body.classList.remove('iv-lock');
            (_b = (_a = this.options).onClose) === null || _b === void 0 ? void 0 : _b.call(_a);
        };
        bd.addEventListener('transitionend', done);
        // Reset transform
        this.resetTransform(true);
    }
    destroy() {
        const mo = this._mo;
        mo === null || mo === void 0 ? void 0 : mo.disconnect();
        this.close();
    }
}
// Factory function
export function createImageViewer(options) { return new ImageViewer(options); }
//# sourceMappingURL=viewer.js.map