import { api } from "../lib/api";
import type { ApiResponse } from "../types/auth";

export type HrMasterResource =
  | "jobsites"
  | "levels"
  | "users"
  | "menus"
  | "enums"
  | "work-pattern"
  | "roster"
  | "sickness"
  | "permit"
  | "finger-error"
  | "edit-policy"
  | "menu-privilege"
  | "level-permissions"
  | "submissions"
  /** Employees SIS (`/employees/sis`) — lists hr.workers via GET /hr/workers?source=sis */
  | "sis"
  /** Employees LS (`/employees/ls`) — lists hr.workers_vendor via GET /hr/workers?source=vendor */
  | "ls";

export type HrEditPolicyPayload = {
  module_code: string;
  level_code: string;
  can_edit: boolean;
  past_days: number;
  allow_past: boolean;
  description?: string | null;
};

export type HrEditPolicyModule = {
  id?: number;
  module_code: string;
  module_name: string;
  description?: string | null;
  sort_order?: number;
};

export type HrUserPayload = {
  username?: string;
  password?: string;
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  section?: string | null;
  description?: string | null;
  level?: string | null;
  level_id?: number | null;
  /** sis | ls | all (hr_admin / hr_administrator); "" clears. */
  worker_scope?: string | null;
  /** irel | meals | safety | attendance (module_admin); "" clears. */
  module?: string | null;
  privilege_menu?: string | null;
  is_active?: boolean | number;
};

export type HrMenuPayload = {
  menu_code?: string;
  menu_name?: string;
  menu_url?: string | null;
  icon?: string | null;
  menu_type?: string | null;
  parent_id?: number | null;
  sort_order?: number | null;
  show_sidebar?: boolean | number;
  is_active?: boolean | number;
  description?: string | null;
};

export type HrWorkPatternPayload = {
  nrp: string;
  date: string;
  pola_kerja: string;
  masa_onsite?: string | number;
  cuti_lapangan?: string | number;
  pola_cuti?: string;
  hari_ke: number;
  remark?: string | null;
  pola_hari?: string | null;
};

export type HrWorkPatternWorkerLookup = {
  nrp: string;
  full_name: string;
  jabatan?: string;
  department?: number | null;
  department_name?: string;
  section?: number | null;
  section_name?: string;
};

export type HrActiveSubmission = {
  id: number;
  start_date: string | null;
  end_date: string | null;
  progress: string;
  entered_by: string | null;
  kind?: string;
};

export type HrSicknessPayload = {
  nrp: string;
  full_name?: string | null;
  date_issue: string;
  category: "inpatient" | "outpatient" | "pasca" | string;
  name_doctor: string;
  name_agency: string;
  diagnosa: string;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
};

export type HrSicknessWorkerLookup = HrWorkPatternWorkerLookup & {
  active_submissions?: HrActiveSubmission[];
  active_submissions_total?: number;
};

export type HrPermitPayload = {
  nrp: string;
  full_name?: string | null;
  category: string;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
};

export type HrPermitWorkerLookup = HrSicknessWorkerLookup;

export type HrFingerErrorPayload = {
  nrp: string;
  full_name?: string | null;
  category: string;
  date: string;
  finger_in?: string | null;
  finger_out?: string | null;
  shift?: string | null;
  remark?: string | null;
  location?: string | null;
  description?: string | null;
  note?: string | null;
};

export type HrFingerErrorWorkerLookup = HrWorkPatternWorkerLookup;

export type LevelPermissionFlag =
  | "can_read"
  | "can_insert"
  | "can_update"
  | "can_delete"
  | "can_export"
  | "can_approve";

export type LevelPermissionRow = {
  id?: number | null;
  by_jobsite?: number;
  level_id: number;
  level_code?: string;
  level_name?: string;
  menu_id: number;
  menu_code: string;
  menu_name: string;
  menu_url?: string | null;
  parent_id?: number | null;
  parent_name?: string | null;
  sort_order?: number;
  show_sidebar?: boolean | number;
  is_active?: boolean | number;
  audience?: string | null;
  can_read: boolean | number;
  can_insert: boolean | number;
  can_update: boolean | number;
  can_delete: boolean | number;
  can_export: boolean | number;
  can_approve: boolean | number;
};

