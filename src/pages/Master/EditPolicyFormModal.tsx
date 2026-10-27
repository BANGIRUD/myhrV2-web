import { FormEvent, type ReactNode, useEffect, useState } from "react";
import Button from "../../components/ui/button/Button";
import { CloseIcon } from "../../icons";
import type {
  HrEditPolicyModule,
  HrEditPolicyPayload,
} from "../../services/hrMaster";

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

type LevelOption = { id: number; code: string; name: string };

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial: Record<string, unknown> | null;
  modules: HrEditPolicyModule[];
  defaultModule: string;
  levels: LevelOption[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: HrEditPolicyPayload) => Promise<void>;
};

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

export default function EditPolicyFormModal({
  open,
  mode,
  initial,
  modules,
  defaultModule,
  levels,
  saving,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState({
    module_code: defaultModule || "roster_kerja",
    level_code: "",
    can_edit: true,
    past_days: "0",
    allow_past: false,
    description: "",
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm({
        module_code: String(initial.module_code ?? defaultModule).toLowerCase(),
        level_code: String(initial.level_code ?? "").toLowerCase(),
        can_edit: asBool(initial.can_edit),
        past_days: String(initial.past_days ?? 0),
        allow_past: asBool(initial.allow_past),
        description: String(initial.description ?? ""),
      });
      return;
    }
    setForm({
      module_code: defaultModule || modules[0]?.module_code || "roster_kerja",
      level_code: levels[0]?.code?.toLowerCase() ?? "",
      can_edit: true,
      past_days: "0",
      allow_past: false,
      description: "",
    });
  }, [open, mode, initial, levels, modules, defaultModule]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const pastDays = Number(form.past_days);
    if (
      !form.module_code ||
      !form.level_code ||
      !Number.isFinite(pastDays) ||
      pastDays < 0
    ) {
      return;
    }
    await onSubmit({
      module_code: form.module_code,
      level_code: form.level_code,
      can_edit: form.can_edit,
      past_days: pastDays,
      allow_past: form.allow_past,
      description: form.description.trim() || null,
    });
  }

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
        aria-labelledby="edit-policy-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2
              id="edit-policy-title"
              className="text-lg font-semibold text-gray-800 dark:text-white/90"
            >
              {mode === "create" ? "Tambah Edit Policy" : "Edit Policy"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Pilih module + level, lalu atur H-n / allow past.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <FieldLabel htmlFor="ep-module" required>
              Module
            </FieldLabel>
            <select
              id="ep-module"
              className={fieldClassName}
              value={form.module_code}
              disabled={saving || mode === "edit"}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  module_code: e.target.value.toLowerCase(),
                }))
              }
              required
            >
              {modules.map((mod) => (
                <option key={mod.module_code} value={mod.module_code}>
                  {mod.module_name} ({mod.module_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="ep-level" required>
              Level
            </FieldLabel>
            <select
              id="ep-level"
              className={fieldClassName}
              value={form.level_code}
              disabled={saving}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  level_code: e.target.value.toLowerCase(),
                }))
              }
              required
            >
              <option value="">Pilih level…</option>
              {levels.map((level) => (
                <option key={level.id} value={level.code.toLowerCase()}>
                  {level.name} ({level.code})
                </option>
              ))}
              {form.level_code &&
              !levels.some(
                (l) => l.code.toLowerCase() === form.level_code,
              ) ? (
                <option value={form.level_code}>{form.level_code}</option>
              ) : null}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700">
              <input
                type="checkbox"
                checked={form.can_edit}
                disabled={saving}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, can_edit: e.target.checked }))
                }
              />
              <span className="text-gray-700 dark:text-gray-200">
                {form.module_code === "workers_grade"
                  ? "Can reveal Grade"
                  : "Can edit"}
              </span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700">
              <input
                type="checkbox"
                checked={form.allow_past}
                disabled={saving || form.module_code === "workers_grade"}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    allow_past: e.target.checked,
                  }))
                }
              />
              <span className="text-gray-700 dark:text-gray-200">
                Allow past (unlimited)
              </span>
            </label>
          </div>

          <div>
            <FieldLabel htmlFor="ep-past-days" required>
              Past days (H-n)
            </FieldLabel>
            <input
              id="ep-past-days"
              type="number"
              min={0}
              step={1}
              className={fieldClassName}
              value={form.past_days}
              disabled={
                saving || form.allow_past || form.module_code === "workers_grade"
              }
              onChange={(e) =>
                setForm((prev) => ({ ...prev, past_days: e.target.value }))
              }
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              {form.module_code === "workers_grade"
                ? "Workers Grade: hanya Can reveal Grade yang dipakai (ikon mata di detail karyawan). Past days diabaikan."
                : form.allow_past
                  ? "Diabaikan saat Allow past aktif."
                  : form.module_code === "sakit"
                    ? "Sickness: 3 = Ubah dan Batalkan hanya sampai 3 hari sejak tanggal dibuat."
                    : "0 = hari ini saja; 3 = H-3."}
            </p>
          </div>

          <div>
            <FieldLabel htmlFor="ep-desc">Description</FieldLabel>
            <input
              id="ep-desc"
              className={fieldClassName}
              value={form.description}
              disabled={saving}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Opsional"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
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
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
