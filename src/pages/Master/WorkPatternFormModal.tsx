import { FormEvent, type ReactNode, useEffect, useState } from "react";
import CalendarDateField from "../../components/form/CalendarDateField";
import Button from "../../components/ui/button/Button";
import { CloseIcon } from "../../icons";
import { ApiError } from "../../lib/api";
import {
  hrMasterService,
  type HrWorkPatternPayload,
} from "../../services/hrMaster";

const POLA_KERJA_OPTIONS = [
  "6:1",
  "7:1",
  "3:4:1",
  "5:4:1",
  "13:1",
  "6:7:1",
  "7:6:1",
  "8:5:1",
  "6:1:6:1",
  "7:1:5:1",
  "8:1:4:1",
  "3:3:1",
  "4:2:1",
] as const;

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

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial: Record<string, unknown> | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: HrWorkPatternPayload) => Promise<void>;
};

export default function WorkPatternFormModal({
  open,
  mode,
  initial,
  saving,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState({
    nrp: "",
    full_name: "",
    pola_kerja: "6:1",
    masa_onsite: "",
    cuti_lapangan: "",
    date: "",
    hari_ke: "1",
    remark: "D",
  });
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      const cuti = splitPolaCuti(initial.pola_cuti);
      setForm({
        nrp: String(initial.nrp ?? ""),
        full_name: String(initial.full_name ?? ""),
        pola_kerja: String(initial.pola_kerja ?? "6:1"),
        masa_onsite: cuti.masa,
        cuti_lapangan: cuti.cuti,
        date: toDateInput(initial.date),
        hari_ke: String(initial.hari_ke ?? "1"),
        remark: String(initial.remark ?? "D"),
      });
      setWorkerReady(true);
      setLookupError("");
      return;
    }
    setForm({
      nrp: "",
      full_name: "",
      pola_kerja: "6:1",
      masa_onsite: "",
      cuti_lapangan: "",
      date: "",
      hari_ke: "1",
      remark: "D",
    });
    setWorkerReady(false);
    setLookupError("");
  }, [open, mode, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const lookupWorker = async () => {
    const nrp = form.nrp.trim();
    if (!nrp) {
      setLookupError("NRP is required.");
      setWorkerReady(false);
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    try {
      const result = await hrMasterService.lookupWorkPatternWorker(nrp);
      const worker = result.data;
      if (!worker?.full_name) {
        setWorkerReady(false);
        setLookupError("Worker not found for this NRP.");
        setField("full_name", "");
        return;
      }
      setForm((prev) => ({
        ...prev,
        nrp: String(worker.nrp ?? nrp),
        full_name: String(worker.full_name),
      }));
      setWorkerReady(true);
    } catch (err) {
      setWorkerReady(false);
      setField("full_name", "");
      setLookupError(
        err instanceof ApiError ? err.message : "Failed to lookup worker",
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!workerReady && mode === "create") {
      setLookupError("Lookup NRP first.");
      return;
    }
    const payload: HrWorkPatternPayload = {
      nrp: form.nrp.trim(),
      date: form.date,
      pola_kerja: form.pola_kerja,
      masa_onsite: form.masa_onsite,
      cuti_lapangan: form.cuti_lapangan,
      hari_ke: Number(form.hari_ke),
      remark: form.remark || null,
    };
    await onSubmit(payload);
  };

  const fieldsEnabled = mode === "edit" || workerReady;

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
              {mode === "create" ? "Tambah" : "Ubah"} Work Pattern
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Isi pola seed per karyawan. Field bertanda * wajib diisi.
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
          <div>
            <FieldLabel htmlFor="pola-nrp" required>
              NRP
            </FieldLabel>
            <div className="flex gap-2">
              <input
                id="pola-nrp"
                className={fieldClassName}
                placeholder="Contoh: 0216691"
                value={form.nrp}
                onChange={(e) => {
                  setWorkerReady(false);
                  setField("nrp", e.target.value);
                  setField("full_name", "");
                }}
                required
                disabled={mode === "edit"}
              />
              {mode === "create" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 self-end !py-2.5"
                  onClick={lookupWorker}
                  disabled={lookupLoading || !form.nrp.trim()}
                >
                  {lookupLoading ? "…" : "Cari"}
                </Button>
              )}
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="pola-full-name">Nama Karyawan</FieldLabel>
            <input
              id="pola-full-name"
              className={fieldClassName}
              placeholder="Otomatis dari NRP"
              value={form.full_name}
              readOnly
              disabled
            />
            {lookupError && (
              <p className="mt-1.5 text-sm text-error-500" role="alert">
                {lookupError}
              </p>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="work-pattern" required>
              Pola Kerja
            </FieldLabel>
            <select
              id="work-pattern"
              className={fieldClassName}
              value={form.pola_kerja}
              onChange={(e) => setField("pola_kerja", e.target.value)}
              disabled={!fieldsEnabled}
              required
            >
              {POLA_KERJA_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              {form.pola_kerja &&
                !(POLA_KERJA_OPTIONS as readonly string[]).includes(
                  form.pola_kerja,
                ) && (
                  <option value={form.pola_kerja}>{form.pola_kerja}</option>
                )}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Format siklus kerja:off (contoh 6:1 = 6 hari kerja, 1 hari OFF).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="pola-masa-onsite" required>
                Masa Onsite
              </FieldLabel>
              <input
                id="pola-masa-onsite"
                className={fieldClassName}
                type="number"
                min={0}
                placeholder="Contoh: 70"
                value={form.masa_onsite}
                onChange={(e) => setField("masa_onsite", e.target.value)}
                disabled={!fieldsEnabled}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Jumlah hari onsite (bagian kiri pola cuti).
              </p>
            </div>
            <div>
              <FieldLabel htmlFor="pola-cuti-lapangan" required>
                Jatah Cuti Lapangan
              </FieldLabel>
              <input
                id="pola-cuti-lapangan"
                className={fieldClassName}
                type="number"
                min={0}
                placeholder="Contoh: 14"
                value={form.cuti_lapangan}
                onChange={(e) => setField("cuti_lapangan", e.target.value)}
                disabled={!fieldsEnabled}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Disimpan sebagai pola cuti: masa_onsite:cuti_lapangan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="pola-date" required>
                Tanggal
              </FieldLabel>
              <CalendarDateField
                id="pola-date"
                value={form.date}
                onChange={(date) => setField("date", date)}
                disabled={!fieldsEnabled}
                placeholder="Pilih tanggal"
                inputClassName={`${fieldClassName} pr-10`}
              />
            </div>
            <div>
              <FieldLabel htmlFor="pola-hari-ke" required>
                Hari Kerja Ke-
              </FieldLabel>
              <input
                id="pola-hari-ke"
                className={fieldClassName}
                type="number"
                min={1}
                placeholder="Contoh: 1"
                value={form.hari_ke}
                onChange={(e) => setField("hari_ke", e.target.value)}
                disabled={!fieldsEnabled}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Posisi hari dalam siklus pola kerja.
              </p>
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="pola-remark">Keterangan / Status</FieldLabel>
            <select
              id="pola-remark"
              className={fieldClassName}
              value={form.remark}
              onChange={(e) => setField("remark", e.target.value)}
              disabled={!fieldsEnabled}
            >
              {REMARK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              {form.remark &&
                !REMARK_OPTIONS.some((o) => o.value === form.remark) && (
                  <option value={form.remark}>{form.remark}</option>
                )}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Status shift awal: D (Siang), N (Malam), atau OFF.
            </p>
          </div>

          {error && (
            <p className="text-sm text-error-500" role="alert">
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
            <Button
              type="submit"
              size="sm"
              disabled={saving || (mode === "create" && !workerReady)}
            >
              {saving ? "Menyimpan…" : mode === "create" ? "Simpan" : "Update"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