export type LevelPermissionSavePayload = {
  level_id: number;
  rows: Array<{
    id?: number | null;
    menu_id: number;
    can_read: boolean;
    can_insert: boolean;
    can_update: boolean;
    can_delete: boolean;
    can_export: boolean;
    can_approve: boolean;
    audience?: string | null;
  }>;
};

export const hrMasterService = {
  list: (resource: HrMasterResource, params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    // Employees menus use short route slugs; API lives at /hr/workers?source=
    if (resource === "sis" || resource === "ls") {
      const source = resource === "sis" ? "sis" : "vendor";
      const withSource = { ...(cleaned ?? {}), source };
      const workersQs = `?${new URLSearchParams(
        Object.entries(withSource).map(([k, v]) => [k, String(v)]),
      ).toString()}`;
      return api.get<ApiResponse<Record<string, unknown>[]>>(
        `/hr/workers${workersQs}`,
      );
    }
    return api.get<ApiResponse<Record<string, unknown>[]>>(`/hr/${resource}${qs}`);
  },

  /** Paged employee master (SIS = workers, LS = workers_vendor). */
  listWorkers: (
    source: "sis" | "vendor" | "ls",
    params?: Record<string, string | number>,
  ) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : {};
    const qs = `?${new URLSearchParams(
      Object.entries({ ...cleaned, source }).map(([k, v]) => [k, String(v)]),
    ).toString()}`;
    return api.get<ApiResponse<Record<string, unknown>[]>>(`/hr/workers${qs}`);
  },

  /** Full employee master row (joined names). source: sis | vendor | ls */
  getWorker: (id: string | number, source: "sis" | "vendor" | "ls") => {
    const qs = `?source=${encodeURIComponent(source)}`;
    return api.get<ApiResponse<Record<string, unknown>>>(
      `/hr/workers/${id}${qs}`,
    );
  },

  importWorkers: (source: "sis" | "ls", file: File) => {
    const body = new FormData();
    body.append("file", file);
    const qs = `?source=${encodeURIComponent(source)}`;
    return api.post<
      ApiResponse<{
        inserted: number;
        skipped: number;
        total: number;
        errors: Array<{ row: number; nrp?: string | null; reason: string }>;
      }>
    >(`/hr/workers/import${qs}`, body);
  },

  downloadWorkersExample: async (source: "sis" | "ls") => {
    const qs = `?source=${encodeURIComponent(source)}`;
    const { blob, filename } = await api.downloadGet(`/hr/workers/example${qs}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      filename ||
      (source === "sis"
        ? "example_employees_sis.xlsx"
        : "example_employees_ls.xlsx");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  exportWorkers: async (
    source: "sis" | "ls",
    params?: {
      department?: string;
      section?: string;
      job_rank?: string;
      status_mode?: string;
      vendor?: string;
      lokasi_kerja?: string;
      q?: string;
    },
  ) => {
    const cleaned: Record<string, string> = { source };
    if (params?.department) cleaned.department = params.department;
    if (params?.section) cleaned.section = params.section;
    if (params?.job_rank) cleaned.job_rank = params.job_rank;
    if (params?.status_mode) cleaned.status_mode = params.status_mode;
    if (params?.vendor) cleaned.vendor = params.vendor;
    if (params?.lokasi_kerja) cleaned.lokasi_kerja = params.lokasi_kerja;
    if (params?.q) cleaned.q = params.q;
    const qs = `?${new URLSearchParams(cleaned).toString()}`;
    const { blob, filename } = await api.downloadGet(`/hr/workers/export${qs}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      filename ||
      (source === "sis" ? "employees_sis.xlsx" : "employees_ls.xlsx");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  listStructure: (params?: { type?: string; ref_id?: string | number }) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(`/hr/structure${qs}`);
  },

  /** Distinct enum types in hr.enums with row counts. */
  listEnumTypes: () =>
    api.get<ApiResponse<{ type: string; total: number }[]>>("/hr/enums/types"),

  getUser: (id: number | string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`/hr/users/${id}`),

  createUser: (payload: HrUserPayload) =>
    api.post<ApiResponse<{ id: number }>>("/hr/users", payload),

  updateUser: (id: number | string, payload: HrUserPayload) =>
    api.put<ApiResponse<null>>(`/hr/users/${id}`, payload),

  deleteUser: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/hr/users/${id}`),

  /** Admin reset: password becomes bcrypt(username). */
  resetUserPassword: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/users/${id}/reset-password`),

  getMenu: (id: number | string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`/hr/menus/${id}`),

  createMenu: (payload: HrMenuPayload) =>
    api.post<ApiResponse<{ id: number }>>("/hr/menus", payload),

  updateMenu: (id: number | string, payload: HrMenuPayload) =>
    api.put<ApiResponse<null>>(`/hr/menus/${id}`, payload),

  deleteMenu: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/hr/menus/${id}`),

  lookupWorkPatternWorker: (nrp: string) =>
    api.get<ApiResponse<HrWorkPatternWorkerLookup>>(
      `/hr/work-pattern/lookup?nrp=${encodeURIComponent(nrp)}`,
    ),

  getWorkPattern: (id: number | string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`/hr/work-pattern/${id}`),

  createWorkPattern: (payload: HrWorkPatternPayload) =>
    api.post<ApiResponse<{ id: number }>>("/hr/work-pattern", payload),

  updateWorkPattern: (id: number | string, payload: HrWorkPatternPayload) =>
    api.put<ApiResponse<null>>(`/hr/work-pattern/${id}`, payload),

  deleteWorkPattern: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/hr/work-pattern/${id}`),

  importWorkPattern: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return api.post<
      ApiResponse<{
        inserted: number;
        skipped: number;
        total: number;
        errors: Array<{ row: number; nrp?: string | null; reason: string }>;
      }>
    >("/hr/work-pattern/import", body);
  },

  downloadWorkPatternExample: async () => {
    const { blob, filename } = await api.downloadGet("/hr/work-pattern/example");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "example_work_pattern.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  exportWorkPattern: async (params?: {
    month?: string;
    department?: string;
    section?: string;
    job_rank?: string;
    q?: string;
  }) => {
    const cleaned: Record<string, string> = {};
    if (params?.month) cleaned.month = params.month;
    if (params?.department) cleaned.department = params.department;
    if (params?.section) cleaned.section = params.section;
    if (params?.job_rank) cleaned.job_rank = params.job_rank;
    if (params?.q) cleaned.q = params.q;
    const qs =
      Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(cleaned).toString()}`
        : "";
    const { blob, filename } = await api.downloadGet(`/hr/work-pattern/export${qs}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `work_pattern_${params?.month || "export"}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  previewGenerateWorkPattern: (params: { month: string; nrp?: string }) => {
    const cleaned: Record<string, string> = { month: params.month };
    if (params.nrp) cleaned.nrp = params.nrp;
    const qs = `?${new URLSearchParams(cleaned).toString()}`;
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/work-pattern/generate-preview${qs}`,
    );
  },

  generateWorkPattern: (payload: { month: string; nrp?: string }) =>
    api.post<
      ApiResponse<{ workers: number; days_upserted: number; month: string }>
    >("/hr/work-pattern/generate", payload),

  getRoster: (id: number | string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`/hr/roster/${id}`),

  getSickness: (id: number | string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`/hr/sickness/${id}`),

  listSicknessSection: (params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/sickness/section${qs}`,
    );
  },

  approveSicknessSection: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/sickness/${id}/approve-section`),

  rejectSicknessSection: (id: number | string, note?: string) =>
    api.post<ApiResponse<null>>(`/hr/sickness/${id}/reject-section`, {
      note: note ?? null,
    }),

  listSicknessGroup: (params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/sickness/group${qs}`,
    );
  },

  approveSicknessGroup: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/sickness/${id}/approve-group`),

  rejectSicknessGroup: (id: number | string, note?: string) =>
    api.post<ApiResponse<null>>(`/hr/sickness/${id}/reject-group`, {
      note: note ?? null,
    }),

  listSicknessDepartment: (params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/sickness/department${qs}`,
    );
  },

  approveSicknessDepartment: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/sickness/${id}/approve-department`),

  rejectSicknessDepartment: (id: number | string, note?: string) =>
    api.post<ApiResponse<null>>(`/hr/sickness/${id}/reject-department`, {
      note: note ?? null,
    }),

  exportSicknessHr: async (params?: {
    month?: string;
    department?: string;
    section?: string;
    job_rank?: string;
    progress?: string;
    status_worker?: string;
    q?: string;
  }) => {
    const cleaned: Record<string, string> = {};
    if (params?.month) cleaned.month = params.month;
    if (params?.department) cleaned.department = params.department;
    if (params?.section) cleaned.section = params.section;
    if (params?.job_rank) cleaned.job_rank = params.job_rank;
    if (params?.progress) cleaned.progress = params.progress;
    if (params?.status_worker) cleaned.status_worker = params.status_worker;
    if (params?.q) cleaned.q = params.q;
    const qs =
      Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(cleaned).toString()}`
        : "";
    const { blob, filename } = await api.downloadGet(`/hr/sickness/hr/export${qs}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `sickness_personalia_${params?.month || "export"}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  listSicknessHr: (params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/sickness/hr${qs}`,
    );
  },

  approveSicknessHr: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/sickness/${id}/approve-hr`),

  rejectSicknessHr: (id: number | string, note?: string) =>
    api.post<ApiResponse<null>>(`/hr/sickness/${id}/reject-hr`, {
      note: note ?? null,
    }),

  listSicknessDepartmentExceptions: () =>
    api.get<
      ApiResponse<
        {
          id: number;
          section_id: number;
          section_name: string | null;
          job_rank: number;
          job_rank_name: string | null;
        }[]
      >
    >("/hr/sickness/department-exceptions"),

  createSicknessDepartmentException: (payload: {
    section_id: number;
    job_rank: number;
  }) =>
    api.post<ApiResponse<{ id: number }>>(
      "/hr/sickness/department-exceptions",
      payload,
    ),

  deleteSicknessDepartmentException: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/hr/sickness/department-exceptions/${id}`),

  lookupSicknessWorker: (nrp: string) =>
    api.get<ApiResponse<HrSicknessWorkerLookup>>(
      `/hr/sickness/lookup?nrp=${encodeURIComponent(nrp)}`,
    ),

  createSickness: (payload: HrSicknessPayload, files?: File[]) => {
    const body = new FormData();
    body.append("nrp", payload.nrp);
    if (payload.full_name) body.append("full_name", payload.full_name);
    body.append("date_issue", payload.date_issue);
    body.append("category", payload.category);
    body.append("name_doctor", payload.name_doctor);
    body.append("name_agency", payload.name_agency);
    body.append("diagnosa", payload.diagnosa);
    body.append("start_date", payload.start_date);
    if (payload.end_date) body.append("end_date", payload.end_date);
    if (payload.description) body.append("description", payload.description);
    for (const file of files ?? []) {
      body.append("files", file);
    }
    return api.post<ApiResponse<{ id: number; evidence_count?: number }>>(
      "/hr/sickness",
      body,
    );
  },

  updateSickness: (id: number | string, payload: HrSicknessPayload) =>
    api.put<ApiResponse<null>>(`/hr/sickness/${id}`, payload),

  cancelSickness: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/sickness/${id}/cancel`),

  openSicknessEvidence: async (relativePath: string) => {
    const qs = `?path=${encodeURIComponent(relativePath)}`;
    const { blob } = await api.downloadGet(`/hr/sickness/evidence${qs}`);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  getPermit: (id: number | string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`/hr/permit/${id}`),

  listPermitSection: (params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/permit/section${qs}`,
    );
  },

  approvePermitSection: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/permit/${id}/approve-section`),

  rejectPermitSection: (id: number | string, note?: string) =>
    api.post<ApiResponse<null>>(`/hr/permit/${id}/reject-section`, {
      note: note ?? null,
    }),

  listPermitGroup: (params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/permit/group${qs}`,
    );
  },

  approvePermitGroup: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/permit/${id}/approve-group`),

  rejectPermitGroup: (id: number | string, note?: string) =>
    api.post<ApiResponse<null>>(`/hr/permit/${id}/reject-group`, {
      note: note ?? null,
    }),

  listPermitDepartment: (params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/permit/department${qs}`,
    );
  },

  approvePermitDepartment: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/permit/${id}/approve-department`),

  rejectPermitDepartment: (id: number | string, note?: string) =>
    api.post<ApiResponse<null>>(`/hr/permit/${id}/reject-department`, {
      note: note ?? null,
    }),

  exportPermitHr: async (params?: {
    month?: string;
    department?: string;
    section?: string;
    job_rank?: string;
    progress?: string;
    status_worker?: string;
    q?: string;
  }) => {
    const cleaned: Record<string, string> = {};
    if (params?.month) cleaned.month = params.month;
    if (params?.department) cleaned.department = params.department;
    if (params?.section) cleaned.section = params.section;
    if (params?.job_rank) cleaned.job_rank = params.job_rank;
    if (params?.progress) cleaned.progress = params.progress;
    if (params?.status_worker) cleaned.status_worker = params.status_worker;
    if (params?.q) cleaned.q = params.q;
    const qs =
      Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(cleaned).toString()}`
        : "";
    const { blob, filename } = await api.downloadGet(`/hr/permit/hr/export${qs}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `permit_personalia_${params?.month || "export"}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  listPermitHr: (params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/permit/hr${qs}`,
    );
  },

  approvePermitHr: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/permit/${id}/approve-hr`),

  rejectPermitHr: (id: number | string, note?: string) =>
    api.post<ApiResponse<null>>(`/hr/permit/${id}/reject-hr`, {
      note: note ?? null,
    }),

  listPermitDepartmentExceptions: () =>
    api.get<
      ApiResponse<
        {
          id: number;
          section_id: number;
          section_name: string | null;
          job_rank: number;
          job_rank_name: string | null;
        }[]
      >
    >("/hr/permit/department-exceptions"),

  createPermitDepartmentException: (payload: {
    section_id: number;
    job_rank: number;
  }) =>
    api.post<ApiResponse<{ id: number }>>(
      "/hr/permit/department-exceptions",
      payload,
    ),

  deletePermitDepartmentException: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/hr/permit/department-exceptions/${id}`),

  lookupPermitWorker: (nrp: string) =>
    api.get<ApiResponse<HrPermitWorkerLookup>>(
      `/hr/permit/lookup?nrp=${encodeURIComponent(nrp)}`,
    ),

  createPermit: (payload: HrPermitPayload, files?: File[]) => {
    const body = new FormData();
    body.append("nrp", payload.nrp);
    if (payload.full_name) body.append("full_name", payload.full_name);
    body.append("category", payload.category);
    body.append("start_date", payload.start_date);
    if (payload.end_date) body.append("end_date", payload.end_date);
    if (payload.description) body.append("description", payload.description);
    for (const file of files ?? []) {
      body.append("files", file);
    }
    return api.post<ApiResponse<{ id: number; evidence_count?: number }>>(
      "/hr/permit",
      body,
    );
  },

  updatePermit: (id: number | string, payload: HrPermitPayload) =>
    api.put<ApiResponse<null>>(`/hr/permit/${id}`, payload),

  cancelPermit: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/permit/${id}/cancel`),

  openPermitEvidence: async (relativePath: string) => {
    const qs = `?path=${encodeURIComponent(relativePath)}`;
    const { blob } = await api.downloadGet(`/hr/permit/evidence${qs}`);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  getFingerError: (id: number | string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`/hr/finger-error/${id}`),

  listFingerErrorSection: (params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/finger-error/section${qs}`,
    );
  },

  approveFingerErrorSection: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/finger-error/${id}/approve-section`),

  rejectFingerErrorSection: (id: number | string, note?: string) =>
    api.post<ApiResponse<null>>(`/hr/finger-error/${id}/reject-section`, {
      note: note ?? null,
    }),

  listFingerErrorGroup: (params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/finger-error/group${qs}`,
    );
  },

  approveFingerErrorGroup: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/finger-error/${id}/approve-group`),

  rejectFingerErrorGroup: (id: number | string, note?: string) =>
    api.post<ApiResponse<null>>(`/hr/finger-error/${id}/reject-group`, {
      note: note ?? null,
    }),

  listFingerErrorDepartment: (params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/finger-error/department${qs}`,
    );
  },

  approveFingerErrorDepartment: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/finger-error/${id}/approve-department`),

  rejectFingerErrorDepartment: (id: number | string, note?: string) =>
    api.post<ApiResponse<null>>(`/hr/finger-error/${id}/reject-department`, {
      note: note ?? null,
    }),

  listFingerErrorDepartmentExceptions: () =>
    api.get<
      ApiResponse<
        Array<{
          id: number;
          section_id: number;
          section_name: string | null;
          job_rank: number;
          job_rank_name: string | null;
        }>
      >
    >("/hr/finger-error/department-exceptions"),

  createFingerErrorDepartmentException: (payload: {
    section_id: number;
    job_rank: number;
  }) =>
    api.post<ApiResponse<{ id: number }>>(
      "/hr/finger-error/department-exceptions",
      payload,
    ),

  deleteFingerErrorDepartmentException: (id: number | string) =>
    api.delete<ApiResponse<null>>(
      `/hr/finger-error/department-exceptions/${id}`,
    ),

  exportFingerErrorHr: async (params?: {
    month?: string;
    department?: string;
    section?: string;
    job_rank?: string;
    progress?: string;
    status_worker?: string;
    q?: string;
  }) => {
    const cleaned: Record<string, string> = {};
    if (params?.month) cleaned.month = params.month;
    if (params?.department) cleaned.department = params.department;
    if (params?.section) cleaned.section = params.section;
    if (params?.job_rank) cleaned.job_rank = params.job_rank;
    if (params?.progress) cleaned.progress = params.progress;
    if (params?.status_worker) cleaned.status_worker = params.status_worker;
    if (params?.q) cleaned.q = params.q;
    const qs =
      Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(cleaned).toString()}`
        : "";
    const { blob, filename } = await api.downloadGet(
      `/hr/finger-error/hr/export${qs}`,
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      filename || `fingerprint_personalia_${params?.month || "export"}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  listFingerErrorHr: (params?: Record<string, string | number>) => {
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && String(v) !== "",
          ),
        )
      : undefined;
    const qs =
      cleaned && Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(
            Object.entries(cleaned).map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : "";
    return api.get<ApiResponse<Record<string, unknown>[]>>(
      `/hr/finger-error/hr${qs}`,
    );
  },

  approveFingerErrorHr: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/finger-error/${id}/approve-hr`),

  rejectFingerErrorHr: (id: number | string, note?: string) =>
    api.post<ApiResponse<null>>(`/hr/finger-error/${id}/reject-hr`, {
      note: note ?? null,
    }),

  lookupFingerErrorWorker: (nrp: string) =>
    api.get<ApiResponse<HrFingerErrorWorkerLookup>>(
      `/hr/finger-error/lookup?nrp=${encodeURIComponent(nrp)}`,
    ),

  createFingerError: (payload: HrFingerErrorPayload, files?: File[]) => {
    const body = new FormData();
    body.append("nrp", payload.nrp);
    if (payload.full_name) body.append("full_name", payload.full_name);
    body.append("category", payload.category);
    body.append("date", payload.date);
    if (payload.finger_in) body.append("finger_in", payload.finger_in);
    if (payload.finger_out) body.append("finger_out", payload.finger_out);
    if (payload.location) body.append("location", payload.location);
    if (payload.shift) body.append("shift", payload.shift);
    if (payload.remark) body.append("remark", payload.remark);
    if (payload.description) body.append("description", payload.description);
    if (payload.note) body.append("note", payload.note);
    for (const file of files ?? []) {
      body.append("files", file);
    }
    return api.post<ApiResponse<{ id: number; evidence_count?: number }>>(
      "/hr/finger-error",
      body,
    );
  },

  importFingerError: (
    file: File,
    opts: { category: string; mode: "in" | "out" | "both" },
  ) => {
    const body = new FormData();
    body.append("file", file);
    body.append("category", opts.category);
    body.append("mode", opts.mode);
    return api.post<
      ApiResponse<{
        inserted: number;
        skipped: number;
        total: number;
        rows: Array<{
          row: number;
          nrp?: string | null;
          date?: string | null;
          shift?: string | null;
          status: "ok" | "error";
          id?: number | null;
          reason?: string | null;
        }>;
        errors: Array<{ row: number; nrp?: string | null; reason: string }>;
      }>
    >("/hr/finger-error/import", body);
  },

  downloadFingerErrorExample: async () => {
    const { blob, filename } = await api.downloadGet("/hr/finger-error/example");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "example_fingerprint.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  updateFingerError: (id: number | string, payload: HrFingerErrorPayload) =>
    api.put<ApiResponse<null>>(`/hr/finger-error/${id}`, payload),

  cancelFingerError: (id: number | string) =>
    api.post<ApiResponse<null>>(`/hr/finger-error/${id}/cancel`),

  openFingerErrorEvidence: async (relativePath: string) => {
    const qs = `?path=${encodeURIComponent(relativePath)}`;
    const { blob } = await api.downloadGet(`/hr/finger-error/evidence${qs}`);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  /** Edit window (H-n) from hr.roster_edit_policy for the signed-in level. */
  getRosterEditPolicy: () =>
    api.get<
      ApiResponse<{
        level_code: string;
        can_edit: boolean;
        allow_past: boolean;
        past_days: number;
        min_editable_date: string | null;
      }>
    >("/hr/roster/edit-policy"),

  updateRoster: (id: number | string, payload: { remark: string }) =>
    api.put<ApiResponse<null>>(`/hr/roster/${id}`, payload),

  listEditPolicyModules: () =>
    api.get<ApiResponse<HrEditPolicyModule[]>>("/hr/edit-policy/modules"),

  upsertEditPolicyModule: (payload: {
    module_code: string;
    module_name: string;
    description?: string | null;
    sort_order?: number | null;
  }) =>
    api.post<ApiResponse<{ id: number; module_code: string }>>(
      "/hr/edit-policy/modules",
      payload,
    ),

  getEditPolicyRow: (id: number | string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`/hr/edit-policy/${id}`),

  createEditPolicy: (payload: HrEditPolicyPayload) =>
    api.post<ApiResponse<{ id: number }>>("/hr/edit-policy", payload),

  updateEditPolicy: (id: number | string, payload: HrEditPolicyPayload) =>
    api.put<ApiResponse<null>>(`/hr/edit-policy/${id}`, payload),

  deleteEditPolicy: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/hr/edit-policy/${id}`),

  exportRoster: async (params?: {
    month?: string;
    department?: string;
    section?: string;
    job_rank?: string;
    q?: string;
  }) => {
    const cleaned: Record<string, string> = {};
    if (params?.month) cleaned.month = params.month;
    if (params?.department) cleaned.department = params.department;
    if (params?.section) cleaned.section = params.section;
    if (params?.job_rank) cleaned.job_rank = params.job_rank;
    if (params?.q) cleaned.q = params.q;
    const qs =
      Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(cleaned).toString()}`
        : "";
    const { blob, filename } = await api.downloadGet(
      `/hr/roster/export${qs}`,
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `roster_${params?.month || "export"}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  listLevelPermissions: (params?: {
    level_id?: string | number;
    include_legacy?: boolean;
    q?: string;
  }) => {
    const cleaned: Record<string, string> = {};
    if (params?.level_id != null && String(params.level_id) !== "") {
      cleaned.level_id = String(params.level_id);
    }
    if (params?.include_legacy) cleaned.include_legacy = "1";
    if (params?.q) cleaned.q = params.q;
    const qs =
      Object.keys(cleaned).length > 0
        ? `?${new URLSearchParams(cleaned).toString()}`
        : "";
    return api.get<ApiResponse<LevelPermissionRow[]>>(
      `/hr/level-permissions${qs}`,
    );
  },

  saveLevelPermissions: (payload: LevelPermissionSavePayload) =>
    api.put<ApiResponse<{ menu_id: number; id: number }[]>>(
      "/hr/level-permissions",
      payload,
    ),
};
