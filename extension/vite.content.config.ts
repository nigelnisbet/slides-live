import { defineConfig } from 'vite';
import { resolve } from 'path';

// Separate build pass for the content script. It runs as a classic
// content_scripts entry (not "type":"module" like the background worker),
// so it can't use ES `import` at runtime - format: 'iife' forces Rollup to
// inline its entire dependency graph (firebase-client, thumbnail-badges,
// activity-editor, pip-stats, etc.) into one self-contained file instead of
// splitting out shared chunks the way the main build does for popup/background.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/content/content-script.ts'),
      output: {
        format: 'iife',
        entryFileNames: 'content.js',
      },
    },
  },
});
