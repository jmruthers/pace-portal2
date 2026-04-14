import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    teardownTimeout: 10_000,
  },
  // Pre-bundle `cookie` (CJS) so `import { parse } from 'cookie'` in react-router works in the browser.
  // Excluding react-router-dom skips that pre-bundle and triggers "does not provide export named: parse".
  optimizeDeps: {
    exclude: ['@solvera/pace-core'],
    include: ['cookie', 'react-router', 'react-router-dom'],
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
});
