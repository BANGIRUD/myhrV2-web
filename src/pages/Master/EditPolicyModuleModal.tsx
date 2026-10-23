import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/button/Button";
import { CloseIcon } from "../../icons";

const fieldClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:disabled:bg-gray-800";

const labelClassName =
  "mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400";

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className={labelClassName}>
      {children}
      {required ? <span className="text-error-500"> *</span> : null}
    </label>
  );
}

export type EditPolicyMenuOption = {
  menu_code: string;
  menu_name: string;
  description?: string | null;
  menu_url?: string | null;
};

export type EditPolicyModulePayload = {
  module_code: string;
  module_name: string;
  description?: string | null;
};

/** Menu codes are English. edit_policy.module_code stays the stored catalog key. */
const EDIT_POLICY_MODULE_BY_MENU: Record<string, string> = {
  hr_work_pattern: "pola_kerja",
  hr_roster: "roster_kerja",
  hr_sickness: "sakit",
  hr_sickness_section: "sakit",
  hr_sickness_group: "sakit",
  hr_sickness_department: "sakit",
  hr_sickness_hr: "sakit",
  hr_permit: "ijin",
  hr_permit_section: "ijin",
  hr_permit_group: "ijin",
  hr_permit_department: "ijin",
  hr_permit_hr: "ijin",
};

export function moduleCodeFromMenuCode(menuCode: string): string {
  const code = menuCode.trim().toLowerCase();
  const mapped = EDIT_POLICY_MODULE_BY_MENU[code];
  if (mapped) return mapped;
  return code.startsWith("hr_") ? code.slice(3) : code;
}

type Props = {
  open: boolean;
  menus: EditPolicyMenuOption[];
  /** module_code already in hr.edit_policy_modules */
  existingModuleCodes: string[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: EditPolicyModulePayload) => Promise<void>;
};

export default function EditPolicyModuleModal({
  open,
  menus,
  existingModuleCodes,
  saving,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [menuCode, setMenuCode] = useState("");
  const [localError, setLocalError] = useState("");

  const existing = useMemo(
    () => new Set(existingModuleCodes.map((c) => c.trim().toLowerCase())),
    [existingModuleCodes],
  );

  const options = useMemo(() => {
    return menus
      .filter((m) => {
        const code = m.menu_code?.trim();
        if (!code) return false;
        const url = String(m.menu_url ?? "").trim();
        // Skip folder-only parents
        if (!url || url === "#") return false;
        const mod = moduleCodeFromMenuCode(code);
        if (!mod || existing.has(mod)) return false;
        return true;
      })
      .slice()
      .sort((a, b) =>
        a.menu_name.localeCompare(b.menu_name, "id", { sensitivity: "base" }),
      );
  }, [menus, existing]);

  const selected = options.find((m) => m.menu_code === menuCode) ?? null;

  useEffect(() => {
    if (!open) return;
    setMenuCode(options[0]?.menu_code ?? "");
    setLocalError("");
  }, [open, options]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setLocalError("Pilih menu dari daftar.");
      return;
    }
    const moduleCode = moduleCodeFromMenuCode(selected.menu_code);
    if (!moduleCode) {
      setLocalError("Menu code tidak valid untuk module.");
      return;
    }
    setLocalError("");
    await onSubmit({
      module_code: moduleCode,
      module_name: selected.menu_name.trim(),
      description:
        selected.description != null
          ? String(selected.description).trim() || null
          : null,
    });
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-policy-module-title"
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="edit-policy-module-title"
              className="text-lg font-semibold text-gray-800 dark:text-white/90"
            >
              Tambah Module
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Pilih menu yang sudah ada. Code module diambil dari menu_code
              (tanpa prefix <code className="rounded bg-gray-100 px-1 dark:bg-white/10">hr_</code>).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10"
            aria-label="Close dialog"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel htmlFor="epm-menu" required>
              Menu
            </FieldLabel>
            <select
              id="epm-menu"
              className={`${fieldClassName} bg-white dark:bg-gray-900`}
              value={menuCode}
              onChange={(e) => setMenuCode(e.target.value)}
              disabled={saving || options.length === 0}
              aria-label="Pilih menu untuk module"
            >
              {options.length === 0 ? (
                <option value="">Semua menu sudah punya module</option>
              ) : (
                options.map((m) => (
                  <option key={m.menu_code} value={m.menu_code}>
                    {m.menu_name} ({m.menu_code})
                  </option>
                ))
              )}
            </select>
          </div>

          {selected && (
            <div className="rounded-lg border border-gray-200 bg-slate-50/80 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  module_code:
                </span>{" "}
                <code>{moduleCodeFromMenuCode(selected.menu_code)}</code>
              </p>
              <p className="mt-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  Nama:
                </span>{" "}
                {selected.menu_name}
              </p>
            </div>
          )}

          {(localError || error) && (
            <p className="text-sm text-error-500" role="alert">
              {localError || error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" disabled={saving || !selected}>
              {saving ? "Menyimpan…" : "Simpan module"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
