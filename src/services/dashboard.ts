import { api } from "../lib/api";

export type ShiftFilter = "all" | "day" | "night";

export type DashboardMeta = {
  total?: number;
  date?: string;
  month?: string;
  shift?: ShiftFilter;
  /** true when the API limited rows to the user's own sections. */
  scoped?: boolean;
  scope_sections?: number | null;
};

type DashboardResponse<T> = {
  success: boolean;
  message: string;
  data?: T[];
  meta?: DashboardMeta;
  error?: string;
};

export type AttendanceRow = {
  id: number;
  department_id: string | null;
  by_order: number | null;
  date: string;
  department: string;
  section: string;
  plan_day: number;
  actual_day: number;
  plan_night: number;
  actual_night: number;
  plan_off: number;
  actual_off: number;
  plan_cuti: number;
  actual_cuti: number;
  plan_sakit: number;
  actual_sakit: number;
  plan_izin: number;
  actual_izin: number;
  plan_alpha: number;
  actual_alpha_day: number;
  actual_alpha_night: number;
  /** Alpha for the whole day (all shifts). */
  actual_alpha: number;
  plan_lain_lain: number;
  actual_lain_lain: number;
  total_pola_kerja: number;
};

export type WorkPatternRow = {
  id: number;
  department: string;
  section: string;
  total_worker: number;
  total_pola_kerja: number;
  /** Percentage 0–100 (one decimal). */
  achievement: number;
};

export type EmployeeUnfitRow = {
  nrp: string;
  full_name: string;
  section: number | string | null;
  department: number | string | null;
  section_name: string | null;
  department_name: string | null;
  reason: string | null;
  start_date: string | null;
  total_hari: number | null;
};

export type DashboardFilters = {
  /** Single id or CSV; empty = all. */
  department?: string;
  section?: string;
};

type RequestExtras = { signal?: AbortSignal };

function query(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "",
  ) as [string, string][];
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : "";
}

export const dashboardService = {
  attendance: (
    params: DashboardFilters & { date?: string; shift?: ShiftFilter },
    extras: RequestExtras = {},
  ) =>
    api.get<DashboardResponse<AttendanceRow>>(
      `/dashboard/attendance${query({
        date: params.date,
        shift: params.shift,
        department: params.department,
        section: params.section,
      })}`,
      { signal: extras.signal },
    ),

  workPattern: (
    params: DashboardFilters & { month?: string },
    extras: RequestExtras = {},
  ) =>
    api.get<DashboardResponse<WorkPatternRow>>(
      `/dashboard/work-pattern${query({
        month: params.month,
        department: params.department,
        section: params.section,
      })}`,
      { signal: extras.signal },
    ),

  employeeUnfit: (params: DashboardFilters, extras: RequestExtras = {}) =>
    api.get<DashboardResponse<EmployeeUnfitRow>>(
      `/dashboard/employee-unfit${query({
        department: params.department,
        section: params.section,
      })}`,
      { signal: extras.signal },
    ),
};
