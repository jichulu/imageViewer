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
export declare class ImageViewer {
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
    constructor(opts?: ViewerOptions);
    private collect;
    private observeNewImages;
    private tryAddImage;
    open(startIndex?: number): void;
    private sideBtn;
    private ctrlBtn;
    private icon;
    private render;
    private highlightThumb;
    private updateZoomIndicator;
    private installKeyboard;
    private installWheel;
    private installInteractions;
    private distance;
    private midpoint;
    private adjustZoom;
    private adjustZoomRaw;
    private rotate;
    private resetTransform;
    private applyTransform;
    private go;
    next(): void;
    prev(): void;
    close(): void;
    destroy(): void;
}
export declare function createImageViewer(options?: ViewerOptions): ImageViewer;
