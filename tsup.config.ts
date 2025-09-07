import { defineConfig, Options } from 'tsup';
import { sassPlugin } from 'esbuild-sass-plugin';
import { htmlMinify } from './tsup.plugin';

const options: Options = {
  entry: ['src/viewer.ts'],
  platform: 'browser',
  format: ['esm', 'iife'],
  globalName: 'ImageViewer',
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  outDir: 'dist/js',
  treeshake: true,
  minify: true,
  loader: {
    '.html': 'text',
    '.scss': 'file'
  },
  skipNodeModulesBundle: true,
  esbuildPlugins: [htmlMinify()]
};


const scssOptions: Options = {
  entry: ['src/*.scss'],
  sourcemap: false,
  clean: true,
  outDir: 'dist/css',
  minify: true,
  esbuildPlugins: [sassPlugin()]
};
export default defineConfig([options, scssOptions]);