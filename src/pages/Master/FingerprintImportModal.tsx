import { FormEvent, useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/button/Button";
import { CloseIcon } from "../../icons";
import { ApiError } from "../../lib/api";
import { hrMasterService } from "../../services/hrMaster";

type FingerMode = "in" | "out" | "both";
type Step = "form" | "result";
type ResultFilter = "all" | "ok" | "error";

type CategoryOption = { id: string; name: string };

type RowResult = {
  row: number;
  nrp?: string | null;
  date?: string | null;
  shift?: string | null;
  status: "ok" | "error";
  id?: number | null;
  reason?: string | null;
};

type ImportResult = {
  inserted: number;
  skipped: number;
  total: number;
  rows: RowResult[];
  errors: Array<{ row: number; nrp?: string | null; reason: string }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

const fieldClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";

const fileInputClassName =
  "block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:text-gray-200 dark:file:bg-white/10 dark:file:text-white/90";

const MODE_OPTIONS = [
  { id: "in" as const, label: "IN", hint: "Masuk saja" },
  { id: "out" as const, label: "OUT", hint: "Keluar saja" },
  { id: "both" as const, label: "IN + OUT", hint: "Keduanya" },
];

function normalizeResult(data: Partial<ImportResult> | null | undefined): ImportResult {
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const errors = Array.isArray(data?.errors) ? data.errors : [];
  // Backward compat: if API only sent errors, synthesize row list.
  const resolvedRows =
    rows.length > 0
      ? rows
      : errors.map((item) => ({
          row: item.row,
          nrp: item.nrp,
          status: "error" as const,
          reason: item.reason,
        }));
  return {
    inserted: Number(data?.inserted || 0),
    skipped: Number(data?.skipped || 0),
    total: Number(data?.total || resolvedRows.length),
    rows: resolvedRows,
    errors,
  };
}

export default function FingerprintImportModal({
  open,
  onClose,
  onImported,
}: Props) {
  const [step, setStep] = useState<Step>("form");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState<FingerMode>("both");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [filter, setFilter] = useState<ResultFilter>("all");

  useEffect(() => {
    if (!open) return;
    setStep("form");
    setFile(null);
    setCategory("");
    setMode("both");
    setSaving(false);
    setError("");
    setResult(null);
    setFilter("all");

    let cancelled = false;
    hrMasterService
      .list("enums", { type: "workers_fingerprint", page_size: 200 })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        setCategories(
          rows.map((row) => ({
            id: String(row.id ?? ""),
            name: String(row.name ?? row.code ?? row.id ?? ""),
          })),
        );
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

  const filteredRows = useMemo(() => {
    if (!result) return [];
    if (filter === "ok") return result.rows.filter((r) => r.status === "ok");
    if (filter === "error") return result.rows.filter((r) => r.status === "error");
    return result.rows;
  }, [result, filter]);

  if (!open) return null;

  const canSubmit = Boolean(file && category && mode);

  const handleDownloadExample = async () => {
    try {
      setError("");
      await hrMasterService.downloadFingerErrorExample();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to download example file",
      );
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a .xlsx, .xls, or .csv file.");
      return;
    }
    if (!category) {
      setError("Pilih kategori terlebih dahulu.");
      return;
    }
    setSaving(true);
    setError("");
    setResult(null);
    try {
      const response = await hrMasterService.importFingerError(file, {
        category,
        mode,
      });
      const data = normalizeResult(response.data || {});
      setResult(data);
      setFilter(data.skipped > 0 && data.inserted === 0 ? "error" : "all");
      setStep("result");
      if (data.inserted > 0) {
        onImported();
      }
    } catch (err) {
      const body =
        err instanceof ApiError &&
        err.body &&
        typeof err.body === "object" &&
        "data" in err.body
          ? (err.body as { data?: Partial<ImportResult> }).data
          : null;
      if (body && (body.rows?.length || body.errors?.length || body.total)) {
        const data = normalizeResult(body);
        setResult(data);
        setFilter("all");
        setStep("result");
      }
      setError(err instanceof ApiError ? err.message : "Failed to import");
      if (!(body && (body.rows?.length || body.errors?.length))) {
        // stay on form if no per-row data
      }
    } finally {
      setSaving(false);
    }
  };

  const goBackToForm = () => {
    setStep("form");
    setResult(null);
    setError("");
    setFilter("all");
    setFile(null);
  };

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
        aria-label="Close import dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 ${
          step === "result" ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {step === "result"
                ? "Hasil import Fingerprint"
                : "Import Fingerprint"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {step === "result"
                ? "Detail per baris Excel — berhasil atau ditolak."
                : "Semua baris memakai kategori dan mode yang dipilih di sini. Max 500 baris."}
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

        {step === "form" ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="finger-import-category"
                className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Kategori <span className="text-error-500">*</span>
              </label>
              <select
                id="finger-import-category"
                className={fieldClassName}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                disabled={saving}
              >
                <option value="">— Pilih kategori —</option>
                {categories.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Mode finger <span className="text-error-500">*</span>
              </p>
              <div
                className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2 dark:border-gray-700 dark:bg-gray-800/50"
                role="group"
                aria-label="Pilih mode finger"
              >
                {MODE_OPTIONS.map((opt) => {
                  const active = mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={saving}
                      onClick={() => setMode(opt.id)}
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
                          active
                            ? "text-teal-50/90"
                            : "text-slate-500 dark:text-gray-400"
                        }`}
                      >
                        {opt.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-4 text-gray-400 dark:text-gray-500">
                Jam otomatis: Day IN 06:30 / OUT 17:30; Night IN 17:30 / OUT H+1
                06:30 — mengikuti kolom{" "}
                <span className="font-semibold">shift</span> di Excel.
              </p>
            </div>

            <div
              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 dark:border-amber-500/40 dark:bg-amber-500/10"
              role="note"
            >
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Kolom shift di Excel — wajib benar
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-100/90">
                Isi hanya{" "}
                <span className="rounded bg-amber-200/80 px-1.5 py-0.5 font-mono font-bold text-amber-950 dark:bg-amber-400/30 dark:text-amber-50">
                  I
                </span>{" "}
                (siang / Day) atau{" "}
                <span className="rounded bg-amber-200/80 px-1.5 py-0.5 font-mono font-bold text-amber-950 dark:bg-amber-400/30 dark:text-amber-50">
                  II
                </span>{" "}
                (malam / Night). Huruf kapital, tanpa spasi.
              </p>
              <p className="mt-1.5 text-[11px] leading-4 text-amber-700 dark:text-amber-200/80">
                Jangan tulis D, N, Siang, Malam, 1, 2, atau teks lain — baris akan
                ditolak dan tidak masuk sistem. Shift salah juga membuat jam
                default IN/OUT ikut salah.
              </p>
            </div>

            <div>
              <label
                htmlFor="finger-import-file"
                className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                File Excel / CSV
              </label>
              <p className="mb-2 text-[11px] leading-4 text-gray-400 dark:text-gray-500">
                Kolom: date, nrp,{" "}
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  shift (I atau II)
                </span>
                , location, description. Nama dari NRP; jam dari mode + shift.
              </p>
              <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
                <input
                  id="finger-import-file"
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  className={fileInputClassName}
                  disabled={saving}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  aria-label="File Excel atau CSV"
                />
                {file && (
                  <p className="mt-2 text-xs text-gray-500">
                    Dipilih: {file.name}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="!py-2.5"
              onClick={handleDownloadExample}
              disabled={saving}
            >
              Unduh contoh Excel
            </Button>

            {saving && (
              <div
                className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-3 text-sm text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100"
                role="status"
                aria-live="polite"
              >
                <p className="font-medium">Memproses impor…</p>
                <p className="mt-1 text-xs opacity-90">
                  Setiap baris Excel dicek dan disimpan. Setelah selesai, detail
                  per baris akan tampil di layar berikutnya.
                </p>
              </div>
            )}

            {error && !saving && (
              <p className="text-sm text-error-500" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Close
              </Button>
              <Button type="submit" size="sm" disabled={saving || !canSubmit}>
                {saving ? "Importing…" : "Import"}
              </Button>
            </div>
          </form>
        ) : (
          result && (
            <div className="space-y-4">
              {error && (
                <p className="text-sm text-error-500" role="alert">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-white/[0.03]">
                  <p className="text-[11px] text-gray-500">Total</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {result.total}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Berhasil
                  </p>
                  <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                    {result.inserted}
                  </p>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-500/30 dark:bg-rose-500/10">
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    Gagal
                  </p>
                  <p className="text-lg font-semibold text-rose-800 dark:text-rose-200">
                    {result.skipped}
                  </p>
                </div>
              </div>

              <div
                className="flex flex-wrap gap-1.5"
                role="tablist"
                aria-label="Filter hasil baris"
              >
                {(
                  [
                    { id: "all" as const, label: `Semua (${result.total})` },
                    {
                      id: "ok" as const,
                      label: `Berhasil (${result.inserted})`,
                    },
                    {
                      id: "error" as const,
                      label: `Gagal (${result.skipped})`,
                    },
                  ] as const
                ).map((tab) => {
                  const active = filter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFilter(tab.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        active
                          ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="max-h-[min(50vh,28rem)] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Baris</th>
                      <th className="px-3 py-2 font-medium">NRP</th>
                      <th className="px-3 py-2 font-medium">Tanggal</th>
                      <th className="px-3 py-2 font-medium">Shift</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-gray-500"
                        >
                          Tidak ada baris pada filter ini.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((item) => (
                        <tr
                          key={`${item.row}-${item.nrp}-${item.status}`}
                          className={
                            item.status === "ok"
                              ? "bg-emerald-50/40 dark:bg-emerald-500/5"
                              : "bg-rose-50/50 dark:bg-rose-500/5"
                          }
                        >
                          <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">
                            {item.row}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-800 dark:text-gray-100">
                            {item.nrp || "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                            {item.date || "—"}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">
                            {item.shift || "—"}
                          </td>
                          <td className="px-3 py-2">
                            {item.status === "ok" ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                                Berhasil
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-800 dark:bg-rose-500/20 dark:text-rose-200">
                                Gagal
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                            {item.status === "ok"
                              ? item.id
                                ? `Tersimpan (id ${item.id})`
                                : "Tersimpan"
                              : item.reason || "Gagal"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={goBackToForm}
                >
                  Import file lain
                </Button>
                <Button type="button" size="sm" onClick={onClose}>
                  Selesai
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
