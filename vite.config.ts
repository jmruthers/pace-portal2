import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  optimizeDeps: {
    // React Router pulls CJS-only deps with named imports (`parse`/`serialize`, `splitCookiesString`).
    // Pre-bundle so the browser gets ESM interop.
    include: ['cookie', 'set-cookie-parser'],
    exclude: ['@solvera/pace-core', 'react-router-dom'],
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
});
