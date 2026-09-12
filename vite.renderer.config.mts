import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    // The strict CSP sets `font-src 'self'`, which does not admit `data:`.
    // Without this, Vite inlines small font subsets (e.g. cyrillic-ext) as
    // base64 data: URIs, producing an @font-face the CSP silently blocks.
    assetsInlineLimit: 0,
  },
});
