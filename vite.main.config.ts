import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
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
