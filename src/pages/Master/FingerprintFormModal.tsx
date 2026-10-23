import { FormEvent, type ReactNode, useEffect, useState } from "react";
import CalendarDateField from "../../components/form/CalendarDateField";
import Button from "../../components/ui/button/Button";
import { CloseIcon } from "../../icons";
import { ApiError } from "../../lib/api";
import {
  hrMasterService,
  type HrFingerErrorPayload,
} from "../../services/hrMaster";

type CategoryOption = {
  id: string;
  name: string;
  description: string;
};

type FingerMode = "in" | "out" | "both";

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

/** datetime-local value YYYY-MM-DDTHH:mm */
function toDateTimeLocal(value: unknown): string {
  if (!value) return "";
  const raw = String(value).trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw.slice(0, 16);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function inferMode(fingerIn: string, fingerOut: string): FingerMode {
  if (fingerIn && fingerOut) return "both";
  if (fingerOut) return "out";
  return "in";
}

/** Shift I → roster D (Siang); Shift II → roster N (Malam). */
function rosterFromShift(shift: string): "D" | "N" {
  return String(shift).trim().toUpperCase() === "II" ? "N" : "D";
}

function rosterDisplay(remark: string): string {
  const code = String(remark).trim().toUpperCase();
  if (code === "N") return "N · Malam";
  return "D · Siang";
}

function isNightShift(shift: string): boolean {
  return String(shift).trim().toUpperCase() === "II";
}

/** YYYY-MM-DD → next calendar day YYYY-MM-DD */
function addDaysYmd(ymd: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function datePartOfDateTimeLocal(value: string): string {
  if (!value) return "";
  return value.slice(0, 10);
}

/**
 * Night shift (II): finger out is the next morning after tanggal hadir.
 * Day shift (I): finger out stays on tanggal hadir.
 */
function fingerOutBounds(
  tanggalHadir: string,
  shift: string,
): { min?: string; max?: string; defaultOut?: string; hint: string } {
  if (!tanggalHadir) {
    return {
      hint: "Isi Tanggal Hadir dulu agar batas tanggal Finger Out mengikuti shift.",
    };
  }
  if (isNightShift(shift)) {
    const next = addDaysYmd(tanggalHadir, 1);
    return {
      min: `${next}T00:00`,
      defaultOut: `${next}T06:30`,
      hint: `Shift malam: Finger Out harus tanggal ${formatIdDate(next)} (pagi setelah Tanggal Hadir ${formatIdDate(tanggalHadir)}). Tanggal hadir tidak boleh dipakai untuk jam keluar.`,
    };
  }
  return {
    min: `${tanggalHadir}T00:00`,
    max: `${tanggalHadir}T23:59`,
    defaultOut: `${tanggalHadir}T17:30`,
    hint: `Shift siang: Finger Out pada Tanggal Hadir ${formatIdDate(tanggalHadir)} (hari yang sama).`,
  };
}

/** Default Finger In for Tanggal Hadir + shift (day 06:30, night 17:30). */
function defaultFingerIn(tanggalHadir: string, shift: string): string {
  if (!tanggalHadir) return "";
  if (isNightShift(shift)) return `${tanggalHadir}T17:30`;
  return `${tanggalHadir}T06:30`;
}

function formatIdDate(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split("-").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

function isFingerOutValid(
  fingerOut: string,
  tanggalHadir: string,
  shift: string,
): boolean {
  if (!fingerOut || !tanggalHadir) return false;
  const outDay = datePartOfDateTimeLocal(fingerOut);
  if (isNightShift(shift)) {
    return outDay >= addDaysYmd(tanggalHadir, 1);
  }
  return outDay === tanggalHadir;
}

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial: Record<string, unknown> | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: HrFingerErrorPayload, files?: File[]) => Promise<void>;
};

export default function FingerprintFormModal({
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
    category: "",
    date: "",
    finger_in: "",
    finger_out: "",
    shift: "I",
    remark: "D",
    location: "",
    description: "",
  });
  const [fingerMode, setFingerMode] = useState<FingerMode>("in");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      const fingerIn = toDateTimeLocal(initial.finger_in);
      const fingerOut = toDateTimeLocal(initial.finger_out);
      const shift = String(initial.shift ?? "I") || "I";
      setForm({
        nrp: String(initial.nrp ?? ""),
        full_name: String(initial.full_name ?? ""),
        category: String(initial.category ?? ""),
        date: toDateInput(initial.date),
        finger_in: fingerIn,
        finger_out: fingerOut,
        shift,
        remark: rosterFromShift(shift),
        location: String(initial.location ?? ""),
        description: String(initial.description ?? ""),
      });
      setFingerMode(inferMode(fingerIn, fingerOut));
      setWorkerReady(true);
      setLookupError("");
      setFiles([]);
      return;
    }
    setForm({
      nrp: "",
      full_name: "",
      category: "",
      date: "",
      finger_in: "",
      finger_out: "",
      shift: "I",
      remark: rosterFromShift("I"),
      location: "",
      description: "",
    });
    setFingerMode("in");
    setWorkerReady(false);
    setLookupError("");
    setFiles([]);
  }, [open, mode, initial]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    hrMasterService
      .list("enums", { type: "workers_fingerprint", page_size: 200 })
      .then((result) => {
        if (cancelled) return;
        const options = (result.data || [])
          .map((row) => ({
            id: String(row.id ?? ""),
            name: String(row.name ?? row.id ?? ""),
            description: String(row.description ?? "").trim(),
          }))
          .filter((row) => row.id);
        setCategories(options);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /** Keep Finger Out date in range when Tanggal Hadir / shift / mode change. */
  useEffect(() => {
    if (!open) return;
    if (fingerMode === "in") return;
    if (!form.date) return;
    const bounds = fingerOutBounds(form.date, form.shift);
    setForm((prev) => {
      const current = prev.finger_out.trim();
      const outDay = datePartOfDateTimeLocal(current);
      const night = isNightShift(prev.shift);
      const invalid = !current
        ? false
        : night
          ? outDay < addDaysYmd(prev.date, 1)
          : outDay !== prev.date;
      if (!invalid && current) return prev;
      if (!bounds.defaultOut) return prev;
      // Only auto-fill / correct when empty or clearly wrong for the shift rule.
      if (!current || invalid) {
        return { ...prev, finger_out: bounds.defaultOut };
      }
      return prev;
    });
  }, [open, form.date, form.shift, fingerMode]);

  /** Default Finger In when Tanggal Hadir / shift / mode change (empty only). */
  useEffect(() => {
    if (!open) return;
    if (fingerMode === "out") return;
    if (!form.date) return;
    const nextIn = defaultFingerIn(form.date, form.shift);
    if (!nextIn) return;
    setForm((prev) => {
      if (prev.finger_in.trim()) return prev;
      return { ...prev, finger_in: nextIn };
    });
  }, [open, form.date, form.shift, fingerMode]);

  if (!open) return null;

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setShift = (shift: string) => {
    setForm((prev) => ({
      ...prev,
      shift,
      remark: rosterFromShift(shift),
    }));
  };

  const applyFingerMode = (next: FingerMode) => {
    setFingerMode(next);
    setForm((prev) => ({
      ...prev,
      finger_in: next === "out" ? "" : prev.finger_in,
      finger_out: next === "in" ? "" : prev.finger_out,
    }));
  };

  const lookupWorker = async () => {
    const nrp = form.nrp.trim();
    if (!nrp) {
      setLookupError("NRP wajib diisi.");
      setWorkerReady(false);
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    try {
      const result = await hrMasterService.lookupFingerErrorWorker(nrp);
      const worker = result.data;
      if (!worker?.full_name) {
        setWorkerReady(false);
        setLookupError("Karyawan tidak ditemukan untuk NRP ini.");
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
    const fingerIn =
      fingerMode === "out" ? null : form.finger_in.trim() || null;
    const fingerOut =
      fingerMode === "in" ? null : form.finger_out.trim() || null;
    if (!fingerIn && !fingerOut) {
      setLookupError("Isi minimal Finger In atau Finger Out.");
      return;
    }
    if (
      fingerOut &&
      form.date &&
      !isFingerOutValid(fingerOut, form.date, form.shift)
    ) {
      setLookupError(
        isNightShift(form.shift)
          ? "Shift malam: Finger Out harus tanggal setelah Tanggal Hadir (pagi hari berikutnya), bukan tanggal hadir itu sendiri."
          : "Shift siang: Finger Out harus pada Tanggal Hadir yang sama.",
      );
      return;
    }
    const payload: HrFingerErrorPayload = {
      nrp: form.nrp.trim(),
      full_name: form.full_name.trim() || null,
      category: form.category,
      date: form.date,
      finger_in: fingerIn,
      finger_out: fingerOut,
      shift: form.shift || null,
      remark: rosterFromShift(form.shift),
      location: form.location.trim() || null,
      description: form.description.trim() || null,
    };
    await onSubmit(payload, mode === "create" ? files : undefined);
  };

  const fieldsEnabled = mode === "edit" || workerReady;
  const outBounds = fingerOutBounds(form.date, form.shift);
  const showFingerOut = fingerMode !== "in";
  const showFingerIn = fingerMode !== "out";

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
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-teal-50 via-white to-white px-5 py-4 dark:border-gray-800 dark:from-teal-500/10 dark:via-gray-900 dark:to-gray-900">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 shadow-sm dark:bg-teal-500/20 dark:text-teal-300">
              <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden>
                <path
                  d="M10 2.5c-1.2 0-2.2.9-2.2 2.1v1.2c-2 .5-3.5 2.3-3.5 4.4v.8c0 1.2.5 2.3 1.3 3.1l.4.4v1.5c0 .6.5 1.1 1.1 1.1h5.8c.6 0 1.1-.5 1.1-1.1v-1.5l.4-.4c.8-.8 1.3-1.9 1.3-3.1v-.8c0-2.1-1.5-3.9-3.5-4.4V4.6c0-1.2-1-2.1-2.2-2.1Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white/90">
                {mode === "create" ? "Tambah" : "Ubah"} Fingerprint
              </h3>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-gray-400">
                {mode === "create"
                  ? "Koreksi finger in/out. Bukti opsional (max 5, 1MB)."
                  : "Hanya pending dalam jendela edit policy. Foto tidak diubah di sini."}
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
            <FieldLabel htmlFor="finger-nrp" required>
              NRP
            </FieldLabel>
            <div className="flex gap-2">
              <input
                id="finger-nrp"
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
            <FieldLabel htmlFor="finger-full-name">Nama Karyawan</FieldLabel>
            <input
              id="finger-full-name"
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
            <FieldLabel htmlFor="finger-category" required>
              Kategori
            </FieldLabel>
            <select
              id="finger-category"
              className={fieldClassName}
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              disabled={!fieldsEnabled}
              required
            >
              <option value="">Pilih kategori</option>
              {categories.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.description
                    ? `${opt.name} — ${opt.description}`
                    : opt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="finger-date" required>
              Tanggal Hadir
            </FieldLabel>
            <CalendarDateField
              id="finger-date"
              value={form.date}
              onChange={(v) => setField("date", v)}
              disabled={!fieldsEnabled}
              inputClassName={`${fieldClassName} pr-10`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="finger-shift">Shift</FieldLabel>
              <select
                id="finger-shift"
                className={fieldClassName}
                value={form.shift}
                onChange={(e) => setShift(e.target.value)}
                disabled={!fieldsEnabled}
              >
                <option value="I">I (mengikat roster D · Siang)</option>
                <option value="II">II (mengikat roster N · Malam)</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="finger-remark">Roster</FieldLabel>
              <input
                id="finger-remark"
                className={fieldClassName}
                value={rosterDisplay(form.remark)}
                readOnly
                disabled
                title="Roster mengikuti shift: I → D Siang, II → N Malam"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">
                Otomatis dari shift — tidak bisa diganti manual.
              </p>
            </div>
          </div>

          <div>
            <p className={`${labelClassName} text-sm font-semibold text-slate-700 dark:text-gray-200`}>
              Mode finger <span className="text-error-500">*</span>
            </p>
            <div
              className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2 dark:border-gray-700 dark:bg-gray-800/50"
              role="group"
              aria-label="Pilih mode finger"
            >
              {(
                [
                  { id: "in", label: "IN", hint: "Masuk saja" },
                  { id: "out", label: "OUT", hint: "Keluar saja" },
                  { id: "both", label: "IN + OUT", hint: "Keduanya" },
                ] as const
              ).map((opt) => {
                const active = fingerMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!fieldsEnabled}
                    onClick={() => applyFingerMode(opt.id)}
                    className={`flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg px-2 py-2.5 text-center transition ${
                      active
                        ? "bg-teal-600 text-white shadow-md ring-2 ring-teal-500/40"
                        : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-teal-50 hover:ring-teal-200 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-teal-500/10"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <span className="text-sm font-bold tracking-wide sm:text-base">
                      {opt.label}
                    </span>
                    <span
                      className={`mt-0.5 text-[11px] font-medium ${
                        active ? "text-teal-50/90" : "text-slate-500 dark:text-gray-400"
                      }`}
                    >
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-gray-300">
              <span className="font-semibold text-slate-800 dark:text-gray-100">
                Wajib dipilih
              </span>{" "}
              sesuai data yang diinput:{" "}
              <span className="font-medium">IN</span> jika hanya koreksi jam
              masuk, <span className="font-medium">OUT</span> jika hanya jam
              keluar, atau <span className="font-medium">IN + OUT</span> jika
              keduanya sekaligus dalam satu pengajuan.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {showFingerIn ? (
              <div>
                <FieldLabel htmlFor="finger-in" required={fingerMode === "in"}>
                  Finger In
                </FieldLabel>
                <input
                  id="finger-in"
                  type="datetime-local"
                  className={fieldClassName}
                  value={form.finger_in}
                  onChange={(e) => setField("finger_in", e.target.value)}
                  disabled={!fieldsEnabled}
                  required={fingerMode === "in" || fingerMode === "both"}
                  min={form.date ? `${form.date}T00:00` : undefined}
                  max={
                    form.date && isNightShift(form.shift)
                      ? `${form.date}T23:59`
                      : form.date
                        ? `${form.date}T23:59`
                        : undefined
                  }
                />
                {form.date && isNightShift(form.shift) ? (
                  <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-gray-400">
                    Shift malam: Finger In biasanya malam Tanggal Hadir (
                    {formatIdDate(form.date)}).
                  </p>
                ) : null}
              </div>
            ) : null}
            {showFingerOut ? (
              <div>
                <FieldLabel htmlFor="finger-out" required={fingerMode === "out"}>
                  Finger Out
                </FieldLabel>
                <input
                  id="finger-out"
                  type="datetime-local"
                  className={fieldClassName}
                  value={form.finger_out}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (
                      form.date &&
                      next &&
                      !isFingerOutValid(next, form.date, form.shift)
                    ) {
                      setLookupError(
                        isNightShift(form.shift)
                          ? "Tanggal Finger Out tidak valid untuk shift malam. Pilih pagi hari setelah Tanggal Hadir."
                          : "Tanggal Finger Out harus sama dengan Tanggal Hadir (shift siang).",
                      );
                      return;
                    }
                    setLookupError("");
                    setField("finger_out", next);
                  }}
                  disabled={!fieldsEnabled || !form.date}
                  required={fingerMode === "out" || fingerMode === "both"}
                  min={outBounds.min}
                  max={outBounds.max}
                />
                <p
                  className={`mt-1 text-[11px] leading-4 ${
                    isNightShift(form.shift)
                      ? "font-medium text-amber-800 dark:text-amber-200"
                      : "text-slate-500 dark:text-gray-400"
                  }`}
                >
                  {outBounds.hint}
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <FieldLabel htmlFor="finger-location">Lokasi</FieldLabel>
            <input
              id="finger-location"
              className={fieldClassName}
              placeholder="Opsional"
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              disabled={!fieldsEnabled}
            />
          </div>

          <div>
            <FieldLabel htmlFor="finger-description">Keterangan</FieldLabel>
            <textarea
              id="finger-description"
              className={`${fieldClassName} h-20 resize-y py-2.5`}
              placeholder="Opsional"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              disabled={!fieldsEnabled}
            />
          </div>

          {mode === "create" && (
            <div>
              <FieldLabel htmlFor="finger-files">Bukti (opsional)</FieldLabel>
              <input
                id="finger-files"
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
