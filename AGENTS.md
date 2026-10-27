# AGENTS.md — MyHR Frontend (HR-only)

React dashboard for **MyHR**: auth, menu-driven sidebar, level permissions, and HR master data
(jobsites, levels, users, menus, enums, menu privilege, level permissions) plus role-based dashboards.
Pairs with `myhr-backend` (schema `hr`).

> Ticketing, Portal, Equipments, and the old enum-category pages were **removed**. Do not reintroduce them.
> This project is HR-only.

---

## Stack

- Vite + React 19 + TypeScript
- React Router 7
- Tailwind CSS 4 (TailAdmin UI primitives)
- API client: `src/lib/api.ts` (`fetch`, not axios)
- Env: `VITE_API_BASE_URL`, `VITE_APP_NAME` (see `.env.example`)

## Project layout

| Path | Role |
| --------------------------- | ---------------------------------------------------------- |
| `src/pages/Master/` | `MasterTablePage` — generic HR master table/CRUD |
| `src/pages/Dashboard/` | Home + role dashboards (`resolveDashboardRole`) |
| `src/pages/AuthPages/` | Sign-in |
| `src/pages/UserProfiles.tsx`| Signed-in user profile + change password |
| `src/components/ui/` | TailAdmin primitives (`Table`, `Modal`, `Button`, `Badge`) |
| `src/components/auth/` | `ProtectedRoute`, sign-in form |
| `src/components/UserProfile/` | Profile cards |
| `src/services/` | API wrappers only: `auth.ts`, `menus.ts`, `hrMaster.ts`, `dashboard.ts` |
| `src/types/auth.ts` | Auth + `MenuPermission` types |
| `src/context/` | `AuthContext`, `ThemeProvider`, `SidebarContext` |
| `src/hooks/` | `usePermission`, `useModal`, … |
| `src/layout/` | `AppLayout`, `AppSidebar`, `AppHeader` |
| `src/config/` | `env.ts`, `navMenus.ts` (sidebar tree + fallback) |
| `src/lib/api.ts` | Bearer `fetch` client + localStorage session (`myhr_auth`) |
| `src/utils/structure.ts` | Department/section helpers |

Template leftovers (`Calendar`, `Blank`, `Charts`, `UiElements`, `Forms`, `Tables`, `SignUp`) are TailAdmin demo
code and are **not routed**. Trim them when convenient; never ship them as product features.

## Routes (`src/App.tsx`)

| Path | Page |
| ---- | ---- |
| `/` | `Home` (role dashboard) — protected |
| `/master/level-permissions` | `LevelPermissionsPage` — matrix editor (superadmin save) |
| `/master/:resource` | `MasterTablePage` — protected (master data) |
| `/employees/:resource` | `MasterTablePage` — Employees SIS / LS (`sis`, `ls`; parent `hr_employees`) |
| `/reconciliation/:resource` | `MasterTablePage` — work-pattern / roster / sickness / permit / finger-error (parent `hr_reconciliation`) |
| `/section/:resource` | `MasterTablePage` — sickness, permit, fingerprint approval queues |
| `/group/:resource` | `MasterTablePage` — LS sickness and permit queues (`hr_sickness_group`, `hr_permit_group`) |
| `/department/:resource` | `MasterTablePage` — department sickness and permit queues (`hr_sickness_department`, `hr_permit_department`) |
| `/personalia/:resource` | `MasterTablePage` — personalia sickness, permit, fingerprint queues |
| `/profile` | `UserProfiles` — protected |
| `/signin` | `SignIn` — public |
| `*` | `NotFound` |

## Shared patterns

1. Pages stay thin; data access only via `src/services/*.ts` — never `fetch` from pages/components.
2. API response shape: `{ success, message, data?, meta?, error? }` (`ApiResponse<T>`); paged lists return `meta.total`.
3. Gate toolbar/row actions with `usePermission(menuCode)` — never invent a second RBAC model.
4. Superadmin (`level_code` in `superadmin|sa`) → all actions allowed on the UI;
 the backend remains the source of truth for menu access (only `superadmin`/`sa` bypass the matrix there).
 Never rely on a numeric `level_id`; use `level_code`.
5. Hide UI the user cannot perform; the API still enforces on the backend.
6. Reuse TailAdmin primitives in `components/ui/`. Do **not** introduce Ant Design / MUI.

```tsx
const { canRead, canInsert, canUpdate, canDelete } = usePermission("hr_users");

{canInsert && <Button onClick={openCreate}>Add</Button>}
```

---

## Framework core

Boot order after login:

