import type { AuthUser } from "../../types/auth";

/**
 * One dashboard per canonical level (`hr.levels.code`).
 * `unknown` is the neutral fallback for codes that are not mapped.
 */
export type DashboardRole =
  | "superadmin"
  | "management"
  | "department_head"
  | "section_head"
  | "group_leader"
  | "admin_section"
  | "hr_admin"
  | "hr_administrator"
  | "module_admin"
  | "employee"
  | "unknown";

/** Canonical level codes -> dashboard (single source of truth). */
export const DASHBOARD_BY_LEVEL: Record<string, DashboardRole> = {
  superadmin: "superadmin",
  management: "management",
  department_head: "department_head",
  section_head: "section_head",
  group_leader: "group_leader",
  admin_section: "admin_section",
  hr_admin: "hr_admin",
  hr_administrator: "hr_administrator",
  module_admin: "module_admin",
  employee: "employee",
};

/**
 * Legacy `users.level` / retired level codes -> canonical dashboard.
 * Mirrors the backend `hr.level_legacy_map` (27_levels_consolidate.sql).
 */
const LEGACY_LEVEL_ALIASES: Record<string, DashboardRole> = {
  sa: "superadmin",
  administrator: "management",
  admin: "admin_section",
  user: "employee",
  admin_hr: "hr_admin",
  "admin_hr(ls)": "hr_admin",
  hr_admin_ls: "hr_admin",
  administrator_hr: "hr_administrator",
  irel: "module_admin",
  admin_irel: "module_admin",
  meals: "module_admin",
  admin_meals: "module_admin",
  safety: "module_admin",
  admin_safety: "module_admin",
  attendance: "module_admin",
  finger: "module_admin",
  finger_check: "module_admin",
};

export const DASHBOARD_LABELS: Record<DashboardRole, string> = {
  superadmin: "Super Admin",
  management: "Management",
  department_head: "Department Head",
  section_head: "Section Head",
  group_leader: "Group Leader",
  admin_section: "Admin Section",
  hr_admin: "HR Admin",
  hr_administrator: "HR Administrator",
  module_admin: "Module Admin",
  employee: "Employee",
  unknown: "MyHR",
};

/**
 * Resolve the dashboard from the session user.
 * Prefers `level_code` (canonical), falls back to the legacy `level` string.
 * The backend `dashboard` path and `level_id` are intentionally not used.
 */
export function resolveDashboardRole(
  user: AuthUser | null | undefined,
): DashboardRole {
  const candidates = [user?.level_code, user?.level];

  for (const candidate of candidates) {
    const raw = String(candidate ?? "")
      .trim()
      .toLowerCase();
    if (!raw) continue;

    const role = DASHBOARD_BY_LEVEL[raw] ?? LEGACY_LEVEL_ALIASES[raw];
    if (role) return role;
  }

  return "unknown";
}
