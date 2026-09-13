import { defineConfig } from 'vite';
import path from 'node:path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      // Vite does not read tsconfig `paths` on its own, so the `@shared/*`
      // alias `tsconfig.json` defines (which `tsc --noEmit` resolves) needs
      // its own mirror here. `src/main/github/auth.ts` and
      // `src/main/ipc/auth.ts` both import from `@shared/*`.
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    lib: {
      entry: 'src/main/index.ts',
      // Force a stable filename instead of the plugin's default `[name].js`,
      // which derives `[name]` from the entry's basename — and every entry
      // in this project is named `index.ts`.
      fileName: () => 'main.js',
      formats: ['cjs'],
    },
  },
});
