# TS ImageViewer

A lightweight, zero‑dependency TypeScript image viewer: modal overlay, zoom, drag/pan, thumbnails, rotation, keyboard navigation.

<p>
  <a href="https://www.npmjs.com/package/lite-image-viewer"><img src="https://img.shields.io/npm/v/lite-image-viewer.svg?style=flat&color=33a" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/lite-image-viewer"><img src="https://img.shields.io/npm/dm/lite-image-viewer.svg?color=4a7" alt="downloads" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="license" /></a>
</p>

> Published on npm as `lite-image-viewer` (the simple name `image-viewer` was already taken).

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
import 'lite-image-viewer/image-viewer.css';

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
<link rel="stylesheet" href="https://unpkg.com/lite-image-viewer/dist/image-viewer.css" />
<article>
  <img src="/demo/1.jpg" />
  <img src="/demo/2.jpg" />
</article>
<script type="module">
  import { createImageViewer } from 'https://unpkg.com/lite-image-viewer/dist/viewer.js';
  createImageViewer({ scope: 'article' });
</script>
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
}
```

### Planned Public Methods
(Currently only the factory and class are exported; internal methods may change. Open an issue if you need more public APIs.)

## Changelog
Initial release: 0.1.1

## License
MIT
