
export interface ImageItem {
    /** Image source URL */
    src: string;
    /** alt text */
    alt?: string;
    /** title text */
    title?: string;
}

export interface ViewerOptions {
    /** CSS selector or element that bounds the DOM scan */
    scope?: string | HTMLElement;
    /** Show thumbnail strip Default true */
    thumbnails?: boolean;
    /** Close when clicking backdrop (default true) */
    closeOnBackdrop?: boolean;
    /** Enable keyboard navigation (Escape, Arrows, +/-, 0) default true */
    keyboard?: boolean;
    /** Enable wheel zoom (no Ctrl/⌘ needed) default true */
    wheelZoom?: boolean;
    /** Extra class names for root element */
    className?: string;
    /** Callback on open */
    onOpen?: () => void;
    /** Callback on close */
    onClose?: () => void;
    /** Provide images directly; skip DOM scan if set */
    images?: ImageItem[];
    /** Filter function: return true to include an <img> */
    filter?: (img: HTMLImageElement) => boolean;
    /** Minimum zoom level (e.g. 0.5 = 50%) default 0.25 */
    minZoom?: number;
    /** Maximum zoom level (e.g. 2 = 200%) default 8 */
    maxZoom?: number;
}

export interface ViewerInstance {
    /** Open viewer at given image index (default 0) */
    open(startIndex?: number): void;
    /** Close viewer */
    close(): void;
    /** Show next image */
    next(): void;
    /** Show previous image */
    prev(): void;
    /** Destroy instance and clean up event listeners */
    destroy(): void;
}