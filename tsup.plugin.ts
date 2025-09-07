import { minify } from 'html-minifier-terser';
import type { Plugin } from 'esbuild';
import fs from 'fs';

export function htmlMinify(): Plugin {
    return {
        name: 'html-minify',
        setup(build) {
            build.onLoad({ filter: /\.html$/ }, async (args) => {
                let html = fs.readFileSync(args.path, 'utf8');
                // Remove BOM if present
                if (html.charCodeAt(0) === 0xFEFF) {
                    html = html.slice(1);
                }
                const minified = await minify(html, {
                    collapseWhitespace: true,
                    removeComments: true,
                    minifyCSS: true,
                    minifyJS: true,
                });
                return {
                    contents: `export default ${JSON.stringify(minified)}`,
                    loader: 'js',
                };
            });
        },
    };
}