import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  optimizeDeps: {
    // react-router-dom stays excluded (pace-core); pre-bundle its CJS deps for ESM dev
    exclude: ['@solvera/pace-core', 'react-router-dom'],
    include: ['cookie', 'set-cookie-parser'],
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
});
