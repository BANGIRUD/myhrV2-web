import { FormEvent, type ReactNode, useEffect, useState } from "react";
import Button from "../../components/ui/button/Button";
import { CloseIcon } from "../../icons";
import { formatDisplayDate } from "../../utils/dateShift";

const REMARK_OPTIONS = [
  { value: "D", label: "Siang (D)" },
  { value: "N", label: "Malam (N)" },
  { value: "OFF", label: "OFF" },
] as const;

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

function splitPolaCuti(value: unknown): { masa: string; cuti: string } {
  const raw = String(value ?? "");
  const [masa = "", cuti = ""] = raw.split(":");
  return { masa, cuti };
}

function toDateInput(value: unknown): string {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayIsoLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Subtract calendar days from YYYY-MM-DD (local). */
function shiftIsoDays(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

type Props = {
  open: boolean;
  initial: Record<string, unknown> | null;
  saving: boolean;
  error: string;
  /**
   * How many past calendar days may still be edited (H-n).
   * `null` = unlimited (superadmin). `3` = admin_section. `0` = today+ only.
   */
  pastDaysAllowed: number | null;
  canUpdate: boolean;
  onClose: () => void;
  onSubmit: (payload: { remark: string }) => Promise<void>;
};

export default function RosterFormModal({
  open,
  initial,
  saving,
  error,
  pastDaysAllowed,
  canUpdate,
  onClose,
  onSubmit,
}: Props) {
  const [remark, setRemark] = useState("D");

  const dateIso = toDateInput(initial?.date);
  const today = todayIsoLocal();
  const minEditable =
    pastDaysAllowed == null
      ? null
      : shiftIsoDays(today, -Math.max(0, pastDaysAllowed));
  const locked = Boolean(
    dateIso && minEditable != null && dateIso < minEditable,
  );
  const editable = canUpdate && !locked;
  const lockHint =
    pastDaysAllowed == null
      ? ""
      : pastDaysAllowed > 0
        ? ` · di luar jendela H-${pastDaysAllowed} (tidak dapat diubah)`
        : " · tanggal lewat (tidak dapat diubah)";

  useEffect(() => {
    if (!open) return;
    const code = String(initial?.remark ?? "D")
      .trim()
      .toUpperCase();
    setRemark(["D", "N", "OFF"].includes(code) ? code : "D");
  }, [open, initial]);

  if (!open || !initial) return null;

  const cuti = splitPolaCuti(initial.pola_cuti);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;
    await onSubmit({ remark });
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
        aria-labelledby="roster-kerja-modal-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2
              id="roster-kerja-modal-title"
              className="text-lg font-semibold text-gray-800 dark:text-white/90"
            >
              {editable ? "Update Roster" : "Detail Roster"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {formatDisplayDate(dateIso || String(initial.date ?? ""))}
              {locked ? lockHint : " · status absen harian"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="roster-nrp">NRP</FieldLabel>
              <input
                id="roster-nrp"
                className={fieldClassName}
                value={String(initial.nrp ?? "")}
                disabled
                readOnly
              />
            </div>
            <div>
              <FieldLabel htmlFor="roster-name">Nama Karyawan</FieldLabel>
              <input
                id="roster-name"
                className={fieldClassName}
                value={String(initial.full_name ?? "")}
                disabled
                readOnly
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="roster-pola">Pola Kerja</FieldLabel>
              <input
                id="roster-pola"
                className={fieldClassName}
                value={String(initial.pola_kerja ?? "")}
                disabled
                readOnly
              />
            </div>
            <div>
              <FieldLabel htmlFor="roster-masa">Masa Onsite</FieldLabel>
              <input
                id="roster-masa"
                className={fieldClassName}
                value={cuti.masa}
                disabled
                readOnly
              />
            </div>
            <div>
              <FieldLabel htmlFor="roster-cuti">Cuti Lapangan</FieldLabel>
              <input
                id="roster-cuti"
                className={fieldClassName}
                value={cuti.cuti}
                disabled
                readOnly
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="roster-date">Tanggal</FieldLabel>
              <input
                id="roster-date"
                className={fieldClassName}
                value={dateIso}
                disabled
                readOnly
              />
            </div>
            <div>
              <FieldLabel htmlFor="roster-hari">Hari Kerja Ke</FieldLabel>
              <input
                id="roster-hari"
                className={fieldClassName}
                value={
                  initial.hari_ke != null && String(initial.hari_ke) !== ""
                    ? String(initial.hari_ke)
                    : ""
                }
                disabled
                readOnly
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="roster-remark" required={editable}>
              Status Absen
            </FieldLabel>
            <select
              id="roster-remark"
              className={fieldClassName}
              value={remark}
              disabled={!editable || saving}
              onChange={(e) => setRemark(e.target.value)}
            >
              {REMARK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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
              {editable ? "Batal" : "Tutup"}
            </Button>
            {editable ? (
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Menyimpan…" : "Update"}
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
