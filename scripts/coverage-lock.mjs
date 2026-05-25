/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCK_FILE = path.join(ROOT, '.coverage-run.lock');

/** @param {number} pid */
function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockPid() {
  if (!fs.existsSync(LOCK_FILE)) return null;
  const pid = Number(fs.readFileSync(LOCK_FILE, 'utf8').trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

export function acquireCoverageLock() {
  const existingPid = readLockPid();
  if (existingPid && existingPid !== process.pid && isProcessAlive(existingPid)) {
    console.error(
      [
        `Another Vitest coverage run is in progress (pid ${existingPid}).`,
        'Wait for it to finish before starting coverage again.',
        `If that process is gone, delete ${path.relative(ROOT, LOCK_FILE)} and retry.`,
      ].join('\n')
    );
    process.exit(1);
  }

  if (existingPid && existingPid !== process.pid) {
    fs.unlinkSync(LOCK_FILE);
  }

  fs.writeFileSync(LOCK_FILE, String(process.pid));
}

export function releaseCoverageLock() {
  if (!fs.existsSync(LOCK_FILE) || readLockPid() !== process.pid) {
    return;
  }

  fs.unlinkSync(LOCK_FILE);
}

export function registerCoverageLockRelease() {
  process.on('exit', releaseCoverageLock);
  process.on('SIGINT', () => {
    releaseCoverageLock();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    releaseCoverageLock();
    process.exit(143);
  });
}
