export interface ImageItem {
    src: string;
    alt?: string;
    title?: string;
}
export interface ViewerOptions {
    /** CSS 选择器或元素，用于限定要扫描的正文范围 */
    scope?: string | HTMLElement;
    /** 是否显示缩略图条 */
    thumbnails?: boolean;
    /** 点击遮罩是否关闭 */
    closeOnBackdrop?: boolean;
    /** 是否启用键盘导航 */
    keyboard?: boolean;
    /** 是否启用滚轮缩放 (现在无需按 Ctrl/⌘) */
    wheelZoom?: boolean;
    /** 自定义根元素附加的类名 */
    className?: string;
    onOpen?: () => void;
    onClose?: () => void;
    /** 直接传入图片数组，若提供则不再扫描 DOM */
    images?: ImageItem[];
    /** 过滤方法：判断 img 元素是否合法，返回 true 表示可作为预览图片 */
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
