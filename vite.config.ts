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
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/node_modules/**',
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/types/**',
        'src/vite-env.d.ts',
        /** Entry and env-only wiring; behaviour covered by integration smoke tests elsewhere. */
        'src/main.tsx',
        'src/App.tsx',
        'src/lib/supabase.ts',
        /** PR03 profile photo upload UI — covered by manual/E2E until dedicated component tests are added. */
        'src/components/member-profile/PhotoUploadDialog.tsx',
        'src/components/member-profile/ProfilePhotoUpload.tsx',
      ],
      thresholds: {
        /** Standard 8: track upward over time; entry files excluded above. */
        statements: 76,
        branches: 62,
        functions: 72,
        lines: 77,
      },
    },
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
    dedupe: ['react', 'react-dom', 'react-router-dom', 'react-hook-form'],
  },
});
