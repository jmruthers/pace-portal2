/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COVERAGE_ROOT = path.join(ROOT, 'coverage');

/** @param {string} dir */
function copyCoverageRunOutput(dir) {
  const finalSrc = path.join(dir, 'coverage-final.json');
  if (!fs.existsSync(finalSrc)) {
    console.error(`Coverage report missing: ${finalSrc}`);
    process.exit(1);
  }

  fs.mkdirSync(COVERAGE_ROOT, { recursive: true });
  fs.copyFileSync(finalSrc, path.join(COVERAGE_ROOT, 'coverage-final.json'));

  for (const entry of fs.readdirSync(dir)) {
    if (entry === 'coverage-final.json' || entry === '.tmp') {
      continue;
    }

    const from = path.join(dir, entry);
    const to = path.join(COVERAGE_ROOT, entry);
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(from, to, { recursive: true });
  }
}

export function finalizeCoverageOutput() {
  if (!fs.existsSync(COVERAGE_ROOT)) {
    console.error('Coverage directory was not created.');
    process.exit(1);
  }

  const runDirs = fs
    .readdirSync(COVERAGE_ROOT)
    .filter((name) => name.startsWith('.run-'))
    .map((name) => path.join(COVERAGE_ROOT, name))
    .filter((dir) => fs.existsSync(path.join(dir, 'coverage-final.json')))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (runDirs.length === 0) {
    console.error('No completed Vitest coverage run directory found under coverage/.run-*');
    process.exit(1);
  }

  copyCoverageRunOutput(runDirs[0]);

  for (const dir of runDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function cleanCoverageOutput() {
  fs.rmSync(COVERAGE_ROOT, { recursive: true, force: true });
}
