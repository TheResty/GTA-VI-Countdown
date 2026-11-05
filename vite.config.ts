/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         → dist/        (mehrere Dateien, z. B. für GitHub Pages)
// `npm run build:single`  → dist-single/ (eine einzige HTML-Datei inkl. Fonts, JS und CSS)
// `npm run build:en`      → dist-en/en.html (englische Public-Edition als Einzeldatei)
export default defineConfig(({ mode }) => {
  const en = mode === 'en';
  const single = mode === 'single' || en;
  return {
    base: './',
    plugins: single ? [viteSingleFile()] : [],
    build: {
      outDir: en ? 'dist-en' : single ? 'dist-single' : 'dist',
      rollupOptions: { input: en ? 'en.html' : 'index.html' },
      target: 'es2020',
      assetsInlineLimit: single ? 100_000_000 : 4096,
      chunkSizeWarningLimit: 1500,
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
