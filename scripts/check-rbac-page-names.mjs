/**
 * Offline guard: pace-portal PagePermissionGuard / file pageContext slugs are kebab-case.
 * See pace-core2/docs/database/decisions/RBAC-page-name-rollout-checklist.md
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const srcDir = resolve(repoRoot, 'src');

const KEBAB_PAGE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function walk(dir, exts, files = []) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return files;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(full, exts, files);
    } else if (exts.some((e) => name.endsWith(e))) {
      files.push(full);
    }
  }
  return files;
}

function checkPortalSource() {
  const errors = [];
  const files = walk(srcDir, ['.ts', '.tsx']);
  const patterns = [
    { re: /pageName\s*=\s*["']([^"']+)["']/g, label: 'pageName=' },
    { re: /pageName:\s*["']([^"']+)["']/g, label: 'pageName:' },
    { re: /pageContext[=:]\s*["']([^"']+)["']/g, label: 'pageContext' },
    { re: /PAGE_CONTEXT\s*=\s*["']([^"']+)["']/g, label: 'PAGE_CONTEXT' },
  ];

  for (const file of files) {
    const rel = file.replace(repoRoot + '/', '');
    const text = readFileSync(file, 'utf8');
    for (const { re, label } of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        const slug = m[1];
        if (!KEBAB_PAGE_RE.test(slug)) {
          errors.push(`${rel}: ${label} '${slug}' is not kebab-case`);
        }
      }
    }
  }
  return errors;
}

function main() {
  const errors = checkPortalSource();
  if (errors.length > 0) {
    console.error('RBAC page name drift check failed:\n');
    for (const line of errors) {
      console.error(`  - ${line}`);
    }
    process.exit(1);
  }
  console.log('RBAC page name drift check passed (pace-portal src).');
}

main();
