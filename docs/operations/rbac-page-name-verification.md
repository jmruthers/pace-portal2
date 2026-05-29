# RBAC page name verification (pace-portal2)

Norm: lowercase **kebab-case** slugs in `rbac_app_pages.page_name`, UI `PagePermissionGuard` `pageName`, and file `pageContext`. See pace-core Standard 03 (Page key naming) and `pace-core2/docs/database/decisions/RBAC-page-name-rollout-checklist.md`.

Portal uses `APP_NAME = PACE` (`src/constants.ts`). Page keys are defined in `src/constants/rbacPageNames.ts`.

## Apply migrations (pace-core2)

On the target Supabase project, apply pace-core2 migrations through at least:

- `20260517120000_portal_batch01_rbac_membership_join.sql` (PORTAL-DB-001: `profile-complete`, `my-memberships`)
- `20260529121000_rbac_pace_medi_page_name_kebab.sql` (PACE PascalCase → kebab)
- `20260529122000_rbac_snake_case_page_name_kebab.sql` (snake_case → kebab where listed)

Deploy **database migrations before or with** the portal release when enabling fail-closed `PagePermissionGuard` on new catalogue rows.

## SQL verification

```sql
-- Must return 0
SELECT COUNT(*) FROM rbac_app_pages WHERE page_name ~ '[A-Z]' OR page_name ~ '_';

-- PACE catalogue (portal + admin pages)
SELECT page_name FROM rbac_app_pages ap
JOIN rbac_apps a ON a.id = ap.app_id
WHERE a.name = 'PACE'
ORDER BY 1;
```

## Expected portal page keys (minimum)

These must exist in `rbac_app_pages` for `PACE` and match app code:

| Route / surface | `page_name` |
| --- | --- |
| `/`, `/dashboard` | `dashboard` |
| `/profile-complete` | `profile-complete` |
| `/member-profile`, `/profile/view/:id`, `/profile/edit/:id` | `member-profile` |
| `/medical-profile` | `medical-profile` |
| `/additional-contacts` | `additional-contacts` |
| `/my-memberships` | `my-memberships` |
| Event/org workflow (interim) | `dashboard` |
| Profile photo upload | `member-profile` |
| Medical action-plan upload | `medical-profile` |

Other PACE rows (e.g. `calendar`, `events`, `form-fields`) are admin-app surfaces, not portal routes.

## Local checks

```bash
npm run validate:portal
```

(`validate:portal` runs pace-core `validate` plus `check:rbac-page-names`.)

From pace-core2 root (platform migrations + core src):

```bash
npm run check:rbac-page-names
npm run check:rbac-parity
```
