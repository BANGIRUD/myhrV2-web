export type PermissionAction =
  | "read"
  | "insert"
  | "update"
  | "delete"
  | "export"
  | "import"
  | "approve";

export type MenuPermission = {
  menu_id: number;
  menu_code: string;
  menu_name: string;
  path?: string | null;
  menu_url?: string | null;
  icon?: string | null;
  parent_id?: number | null;
  sort_order?: number;
  show_sidebar?: boolean;
  can_read: boolean;
  can_insert: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_import: boolean;
  can_approve?: boolean;
};

export type StructureSection = {
  id: number;
  name: string;
  /** Active workers (dbo.workers) in this section. */
  worker_count?: number;
};

/** Department with the user's sections; `id`/`name` null groups orphan sections. */
export type StructureDepartment = {
  id: number | null;
  name: string | null;
  /** Active workers (dbo.workers) in the whole department. */
  worker_count?: number;
  sections: StructureSection[];
};

/** MyHR login user (buildUserData). Optional cutover fields for later hr.* auth. */
export type AuthUser = {
  id: number | string;
  username: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  ref_id?: string | number | null;
  privilege_menu?: string | null;
  /** Legacy level string (e.g. admin, group_leader, admin_hr). */
  level?: string | null;
  section?: string | null;
  department?: string | null;
  section_name?: string | null;
  department_name?: string | null;
  structure_tree?: StructureDepartment[];
  section_fw?: string | null;
  department_fw?: string | null;
  description?: string | null;
  dashboard?: string | null;
  menu?: string[];
  path_foto?: string | null;
  structure?: string | null;
  access_read?: string | null;
  access_update?: string | null;
  access_create?: string | null;
  access_delete?: string | null;
  access_export?: string | null;
  access_approve?: string | null;
  /** Canonical hr.levels (auth cutover). */
  level_id?: number | null;
  level_code?: string | null;
  level_name?: string | null;
  by_jobsite?: number | null;
  approval_stage?: string | null;
  structure_scoped?: boolean | null;
  /** HR data scope: sis | ls | all (hr_admin / hr_administrator). */
  worker_scope?: string | null;
  /** Administered module: irel | meals | safety | attendance (module_admin). */
  module?: string | null;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    /** Employee detail: whether Edit Policy workers_grade allows revealing Grade */
    can_view_grade?: boolean;
    status_counts?: {
      label: string;
      total: number;
      people?: {
        nrp: string;
        name: string;
        section: string;
        start_date?: string;
        end_date?: string;
        category?: string;
      }[];
    }[];
  };
};