1. Persist `{ token, user }` in localStorage (key `myhr_auth`, see `api.storageKey`)
2. `GET /auth/me` on bootstrap when a token exists
3. `GET /menus/permissions` → `AuthContext.permissions`
4. Render shell + routes gated by `ProtectedRoute` + `usePermission`

### Auth

| Piece | Path |
| ----- | ---- |
| Provider | `src/context/AuthContext.tsx` |
| Service | `src/services/auth.ts` (`login`, `me`, `logout`, `changePassword`) |
| Types | `src/types/auth.ts` |
| Guard | `src/components/auth/ProtectedRoute.tsx` |
| Sign-in | `src/pages/AuthPages/SignIn.tsx` + `components/auth/SignInForm.tsx` |

`ProtectedRoute` blocks unauthenticated users in production; in DEV it may render without a JWT
(aligns with backend `AUTH_DEV_BYPASS`).

### Menus + sidebar

- `AppSidebar` loads `GET /menus/navigation` and builds a tree with `buildNavItems()` (`config/navMenus.ts`, `parent_id` based, any depth).
- If the API returns nothing/fails, it falls back to `FALLBACK_NAV_MENUS` (keep it in sync with seeded `hr_*` menus).
- Menu identity is `menu_code`. HR menus use the `hr_` prefix.

**URL follows parent (required for new menus):** `menu_url` must mirror the sidebar parent so the path tells you the domain / where code lives.

| Parent `menu_code` | Parent URL | Child URL pattern | Route in `App.tsx` |
| ------------------ | ---------- | ----------------- | ------------------ |
| `hr_master` | `#` | `/master/<slug>` | `/master/:resource` |
| `hr_employees` | `#` | `/employees/<slug>` | `/employees/:resource` |
| `hr_reconciliation` | `#` | `/reconciliation/<slug>` | `/reconciliation/:resource` |
| future folder `hr_<domain>` | `#` | `/<domain>/<slug>` | add `/<domain>/:resource` (or dedicated page) |

- Folder parents use `menu_url = '#'` (expand only). Children never sit under `/master` unless the parent is Master Data.
- Keep `FALLBACK_NAV_MENUS` paths identical to seeded `hr.menus.menu_url`.
- When adding a child under a new parent, add the matching React route **before** shipping the menu row.
- Sidebar icons: `hr.menus.icon` is a key resolved by `config/sidebarIcons.tsx` (not free-form). Use distinct keys per menu; unknown keys fall back by `menu_code` then `grid`.

| `menu_code` | Path |
| ----------- | ---- |

| `menu_code` | Path |
| ----------- | ---- |
| `hr_dashboard` | `/` |
| `hr_master` | `#` (parent folder) |
| `hr_jobsites` | `/master/jobsites` |
| `hr_levels` | `/master/levels` |
| `hr_users` | `/master/users` |
| `hr_menus` | `/master/menus` |
| `hr_enums` | `/master/enums` |
| `hr_submissions` | `/master/submissions` |
| `hr_edit_policy` | `/master/edit-policy` |
| `hr_employees` | `#` (parent folder; children under `/employees/…`) |
| `hr_employees_sis` | `/employees/sis` |
| `hr_employees_ls` | `/employees/ls` |
| `hr_reconciliation` | `#` (parent folder; children under `/reconciliation/…`) |
| `hr_work_pattern` | `/reconciliation/work-pattern` |
| `hr_roster` | `/reconciliation/roster` |
| `hr_sickness` | `/reconciliation/sickness` |
| `hr_sickness_section` | `/section/sickness` |
| `hr_sickness_group` | `/group/sickness` |
| `hr_sickness_department` | `/department/sickness` |
| `hr_sickness_hr` | `/personalia/sickness` |
| `hr_permit` | `/reconciliation/permit` |
| `hr_permit_section` | `/section/permit` |
| `hr_permit_group` | `/group/permit` |
| `hr_permit_department` | `/department/permit` |
| `hr_permit_hr` | `/personalia/permit` |
| `hr_finger_error` | `/reconciliation/finger-error` |
| `hr_finger_error_section` | `/section/finger-error` |
| `hr_finger_error_group` | `/group/finger-error` |
| `hr_finger_error_department` | `/department/finger-error` |
| `hr_finger_error_hr` | `/personalia/finger-error` |
| `hr_menu_privilege` | `/master/menu-privilege` |
| `hr_level_permissions` | `/master/level-permissions` |
| `hr_profile` | `/profile` |

### Levels and dashboards

10 canonical levels (`hr.levels.code`). Differences that used to be separate levels are per-user attributes
on the session user: `worker_scope` (`sis|ls|all`) and `module` (`irel|meals|safety|attendance`).

