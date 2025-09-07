# Lite Image Viewer

A lightweight, zero‑dependency TypeScript image viewer: modal overlay, zoom, drag/pan, thumbnails, rotation, keyboard navigation.

<p>
  <a href="https://www.npmjs.com/package/lite-image-viewer"><img src="https://img.shields.io/npm/v/lite-image-viewer.svg?style=flat&color=33a" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/lite-image-viewer"><img src="https://img.shields.io/npm/dm/lite-image-viewer.svg?color=4a7" alt="downloads" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="license" /></a>
</p>

## Features
- Auto-detect images within a given DOM scope and open on click
- Zoom via buttons / mouse wheel / pinch (no need to hold Ctrl/⌘)
- Pan by mouse drag or single-finger touch drag
- Rotate left / right in 90° steps, plus reset
- Thumbnail strip with auto-centering and quick navigation
- Keyboard shortcuts: ← / → navigate, ESC close, + / − zoom, 0 reset
- Zoom range 0.25x – 8x with smooth interpolation
- Live detection of newly added images (MutationObserver)
- Optional explicit images array (skip DOM scan)
- Tiny, framework-agnostic, full TypeScript types

## Live Demo
https://jichulu.github.io/imageViewer/

## Install
```bash
npm i lite-image-viewer
# or
pnpm add lite-image-viewer
# or
yarn add lite-image-viewer
```

## Basic Usage (bundler / ESM)
```ts
import { createImageViewer } from 'lite-image-viewer';
import 'lite-image-viewer/viewer.css';

createImageViewer({ scope: 'article' });
```

Providing your own image list:
```ts
createImageViewer({
  images: [
    { src: '/a.jpg', alt: 'A' },
    { src: '/b.jpg', title: 'Image B' }
  ],
  thumbnails: true
});
```

## Direct Browser (CDN / ESM) Example
```html
<link rel="stylesheet" href="https://unpkg.com/lite-image-viewer/dist/viewer.css" />
<article>
  <img src="/demo/1.jpg" />
  <img src="/demo/2.jpg" />
</article>
<script type="module">
  import { createImageViewer } from 'https://unpkg.com/lite-image-viewer/dist/viewer.js';
  createImageViewer({ scope: 'article' });
</script>
```

## IIFE (Global) Usage (no modules / legacy script tag)
Use the pre-bundled IIFE build which exposes a global `ImageViewer` object containing both the class and the factory function.

```html
<link rel="stylesheet" href="https://unpkg.com/lite-image-viewer/dist/viewer.css" />
<article id="gallery">
  <img src="/demo/1.jpg" alt="One" />
  <img src="/demo/2.jpg" alt="Two" />
</article>

<!-- Load AFTER the images / or place before </body> -->
<script src="https://unpkg.com/lite-image-viewer/dist/viewer.global.js"></script>
<script>
  // Option 1: use factory
  ImageViewer.createImageViewer({ scope: '#gallery' });
</script>
```

Notes:
- Global name: `ImageViewer`
- Exports: `ImageViewer.ImageViewer` (class) and `ImageViewer.createImageViewer` (factory)
- Include the CSS file separately (not inlined)
- Call after DOM is ready (e.g. `DOMContentLoaded`) if script is in `<head>`

### Minimal inline example
```html
<link rel="stylesheet" href="https://unpkg.com/lite-image-viewer/dist/viewer.css" />
<img src="/demo/1.jpg" />
<img src="/demo/2.jpg" />
<script src="https://unpkg.com/lite-image-viewer/dist/viewer.global.js"></script>
<script>ImageViewer.createImageViewer();</script>
```

## Local Dev (clone repo)
```powershell
npm install
npm run build
```
Build output is in `dist/`.

## API
```ts
createImageViewer(options?: ViewerOptions): ImageViewer

interface ViewerOptions {
  scope?: string | HTMLElement; // DOM scan scope
  thumbnails?: boolean;         // Show thumbnail strip
  closeOnBackdrop?: boolean;    // Click backdrop to close
  keyboard?: boolean;           // Enable keyboard navigation
  wheelZoom?: boolean;          // Enable direct wheel zoom
  className?: string;           // Extra class on root
  onOpen?: () => void;
  onClose?: () => void;
  images?: { src: string; alt?: string; title?: string }[]; // Provide images directly
  filter?: (img: HTMLImageElement) => boolean;              // Filter which <img> elements are included
  minZoom?: number; // default 0.25
  maxZoom?: number; // default 8
}
```

## License
MIT
