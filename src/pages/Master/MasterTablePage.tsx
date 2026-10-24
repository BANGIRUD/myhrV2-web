import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import TableLoadingOverlay from "../../components/ui/table/TableLoadingOverlay";
import { CloseIcon } from "../../icons";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { usePermission } from "../../hooks/usePermission";
import {
  hrMasterService,
  type HrMasterResource,
  type HrMenuPayload,
  type HrWorkPatternPayload,
  type HrSicknessPayload,
  type HrPermitPayload,
  type HrFingerErrorPayload,
  type HrEditPolicyModule,
  type HrEditPolicyPayload,
  type HrUserPayload,
} from "../../services/hrMaster";
import { STRUCTURE_ALL_LABEL } from "../../utils/structure";
import CalendarMonthField from "../../components/form/CalendarMonthField";
import EditPolicyFormModal from "./EditPolicyFormModal";
import SicknessDepartmentExceptionPanel from "./SicknessDepartmentExceptionPanel";
import EditPolicyModuleModal from "./EditPolicyModuleModal";
import WorkPatternFormModal from "./WorkPatternFormModal";
import WorkPatternGenerateModal from "./WorkPatternGenerateModal";
import WorkPatternImportModal from "./WorkPatternImportModal";
import FingerprintImportModal from "./FingerprintImportModal";
import WorkPatternTable from "./WorkPatternTable";
import RosterFormModal from "./RosterFormModal";
import RosterTable from "./RosterTable";
import SicknessCancelModal from "./SicknessCancelModal";
import SicknessFormModal from "./SicknessFormModal";
import SicknessSectionDetailModal from "./SicknessSectionDetailModal";
import SicknessTable from "./SicknessTable";
import PermitCancelModal from "./PermitCancelModal";
import PermitDetailModal from "./PermitDetailModal";
import PermitFormModal from "./PermitFormModal";
import PermitTable from "./PermitTable";
import PermitDepartmentExceptionPanel from "./PermitDepartmentExceptionPanel";
import FingerprintDepartmentExceptionPanel from "./FingerprintDepartmentExceptionPanel";
import FingerprintCancelModal from "./FingerprintCancelModal";
import FingerprintDetailModal from "./FingerprintDetailModal";
import FingerprintFormModal from "./FingerprintFormModal";
import FingerprintTable from "./FingerprintTable";
import SidebarIconPicker from "./SidebarIconPicker";

const CRUD_RESOURCES = new Set<HrMasterResource>(["users", "menus"]);
/** Resources backed by SP with PAGE / PAGE_SIZE / q. */
const PAGED_RESOURCES = new Set<HrMasterResource>([
  "users",
  "menus",
  "enums",
  "work-pattern",
  "roster",
  "sickness",
  "permit",
  "finger-error",
  "edit-policy",
  "submissions",
]);
const LEGACY_RESOURCE: Record<string, string> = {
  "pola-kerja": "work-pattern",
  "roster-kerja": "roster",
  sakit: "sickness",
  ijin: "permit",
};

const PAGE_SIZE = 20;
const POLA_KERJA_PAGE_SIZE = 50;
const ROSTER_KERJA_PAGE_SIZE = 100;
const SAKIT_PAGE_SIZE = 50;

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function remarkBadgeColor(
  remark: string,
): "success" | "info" | "light" | "warning" | "error" | "dark" {
  const code = remark.trim().toUpperCase();
  if (code === "D") return "success";
  if (code === "N") return "info";
  if (code === "OFF") return "dark";
  if (code === "CT" || code === "CTN" || code === "CTB") return "light";
  if (code === "S" || code === "I") return "warning";
  if (code === "A" || code === "L") return "error";
  return "light";
}

type ColumnFormat = "text" | "boolean" | "active" | "remark";

type ColumnDef = {
  key: string;
  label: string;
  /** When false, column is detail-only (hidden from table). Default true. */
  inTable?: boolean;
  format?: ColumnFormat;
  /** Shown instead of "—" when the value is empty. */
  emptyLabel?: string;
};

type ResourceMeta = {
  title: string;
  description: string;
  columns: ColumnDef[];
};

const RESOURCE_META: Record<HrMasterResource, ResourceMeta> = {
  submissions: {
    title: "Submissions",
    description: "Every sickness and permit request. HR administrator and superadmin only.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "module_name", label: "Module" },
      { key: "nrp", label: "NRP" },
      { key: "full_name", label: "Name" },
      { key: "department_name", label: "Department" },
      { key: "section_name", label: "Section" },
      { key: "start_date", label: "Start" },
      { key: "end_date", label: "End" },
      { key: "progress", label: "Status" },
      { key: "entered_by", label: "Entered by" },
    ],
  },
  jobsites: {
    title: "Jobsites",
    description: "Work locations and operating sites used across MyHR.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "description", label: "Description" },
      { key: "is_active", label: "Active", format: "active" },
      { key: "created_at", label: "Created", inTable: false },
      { key: "updated_at", label: "Updated", inTable: false },
    ],
  },
  levels: {
    title: "Levels",
    description: "Canonical roles and approval stages for access control.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "by_jobsite", label: "Jobsite ID", inTable: false },
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "description", label: "Description", inTable: false },
      { key: "approval_stage", label: "Approval Stage" },
      { key: "structure_scoped", label: "Structure Scoped", format: "boolean" },
      { key: "sort_order", label: "Sort" },
      { key: "is_active", label: "Active", format: "active" },
      { key: "created_at", label: "Created", inTable: false },
      { key: "updated_at", label: "Updated", inTable: false },
    ],
  },
  users: {
    title: "Users",
    description: "Login accounts linked to levels, departments, and jobsites.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "by_jobsite", label: "Jobsite ID", inTable: false },
      { key: "username", label: "Username" },
      { key: "full_name", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone", inTable: false },
      { key: "department_name", label: "Department", emptyLabel: STRUCTURE_ALL_LABEL },
      { key: "section_name", label: "Section", emptyLabel: STRUCTURE_ALL_LABEL },
      { key: "department", label: "Department ID", inTable: false, emptyLabel: STRUCTURE_ALL_LABEL },
      { key: "section", label: "Section ID", inTable: false, emptyLabel: STRUCTURE_ALL_LABEL },
      { key: "level_name", label: "Level" },
      { key: "worker_scope", label: "Worker Scope" },
      { key: "module", label: "Module" },
      { key: "level", label: "Legacy Level", inTable: false },
      { key: "level_id", label: "Level ID", inTable: false },
      { key: "level_code", label: "Level Code", inTable: false },
      { key: "is_active", label: "Active", format: "active" },
      { key: "last_login", label: "Last Login", inTable: false },
      { key: "created_at", label: "Created", inTable: false },
    ],
  },
  menus: {
    title: "Menus",
    description: "Navigation catalog for the sidebar and privilege matrix.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "by_jobsite", label: "Jobsite ID", inTable: false },
      { key: "legacy_id", label: "Legacy ID", inTable: false },
      { key: "menu_code", label: "Code" },
      { key: "menu_name", label: "Name" },
      { key: "menu_url", label: "URL" },
      { key: "icon", label: "Icon", inTable: false },
      { key: "menu_type", label: "Type", inTable: false },
      { key: "parent_name", label: "Parent" },
      { key: "parent_id", label: "Parent ID", inTable: false },
      { key: "sort_order", label: "Sort" },
      { key: "show_sidebar", label: "Sidebar", format: "boolean" },
      { key: "is_active", label: "Active", format: "active" },
      { key: "description", label: "Description", inTable: false },
    ],
  },
  enums: {
    title: "Enums",
    description: "Typed lookup values (department, section, status, etc.) per jobsite.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "by_jobsite", label: "Jobsite ID", inTable: false },
      { key: "legacy_id", label: "Legacy ID", inTable: false },
      { key: "type", label: "Type" },
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "ref_id", label: "Ref ID", inTable: false },
      { key: "description", label: "Description", inTable: false },
      { key: "created_at", label: "Created", inTable: false },
      { key: "updated_at", label: "Updated", inTable: false },
    ],
  },
  "menu-privilege": {
    title: "Menu Privilege",
    description: "Legacy privilege templates used by older role assignments.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "by_jobsite", label: "Jobsite ID", inTable: false },
      { key: "name", label: "Name" },
      { key: "menu", label: "Menu", inTable: false },
      { key: "dashboard", label: "Dashboard", inTable: false },
      { key: "access_read", label: "Read", format: "boolean" },
      { key: "access_create", label: "Create", format: "boolean" },
      { key: "access_update", label: "Update", format: "boolean" },
      { key: "access_delete", label: "Delete", format: "boolean" },
      { key: "access_export", label: "Export", format: "boolean" },
      { key: "created_at", label: "Created", inTable: false },
      { key: "updated_at", label: "Updated", inTable: false },
    ],
  },
  "level-permissions": {
    title: "Level Permissions",
    description: "Permission matrix mapping each level to HR menus.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "by_jobsite", label: "Jobsite ID", inTable: false },
      { key: "level_id", label: "Level ID", inTable: false },
      { key: "level_code", label: "Level Code" },
      { key: "level_name", label: "Level", inTable: false },
      { key: "menu_id", label: "Menu ID", inTable: false },
      { key: "menu_code", label: "Menu Code" },
      { key: "menu_name", label: "Menu" },
      { key: "can_read", label: "Read", format: "boolean" },
      { key: "can_insert", label: "Insert", format: "boolean" },
      { key: "can_update", label: "Update", format: "boolean" },
      { key: "can_delete", label: "Delete", format: "boolean" },
      { key: "can_export", label: "Export", format: "boolean" },
      { key: "can_approve", label: "Approve", format: "boolean" },
    ],
  },
  "work-pattern": {
    title: "Work Pattern",
    description:
      "Seed pola kerja per karyawan. Filter bulan, department, section, dan jabatan — daftar dikelompokkan per NRP agar mudah dipindai.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "date", label: "Tanggal" },
      { key: "nrp", label: "NRP" },
      { key: "full_name", label: "Nama Karyawan" },
      { key: "jabatan", label: "Jabatan" },
      { key: "department_name", label: "Department", inTable: false },
      { key: "section_name", label: "Section", inTable: false },
      { key: "pola_cuti", label: "Pola Cuti" },
      { key: "pola_kerja", label: "Pola Kerja" },
      { key: "hari_ke", label: "Hari Ke-" },
      { key: "remark", label: "Keterangan", format: "remark" },
      { key: "created_at", label: "Created", inTable: false },
      { key: "updated_at", label: "Updated", inTable: false },
    ],
  },
  "roster": {
    title: "Roster",
    description:
      "Roster harian (Status Absen) hasil generate dari Work Pattern. Filter bulan, department, section, dan jabatan — ubah status D / N / OFF per hari.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "date", label: "Tanggal" },
      { key: "nrp", label: "NRP" },
      { key: "full_name", label: "Nama Karyawan" },
      { key: "jabatan", label: "Jabatan" },
      { key: "department_name", label: "Department", inTable: false },
      { key: "section_name", label: "Section", inTable: false },
      { key: "pola_kerja", label: "Pola Kerja", inTable: false },
      { key: "pola_cuti", label: "Pola Cuti", inTable: false },
      { key: "hari_ke", label: "Hari Ke-" },
      { key: "remark", label: "Status Absen", format: "remark" },
      { key: "created_at", label: "Created", inTable: false },
      { key: "updated_at", label: "Updated", inTable: false },
    ],
  },
  sickness: {
    title: "Sickness",
    description:
      "Pengajuan sakit (create/edit/batalkan pending) + bukti. Filter bulan, department, section, jabatan, status pengajuan, dan status worker.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "input_date", label: "Tanggal Input" },
      { key: "date_issue", label: "Tanggal Terbit" },
      { key: "nrp", label: "NRP" },
      { key: "full_name", label: "Nama Karyawan" },
      { key: "department_name", label: "Department" },
      { key: "section_name", label: "Section" },
      { key: "category_name", label: "Kategori" },
      { key: "name_doctor", label: "Nama Dokter" },
      { key: "name_agency", label: "Nama Instansi" },
      { key: "diagnosa", label: "Diagnosa" },
      { key: "start_date", label: "Tanggal Mulai" },
      { key: "end_date", label: "Tanggal Akhir" },
      { key: "day", label: "Total Hari" },
      { key: "progress", label: "Status Pengajuan" },
      { key: "note", label: "Catatan Tolak", inTable: false },
      { key: "created_at", label: "Created", inTable: false },
    ],
  },
  permit: {
    title: "Permit",
    description:
      "Pengajuan ijin (create/edit/batalkan pending) + bukti. Filter bulan, department, section, jabatan, status pengajuan, dan status worker.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "nrp", label: "NRP" },
      { key: "full_name", label: "Nama Karyawan" },
      { key: "category_name", label: "Kategori" },
      { key: "start_date", label: "Tanggal Mulai" },
      { key: "end_date", label: "Tanggal Akhir" },
      { key: "day", label: "Total Hari" },
      { key: "progress", label: "Status Pengajuan" },
    ],
  },
  "finger-error": {
    title: "Fingerprint",
    description:
      "Koreksi fingerprint (create/edit/batalkan pending) + bukti. Filter bulan, department, section, jabatan, status pengajuan. Antrean Section + Personalia saja.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "nrp", label: "NRP" },
      { key: "full_name", label: "Nama Karyawan" },
      { key: "category_name", label: "Kategori" },
      { key: "date", label: "Tanggal" },
      { key: "finger_in", label: "Finger In" },
      { key: "finger_out", label: "Finger Out" },
      { key: "shift", label: "Shift" },
      { key: "remark", label: "Remark" },
      { key: "progress", label: "Status Pengajuan" },
    ],
  },
  "edit-policy": {
    title: "Edit Policy",
    description:
      "Aturan edit per module + level (H-n / allow past / can_edit). Pilih module di filter — module baru ditambah lewat hr.edit_policy_modules.",
    columns: [
      { key: "id", label: "ID", inTable: false },
      { key: "module_code", label: "Module", inTable: false },
      { key: "module_name", label: "Module" },
      { key: "level_code", label: "Level Code" },
      { key: "level_name", label: "Level" },
      { key: "can_edit", label: "Can Edit", format: "boolean" },
      { key: "past_days", label: "Past Days (H-n)" },
      { key: "allow_past", label: "Allow Past", format: "boolean" },
      { key: "description", label: "Description" },
      { key: "created_at", label: "Created", inTable: false },
      { key: "updated_at", label: "Updated", inTable: false },
    ],
  },
};

