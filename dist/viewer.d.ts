interface ImageItem {
    src: string;
    alt?: string;
    title?: string;
}
interface ViewerOptions {
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
    minZoom?: number;
    maxZoom?: number;
}
declare class ImageViewer {
    private options;
    private images;
    private index;
    private backdrop?;
    private imgEl?;
    private thumbsEl?;
    private zoom;
    private rotation;
    private pan;
    private isPanning;
    private panStart;
    private pointerStart;
    private multiTouchDist;
    private origin;
    private clickMoved;
    private disposes;
    constructor(opts?: ViewerOptions);
    private collect;
    private observeNewImages;
    private tryAddImage;
    private tryRemoveImage;
    private render;
    private highlightThumb;
    private updateCounter;
    private updateZoomIndicator;
    private installKeyboard;
    private installWheel;
    private calculateZoomOrigin;
    private installInteractions;
    private distance;
    private midpoint;
    private adjustZoom;
    private adjustZoomRaw;
    private rotate;
    private resetTransform;
    private applyTransform;
    private go;
    open(startIndex?: number): void;
    next(): void;
    prev(): void;
    close(): void;
    destroy(): void;
}
declare function createImageViewer(options?: ViewerOptions): ImageViewer;

export { type ImageItem, ImageViewer, type ViewerOptions, createImageViewer };
