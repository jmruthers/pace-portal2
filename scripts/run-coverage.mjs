#!/usr/bin/env node
/* global console, process */
/**
 * Cleans coverage output, runs Vitest Istanbul coverage, then consolidates
 * the per-process reports directory into coverage/ for check-coverage.mjs.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { cleanCoverageOutput, finalizeCoverageOutput } from './finalize-coverage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] === 'full' ? 'full' : 'run';

/** @param {string} command @param {string[]} args */
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

cleanCoverageOutput();

run('npx', [
  'vitest',
  'run',
  '--coverage',
  '--coverage.provider=istanbul',
  '--testTimeout=10000',
]);

finalizeCoverageOutput();

if (mode === 'full') {
  run('node', ['scripts/check-coverage.mjs']);
}