| `level_code` | Dashboard (`pages/Dashboard/`) | Notes |
| ------------ | ------------------------------ | ----- |
| `superadmin` | `ManagementDashboard variant="superadmin"` | executive view + system panel |
| `management` | `ManagementDashboard` | PJO site, all departments (absorbs legacy `administrator`) |
| `department_head` | `DepartmentHeadDashboard` | structure-scoped |
| `section_head` | `SectionHeadDashboard` | structure-scoped |
| `group_leader` | `GroupLeaderDashboard` | structure-scoped |
| `admin_section` | `AdminSectionDashboard` | **real data**: attendance, pola kerja, employee unfit (legacy `admin`) |
| `hr_admin` | `HrAdminDashboard` | `worker_scope` sis / ls (absorbs `hr_admin_ls`) |
| `hr_administrator` | `HrAdministratorDashboard` | HR lead, `worker_scope` all |
| `module_admin` | `ModuleAdminDashboard` | widgets follow `user.module` (absorbs irel/meals/safety/attendance) |
| `employee` | `EmployeeDashboard` | self-service (legacy `user`) |
| anything else | `DefaultDashboard` | neutral fallback |

- Mapping lives in `resolveDashboardRole.ts` (`DASHBOARD_BY_LEVEL` + legacy aliases) and the registry in `Home.tsx`.
- Placeholder dashboards use `components/RoleDashboard.tsx`; their data is still sample data. Only
  `AdminSectionDashboard` reads `/api/dashboard/*` so far (jobsite 1; backend limits rows to the user's sections).
- Dashboard data pattern: `services/dashboard.ts` (typed API, accepts `AbortSignal`) → hook in `src/hooks/`
  (`useAdminSectionDashboard`, per-panel loading/error, aborts stale requests) → thin page + `components/DashboardPanel`
  (shared loading / error+retry / empty states). Filter options come from `useDashboardStructure` (mirrors the backend scope).
- Admin section panels (`pages/Dashboard/components/`): `AttendanceTable` (grouped by department, plan vs actual),
  `PolaKerjaBars` (coverage per section; "has pola kerja" = roster row on the 1st of the selected month, so it follows
  the month, not the day), `EmployeeUnfitTable` (stats, reason filter, search, sort, paging; pads itself with `p-5 md:p-6`
  because `DashboardPanel` body has no padding). Filter bar: Section is disabled until a Department is chosen; Date uses
  `components/form/CalendarDateField` (flatpickr, no manual typing). `scopeStructureOptions` uses assigned sections only.
- `utils/dateShift.ts` ports the legacy shift date (until 07:30 = previous day); never use `toISOString()` for dates.
- The users form (`/master/users`) shows `worker_scope` for `hr_admin|hr_administrator` and `module` for `module_admin`.

### Permissions (RBAC)

Flags (match backend `hr.level_permissions`): `can_read`, `can_insert`, `can_update`, `can_delete`, `can_export`, `can_import`, `can_approve`.

Resolution order (`AuthContext.can`): superadmin → allowed; else match `permissions` by `menu_code`;
missing entry → allow in DEV, deny in production.

### Master data pages (`/master/:resource`)

One generic page, driven by `RESOURCE_META` in `MasterTablePage.tsx` and `HrMasterResource` in `services/hrMaster.ts`.

| Resource | Backend | Mode |
| -------- | ------- | ---- |
| `sis` | `GET /hr/workers?source=sis` + detail + import/example/export (`/employees/sis`) | list of `hr.workers`; detail modal; Import INSERT-only (new NRP / PKWT); Export; Grade eye + export column via Edit Policy `workers_grade` |
| `ls` | `GET /hr/workers?source=vendor` + detail + import/export (`/employees/ls`) | list of `hr.workers_vendor` (+ vendor); same Import/Export/Grade rules |
| `jobsites` | `GET /hr/jobsites` | read-only |
| `levels` | `GET /hr/levels` | read-only |
| `users` | `/hr/users[/:id]` + reset-password | CRUD, paged, level/department/section filters |
| `menus` | `/hr/menus[/:id]` | CRUD, paged |
| `enums` | `GET /hr/enums`, `GET /hr/enums/types` | read-only, paged, search + **type filter** |
| `submissions` | `GET /hr/submissions` | read-only, paged, search; `hr_administrator` and superadmin |
| `work-pattern` | `/hr/work-pattern[/:id]` + lookup + import/example + export + generate | CRUD + mass upload + Excel export + generate roster, paged, month/dept/section/jabatan filters |
| `roster` | `/hr/roster[/:id]` + export + edit-policy | list + update Status Absen (`remark`) + Excel export; edit window from `hr.edit_policy` module `roster_kerja` |
| `sickness` | `/hr/sickness[/:id]` + lookup + multipart create + cancel; section/group/department/hr queues | CRUD pending rows + multi bukti upload; month/dept/section/jabatan/progress/status_worker filters; parent+child merge; evidence links from `evidence_paths`. `/section/sickness`, `/group/sickness`, and `/department/sickness` reuse this table (Detail / Setujui / Tolak only). `/personalia/sickness` exports the current filters to Excel (`GET /hr/sickness/hr/export`: sheet Ringkasan + Detail). The SIS/LS type filter shows only when the account already sees both groups. Department exceptions are edited on Edit Policy. Module shape to copy: `myhr-backend/docs/MODULE_PATTERN_SAKIT.md`. |
| `permit` | `/hr/permit[/:id]` + lookup + multipart create + cancel; same queues as sickness | Same flow as sickness under Permit menus (`hr_permit`, `hr_permit_section`, `hr_permit_group`, `hr_permit_department`, `hr_permit_hr`). Export: `GET /hr/permit/hr/export`. |
| `finger-error` | `/hr/finger-error[/:id]` + lookup + multipart create + cancel + import/example; section/group/department/hr queues | Fingerprint correction (date, finger_in/out, shift, remark, category `workers_fingerprint`). Approval same as sakit/ijin: Section (below SH), Group (LS), Department (high ranks + exceptions on Edit Policy), then HR. Bulk import: kategori + mode di modal. Menus: `hr_finger_error*` including `_group` / `_department`. Export: `GET /hr/finger-error/hr/export`. |
| `edit-policy` | `/hr/edit-policy[/:id]` + modules | CRUD multi-module (`hr.edit_policy`); module dropdown + **Tambah module** (no separate menu) |
| `menu-privilege` | `GET /hr/menu-privilege` | read-only |
| `level-permissions` | `GET/PUT /hr/level-permissions` | **matrix editor** (`LevelPermissionsPage`) |

**Level Permissions** (`/master/level-permissions`): pick a level, toggle `can_read` / insert / update / delete /
export / approve per `hr_*` menu (optional “Include legacy menus”). Save is **superadmin-only** (`PUT`); other roles
see the matrix read-only. Sidebar show/hide = `Menus.show_sidebar` **and** level `can_read` — not per username.

**Enums** page (`/master/enums`) lists everything in `hr.enums` and is the catalog of which enum types exist in the HR
system. The type dropdown is populated from `hrMasterService.listEnumTypes()` (`[{ type, total }]`).
Backend also exposes enum create/update/delete (`/hr/enums`), but the UI is read-only for now.

---

## Env checklist

| Variable | Purpose |
| -------- | ------- |
| `VITE_API_BASE_URL` | Backend API root (e.g. `http://localhost:9520/api`) |
| `VITE_APP_NAME` | Display name |

Never commit secrets.

---

## Adding an HR master / domain resource

1. Backend: table + `hr.<RESOURCE>_SP` + `hr.menus` row (`hr_<name>`) + `hr.level_permissions` (see backend `AGENTS.md`).
2. Set `menu_url` from the **parent** folder (see [URL follows parent](#menus--sidebar)); only Master Data children use `/master/<slug>`.
3. `services/hrMaster.ts`: add the resource to `HrMasterResource` (+ typed payload/helpers if it has CRUD).
4. `MasterTablePage.tsx`: add an entry in `RESOURCE_META`; add to `PAGED_RESOURCES` if the SP pages (`page`, `page_size`, `q`) and to `CRUD_RESOURCES` if editable.
5. `App.tsx`: ensure a route exists for that parent prefix (e.g. `/reconciliation/:resource`).
6. `config/navMenus.ts`: add the sidebar fallback entry with the same path.
7. Gate actions with `usePermission("hr_<name>")`.

---

## Do / Don't

- Do keep pages thin; API only in `services/`.
- Do gate actions with `usePermission(menuCode)` matching the backend `menu_code`.
- Do keep `FALLBACK_NAV_MENUS` aligned with seeded `hr_*` menus.
- Do set child `menu_url` under the parent path (`/<parent-slug>/<child-slug>`), not always `/master`.
- Do reuse TailAdmin primitives already in `components/ui/`.
- Don't call `fetch` from pages/components.
- Don't put domain features (reconciliation, etc.) under `/master` just because they reuse `MasterTablePage`.
- Don't add Ticketing / Portal / Equipment features back — this app is HR-only.
- Don't invent a second permission system.
- Don't commit `.env` secrets; keep the API base URL in env.
- Don't ship TailAdmin demo pages as product features.