const COLUMN_LABEL_FALLBACK: Record<string, string> = {
  id: "ID",
  by_jobsite: "Jobsite ID",
  is_active: "Active",
  created_at: "Created",
  updated_at: "Updated",
  full_name: "Full Name",
  level_id: "Level ID",
  department_name: "Department",
  section_name: "Section",
  menu_id: "Menu ID",
  menu_code: "Menu Code",
  menu_name: "Menu Name",
  menu_url: "Menu URL",
  parent_id: "Parent ID",
  sort_order: "Sort Order",
  show_sidebar: "Show Sidebar",
  structure_scoped: "Structure Scoped",
  approval_stage: "Approval Stage",
  last_login: "Last Login",
  legacy_id: "Legacy ID",
  level_code: "Level Code",
  level_name: "Level Name",
  access_read: "Read",
  access_create: "Create",
  access_update: "Update",
  access_delete: "Delete",
  access_export: "Export",
  can_read: "Read",
  can_insert: "Insert",
  can_update: "Update",
  can_delete: "Delete",
  can_export: "Export",
  can_approve: "Approve",
};

function humanizeKey(key: string) {
  if (COLUMN_LABEL_FALLBACK[key]) return COLUMN_LABEL_FALLBACK[key];
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isTruthyFlag(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
}

function isBooleanLike(value: unknown, format?: ColumnFormat) {
  if (format === "boolean" || format === "active") return true;
  return typeof value === "boolean";
}

function formatPlain(value: unknown, emptyLabel = "—") {
  if (value === null || value === undefined || value === "") return emptyLabel;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function CellValue({
  value,
  format,
  emptyLabel,
}: {
  value: unknown;
  format?: ColumnFormat;
  emptyLabel?: string;
}) {
  if (value === null || value === undefined || value === "") {
    return emptyLabel ? (
      <span>{emptyLabel}</span>
    ) : (
      <span className="text-gray-400">—</span>
    );
  }

  if (format === "active") {
    const active = isTruthyFlag(value);
    return (
      <Badge size="sm" color={active ? "success" : "light"}>
        {active ? "Active" : "Inactive"}
      </Badge>
    );
  }

  if (format === "boolean" || typeof value === "boolean") {
    const on = isTruthyFlag(value);
    return (
      <Badge size="sm" color={on ? "success" : "light"}>
        {on ? "Yes" : "No"}
      </Badge>
    );
  }

  if (format === "remark") {
    const text = String(value);
    return (
      <Badge size="sm" color={remarkBadgeColor(text)}>
        {text}
      </Badge>
    );
  }

  return <>{formatPlain(value)}</>;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20.5 12A8.5 8.5 0 1 1 15.2 4.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M15 3.5h4.5V8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const fieldClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const labelClassName =
  "mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400";

function FieldLabel({
  htmlFor,
  children,
  required,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <label htmlFor={htmlFor} className={labelClassName}>
        {children}
        {required ? <span className="text-error-500"> *</span> : null}
      </label>
      {hint ? (
        <p className="mt-0.5 text-[11px] leading-4 text-gray-400 dark:text-gray-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <FieldLabel htmlFor={htmlFor} required={required} hint={hint}>
        {label}
      </FieldLabel>
      {children}
    </div>
  );
}

/** Levels whose users carry a `worker_scope` (SIS / Labour Supply data scope). */
const WORKER_SCOPE_LEVELS = new Set(["hr_admin", "hr_administrator"]);

const WORKER_SCOPE_OPTIONS = [
  { value: "sis", label: "SIS" },
  { value: "ls", label: "Labour Supply (vendor)" },
  { value: "all", label: "All (SIS + LS)" },
];

/** `module_admin` users carry the module they administer. */
const MODULE_OPTIONS = [
  { value: "irel", label: "Industrial Relation" },
  { value: "meals", label: "Meals" },
  { value: "safety", label: "Safety" },
  { value: "attendance", label: "Attendance" },
];

type LevelOption = { id: number; code: string; name: string };
type StructureOption = {
  id: number;
  name: string;
  type: string;
  ref_id: number | null;
};

function parseCsvIds(value: string | null | undefined): string[] {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toggleCsvId(current: string, id: string): string {
  const next = new Set(parseCsvIds(current));
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return [...next].join(",");
}

function MultiStructurePicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: StructureOption[];
  value: string;
  onChange: (next: string) => void;
}) {
  const selected = useMemo(() => new Set(parseCsvIds(value)), [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="text-xs text-gray-400">
          {selected.size} selected
        </p>
      </div>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-300 p-2 dark:border-gray-700">
        {options.length === 0 ? (
          <p className="px-1 py-2 text-xs text-gray-400">No options available.</p>
        ) : (
          options.map((opt) => {
            const checked = selected.has(String(opt.id));
            return (
              <label
                key={opt.id}
                className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/[0.04]"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checked}
                  onChange={() => onChange(toggleCsvId(value, String(opt.id)))}
                />
                <span className="leading-5">{opt.name}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

function CrudFormModal({
  open,
  mode,
  resource,
  initial,
  levels,
  departments,
  sections,
  menus,
  menuParents,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  resource: "users" | "menus";
  initial: Record<string, unknown> | null;
  levels: LevelOption[];
  departments: StructureOption[];
  sections: StructureOption[];
  menus: Record<string, unknown>[];
  /** Full menu list for parent picker (not the paged table rows). */
  menuParents?: Record<string, unknown>[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: HrUserPayload | HrMenuPayload) => Promise<void>;
}) {
  const parentOptions = menuParents && menuParents.length > 0 ? menuParents : menus;
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (resource === "users") {
      setForm({
        username: String(initial?.username ?? ""),
        full_name: String(initial?.full_name ?? ""),
        email: String(initial?.email ?? ""),
        phone: String(initial?.phone ?? ""),
        department: String(initial?.department ?? ""),
        section: String(initial?.section ?? ""),
        level_id: initial?.level_id != null ? String(initial.level_id) : "",
        worker_scope: String(initial?.worker_scope ?? ""),
        module: String(initial?.module ?? ""),
        password: "",
        is_active: isTruthyFlag(initial?.is_active ?? true) ? "1" : "0",
      });
    } else {
      setForm({
        menu_code: String(initial?.menu_code ?? ""),
        menu_name: String(initial?.menu_name ?? ""),
        menu_url: String(initial?.menu_url ?? ""),
        icon: String(initial?.icon ?? ""),
        menu_type: String(initial?.menu_type ?? "children"),
        parent_id: initial?.parent_id != null ? String(initial.parent_id) : "",
        sort_order: String(initial?.sort_order ?? "0"),
        show_sidebar: isTruthyFlag(initial?.show_sidebar ?? true) ? "1" : "0",
        is_active: isTruthyFlag(initial?.is_active ?? true) ? "1" : "0",
        description: String(initial?.description ?? ""),
      });
    }
  }, [open, resource, initial]);

  const sectionOptions = useMemo(() => {
    const deptIds = new Set(parseCsvIds(form.department));
    if (deptIds.size === 0) return sections;
    return sections.filter(
      (s) => s.ref_id == null || deptIds.has(String(s.ref_id)),
    );
  }, [form.department, sections]);

  useEffect(() => {
    if (!open || resource !== "users") return;
    const allowed = new Set(sectionOptions.map((s) => String(s.id)));
    const current = parseCsvIds(form.section);
    const next = current.filter((id) => allowed.has(id));
    if (next.length !== current.length) {
      setForm((prev) => ({ ...prev, section: next.join(",") }));
    }
  }, [form.department, form.section, open, resource, sectionOptions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const selectedLevelCode =
    levels.find((level) => String(level.id) === form.level_id)?.code ?? "";
  const usesWorkerScope = WORKER_SCOPE_LEVELS.has(selectedLevelCode);
  const usesModule = selectedLevelCode === "module_admin";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (resource === "users") {
      const payload: HrUserPayload = {
        username: form.username.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        department: parseCsvIds(form.department).join(",") || null,
        section: parseCsvIds(form.section).join(",") || null,
        level_id: form.level_id ? Number(form.level_id) : null,
        // "" clears the attribute on the backend; hidden when the level does not use it
        worker_scope: usesWorkerScope ? form.worker_scope : "",
        module: usesModule ? form.module : "",
        is_active: form.is_active === "1",
      };
      if (form.password.trim()) payload.password = form.password;
      await onSubmit(payload);
      return;
    }

    const payload: HrMenuPayload = {
      menu_code: form.menu_code.trim(),
      menu_name: form.menu_name.trim(),
      menu_url: form.menu_url.trim() || null,
      icon: form.icon.trim() || null,
      menu_type: form.menu_type.trim() || null,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      sort_order: Number(form.sort_order || 0),
      show_sidebar: form.show_sidebar === "1",
      is_active: form.is_active === "1",
      description: form.description.trim() || null,
    };
    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
        aria-label="Close form"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {mode === "create" ? "Add" : "Edit"}{" "}
              {resource === "users" ? "User" : "Menu"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {resource === "users"
                ? "Password defaults to username when left blank on create."
                : "Menu code must be unique per jobsite."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800"
            aria-label="Close"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {resource === "users" ? (
            <>
              <Field label="Username" htmlFor="crud-username" required>
                <input
                  id="crud-username"
                  className={fieldClassName}
                  placeholder="Contoh: johndoe"
                  value={form.username || ""}
                  onChange={(e) => setField("username", e.target.value)}
                  required
                />
              </Field>
              <Field label="Nama Lengkap" htmlFor="crud-full-name" required>
                <input
                  id="crud-full-name"
                  className={fieldClassName}
                  placeholder="Nama lengkap user"
                  value={form.full_name || ""}
                  onChange={(e) => setField("full_name", e.target.value)}
                  required
                />
              </Field>
              <Field
                label="Password"
                htmlFor="crud-password"
                hint={
                  mode === "create"
                    ? "Opsional. Jika kosong, password = username."
                    : "Opsional. Isi hanya jika ingin mengganti password."
                }
              >
                <input
                  id="crud-password"
                  className={fieldClassName}
                  type="password"
                  placeholder={
                    mode === "create" ? "Password baru (opsional)" : "Password baru (opsional)"
                  }
                  value={form.password || ""}
                  onChange={(e) => setField("password", e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Level" htmlFor="crud-level" required>
                <select
                  id="crud-level"
                  className={fieldClassName}
                  value={form.level_id || ""}
                  onChange={(e) => setField("level_id", e.target.value)}
                  required
                >
                  <option value="">Pilih level</option>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name} ({level.code})
                    </option>
                  ))}
                </select>
              </Field>
              {usesWorkerScope ? (
                <Field
                  label="Worker Scope"
                  htmlFor="crud-worker-scope"
                  required
                  hint="Ruang lingkup data pekerja: SIS, Labour Supply, atau keduanya."
                >
                  <select
                    id="crud-worker-scope"
                    className={fieldClassName}
                    value={form.worker_scope || ""}
                    onChange={(e) => setField("worker_scope", e.target.value)}
                    required
                  >
                    <option value="">Pilih worker scope</option>
                    {WORKER_SCOPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {usesModule ? (
                <Field
                  label="Module"
                  htmlFor="crud-module"
                  required
                  hint="Modul yang diadministrasikan oleh user ini."
                >
                  <select
                    id="crud-module"
                    className={fieldClassName}
                    value={form.module || ""}
                    onChange={(e) => setField("module", e.target.value)}
                    required
                  >
                    <option value="">Pilih module</option>
                    {MODULE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Email" htmlFor="crud-email">
                <input
                  id="crud-email"
                  className={fieldClassName}
                  type="email"
                  placeholder="email@contoh.com"
                  value={form.email || ""}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </Field>
              <Field label="Telepon" htmlFor="crud-phone">
                <input
                  id="crud-phone"
                  className={fieldClassName}
                  placeholder="Nomor telepon"
                  value={form.phone || ""}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </Field>
              <MultiStructurePicker
                label="Department (bisa lebih dari satu)"
                options={departments}
                value={form.department || ""}
                onChange={(next) => setField("department", next)}
              />
              <MultiStructurePicker
                label="Section (bisa lebih dari satu)"
                options={sectionOptions}
                value={form.section || ""}
                onChange={(next) => setField("section", next)}
              />
            </>
          ) : (
            <>
              <Field
                label="Kode Menu"
                htmlFor="crud-menu-code"
                required
                hint="Identitas unik menu (contoh: hr_work_pattern). Tidak boleh duplikat per jobsite."
              >
                <input
                  id="crud-menu-code"
                  className={fieldClassName}
                  placeholder="Contoh: hr_work_pattern"
                  value={form.menu_code || ""}
                  onChange={(e) => setField("menu_code", e.target.value)}
                  required
                />
              </Field>
              <Field label="Nama Menu" htmlFor="crud-menu-name" required>
                <input
                  id="crud-menu-name"
                  className={fieldClassName}
                  placeholder="Teks yang tampil di sidebar"
                  value={form.menu_name || ""}
                  onChange={(e) => setField("menu_name", e.target.value)}
                  required
                />
              </Field>
              <Field
                label="URL"
                htmlFor="crud-menu-url"
                hint='Path mengikuti parent (contoh: /reconciliation/work-pattern, /master/users). Folder pakai "#".'
              >
                <input
                  id="crud-menu-url"
                  className={fieldClassName}
                  placeholder="/reconciliation/… atau /master/…"
                  value={form.menu_url || ""}
                  onChange={(e) => setField("menu_url", e.target.value)}
                />
              </Field>
              <Field
                label="Icon sidebar"
                htmlFor="crud-menu-icon"
                hint="Klik salah satu — bisa diganti kapan saja sesuai selera."
              >
                <input
                  id="crud-menu-icon"
                  type="hidden"
                  value={form.icon || ""}
                  readOnly
                />
                <SidebarIconPicker
                  value={String(form.icon || "")}
                  onChange={(key) => setField("icon", key)}
                />
              </Field>
              <Field
                label="Tipe Menu"
                htmlFor="crud-menu-type"
                hint="parents = folder, children = item, divider = pemisah."
              >
                <select
                  id="crud-menu-type"
                  className={fieldClassName}
                  value={form.menu_type || "children"}
                  onChange={(e) => setField("menu_type", e.target.value)}
                >
                  <option value="parents">parents (folder)</option>
                  <option value="children">children (item)</option>
                  <option value="divider">divider</option>
                </select>
              </Field>
              <Field
                label="Parent Menu"
                htmlFor="crud-parent-id"
                hint="Menu induk di sidebar. Kosongkan jika menu tingkat atas."
              >
                <select
                  id="crud-parent-id"
                  className={fieldClassName}
                  value={form.parent_id || ""}
                  onChange={(e) => setField("parent_id", e.target.value)}
                >
                  <option value="">Tanpa parent (tingkat atas)</option>
                  {parentOptions
                    .filter((m) => String(m.id) !== String(initial?.id ?? ""))
                    .map((m) => (
                      <option key={String(m.id)} value={String(m.id)}>
                        {String(m.menu_name)} ({String(m.menu_code)})
                      </option>
                    ))}
                </select>
              </Field>
              <Field
                label="Urutan (Sort)"
                htmlFor="crud-sort-order"
                hint="Angka lebih kecil tampil lebih atas."
              >
                <input
                  id="crud-sort-order"
                  className={fieldClassName}
                  type="number"
                  placeholder="0"
                  value={form.sort_order || "0"}
                  onChange={(e) => setField("sort_order", e.target.value)}
                />
              </Field>
              <Field label="Deskripsi" htmlFor="crud-description">
                <input
                  id="crud-description"
                  className={fieldClassName}
                  placeholder="Keterangan singkat (opsional)"
                  value={form.description || ""}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </Field>
              <Field
                label="Tampil di Sidebar"
                htmlFor="crud-show-sidebar"
                hint="Harus aktif + level punya can_read agar menu terlihat."
              >
                <select
                  id="crud-show-sidebar"
                  className={fieldClassName}
                  value={form.show_sidebar || "1"}
                  onChange={(e) => setField("show_sidebar", e.target.value)}
                >
                  <option value="1">Ya — tampilkan di sidebar</option>
                  <option value="0">Tidak — sembunyikan dari sidebar</option>
                </select>
              </Field>
            </>
          )}

          <Field label="Status Aktif" htmlFor="crud-is-active">
            <select
              id="crud-is-active"
              className={fieldClassName}
              value={form.is_active || "1"}
              onChange={(e) => setField("is_active", e.target.value)}
            >
              <option value="1">Aktif</option>
              <option value="0">Nonaktif</option>
            </select>
          </Field>

          {error && (
            <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Menyimpan…" : mode === "create" ? "Simpan" : "Update"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailDrawer({
  open,
  title,
  row,
  columns,
  onClose,
  canMutate,
  canUpdate = canMutate,
  canDelete = canMutate,
  showResetPassword,
  resetLoading,
  resetMessage,
  resetError,
  onResetPassword,
  onEdit,
  onDelete,
  deleteLoading,
}: {
  open: boolean;
  title: string;
  row: Record<string, unknown> | null;
  columns: ColumnDef[];
  onClose: () => void;
  canMutate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  showResetPassword?: boolean;
  resetLoading?: boolean;
  resetMessage?: string;
  resetError?: string;
  onResetPassword?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteLoading?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const entries = useMemo(() => {
    if (!row) return [];
    const known = new Map(columns.map((col) => [col.key, col]));
    const keys = [
      ...columns.map((col) => col.key),
      ...Object.keys(row).filter((key) => !known.has(key)),
    ];
    return keys.map((key) => {
      const def = known.get(key);
      return {
        key,
        label: def?.label ?? humanizeKey(key),
        format: def?.format,
        emptyLabel: def?.emptyLabel,
        value: row[key],
      };
    });
  }, [columns, row]);

  if (!open || !row) return null;

  const subtitle =
    (row.name as string) ||
    (row.full_name as string) ||
    (row.menu_name as string) ||
    (row.username as string) ||
    (row.code as string) ||
    (row.menu_code as string) ||
    `Record #${String(row.id ?? "")}`;

  const username = String(row.username ?? "");

  return (
    <div className="fixed inset-0 z-99999 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
        aria-label="Close detail panel"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="master-detail-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {title} detail
            </p>
            <h3
              id="master-detail-title"
              className="mt-1 truncate text-lg font-semibold text-gray-800 dark:text-white/90"
            >
              {subtitle}
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              {canUpdate || canDelete ? "View / edit" : "Read-only"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            aria-label="Close"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <dl className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.key}
                className="rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800"
              >
                <dt className="text-xs font-medium text-gray-400">
                  {entry.label}
                </dt>
                <dd className="mt-1 break-words text-sm text-gray-800 dark:text-gray-200">
                  {isBooleanLike(entry.value, entry.format) ? (
                    <CellValue
                      value={entry.value}
                      format={entry.format ?? "boolean"}
                    />
                  ) : (
                    formatPlain(entry.value, entry.emptyLabel)
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          {(canUpdate || canDelete) && (
            <div className="flex gap-2">
              {canUpdate && (
                <Button
                  size="sm"
                  className="flex-1 !py-2.5"
                  onClick={onEdit}
                  disabled={!row.id}
                >
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 !py-2.5"
                  onClick={onDelete}
                  disabled={deleteLoading || !row.id}
                >
                  {deleteLoading ? "Deleting…" : "Delete"}
                </Button>
              )}
            </div>
          )}

          {showResetPassword && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Reset password to username
                {username ? (
                  <>
                    {" "}
                    (
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {username}
                    </span>
                    )
                  </>
                ) : null}
                .
              </p>
              {resetMessage && (
                <p className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
                  {resetMessage}
                </p>
              )}
              {resetError && (
                <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                  {resetError}
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full !py-2.5"
                disabled={resetLoading || !row.id}
                onClick={onResetPassword}
              >
                {resetLoading ? "Resetting…" : "Reset Password"}
              </Button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function MasterTablePage() {
  const { user } = useAuth();
  const { resource = "" } = useParams<{ resource: string }>();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const meta = RESOURCE_META[resource as HrMasterResource];
  const polaPerm = usePermission("hr_work_pattern");
  const rosterPerm = usePermission("hr_roster");
  const sakitPerm = usePermission("hr_sickness");
  const sakitSectionPerm = usePermission("hr_sickness_section");
  const sakitGroupPerm = usePermission("hr_sickness_group");
  const sakitDepartmentPerm = usePermission("hr_sickness_department");
  const sakitHrPerm = usePermission("hr_sickness_hr");
  const ijinPerm = usePermission("hr_permit");
  const ijinSectionPerm = usePermission("hr_permit_section");
  const ijinGroupPerm = usePermission("hr_permit_group");
  const ijinDepartmentPerm = usePermission("hr_permit_department");
  const ijinHrPerm = usePermission("hr_permit_hr");
  const fingerPerm = usePermission("hr_finger_error");
  const fingerSectionPerm = usePermission("hr_finger_error_section");
  const fingerGroupPerm = usePermission("hr_finger_error_group");
  const fingerDepartmentPerm = usePermission("hr_finger_error_department");
  const fingerHrPerm = usePermission("hr_finger_error_hr");
  const editPolicyPerm = usePermission("hr_edit_policy");
  const isWorkPattern = resource === "work-pattern";
  const isRoster = resource === "roster";
  const isSicknessSection = pathname.startsWith("/section/sickness");
  const isSicknessGroup = pathname.startsWith("/group/sickness");
  const isSicknessDepartment = pathname.startsWith("/department/sickness");
  const isSicknessHr = pathname.startsWith("/personalia/sickness");
  const isSicknessQueue =
    isSicknessSection || isSicknessGroup || isSicknessDepartment || isSicknessHr;
  const sakitQueuePerm = isSicknessHr
    ? sakitHrPerm
    : isSicknessDepartment
    ? sakitDepartmentPerm
    : isSicknessGroup
      ? sakitGroupPerm
      : sakitSectionPerm;
  const isSickness = resource === "sickness" || isSicknessQueue;
  const isPermitSection = pathname.startsWith("/section/permit");
  const isPermitGroup = pathname.startsWith("/group/permit");
  const isPermitDepartment = pathname.startsWith("/department/permit");
  const isPermitHr = pathname.startsWith("/personalia/permit");
  const isPermitQueue =
    isPermitSection || isPermitGroup || isPermitDepartment || isPermitHr;
  const ijinQueuePerm = isPermitHr
    ? ijinHrPerm
    : isPermitDepartment
      ? ijinDepartmentPerm
      : isPermitGroup
        ? ijinGroupPerm
        : ijinSectionPerm;
  const isPermit = resource === "permit" || isPermitQueue;
  const isFingerprintSection = pathname.startsWith("/section/finger-error");
  const isFingerprintGroup = pathname.startsWith("/group/finger-error");
  const isFingerprintDepartment = pathname.startsWith("/department/finger-error");
  const isFingerprintHr = pathname.startsWith("/personalia/finger-error");
  const isFingerprintQueue =
    isFingerprintSection ||
    isFingerprintGroup ||
    isFingerprintDepartment ||
    isFingerprintHr;
  const fingerQueuePerm = isFingerprintHr
    ? fingerHrPerm
    : isFingerprintDepartment
      ? fingerDepartmentPerm
      : isFingerprintGroup
        ? fingerGroupPerm
        : fingerSectionPerm;
  const isFingerprint = resource === "finger-error" || isFingerprintQueue;
  const levelCode = String(user?.level_code ?? "").toLowerCase();
  const ijinHrCanFilterType =
    isPermitHr &&
    (levelCode === "superadmin" ||
      levelCode === "sa" ||
      String(user?.worker_scope ?? "").toLowerCase() === "all");
  const sakitHrCanFilterType =
    isSicknessHr &&
    (levelCode === "superadmin" ||
      levelCode === "sa" ||
      String(user?.worker_scope ?? "").toLowerCase() === "all");
  const fingerHrCanFilterType =
    isFingerprintHr &&
    (levelCode === "superadmin" ||
      levelCode === "sa" ||
      String(user?.worker_scope ?? "").toLowerCase() === "all");
  const isEditPolicy = resource === "edit-policy";
  const isMonthFiltered =
    isWorkPattern || isRoster || isSickness || isPermit || isFingerprint;
  /** From hr.edit_policy (module roster_kerja) via API; null = unlimited. */
  const [rosterPastDaysAllowed, setRosterPastDaysAllowed] = useState<
    number | null
  >(0);
  const [editPolicyModules, setEditPolicyModules] = useState<
    HrEditPolicyModule[]
  >([]);
  const [editPolicyMenuOptions, setEditPolicyMenuOptions] = useState<
    {
      menu_code: string;
      menu_name: string;
      description?: string | null;
      menu_url?: string | null;
    }[]
  >([]);
  const [filterEditModule, setFilterEditModule] = useState("roster_kerja");
  const canInsert = isWorkPattern
    ? polaPerm.canInsert
    : isRoster
      ? false
      : isSicknessQueue || isFingerprintQueue
        ? false
      : isSickness
        ? sakitPerm.canInsert
        : isPermitQueue
          ? false
          : isPermit
            ? ijinPerm.canInsert
            : isFingerprint
              ? fingerPerm.canInsert
        : isEditPolicy
          ? editPolicyPerm.canInsert
          : CRUD_RESOURCES.has(resource as HrMasterResource);
  const canUpdate = isWorkPattern
    ? polaPerm.canUpdate
    : isRoster
      ? rosterPerm.canUpdate
      : isSicknessQueue || isFingerprintQueue
        ? false
      : isSickness
        ? sakitPerm.canUpdate
        : isPermitQueue
          ? false
          : isPermit
            ? ijinPerm.canUpdate
            : isFingerprint
              ? fingerPerm.canUpdate
        : isEditPolicy
          ? editPolicyPerm.canUpdate
          : CRUD_RESOURCES.has(resource as HrMasterResource);
  const canDelete = isWorkPattern
    ? polaPerm.canDelete
    : isRoster
      ? false
      : isSicknessQueue || isFingerprintQueue
        ? false
      : isSickness
        ? sakitPerm.canDelete
        : isPermitQueue
          ? false
          : isPermit
            ? ijinPerm.canDelete
            : isFingerprint
              ? fingerPerm.canDelete
        : isEditPolicy
          ? editPolicyPerm.canDelete
          : CRUD_RESOURCES.has(resource as HrMasterResource);
  const canExport = isWorkPattern
    ? polaPerm.canExport || polaPerm.canRead
    : isRoster
      ? rosterPerm.canExport || rosterPerm.canRead
      : isSicknessHr
        ? sakitHrPerm.canRead || sakitHrPerm.canApprove || sakitHrPerm.canExport
        : isPermitHr
          ? ijinHrPerm.canRead || ijinHrPerm.canApprove || ijinHrPerm.canExport
          : isFingerprintHr
            ? fingerHrPerm.canRead ||
              fingerHrPerm.canApprove ||
              fingerHrPerm.canExport
        : isSicknessQueue || isFingerprintQueue
          ? false
          : isSickness
            ? sakitPerm.canExport
            : false;
  const canGenerate = isWorkPattern && (canInsert || canUpdate);
  const canMutate = canInsert || canUpdate || canDelete;
  const useServerPaging = PAGED_RESOURCES.has(resource as HrMasterResource);
  const pageSize = isRoster
    ? ROSTER_KERJA_PAGE_SIZE
    : isSickness || isPermit || isFingerprint
      ? SAKIT_PAGE_SIZE
      : isWorkPattern
        ? POLA_KERJA_PAGE_SIZE
        : PAGE_SIZE;
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [departments, setDepartments] = useState<StructureOption[]>([]);
  const [sections, setSections] = useState<StructureOption[]>([]);
  const [filterLevelId, setFilterLevelId] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterEnumType, setFilterEnumType] = useState("");
  const monthFromQuery = searchParams.get("month");
  const [filterMonth, setFilterMonth] = useState(() => {
    const q = monthFromQuery?.trim() ?? "";
    return /^\d{4}-\d{2}$/.test(q) ? q : currentMonthValue();
  });
  const [filterJobRank, setFilterJobRank] = useState("");
  const [filterProgress, setFilterProgress] = useState("");
  const [filterStatusWorker, setFilterStatusWorker] = useState("");
  const [jobRanks, setJobRanks] = useState<{ id: number; name: string }[]>([]);
  const [enumTypes, setEnumTypes] = useState<{ type: string; total: number }[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(
    null,
  );
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [sakitCancelRow, setSicknessCancelRow] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [sakitDetailRow, setSicknessDetailRow] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [sakitNotice, setSicknessNotice] = useState("");
  const [sakitStatusCounts, setSicknessStatusCounts] = useState<
    {
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
    }[]
  >([]);
  const [importOpen, setImportOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [moduleSaving, setModuleSaving] = useState(false);
  const [moduleError, setModuleError] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [menuParents, setMenuParents] = useState<Record<string, unknown>[]>(
    [],
  );

  const tableColumns = useMemo(
    () => (meta ? meta.columns.filter((col) => col.inTable !== false) : []),
    [meta],
  );

  const loadData = useCallback(async () => {
    if (!meta) {
      setLoading(false);
      setRows([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const listParams: Record<string, string | number> = {};

      if (useServerPaging) {
        listParams.page = page;
        listParams.page_size = pageSize;
        if (search) listParams.q = search;
      }

      if (resource === "users") {
        if (filterLevelId) listParams.level_id = filterLevelId;
        if (filterDepartment) listParams.department = filterDepartment;
        if (filterSection) listParams.section = filterSection;
      }

      if (resource === "enums" && filterEnumType) {
        listParams.type = filterEnumType;
      }

      if (isMonthFiltered) {
        listParams.month = filterMonth || currentMonthValue();
        if (filterDepartment) listParams.department = filterDepartment;
        if (filterSection) listParams.section = filterSection;
        if (filterJobRank) listParams.job_rank = filterJobRank;
      }

      if (isSickness || isPermit || isFingerprint) {
        if (filterProgress) listParams.progress = filterProgress;
        const hrLocked = isSicknessHr
          ? !sakitHrCanFilterType
          : isPermitHr
            ? !ijinHrCanFilterType
            : isFingerprintHr
              ? !fingerHrCanFilterType
              : false;
        if (filterStatusWorker && !hrLocked) {
          listParams.status_worker = filterStatusWorker;
        }
      }

      if (resource === "edit-policy") {
        listParams.module = filterEditModule || "roster_kerja";
      }

      const result = isFingerprintHr
        ? await hrMasterService.listFingerErrorHr(
            Object.keys(listParams).length > 0 ? listParams : undefined,
          )
        : isFingerprintDepartment
        ? await hrMasterService.listFingerErrorDepartment(
            Object.keys(listParams).length > 0 ? listParams : undefined,
          )
        : isFingerprintGroup
        ? await hrMasterService.listFingerErrorGroup(
            Object.keys(listParams).length > 0 ? listParams : undefined,
          )
        : isFingerprintSection
        ? await hrMasterService.listFingerErrorSection(
            Object.keys(listParams).length > 0 ? listParams : undefined,
          )
        : isPermitHr
        ? await hrMasterService.listPermitHr(
            Object.keys(listParams).length > 0 ? listParams : undefined,
          )
        : isPermitDepartment
        ? await hrMasterService.listPermitDepartment(
            Object.keys(listParams).length > 0 ? listParams : undefined,
          )
        : isPermitGroup
        ? await hrMasterService.listPermitGroup(
            Object.keys(listParams).length > 0 ? listParams : undefined,
          )
        : isPermitSection
        ? await hrMasterService.listPermitSection(
            Object.keys(listParams).length > 0 ? listParams : undefined,
          )
        : isSicknessHr
        ? await hrMasterService.listSicknessHr(
            Object.keys(listParams).length > 0 ? listParams : undefined,
          )
        : isSicknessDepartment
        ? await hrMasterService.listSicknessDepartment(
            Object.keys(listParams).length > 0 ? listParams : undefined,
          )
        : isSicknessGroup
        ? await hrMasterService.listSicknessGroup(
            Object.keys(listParams).length > 0 ? listParams : undefined,
          )
        : isSicknessSection
        ? await hrMasterService.listSicknessSection(
            Object.keys(listParams).length > 0 ? listParams : undefined,
          )
        : await hrMasterService.list(
            resource as HrMasterResource,
            Object.keys(listParams).length > 0 ? listParams : undefined,
          );
      setRows(result.data || []);
      setSicknessStatusCounts(
        isSickness || isPermit || isFingerprint
          ? result.meta?.status_counts ?? []
          : [],
      );
      setTotal(
        useServerPaging
          ? Number(result.meta?.total ?? result.data?.length ?? 0)
          : (result.data || []).length,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data");
      setRows([]);
      setSicknessStatusCounts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    meta,
    resource,
    useServerPaging,
    page,
    pageSize,
    search,
    filterLevelId,
    filterDepartment,
    filterSection,
    filterEnumType,
    filterMonth,
    filterJobRank,
    filterProgress,
    filterStatusWorker,
    filterEditModule,
    isMonthFiltered,
    isSickness,
    isSicknessSection,
    isSicknessGroup,
    isSicknessDepartment,
    isSicknessHr,
    sakitHrCanFilterType,
    isPermit,
    isPermitSection,
    isPermitGroup,
    isPermitDepartment,
    isPermitHr,
    ijinHrCanFilterType,
    isFingerprint,
    isFingerprintSection,
    isFingerprintGroup,
    isFingerprintDepartment,
    isFingerprintHr,
    fingerHrCanFilterType,
  ]);

  const loadEnumTypes = useCallback(async () => {
    if (resource !== "enums") return;
    try {
      const result = await hrMasterService.listEnumTypes();
      setEnumTypes(result.data || []);
    } catch {
      // Type filter is optional; table still works without it.
    }
  }, [resource]);

  const loadUserLookups = useCallback(async () => {
    if (resource !== "users" && resource !== "edit-policy") return;
    try {
      if (resource === "edit-policy") {
        const [levelsResult, modulesResult, menusResult] = await Promise.all([
          hrMasterService.list("levels"),
          hrMasterService.listEditPolicyModules(),
          hrMasterService.list("menus", { page_size: 0 }),
        ]);
        setLevels(
          (levelsResult.data || []).map((row) => ({
            id: Number(row.id),
            code: String(row.code ?? ""),
            name: String(row.name ?? ""),
          })),
        );
        const mods = modulesResult.data || [];
        setEditPolicyModules(mods);
        setEditPolicyMenuOptions(
          (menusResult.data || []).map((row) => ({
            menu_code: String(row.menu_code ?? ""),
            menu_name: String(row.menu_name ?? ""),
            description:
              row.description == null ? null : String(row.description),
            menu_url: row.menu_url == null ? null : String(row.menu_url),
          })),
        );
        if (
          mods.length > 0 &&
          !mods.some((m) => m.module_code === filterEditModule)
        ) {
          setFilterEditModule(mods[0].module_code);
        }
        return;
      }
      const [levelsResult, deptResult, sectionResult] = await Promise.all([
        hrMasterService.list("levels"),
        hrMasterService.listStructure({ type: "department" }),
        hrMasterService.listStructure({ type: "section" }),
      ]);
      setLevels(
        (levelsResult.data || []).map((row) => ({
          id: Number(row.id),
          code: String(row.code ?? ""),
          name: String(row.name ?? ""),
        })),
      );
      setDepartments(
        (deptResult.data || []).map((row) => ({
          id: Number(row.id),
          name: String(row.name ?? ""),
          type: String(row.type ?? "department"),
          ref_id: row.ref_id == null ? null : Number(row.ref_id),
        })),
      );
      setSections(
        (sectionResult.data || []).map((row) => ({
          id: Number(row.id),
          name: String(row.name ?? ""),
          type: String(row.type ?? "section"),
          ref_id: row.ref_id == null ? null : Number(row.ref_id),
        })),
      );
    } catch {
      // Lookups are optional for table view; form filters degrade gracefully.
    }
  }, [resource, filterEditModule]);

  const loadMenuParents = useCallback(async () => {
    if (resource !== "menus") return;
    try {
      const result = await hrMasterService.list("menus", { page_size: 0 });
      setMenuParents(result.data || []);
    } catch {
      setMenuParents([]);
    }
  }, [resource]);

  const loadMonthFilterLookups = useCallback(async () => {
    if (!isMonthFiltered) return;
    try {
      const [deptResult, sectionResult, positionResult] = await Promise.all([
        hrMasterService.listStructure({ type: "department" }),
        hrMasterService.listStructure({ type: "section" }),
        hrMasterService.list("enums", { type: "position", page_size: 0 }),
      ]);
      setDepartments(
        (deptResult.data || []).map((row) => ({
          id: Number(row.id),
          name: String(row.name ?? ""),
          type: String(row.type ?? "department"),
          ref_id: row.ref_id == null ? null : Number(row.ref_id),
        })),
      );
      setSections(
        (sectionResult.data || []).map((row) => ({
          id: Number(row.id),
          name: String(row.name ?? ""),
          type: String(row.type ?? "section"),
          ref_id: row.ref_id == null ? null : Number(row.ref_id),
        })),
      );
      setJobRanks(
        (positionResult.data || []).map((row) => ({
          id: Number(row.id),
          name: String(row.name ?? row.code ?? row.id),
        })),
      );
    } catch {
      // Lookups are optional; filters degrade gracefully.
    }
  }, [isMonthFiltered]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setSearchInput("");
    setSearch("");
    setSelected(null);
    setResetMessage("");
    setResetError("");
    setFormOpen(false);
    setFormError("");
    setFilterLevelId("");
    setFilterDepartment("");
    setFilterSection("");
    setFilterEnumType("");
    {
      const q = searchParams.get("month")?.trim() ?? "";
      setFilterMonth(/^\d{4}-\d{2}$/.test(q) ? q : currentMonthValue());
    }
    setFilterJobRank("");
    setJobRanks([]);
    setEnumTypes([]);
    setMenuParents([]);
    setEditPolicyModules([]);
    setFilterEditModule("roster_kerja");
    setPage(1);
    setTotal(0);
  }, [resource, searchParams]);

  useEffect(() => {
    loadEnumTypes();
  }, [loadEnumTypes]);

  useEffect(() => {
    loadMenuParents();
  }, [loadMenuParents]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    filterLevelId,
    filterDepartment,
    filterSection,
    filterEnumType,
    filterMonth,
    filterJobRank,
    filterEditModule,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onNotify = (event: Event) => {
      const detail = (event as CustomEvent<{ module?: string; url?: string }>)
        .detail;
      if (
        (detail?.module !== "sickness" &&
          detail?.module !== "permit" &&
          detail?.module !== "finger_error") ||
        !detail.url
      )
        return;
      if (!pathname.startsWith(detail.url)) return;
      void loadData();
    };
    window.addEventListener("myhr-notify", onNotify);
    return () => window.removeEventListener("myhr-notify", onNotify);
  }, [pathname, loadData]);

  useEffect(() => {
    loadUserLookups();
  }, [loadUserLookups]);

  useEffect(() => {
    loadMonthFilterLookups();
  }, [loadMonthFilterLookups]);

  useEffect(() => {
    if (!isRoster) {
      setRosterPastDaysAllowed(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await hrMasterService.getRosterEditPolicy();
        if (cancelled) return;
        const policy = result.data;
        if (!policy || !policy.can_edit) {
          setRosterPastDaysAllowed(0);
          return;
        }
        // allow_past → unlimited (null); else H-n from past_days
        setRosterPastDaysAllowed(
          policy.allow_past ? null : Number(policy.past_days) || 0,
        );
      } catch {
        if (!cancelled) setRosterPastDaysAllowed(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isRoster]);

  useEffect(() => {
    setResetMessage("");
    setResetError("");
  }, [selected]);

  const filtered = useMemo(() => {
    if (useServerPaging) return rows;
    const keyword = search.trim().toLowerCase();
    if (!keyword || !meta) return rows;
    const searchKeys = meta.columns.map((col) => col.key);
    return rows.filter((row) =>
      searchKeys.some((key) =>
        String(row[key] ?? "")
          .toLowerCase()
          .includes(keyword),
      ),
    );
  }, [meta, rows, search, useServerPaging]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);

  useEffect(() => {
    if (useServerPaging && page > pageCount) {
      setPage(pageCount);
    }
  }, [useServerPaging, page, pageCount]);

  const filterSectionOptions = useMemo(() => {
    if (!filterDepartment) return sections;
    return sections.filter(
      (s) => s.ref_id == null || String(s.ref_id) === filterDepartment,
    );
  }, [filterDepartment, sections]);

  const closeDetail = useCallback(() => setSelected(null), []);

  const handleResetPassword = useCallback(async () => {
    if (!selected?.id) return;
    const username = String(selected.username ?? "");
    const confirmed = window.confirm(
      username
        ? `Reset password for ${username}?\n\nDefault password will be the username.`
        : "Reset this user's password to their username?",
    );
    if (!confirmed) return;

    setResetLoading(true);
    setResetMessage("");
    setResetError("");
    try {
      const result = await hrMasterService.resetUserPassword(
        String(selected.id),
      );
      setResetMessage(
        result.message ||
          "Password reset successfully. Default password is the username.",
      );
    } catch (err) {
      setResetError(
        err instanceof ApiError ? err.message : "Failed to reset password",
      );
    } finally {
      setResetLoading(false);
    }
  }, [selected]);

  const openCreate = useCallback(() => {
    setFormMode("create");
    setFormError("");
    setFormOpen(true);
  }, []);

  const openEdit = useCallback(() => {
    setFormMode("edit");
    setFormError("");
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selected?.id || !canDelete) return;
    const label =
      String(selected.full_name || selected.menu_name || selected.username || selected.nrp || selected.id);
    if (!window.confirm(`Delete "${label}"? This soft-deletes the record.`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      if (resource === "users") {
        await hrMasterService.deleteUser(String(selected.id));
      } else if (resource === "menus") {
        await hrMasterService.deleteMenu(String(selected.id));
      } else if (resource === "work-pattern") {
        await hrMasterService.deleteWorkPattern(String(selected.id));
      } else if (resource === "edit-policy") {
        await hrMasterService.deleteEditPolicy(String(selected.id));
      }
      setSelected(null);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  }, [canDelete, loadData, resource, selected]);

  const handleFormSubmit = useCallback(
    async (payload: HrUserPayload | HrMenuPayload) => {
      setFormSaving(true);
      setFormError("");
      try {
        if (resource === "users") {
          const body = payload as HrUserPayload;
          if (formMode === "create") {
            await hrMasterService.createUser(body);
          } else if (selected?.id) {
            await hrMasterService.updateUser(String(selected.id), body);
          }
        } else if (resource === "menus") {
          const body = payload as HrMenuPayload;
          if (formMode === "create") {
            await hrMasterService.createMenu(body);
          } else if (selected?.id) {
            await hrMasterService.updateMenu(String(selected.id), body);
          }
        }
        setFormOpen(false);
        setSelected(null);
        await loadData();
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : "Failed to save");
      } finally {
        setFormSaving(false);
      }
    },
    [formMode, loadData, resource, selected],
  );

  const handleWorkPatternSubmit = useCallback(
    async (payload: HrWorkPatternPayload) => {
      setFormSaving(true);
      setFormError("");
      try {
        if (formMode === "create") {
          await hrMasterService.createWorkPattern(payload);
        } else if (selected?.id) {
          await hrMasterService.updateWorkPattern(String(selected.id), payload);
        }
        setFormOpen(false);
        setSelected(null);
        await loadData();
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : "Failed to save");
      } finally {
        setFormSaving(false);
      }
    },
    [formMode, loadData, selected],
  );

  const handlePermitSubmit = useCallback(
    async (payload: HrPermitPayload, files?: File[]) => {
      setFormSaving(true);
      setFormError("");
      try {
        if (formMode === "create") {
          await hrMasterService.createPermit(payload, files);
        } else if (selected?.id) {
          await hrMasterService.updatePermit(String(selected.id), payload);
        }
        setFormOpen(false);
        setSelected(null);
        await loadData();
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : "Failed to save");
      } finally {
        setFormSaving(false);
      }
    },
    [formMode, loadData, selected],
  );

  const handleFingerprintSubmit = useCallback(
    async (payload: HrFingerErrorPayload, files?: File[]) => {
      setFormSaving(true);
      setFormError("");
      try {
        if (formMode === "create") {
          await hrMasterService.createFingerError(payload, files);
        } else if (selected?.id) {
          await hrMasterService.updateFingerError(String(selected.id), payload);
        }
        setFormOpen(false);
        setSelected(null);
        await loadData();
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : "Failed to save");
      } finally {
        setFormSaving(false);
      }
    },
    [formMode, loadData, selected],
  );

  const handleSicknessSubmit = useCallback(
    async (payload: HrSicknessPayload, files?: File[]) => {
      setFormSaving(true);
      setFormError("");
      try {
        if (formMode === "create") {
          await hrMasterService.createSickness(payload, files);
        } else if (selected?.id) {
          await hrMasterService.updateSickness(String(selected.id), payload);
        }
        setFormOpen(false);
        setSelected(null);
        await loadData();
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : "Failed to save");
      } finally {
        setFormSaving(false);
      }
    },
    [formMode, loadData, selected],
  );

  const openSicknessEdit = useCallback((row: Record<string, unknown>) => {
    setSelected(row);
    setFormMode("edit");
    setFormError("");
    setFormOpen(true);
  }, []);

  const decideSicknessSection = useCallback(
    async (action: "approve" | "reject", note = "") => {
      if (!sakitDetailRow?.id) return;
      setDecisionLoading(true);
      setDecisionError("");
      try {
        if (action === "approve") {
          const approve = isFingerprintHr
            ? hrMasterService.approveFingerErrorHr
            : isFingerprintDepartment
              ? hrMasterService.approveFingerErrorDepartment
              : isFingerprintGroup
                ? hrMasterService.approveFingerErrorGroup
                : isFingerprintSection
                  ? hrMasterService.approveFingerErrorSection
                  : isPermitHr
            ? hrMasterService.approvePermitHr
            : isPermitDepartment
              ? hrMasterService.approvePermitDepartment
              : isPermitGroup
                ? hrMasterService.approvePermitGroup
                : isPermitSection
                  ? hrMasterService.approvePermitSection
                  : isSicknessHr
            ? hrMasterService.approveSicknessHr
            : isSicknessDepartment
            ? hrMasterService.approveSicknessDepartment
            : isSicknessGroup
              ? hrMasterService.approveSicknessGroup
              : hrMasterService.approveSicknessSection;
          await approve(String(sakitDetailRow.id));
        } else {
          const reject = isFingerprintHr
            ? hrMasterService.rejectFingerErrorHr
            : isFingerprintDepartment
              ? hrMasterService.rejectFingerErrorDepartment
              : isFingerprintGroup
                ? hrMasterService.rejectFingerErrorGroup
                : isFingerprintSection
                  ? hrMasterService.rejectFingerErrorSection
                  : isPermitHr
            ? hrMasterService.rejectPermitHr
            : isPermitDepartment
              ? hrMasterService.rejectPermitDepartment
              : isPermitGroup
                ? hrMasterService.rejectPermitGroup
                : isPermitSection
                  ? hrMasterService.rejectPermitSection
                  : isSicknessHr
            ? hrMasterService.rejectSicknessHr
            : isSicknessDepartment
            ? hrMasterService.rejectSicknessDepartment
            : isSicknessGroup
              ? hrMasterService.rejectSicknessGroup
              : hrMasterService.rejectSicknessSection;
          await reject(String(sakitDetailRow.id), note);
        }
        const who = String(
          sakitDetailRow.full_name || sakitDetailRow.nrp || "Pengajuan",
        );
        const finalHr = isPermitHr || isSicknessHr || isFingerprintHr;
        setSicknessNotice(
          action === "approve"
            ? finalHr
              ? `${who} disetujui HR.`
              : `${who} disetujui. Status menjadi Waiting approve by HR.`
            : `${who} ditolak.`,
        );
        setSicknessDetailRow(null);
        await loadData();
      } catch (err) {
        setDecisionError(err instanceof ApiError ? err.message : "Failed to update");
      } finally {
        setDecisionLoading(false);
      }
    },
    [
      isFingerprintDepartment,
      isFingerprintGroup,
      isFingerprintHr,
      isFingerprintSection,
      isPermitDepartment,
      isPermitGroup,
      isPermitHr,
      isPermitSection,
      isSicknessDepartment,
      isSicknessGroup,
      isSicknessHr,
      loadData,
      sakitDetailRow,
    ],
  );

  const openSicknessCancel = useCallback(
    (row: Record<string, unknown>) => {
      if (!row?.id || !canDelete) return;
      setSicknessCancelRow(row);
    },
    [canDelete],
  );

  const confirmSicknessCancel = useCallback(async () => {
    if (!sakitCancelRow?.id || !canDelete) return;
    setDeleteLoading(true);
    try {
      if (isFingerprint) {
        await hrMasterService.cancelFingerError(String(sakitCancelRow.id));
      } else if (isPermit) {
        await hrMasterService.cancelPermit(String(sakitCancelRow.id));
      } else {
        await hrMasterService.cancelSickness(String(sakitCancelRow.id));
      }
      setSicknessCancelRow(null);
      setSelected(null);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel");
      setSicknessCancelRow(null);
    } finally {
      setDeleteLoading(false);
    }
  }, [canDelete, isFingerprint, isPermit, loadData, sakitCancelRow]);

  const handleRosterSubmit = useCallback(
    async (payload: { remark: string }) => {
      if (!selected?.id) return;
      setFormSaving(true);
      setFormError("");
      try {
        await hrMasterService.updateRoster(String(selected.id), payload);
        setFormOpen(false);
        setSelected(null);
        await loadData();
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : "Failed to save");
      } finally {
        setFormSaving(false);
      }
    },
    [loadData, selected],
  );

  const handleEditPolicySubmit = useCallback(
    async (payload: HrEditPolicyPayload) => {
      setFormSaving(true);
      setFormError("");
      try {
        if (formMode === "create") {
          await hrMasterService.createEditPolicy(payload);
        } else if (selected?.id) {
          await hrMasterService.updateEditPolicy(String(selected.id), payload);
        }
        setFormOpen(false);
        setSelected(null);
        if (payload.module_code) setFilterEditModule(payload.module_code);
        await loadData();
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : "Failed to save");
      } finally {
        setFormSaving(false);
      }
    },
    [formMode, loadData, selected],
  );

  const handleEditPolicyModuleSubmit = useCallback(
    async (payload: {
      module_code: string;
      module_name: string;
      description?: string | null;
    }) => {
      setModuleSaving(true);
      setModuleError("");
      try {
        await hrMasterService.upsertEditPolicyModule(payload);
        setModuleModalOpen(false);
        setFilterEditModule(payload.module_code);
        setPage(1);
        setSelected(null);
        await loadUserLookups();
        await loadData();
      } catch (err) {
        setModuleError(
          err instanceof ApiError ? err.message : "Failed to save module",
        );
      } finally {
        setModuleSaving(false);
      }
    },
    [loadData, loadUserLookups],
  );

  const openRosterRow = useCallback((row: Record<string, unknown>) => {
    setSelected(row);
    setFormError("");
    setFormOpen(true);
  }, []);

  const legacyResource = LEGACY_RESOURCE[resource];
  if (legacyResource) {
    const nextPath = pathname.replace(
      new RegExp(`/${resource}$`),
      `/${legacyResource}`,
    );
    const qs = searchParams.toString();
    return <Navigate to={`${nextPath}${qs ? `?${qs}` : ""}`} replace />;
  }

  if (!meta) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-gray-500">Unknown master resource.</p>
      </div>
    );
  }

  return (
    <>
      <PageMeta title={`${meta.title} | MyHR`} description={meta.description} />
      <PageBreadcrumb pageTitle={meta.title} />

      <div className="space-y-4">
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {meta.title}
              </h3>
              <Badge size="sm" color="light">
                {useServerPaging ? total : rows.length} row
                {(useServerPaging ? total : rows.length) === 1 ? "" : "s"}
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              {meta.description}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {isWorkPattern && (
              <Link
                to={`/reconciliation/roster?month=${encodeURIComponent(filterMonth || currentMonthValue())}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
              >
                Lihat Roster
              </Link>
            )}
            {canExport && isMonthFiltered && (
              <Button
                size="sm"
                variant="outline"
                className="!py-2.5"
                disabled={exportLoading}
                onClick={async () => {
                  setExportLoading(true);
                  try {
                    const exportParams = {
                      month: filterMonth,
                      department: filterDepartment || undefined,
                      section: filterSection || undefined,
                      job_rank: filterJobRank || undefined,
                      progress: filterProgress || undefined,
                      status_worker:
                        (isSicknessHr && sakitHrCanFilterType) ||
                        (isPermitHr && ijinHrCanFilterType) ||
                        (isFingerprintHr && fingerHrCanFilterType)
                          ? filterStatusWorker || undefined
                          : undefined,
                      q: search || undefined,
                    };
                    if (isFingerprintHr) {
                      await hrMasterService.exportFingerErrorHr(exportParams);
                    } else if (isPermitHr) {
                      await hrMasterService.exportPermitHr(exportParams);
                    } else if (isSicknessHr) {
                      await hrMasterService.exportSicknessHr(exportParams);
                    } else if (isRoster) {
                      await hrMasterService.exportRoster(exportParams);
                    } else {
                      await hrMasterService.exportWorkPattern(exportParams);
                    }
                  } catch (err) {
                    setError(
                      err instanceof ApiError
                        ? err.message
                        : isFingerprintHr
                          ? "Export fingerprint personalia gagal."
                        : isSicknessHr
                          ? "Export sakit personalia gagal."
                          : isRoster
                            ? "Export roster kerja gagal."
                            : "Export pola kerja gagal.",
                    );
                  } finally {
                    setExportLoading(false);
                  }
                }}
              >
                {exportLoading ? "Export…" : "Export"}
              </Button>
            )}
            {canGenerate && (
              <Button
                size="sm"
                variant="outline"
                className="!py-2.5"
                onClick={() => setGenerateOpen(true)}
              >
                Generate Roster
              </Button>
            )}
            {canInsert && resource === "work-pattern" && (
              <Button
                size="sm"
                variant="outline"
                className="!py-2.5"
                onClick={() => setImportOpen(true)}
              >
                Import
              </Button>
            )}
            {canInsert && resource === "finger-error" && !isFingerprintQueue && (
              <Button
                size="sm"
                variant="outline"
                className="!py-2.5"
                onClick={() => setImportOpen(true)}
              >
                Import
              </Button>
            )}
            {canInsert && (
              <Button size="sm" className="!py-2.5" onClick={openCreate}>
                Add{" "}
                {resource === "users"
                  ? "User"
                  : resource === "menus"
                    ? "Menu"
                    : resource === "work-pattern"
                      ? "Work Pattern"
                      : resource === "sickness"
                        ? "Sickness"
                        : resource === "permit"
                          ? "Permit"
                          : resource === "finger-error"
                            ? "Fingerprint"
                          : resource === "edit-policy"
                            ? "Policy"
                            : "Record"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="!py-2.5"
              startIcon={<RefreshIcon className="size-4" />}
              onClick={() => loadData()}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Search ${meta.title.toLowerCase()}…`}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              aria-label={`Search ${meta.title}`}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {useServerPaging ? (
              <>
                Showing{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {showingFrom}-{showingTo}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {total}
                </span>
              </>
            ) : (
              <>
                Showing{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {filtered.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {rows.length}
                </span>
              </>
            )}
          </p>
        </div>

        {resource === "enums" && (
          <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-3">
            <select
              className={fieldClassName}
              value={filterEnumType}
              onChange={(e) => {
                setFilterEnumType(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by enum type"
            >
              <option value="">
                All types ({enumTypes.length} types,{" "}
                {enumTypes.reduce((sum, item) => sum + Number(item.total), 0)}{" "}
                rows)
              </option>
              {enumTypes.map((item) => (
                <option key={item.type} value={item.type}>
                  {item.type} ({item.total})
                </option>
              ))}
            </select>
          </div>
        )}

        {isEditPolicy && (
          <div className="grid gap-3 rounded-xl border border-gray-200 bg-slate-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.02] sm:grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,16rem)_auto_1fr] items-end">
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Module
              </span>
              <select
                className={`${fieldClassName} bg-white dark:bg-gray-900`}
                value={filterEditModule}
                onChange={(e) => {
                  setFilterEditModule(e.target.value);
                  setPage(1);
                  setSelected(null);
                }}
                aria-label="Filter by module"
              >
                {editPolicyModules.length === 0 ? (
                  <option value="roster_kerja">Roster Kerja</option>
                ) : (
                  editPolicyModules.map((mod) => (
                    <option key={mod.module_code} value={mod.module_code}>
                      {mod.module_name}
                    </option>
                  ))
                )}
              </select>
            </label>
            {canInsert && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setModuleError("");
                  setModuleModalOpen(true);
                }}
              >
                Tambah module
              </Button>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 sm:col-span-2 lg:col-span-1 lg:self-center">
              Pilih module yang sudah ada, atau tambah dari tombol — tanpa menu
              Master terpisah.
            </p>
          </div>
        )}

        {isEditPolicy && (
          <>
            <SicknessDepartmentExceptionPanel canUpdate={editPolicyPerm.canUpdate} />
            <PermitDepartmentExceptionPanel canUpdate={editPolicyPerm.canUpdate} />
            <FingerprintDepartmentExceptionPanel canUpdate={editPolicyPerm.canUpdate} />
          </>
        )}

        {isMonthFiltered && (
          <div
            className={`grid gap-3 rounded-xl border border-gray-200 bg-slate-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.02] sm:grid-cols-2 ${
              isSickness || isPermit || isFingerprint
                ? "lg:grid-cols-3"
                : "lg:grid-cols-4"
            }`}
          >
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Bulan
              </span>
              <CalendarMonthField
                id={`${resource}-filter-month`}
                value={filterMonth}
                onChange={(month) => {
                  setFilterMonth(month || currentMonthValue());
                  setPage(1);
                }}
                placeholder="Pilih bulan"
                inputClassName={`${fieldClassName} bg-white pr-10 dark:bg-gray-900`}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Department
              </span>
              <select
                className={`${fieldClassName} bg-white dark:bg-gray-900`}
                value={filterDepartment}
                onChange={(e) => {
                  setFilterDepartment(e.target.value);
                  setFilterSection("");
                  setPage(1);
                }}
                aria-label="Filter by department"
              >
                <option value="">Semua department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Section
              </span>
              <select
                className={`${fieldClassName} bg-white dark:bg-gray-900`}
                value={filterSection}
                onChange={(e) => {
                  setFilterSection(e.target.value);
                  setPage(1);
                }}
                disabled={!filterDepartment}
                aria-label="Filter by section"
              >
                <option value="">
                  {filterDepartment
                    ? "Semua section"
                    : "Pilih department dulu"}
                </option>
                {filterSectionOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Jabatan
              </span>
              <select
                className={`${fieldClassName} bg-white dark:bg-gray-900`}
                value={filterJobRank}
                onChange={(e) => {
                  setFilterJobRank(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by jabatan"
              >
                <option value="">Semua jabatan</option>
                {jobRanks.map((rank) => (
                  <option key={rank.id} value={rank.id}>
                    {rank.name}
                  </option>
                ))}
              </select>
            </label>
            {(isSickness || isPermit || isFingerprint) && (
              <>
                <label className="block text-sm">
                  <span className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Status Pengajuan
                  </span>
                  <select
                    className={`${fieldClassName} bg-white dark:bg-gray-900`}
                    value={filterProgress}
                    onChange={(e) => {
                      setFilterProgress(e.target.value);
                      setPage(1);
                    }}
                    aria-label="Filter by status pengajuan"
                  >
                    <option value="">ALL</option>
                    <option value="1">Waiting for approval Section</option>
                    <option value="2">Waiting for approval HR</option>
                    <option value="3">Rejected By Section Head</option>
                    <option value="4">Rejected By HR</option>
                  </select>
                </label>
                {((!isSicknessHr && !isPermitHr && !isFingerprintHr) ||
                  sakitHrCanFilterType ||
                  ijinHrCanFilterType ||
                  fingerHrCanFilterType) && (
                <label className="block text-sm">
                  <span className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {isSicknessHr || isPermitHr || isFingerprintHr
                      ? "Tipe Karyawan"
                      : "Status Worker"}
                  </span>
                  <select
                    className={`${fieldClassName} bg-white dark:bg-gray-900`}
                    value={filterStatusWorker}
                    onChange={(e) => {
                      setFilterStatusWorker(e.target.value);
                      setPage(1);
                    }}
                    aria-label="Filter by tipe karyawan"
                  >
                    <option value="">ALL</option>
                    <option value="sis">Karyawan SIS</option>
                    <option value="vendor">Karyawan LS</option>
                  </select>
                </label>
                )}
              </>
            )}
          </div>
        )}

        {resource === "users" && (
          <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-3">
            <select
              className={fieldClassName}
              value={filterLevelId}
              onChange={(e) => {
                setFilterLevelId(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by level"
            >
              <option value="">All levels</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
            <select
              className={fieldClassName}
              value={filterDepartment}
              onChange={(e) => {
                setFilterDepartment(e.target.value);
                setFilterSection("");
                setPage(1);
              }}
              aria-label="Filter by department"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              className={fieldClassName}
              value={filterSection}
              onChange={(e) => {
                setFilterSection(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by section"
            >
              <option value="">All sections</option>
              {filterSectionOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        {isWorkPattern ? (
          <WorkPatternTable
            rows={filtered}
            loading={loading}
            selected={selected}
            onSelect={setSelected}
            searchHint={Boolean(searchInput.trim())}
          />
        ) : isRoster ? (
          <RosterTable
            rows={filtered}
            loading={loading}
            selected={selected}
            onSelect={openRosterRow}
            searchHint={Boolean(searchInput.trim())}
          />
        ) : isSickness ? (
          <SicknessTable
            rows={filtered}
            loading={loading}
            searchHint={Boolean(searchInput.trim())}
            startNo={showingFrom || 1}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={isSicknessQueue ? undefined : openSicknessEdit}
            onCancel={isSicknessQueue ? undefined : openSicknessCancel}
            onDetail={
              isSicknessQueue && sakitQueuePerm.canApprove
                ? (row) => {
                    setDecisionError("");
                    setSicknessDetailRow(row);
                  }
                : undefined
            }
            statusCounts={sakitStatusCounts}
            approvalParty={
              isSicknessHr
                ? { header: "Atasan / HR", short: "Atasan", perRow: true }
                : isSicknessDepartment
                ? { header: "Department / HR", short: "DH" }
                : isSicknessGroup
                  ? { header: "Group Leader / HR", short: "GL" }
                  : isSicknessSection
                    ? undefined
                    : { header: "Atasan / HR", short: "Atasan", perRow: true }
            }
          />
        ) : isPermit ? (
          <PermitTable
            rows={filtered}
            loading={loading}
            searchHint={Boolean(searchInput.trim())}
            startNo={showingFrom || 1}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={isPermitQueue ? undefined : openSicknessEdit}
            onCancel={isPermitQueue ? undefined : openSicknessCancel}
            onDetail={
              isPermitQueue && ijinQueuePerm.canApprove
                ? (row) => {
                    setDecisionError("");
                    setSicknessDetailRow(row);
                  }
                : undefined
            }
            statusCounts={sakitStatusCounts}
            approvalParty={
              isPermitHr
                ? { header: "Atasan / HR", short: "Atasan", perRow: true }
                : isPermitDepartment
                ? { header: "Department / HR", short: "DH" }
                : isPermitGroup
                  ? { header: "Group Leader / HR", short: "GL" }
                  : isPermitSection
                    ? undefined
                    : { header: "Atasan / HR", short: "Atasan", perRow: true }
            }
          />
        ) : isFingerprint ? (
          <FingerprintTable
            rows={filtered}
            loading={loading}
            searchHint={Boolean(searchInput.trim())}
            startNo={showingFrom || 1}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={isFingerprintQueue ? undefined : openSicknessEdit}
            onCancel={isFingerprintQueue ? undefined : openSicknessCancel}
            onDetail={
              isFingerprintQueue && fingerQueuePerm.canApprove
                ? (row) => {
                    setDecisionError("");
                    setSicknessDetailRow(row);
                  }
                : undefined
            }
            statusCounts={sakitStatusCounts}
            approvalParty={
              isFingerprintHr
                ? { header: "Atasan / HR", short: "Atasan", perRow: true }
                : isFingerprintSection
                  ? undefined
                  : { header: "Atasan / HR", short: "Atasan", perRow: true }
            }
          />
        ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="relative">
            {loading && filtered.length > 0 ? (
              <TableLoadingOverlay
                label={`Memuat ${meta.title.toLowerCase()}…`}
              />
            ) : null}
            <div className="max-h-[min(70vh,720px)] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                <TableRow>
                  {tableColumns.map((col) => (
                    <TableCell
                      key={col.key}
                      isHeader
                      className="whitespace-nowrap px-5 py-3 text-start text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody
                className={`divide-y divide-gray-100 dark:divide-gray-800${
                  loading && filtered.length > 0
                    ? " pointer-events-none opacity-50 transition-opacity"
                    : ""
                }`}
              >
                {loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={tableColumns.length}
                      className="px-5 py-12 text-center"
                    >
                      <div className="inline-flex flex-col items-center gap-2 text-sm text-gray-500">
                        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
                        Loading {meta.title.toLowerCase()}…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={tableColumns.length}
                      className="px-5 py-12 text-center"
                    >
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        No rows found
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchInput.trim()
                          ? "Try a different search keyword."
                          : "This master list is empty."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row, index) => {
                    const rowKey = String(row.id ?? `${resource}-${index}`);
                    const isSelected = selected === row;
                    return (
                      <TableRow
                        key={rowKey}
                        className={`cursor-pointer transition-colors odd:bg-white even:bg-gray-50/70 hover:bg-brand-50/60 dark:odd:bg-transparent dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04] ${
                          isSelected
                            ? "bg-brand-50/80 dark:bg-brand-500/10"
                            : ""
                        }`}
                        onClick={() => setSelected(row)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelected(row);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`View details for ${meta.title} row`}
                      >
                        {tableColumns.map((col) => (
                          <TableCell
                            key={col.key}
                            className={`px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300 ${
                              col.key === "department_name" ||
                              col.key === "section_name"
                                ? "max-w-[280px] whitespace-normal"
                                : "max-w-[240px] truncate"
                            }`}
                            title={
                              col.key === "department_name" ||
                              col.key === "section_name"
                                ? String(row[col.key] ?? "")
                                : undefined
                            }
                          >
                            <CellValue
                              value={row[col.key]}
                              format={col.format}
                              emptyLabel={col.emptyLabel}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </div>
        )}

        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {isWorkPattern
              ? "Klik baris untuk detail / edit. Karyawan dikelompokkan agar lebih mudah dipindai."
              : isRoster
                ? "Klik baris untuk ubah Status Absen (D / N / OFF). Jendela edit (H-n) mengikuti hr.roster_edit_policy per level."
              : isFingerprintHr
                ? "Personalia melihat semua status fingerprint pada bulan ini. Setujui dan Tolak hanya untuk Waiting approve by HR."
              : isFingerprintDepartment
                ? "Antrean Department fingerprint: jabatan Section Head ke atas, plus pengecualian di Edit Policy."
              : isFingerprintGroup
                ? "Antrean Group Leader fingerprint: hanya karyawan LS."
              : isFingerprintSection
                ? "Antrean Section fingerprint: jabatan di bawah Section Head."
              : isFingerprint
                ? "Ubah dan Batalkan mengikuti Edit Policy module finger_error (past days sejak tanggal dibuat, plus masih pending)."
              : isPermitHr
                ? "Personalia melihat semua status ijin pada bulan ini. Setujui dan Tolak hanya untuk Waiting approve by HR."
              : isPermitDepartment
                ? "Antrean Department ijin: jabatan Section Head ke atas, plus pengecualian di Edit Policy."
              : isPermitGroup
                ? "Antrean Group Leader ijin: hanya karyawan LS."
              : isPermitSection
                ? "Antrean Section ijin: jabatan di bawah Section Head."
              : isPermit
                ? "Ubah dan Batalkan mengikuti Edit Policy module ijin (past days sejak tanggal dibuat, plus masih pending)."
              : isSicknessHr
                ? "Personalia melihat semua status pada bulan ini. HR Admin SIS hanya karyawan SIS, HR Admin LS hanya karyawan LS. Setujui dan Tolak hanya untuk Waiting approve by HR."
              : isSicknessDepartment
                ? "Antrean Department: jabatan Section Head ke atas, plus pengecualian di Edit Policy. Yang approve Department Head."
              : isSicknessGroup
                ? "Antrean Group Leader: hanya karyawan LS. Group Leader atau Unit Head pada section yang sama."
              : isSicknessSection
                ? "Antrean Section: jabatan di bawah Section Head. Unit Head hanya jika section tidak punya Section Head."
              : isSickness
                ? "Ubah dan Batalkan mengikuti Edit Policy module sakit (past days sejak tanggal dibuat, plus masih pending)."
              : isEditPolicy
                ? "Pilih module, lalu atur can_edit / H-n / allow_past per level. Digunakan SP modul terkait (mis. roster_kerja)."
              : resource === "users"
                ? "Click a row to view details. You can create, edit, delete, and reset password."
                : resource === "menus"
                  ? "Click a row to view details. You can create, edit, and delete menus."
                  : "Click a row to view details. Master data is read-only in this release."}
          </p>
          {useServerPaging && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>
                Halaman {page} / {pageCount}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="!py-2"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="!py-2"
                disabled={page >= pageCount || loading}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
              >
                Berikutnya
              </Button>
            </div>
          )}
        </div>
      </div>

      <DetailDrawer
        open={
          selected != null &&
          !formOpen &&
          !isRoster &&
          !isSickness &&
          !isPermit &&
          !isFingerprint
        }
        title={meta.title}
        row={selected}
        columns={meta.columns}
        onClose={closeDetail}
        canMutate={canMutate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        showResetPassword={resource === "users"}
        resetLoading={resetLoading}
        resetMessage={resetMessage}
        resetError={resetError}
        onResetPassword={handleResetPassword}
        onEdit={openEdit}
        onDelete={handleDelete}
        deleteLoading={deleteLoading}
      />

      {canMutate && (resource === "users" || resource === "menus") && (
        <CrudFormModal
          open={formOpen}
          mode={formMode}
          resource={resource}
          initial={formMode === "edit" ? selected : null}
          levels={levels}
          departments={departments}
          sections={sections}
          menus={resource === "menus" ? rows : []}
          menuParents={menuParents}
          saving={formSaving}
          error={formError}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}

      {(canInsert || canUpdate) && isWorkPattern && (
        <WorkPatternFormModal
          open={formOpen}
          mode={formMode}
          initial={formMode === "edit" ? selected : null}
          saving={formSaving}
          error={formError}
          onClose={() => setFormOpen(false)}
          onSubmit={handleWorkPatternSubmit}
        />
      )}

      {(canInsert || canUpdate) && isPermit && !isPermitQueue && (
        <PermitFormModal
          open={formOpen}
          mode={formMode}
          initial={formMode === "edit" ? selected : null}
          saving={formSaving}
          error={formError}
          onClose={() => setFormOpen(false)}
          onSubmit={handlePermitSubmit}
        />
      )}

      {(canInsert || canUpdate) && isFingerprint && !isFingerprintQueue && (
        <FingerprintFormModal
          open={formOpen}
          mode={formMode}
          initial={formMode === "edit" ? selected : null}
          saving={formSaving}
          error={formError}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFingerprintSubmit}
        />
      )}

      {(canInsert || canUpdate) && isSickness && (
        <SicknessFormModal
          open={formOpen}
          mode={formMode}
          initial={formMode === "edit" ? selected : null}
          saving={formSaving}
          error={formError}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSicknessSubmit}
        />
      )}

      {sakitNotice ? (
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45"
            aria-label="Tutup"
            onClick={() => setSicknessNotice("")}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            <p className="text-base font-semibold text-slate-900 dark:text-white/90">
              Selesai
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">{sakitNotice}</p>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={() => setSicknessNotice("")}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <PermitDetailModal
        open={isPermitQueue && sakitDetailRow != null}
        finalHr={isPermitHr}
        row={sakitDetailRow}
        loading={decisionLoading}
        error={decisionError}
        onClose={() => {
          if (!decisionLoading) setSicknessDetailRow(null);
        }}
        onApprove={() => void decideSicknessSection("approve")}
        onReject={(note) => void decideSicknessSection("reject", note)}
      />

      <FingerprintDetailModal
        open={isFingerprintQueue && sakitDetailRow != null}
        finalHr={isFingerprintHr}
        row={sakitDetailRow}
        loading={decisionLoading}
        error={decisionError}
        onClose={() => {
          if (!decisionLoading) setSicknessDetailRow(null);
        }}
        onApprove={() => void decideSicknessSection("approve")}
        onReject={(note) => void decideSicknessSection("reject", note)}
      />

      <SicknessSectionDetailModal
        open={isSicknessQueue && sakitDetailRow != null}
        finalHr={isSicknessHr}
        row={sakitDetailRow}
        loading={decisionLoading}
        error={decisionError}
        onClose={() => {
          if (!decisionLoading) setSicknessDetailRow(null);
        }}
        onApprove={() => void decideSicknessSection("approve")}
        onReject={(note) => void decideSicknessSection("reject", note)}
      />

      {isPermit && !isPermitQueue && (
        <PermitCancelModal
          open={sakitCancelRow != null}
          row={sakitCancelRow}
          loading={deleteLoading}
          onClose={() => {
            if (!deleteLoading) setSicknessCancelRow(null);
          }}
          onConfirm={confirmSicknessCancel}
        />
      )}

      {isFingerprint && !isFingerprintQueue && (
        <FingerprintCancelModal
          open={sakitCancelRow != null}
          row={sakitCancelRow}
          loading={deleteLoading}
          onClose={() => {
            if (!deleteLoading) setSicknessCancelRow(null);
          }}
          onConfirm={confirmSicknessCancel}
        />
      )}

      {isSickness && !isSicknessQueue && (
        <SicknessCancelModal
          open={sakitCancelRow != null}
          row={sakitCancelRow}
          loading={deleteLoading}
          onClose={() => {
            if (!deleteLoading) setSicknessCancelRow(null);
          }}
          onConfirm={confirmSicknessCancel}
        />
      )}

      {isRoster && (
        <RosterFormModal
          open={formOpen}
          initial={selected}
          saving={formSaving}
          error={formError}
          pastDaysAllowed={rosterPastDaysAllowed}
          canUpdate={canUpdate}
          onClose={() => {
            setFormOpen(false);
            setSelected(null);
          }}
          onSubmit={handleRosterSubmit}
        />
      )}

      {(canInsert || canUpdate) && isEditPolicy && (
        <EditPolicyFormModal
          open={formOpen}
          mode={formMode}
          initial={formMode === "edit" ? selected : null}
          modules={editPolicyModules}
          defaultModule={filterEditModule}
          levels={levels}
          saving={formSaving}
          error={formError}
          onClose={() => setFormOpen(false)}
          onSubmit={handleEditPolicySubmit}
        />
      )}

      {canInsert && isEditPolicy && (
        <EditPolicyModuleModal
          open={moduleModalOpen}
          menus={editPolicyMenuOptions}
          existingModuleCodes={editPolicyModules.map((m) => m.module_code)}
          saving={moduleSaving}
          error={moduleError}
          onClose={() => setModuleModalOpen(false)}
          onSubmit={handleEditPolicyModuleSubmit}
        />
      )}

      {canInsert && isWorkPattern && (
        <WorkPatternImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            void loadData();
          }}
        />
      )}

      {canInsert && isFingerprint && !isFingerprintQueue && (
        <FingerprintImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            void loadData();
          }}
        />
      )}

      {canGenerate && (
        <WorkPatternGenerateModal
          open={generateOpen}
          month={filterMonth}
          onClose={() => setGenerateOpen(false)}
          onGenerated={() => {
            void loadData();
          }}
        />
      )}
    </>
  );
}
