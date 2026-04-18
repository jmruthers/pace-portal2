import path from 'path';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

/** Extends Vite (aliases, plugins) with Vitest-only options. */
export default mergeConfig(
  viteConfig,
  defineConfig({
    // Linked `@solvera/pace-core` can resolve `react` from the monorepo copy; force one React for hooks.
    resolve: {
      alias: {
        react: path.resolve(process.cwd(), 'node_modules/react'),
        'react-dom': path.resolve(process.cwd(), 'node_modules/react-dom'),
        // pace-core workspace can resolve RHF from monorepo `node_modules`; pin to app copy so `react` matches.
        'react-hook-form': path.resolve(process.cwd(), 'node_modules/react-hook-form'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 10000,
      hookTimeout: 10000,
      teardownTimeout: 5000,
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          '**/*.test.{ts,tsx}',
          '**/*.integration.test.{ts,tsx}',
          '**/index.ts',
          'src/test/**',
          '**/dist/**',
          '**/node_modules/**',
          'src/main.tsx',
        ],
        // Raise over time toward Standard 8 (utils/hooks ≥90%, components ≥70%).
        thresholds: {
          lines: 0,
          statements: 0,
          functions: 0,
          branches: 0,
        },
      },
    },
  })
);
