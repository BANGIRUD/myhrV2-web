import { FormEvent, useEffect, useState } from "react";
import CalendarMonthField from "../../components/form/CalendarMonthField";
import Button from "../../components/ui/button/Button";
import { CloseIcon } from "../../icons";
import { ApiError } from "../../lib/api";
import { hrMasterService } from "../../services/hrMaster";

type PreviewRow = {
  date?: string;
  nrp?: string;
  full_name?: string;
  pola_kerja?: string;
  pola_cuti?: string;
  hari_ke?: number | string;
  remark?: string;
};

type Props = {
  open: boolean;
  month: string;
  onClose: () => void;
  onGenerated: () => void;
};

const fieldClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function toDateLabel(value: unknown): string {
  if (!value) return "—";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return raw;
}

export default function WorkPatternGenerateModal({
  open,
  month,
  onClose,
  onGenerated,
}: Props) {
  const [formMonth, setFormMonth] = useState(month);
  const [nrp, setNrp] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [resultMsg, setResultMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setFormMonth(month);
    setNrp("");
    setPreview([]);
    setLoadingPreview(false);
    setGenerating(false);
    setError("");
    setResultMsg("");
  }, [open, month]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !generating) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, generating]);

  if (!open) return null;

  const loadPreview = async () => {
    setLoadingPreview(true);
    setError("");
    setResultMsg("");
    try {
      const res = await hrMasterService.previewGenerateWorkPattern({
        month: formMonth,
        nrp: nrp.trim() || undefined,
      });
      setPreview((res.data || []) as PreviewRow[]);
      if (!(res.data || []).length) {
        setError(res.message || "Tidak ada data untuk digenerate.");
      }
    } catch (err) {
      setPreview([]);
      setError(
        err instanceof ApiError ? err.message : "Gagal memuat preview generate.",
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGenerate = async (event: FormEvent) => {
    event.preventDefault();
    setGenerating(true);
    setError("");
    setResultMsg("");
    try {
      if (preview.length === 0) {
        await loadPreview();
      }
      const res = await hrMasterService.generateWorkPattern({
        month: formMonth,
        nrp: nrp.trim() || undefined,
      });
      const workers = res.data?.workers ?? 0;
      const days = res.data?.days_upserted ?? 0;
      setResultMsg(
        res.message ||
          `Generate selesai: ${workers} karyawan, ${days} baris roster.`,
      );
      onGenerated();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Generate roster gagal.",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
        aria-label="Close generate dialog"
        onClick={onClose}
        disabled={generating}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Generate Roster
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Expand seed pola kerja menjadi roster harian sampai tanggal 1 bulan
              berikutnya.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800"
            aria-label="Close"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleGenerate}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pola-generate-month"
                className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Bulan
              </label>
              <CalendarMonthField
                id="pola-generate-month"
                value={formMonth}
                onChange={setFormMonth}
                placeholder="Pilih bulan"
                inputClassName={`${fieldClassName} pr-10`}
              />
            </div>
            <div>
              <label
                htmlFor="pola-generate-nrp"
                className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                NRP (opsional)
              </label>
              <input
                id="pola-generate-nrp"
                className={fieldClassName}
                placeholder="Kosong = semua. Multi: 0216,0217"
                value={nrp}
                onChange={(e) => setNrp(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loadingPreview || generating}
              onClick={() => void loadPreview()}
            >
              {loadingPreview ? "Memuat…" : "Preview"}
            </Button>
            <Button type="submit" size="sm" disabled={generating || loadingPreview}>
              {generating ? "Generating…" : "Generate"}
            </Button>
          </div>

          {error && (
            <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </p>
          )}
          {resultMsg && (
            <p className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
              {resultMsg}
            </p>
          )}

          <div className="max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2">NRP</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Pola</th>
                  <th className="px-3 py-2">Remark</th>
                </tr>
              </thead>
              <tbody>
                {preview.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-gray-400"
                    >
                      Klik Preview untuk melihat seed yang akan digenerate.
                    </td>
                  </tr>
                ) : (
                  preview.map((row) => (
                    <tr
                      key={`${row.nrp}-${row.date}`}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="whitespace-nowrap px-3 py-2">
                        {toDateLabel(row.date)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{row.nrp}</td>
                      <td className="px-3 py-2">{row.full_name || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {row.pola_kerja || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {row.remark || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={generating}
            >
              Tutup
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
