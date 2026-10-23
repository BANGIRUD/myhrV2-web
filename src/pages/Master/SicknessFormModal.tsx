import { FormEvent, type ReactNode, useEffect, useState } from "react";
import CalendarDateField from "../../components/form/CalendarDateField";
import Button from "../../components/ui/button/Button";
import { CloseIcon } from "../../icons";
import { ApiError } from "../../lib/api";
import {
  hrMasterService,
  type HrActiveSubmission,
  type HrSicknessPayload,
} from "../../services/hrMaster";

const CATEGORY_OPTIONS = [
  { value: "outpatient", label: "Rawat Jalan" },
  { value: "inpatient", label: "Rawat Inap" },
  { value: "pasca", label: "Pasca Rawat Inap" },
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

function todayIso(): string {
  const d = new Date();
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
  onSubmit: (payload: HrSicknessPayload, files?: File[]) => Promise<void>;
};

export default function SicknessFormModal({
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
    date_issue: todayIso(),
    category: "outpatient",
    name_doctor: "",
    name_agency: "",
    diagnosa: "",
    start_date: "",
    end_date: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const [activeSubs, setActiveSubs] = useState<HrActiveSubmission[]>([]);
  const [activeTotal, setActiveTotal] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm({
        nrp: String(initial.nrp ?? ""),
        full_name: String(initial.full_name ?? ""),
        date_issue: toDateInput(initial.date_issue) || todayIso(),
        category: String(initial.category ?? "outpatient").toLowerCase(),
        name_doctor: String(initial.name_doctor ?? ""),
        name_agency: String(initial.name_agency ?? ""),
        diagnosa: String(initial.diagnosa ?? ""),
        start_date: toDateInput(initial.start_date),
        end_date: toDateInput(initial.end_date),
      });
      setWorkerReady(true);
      setLookupError("");
      setActiveSubs([]);
      setActiveTotal(0);
      setFiles([]);
      return;
    }
    setForm({
      nrp: "",
      full_name: "",
      date_issue: todayIso(),
      category: "outpatient",
      name_doctor: "",
      name_agency: "",
      diagnosa: "",
      start_date: "",
      end_date: "",
    });
    setWorkerReady(false);
    setLookupError("");
    setActiveSubs([]);
      setActiveTotal(0);
    setFiles([]);
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
      setLookupError("NRP wajib diisi.");
      setWorkerReady(false);
      setActiveSubs([]);
      setActiveTotal(0);
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    try {
      const result = await hrMasterService.lookupSicknessWorker(nrp);
      const worker = result.data;
      if (!worker?.full_name) {
        setWorkerReady(false);
        setLookupError("Karyawan tidak ditemukan untuk NRP ini.");
        setActiveSubs([]);
      setActiveTotal(0);
        setField("full_name", "");
        return;
      }
      setForm((prev) => ({
        ...prev,
        nrp: String(worker.nrp ?? nrp),
        full_name: String(worker.full_name),
      }));
      setActiveSubs(worker.active_submissions ?? []);
      setActiveTotal(
        worker.active_submissions_total ?? worker.active_submissions?.length ?? 0,
      );
      setWorkerReady(true);
    } catch (err) {
      setWorkerReady(false);
      setActiveSubs([]);
      setActiveTotal(0);
      setField("full_name", "");
      setLookupError(
        err instanceof ApiError ? err.message : "Gagal mencari karyawan",
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!workerReady && mode === "create") {
      setLookupError("Cari NRP terlebih dahulu.");
      return;
    }
    const payload: HrSicknessPayload = {
      nrp: form.nrp.trim(),
      full_name: form.full_name.trim() || null,
      date_issue: form.date_issue,
      category: form.category,
      name_doctor: form.name_doctor.trim(),
      name_agency: form.name_agency.trim(),
      diagnosa: form.diagnosa.trim(),
      start_date: form.start_date,
      end_date: form.end_date.trim() || null,
    };
    await onSubmit(payload, mode === "create" ? files : undefined);
  };

  const fieldsEnabled = mode === "edit" || workerReady;

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[3px]"
        aria-label="Close form"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-sky-50 via-white to-white px-5 py-4 dark:border-gray-800 dark:from-sky-500/10 dark:via-gray-900 dark:to-gray-900">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm dark:bg-sky-500/20 dark:text-sky-300">
              <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden>
                <path
                  d="M10 3.5v13M6 7.5c0-1.7 1.8-3 4-3s4 1.3 4 3-1.8 3-4 3-4 1.3-4 3 1.8 3 4 3 4-1.3 4-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white/90">
                {mode === "create" ? "Tambah" : "Ubah"} Pengajuan Sickness
              </h3>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-gray-400">
                {mode === "create"
                  ? "Status awal Waiting Section Head. Bukti opsional (max 5, 1MB)."
                  : "Hanya pending ≤ 3 hari sejak dibuat. Foto tidak diubah di sini."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-white/10 dark:text-gray-300"
            aria-label="Close"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <form
          className="max-h-[calc(90vh-7rem)] space-y-4 overflow-y-auto px-5 py-4"
          onSubmit={handleSubmit}
          noValidate
        >
          <div>
            <FieldLabel htmlFor="sakit-nrp" required>
              NRP
            </FieldLabel>
            <div className="flex gap-2">
              <input
                id="sakit-nrp"
                className={fieldClassName}
                placeholder="Contoh: 0216691"
                value={form.nrp}
                onChange={(e) => {
                  setWorkerReady(false);
                  setActiveSubs([]);
      setActiveTotal(0);
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
            <FieldLabel htmlFor="sakit-full-name">Nama Karyawan</FieldLabel>
            <input
              id="sakit-full-name"
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
            {mode === "create" && activeSubs.length > 0 && (
              <div
                role="status"
                className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
              >
                <p className="font-medium">
                  NRP ini sudah punya pengajuan. Tanggal yang sama tidak bisa diajukan lagi, termasuk sebagai ijin.
                </p>
                <ul className="mt-1 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-4">
                  {activeSubs.map((row) => (
                    <li key={`${row.kind ?? "sickness"}-${row.id}`}>
                      {row.kind === "permit" ? "Ijin" : row.kind === "sickness" ? "Sakit" : "Pengajuan"}
                      {" · "}
                      {row.start_date ?? "Tanpa tanggal mulai"}
                      {row.end_date ? ` – ${row.end_date}` : " (tanpa tanggal akhir)"}
                      {row.progress ? ` · ${row.progress}` : ""}
                      {row.entered_by ? ` · diinput ${row.entered_by}` : ""}
                    </li>
                  ))}
                </ul>
                {activeTotal > activeSubs.length && (
                  <p className="mt-2">contact administrator for more info</p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="sakit-date-issue" required>
                Tanggal terbit
              </FieldLabel>
              <CalendarDateField
                id="sakit-date-issue"
                value={form.date_issue}
                onChange={(v) => setField("date_issue", v)}
                disabled={!fieldsEnabled}
                inputClassName={`${fieldClassName} pr-10`}
              />
            </div>
            <div>
              <FieldLabel htmlFor="sakit-category" required>
                Kategori
              </FieldLabel>
              <select
                id="sakit-category"
                className={fieldClassName}
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                disabled={!fieldsEnabled}
                required
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="sakit-doctor" required>
                Dokter
              </FieldLabel>
              <input
                id="sakit-doctor"
                className={fieldClassName}
                value={form.name_doctor}
                onChange={(e) => setField("name_doctor", e.target.value)}
                disabled={!fieldsEnabled}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="sakit-agency" required>
                Instansi
              </FieldLabel>
              <input
                id="sakit-agency"
                className={fieldClassName}
                value={form.name_agency}
                onChange={(e) => setField("name_agency", e.target.value)}
                disabled={!fieldsEnabled}
                required
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="sakit-diagnosa" required>
              Diagnosa
            </FieldLabel>
            <input
              id="sakit-diagnosa"
              className={fieldClassName}
              value={form.diagnosa}
              onChange={(e) => setField("diagnosa", e.target.value)}
              disabled={!fieldsEnabled}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="sakit-start" required>
                Tanggal mulai
              </FieldLabel>
              <CalendarDateField
                id="sakit-start"
                value={form.start_date}
                onChange={(v) => setField("start_date", v)}
                disabled={!fieldsEnabled}
                inputClassName={`${fieldClassName} pr-10`}
              />
            </div>
            <div>
              <FieldLabel htmlFor="sakit-end">Tanggal akhir</FieldLabel>
              <CalendarDateField
                id="sakit-end"
                value={form.end_date}
                onChange={(v) => setField("end_date", v)}
                disabled={!fieldsEnabled}
                inputClassName={`${fieldClassName} pr-10`}
              />
              <p className="mt-1 text-xs text-gray-400">
                Kosongkan jika belum ada (lampiran / rawat inap).
              </p>
            </div>
          </div>

          {mode === "create" && (
            <div>
              <FieldLabel htmlFor="sakit-files">Bukti (opsional)</FieldLabel>
              <input
                id="sakit-files"
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.pdf,image/jpeg,image/png,image/gif,application/pdf"
                multiple
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:text-gray-300 dark:file:bg-brand-500/15 dark:file:text-brand-300"
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []).slice(0, 5);
                  setFiles(list);
                }}
              />
              {files.length > 0 && (
                <p className="mt-1.5 text-xs text-gray-500">
                  {files.length} file dipilih
                  {files.length >= 5 ? " (maks. 5)" : ""}.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-error-500" role="alert">
              {error}
            </p>
          )}

          <div className="sticky bottom-0 -mx-5 mt-2 flex justify-end gap-2 border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="!px-3.5"
            >
              Tutup
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !fieldsEnabled}
              className="!px-3.5"
            >
              {saving ? "Menyimpan…" : mode === "create" ? "Simpan" : "Update"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
