import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/viewer.ts'],
  format: ['esm'], // revert to pure ESM output
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  outDir: 'dist',
  treeshake: true,
  minify: true,
  banner: {
    js: '// Built with tsup (ESM)'
  },
  loader: {
    '.html': 'text',
    '.scss': 'file'
  },
  skipNodeModulesBundle: true
});
