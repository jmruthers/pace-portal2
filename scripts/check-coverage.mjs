/* global console, process */
/**
 * Reads Istanbul `coverage/coverage-final.json`, applies `scripts/coverage-policy.json`,
 * and exits non-zero when Standard 8 group or critical-path thresholds fail.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COVERAGE_FILE = path.join(ROOT, 'coverage', 'coverage-final.json');
const POLICY_FILE = path.join(ROOT, 'scripts', 'coverage-policy.json');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** @param {string} relPath */
function matchesPrefix(relPath, prefix) {
  const norm = prefix.replace(/\/+$/, '');
  return relPath === norm || relPath.startsWith(`${norm}/`);
}

/** @param {string} relPath */
function classifyGroup(relPath, groups) {
  for (const g of groups) {
    for (const prefix of g.prefixes) {
      if (matchesPrefix(relPath, prefix)) return g.id;
    }
  }
  return null;
}

/**
 * @param {import('istanbul-lib-coverage').FileCoverage} data
 * @returns {{ stmtTotal: number, stmtCovered: number, lineTotal: number, lineCovered: number }}
 */
function metricsForFile(data) {
  const s = data.s || {};
  const statementMap = data.statementMap || {};
  const stmtTotal = Object.keys(s).length;
  const stmtCovered = Object.values(s).filter((v) => v > 0).length;

  const lineHits = new Map();
  for (const id of Object.keys(statementMap)) {
    const line = statementMap[id].start.line;
    const hit = (s[id] ?? 0) > 0;
    if (!lineHits.has(line)) lineHits.set(line, false);
    if (hit) lineHits.set(line, true);
  }
  const lineTotal = lineHits.size;
  const lineCovered = [...lineHits.values()].filter(Boolean).length;

  return { stmtTotal, stmtCovered, lineTotal, lineCovered };
}

function pct(covered, total) {
  if (total === 0) return 1;
  return covered / total;
}

function formatPct(x) {
  return `${(x * 100).toFixed(2)}%`;
}

/**
 * @param {Record<string, import('istanbul-lib-coverage').FileCoverage>} coverageMap
 */
function buildFileIndex(coverageMap) {
  /** @type {Map<string, { rel: string, abs: string, metrics: ReturnType<typeof metricsForFile> }>} */
  const byRel = new Map();
  for (const [abs, data] of Object.entries(coverageMap)) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    const metrics = metricsForFile(data);
    byRel.set(rel, { rel, abs, metrics });
  }
  return byRel;
}

function aggregateGroup(files) {
  let stmtCovered = 0;
  let stmtTotal = 0;
  let lineCovered = 0;
  let lineTotal = 0;
  for (const f of files) {
    stmtCovered += f.metrics.stmtCovered;
    stmtTotal += f.metrics.stmtTotal;
    lineCovered += f.metrics.lineCovered;
    lineTotal += f.metrics.lineTotal;
  }
  return {
    stmtCovered,
    stmtTotal,
    lineCovered,
    lineTotal,
    stmtPct: pct(stmtCovered, stmtTotal),
    linePct: pct(lineCovered, lineTotal),
  };
}

/** Lowest coverage files in a group (by line %, then statement %). */
function worstFiles(files, limit = 8) {
  const ranked = [...files]
    .map((f) => ({
      rel: f.rel,
      stmtPct: pct(f.metrics.stmtCovered, f.metrics.stmtTotal),
      linePct: pct(f.metrics.lineCovered, f.metrics.lineTotal),
    }))
    .sort((a, b) => a.linePct - b.linePct || a.stmtPct - b.stmtPct);
  return ranked.slice(0, limit);
}

function main() {
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error(`Coverage file missing: ${COVERAGE_FILE}\nRun npm run test:coverage:run first.`);
    process.exit(1);
  }

  const policy = loadJson(POLICY_FILE);
  const coverageMap = loadJson(COVERAGE_FILE);
  const index = buildFileIndex(coverageMap);

  /** @type {Map<string, typeof index extends Map<any, infer V> ? V[] : never>} */
  const groupFiles = new Map();
  for (const g of policy.groups) {
    groupFiles.set(g.id, []);
  }

  for (const [, entry] of index) {
    const gid = classifyGroup(entry.rel, policy.groups);
    if (gid && groupFiles.has(gid)) {
      groupFiles.get(gid).push(entry);
    }
  }

  let failed = false;
  const out = [];

  out.push('');
  out.push('Coverage policy (Standard 8)');
  out.push('─'.repeat(48));

  for (const g of policy.groups) {
    const files = groupFiles.get(g.id) || [];
    const agg = aggregateGroup(files);
    const stmtOk = agg.stmtPct + 1e-9 >= g.statements;
    const lineOk = agg.linePct + 1e-9 >= g.lines;
    const ok = stmtOk && lineOk;
    if (!ok) failed = true;

    out.push(
      `${ok ? '✓' : '✗'} ${g.label} (${g.id}): statements ${formatPct(agg.stmtPct)} (min ${formatPct(g.statements)}), lines ${formatPct(agg.linePct)} (min ${formatPct(g.lines)}) — ${files.length} files`
    );
    if (!ok) {
      out.push('  Worst files (by line %):');
      for (const w of worstFiles(files)) {
        out.push(`    - ${w.rel}  lines ${formatPct(w.linePct)}  stmts ${formatPct(w.stmtPct)}`);
      }
    }
  }

  out.push('─'.repeat(48));
  out.push('Critical paths (100% statements & lines)');
  out.push('─'.repeat(48));

  for (const cp of policy.criticalPaths) {
    const entry = index.get(cp.path);
    if (!entry) {
      failed = true;
      out.push(`✗ ${cp.path} — not found in coverage report (${cp.label})`);
      continue;
    }
    const { metrics: m } = entry;
    const stmtP = pct(m.stmtCovered, m.stmtTotal);
    const lineP = pct(m.lineCovered, m.lineTotal);
    const ok = (m.stmtTotal === 0 || stmtP >= 1 - 1e-9) && (m.lineTotal === 0 || lineP >= 1 - 1e-9);
    if (!ok) failed = true;
    out.push(
      `${ok ? '✓' : '✗'} ${cp.path} — stmts ${formatPct(stmtP)} lines ${formatPct(lineP)} — ${cp.label}`
    );
    if (!ok) {
      out.push(`    (${m.stmtCovered}/${m.stmtTotal} statements, ${m.lineCovered}/${m.lineTotal} lines)`);
    }
  }

  out.push('');
  console.log(out.join('\n'));

  if (failed) {
    console.error('\nCoverage policy check FAILED. Fix groups/critical paths above or add tests.\n');
    process.exit(1);
  }
  console.log('Coverage policy check passed.\n');
}

main();
