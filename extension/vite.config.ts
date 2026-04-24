import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest-and-icons',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }
        // Copy manifest
        fs.copyFileSync(
          resolve(__dirname, 'public/manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );
        // Copy icons
        const iconsDir = resolve(__dirname, 'public/icons');
        const distIconsDir = resolve(distDir, 'icons');
        if (fs.existsSync(iconsDir)) {
          if (!fs.existsSync(distIconsDir)) {
            fs.mkdirSync(distIconsDir, { recursive: true });
          }
          fs.readdirSync(iconsDir).forEach(file => {
            fs.copyFileSync(
              resolve(iconsDir, file),
              resolve(distIconsDir, file)
            );
          });
        }

        // Fix popup.html to use relative path
        const popupHtmlPath = resolve(distDir, 'src/popup/index.html');
        if (fs.existsSync(popupHtmlPath)) {
          let html = fs.readFileSync(popupHtmlPath, 'utf-8');
          // Fix absolute path to relative path (go up 2 levels: src/popup/ -> root)
          html = html.replace('src="/popup.js"', 'src="../../popup.js"');
          fs.writeFileSync(popupHtmlPath, html);
        }
      },
    },
  ],
  base: '',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
