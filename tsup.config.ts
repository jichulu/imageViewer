import { defineConfig } from 'tsup';
import { sassPlugin } from 'esbuild-sass-plugin';
import { htmlMinify } from './tsup.plugin';

export default defineConfig({
  entry: ['src/viewer.ts'],
  format: ['esm', 'iife'],
  globalName: 'ImageViewer',
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  outDir: 'dist',
  treeshake: true,
  minify: true,
  loader: {
    '.html': 'text',
    '.scss': 'file'
  },
  skipNodeModulesBundle: true,
  esbuildPlugins: [sassPlugin(), htmlMinify()]
});
