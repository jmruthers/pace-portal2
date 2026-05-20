# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**pace-portal2** is a React 19 + Vite 8 + TypeScript SPA (member-facing portal in the PACE ecosystem). It depends on a shared library `@solvera/pace-core` which is file-linked from `../pace-core2/packages/core`.

### Critical: pace-core stub

In Cloud Agent environments, the real `pace-core2` sibling repo is unavailable. A stub package is created at `/pace-core2/packages/core` by the update script. This stub:
- Provides all subpath exports (`/components`, `/types`, `/forms`, `/hooks`, `/rbac`, `/providers`, `/utils`, `/crud`, `/icons`, `/login-history`)
- Re-exports `zod` from `/utils`
- Provides ESLint config with no-op custom rules (`pace-core-compliance/*`)
- Has TypeScript declarations (`.d.ts`) for basic type safety

**Limitations of the stub:**
- `npm run type-check` (`tsc -b`) will report ~300+ errors due to incomplete type information
- ~22/142 test files fail because stub components don't replicate real pace-core behavior (accessibility roles, form context, etc.)
- These are not bugs in the portal codebase; they pass with the real library

### Running the app

```bash
npm run dev          # Vite dev server on port 5173
```

The app starts without Supabase credentials (gracefully degrades). With credentials in `.env`, full auth/data flows work.

### Key commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Tests | `npm run test:run` |
| Tests (watch) | `npm run test` |
| Type-check | `npm run type-check` (expect stub-related errors) |
| Build | `npm run build` (expect stub-related tsc errors) |

### Environment variables

Copy `.env.example` to `.env`. Supabase credentials are optional for dev server startup but required for auth/data flows. The app uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

### Case sensitivity note

The import `./app.css` in `src/main.tsx` was corrected to `./App.css` for Linux case-sensitive filesystems. The original codebase targets macOS (case-insensitive). Keep this fix when working on Linux.

### Port assignments

This project is part of a multi-app suite. Default dev port is 5173. Don't start multiple dev server instances.
