# TS ImageViewer

一个零依赖的轻量 TypeScript 图片查看器：弹窗显示正文图片，支持缩放、拖拽、缩略图、旋转、键盘导航。

## 功能特性
- 点击正文图片自动弹出查看器
- 缩略图快速跳转
- 键盘支持：← → 切换，ESC 关闭，+ / - 缩放，0 重置
- 缩放方式：按钮、滚轮（无需再按 Ctrl/⌘）、双指捏合（移动端）
- 平移：鼠标拖拽 / 单指拖动
- 最大 8 倍 / 最小 0.25 倍缩放
- 旋转：右上角按钮支持 90° 左右旋转，重置恢复
- 页码显示：当前页 / 总数（左上角）
- 可传入自定义图片数组或自动扫描 DOM

## 快速使用
```html
<link rel="stylesheet" href="dist/image-viewer.css" />
<script type="module">
  import { createImageViewer } from './dist/viewer.js';
  createImageViewer({ scope: 'article' });
</script>
```

## 构建
```powershell
npm install
npm run build
```
输出文件位于 `dist/`。

## API
```ts
createImageViewer(options?: ViewerOptions): ImageViewer

interface ViewerOptions {
  scope?: string | HTMLElement; // 扫描范围
  thumbnails?: boolean;         // 缩略图
  closeOnBackdrop?: boolean;    // 点击遮罩关闭
  keyboard?: boolean;           // 键盘导航
  wheelZoom?: boolean;          // 是否启用滚轮缩放（直接滚轮即可）
  className?: string;           // 自定义类
  onOpen?: () => void;
  onClose?: () => void;
  images?: { src: string; alt?: string; title?: string }[]; // 直接提供图片
}
```

## License
MIT
