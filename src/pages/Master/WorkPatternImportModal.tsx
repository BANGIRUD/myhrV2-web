import { FormEvent, useEffect, useState } from "react";
import Button from "../../components/ui/button/Button";
import { CloseIcon } from "../../icons";
import { ApiError } from "../../lib/api";
import { hrMasterService } from "../../services/hrMaster";

type ImportResult = {
  inserted: number;
  skipped: number;
  total: number;
  errors: Array<{ row: number; nrp?: string | null; reason: string }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

const fieldClassName =
  "block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:text-gray-200 dark:file:bg-white/10 dark:file:text-white/90";

export default function WorkPatternImportModal({
  open,
  onClose,
  onImported,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setSaving(false);
    setError("");
    setResult(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleDownloadExample = async () => {
    try {
      setError("");
      await hrMasterService.downloadWorkPatternExample();
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
    setSaving(true);
    setError("");
    setResult(null);
    try {
      const response = await hrMasterService.importWorkPattern(file);
      const data = (response.data || {}) as ImportResult;
      setResult({
        inserted: Number(data.inserted || 0),
        skipped: Number(data.skipped || 0),
        total: Number(data.total || 0),
        errors: Array.isArray(data.errors) ? data.errors : [],
      });
      if (Number(data.inserted || 0) > 0) {
        onImported();
      }
    } catch (err) {
      const body =
        err instanceof ApiError &&
        err.body &&
        typeof err.body === "object" &&
        "data" in err.body
          ? (err.body as { data?: ImportResult }).data
          : null;
      if (body) {
        setResult({
          inserted: Number(body.inserted || 0),
          skipped: Number(body.skipped || 0),
          total: Number(body.total || 0),
          errors: Array.isArray(body.errors) ? body.errors : [],
        });
      }
      setError(err instanceof ApiError ? err.message : "Failed to import");
    } finally {
      setSaving(false);
    }
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
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Import Work Pattern
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Columns: date, nrp, full_name, pola_kerja, pola_cuti, hari_ke,
              remark. Max 2000 rows.
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

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="pola-kerja-import-file"
              className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              File Excel / CSV
            </label>
            <p className="mb-2 text-[11px] leading-4 text-gray-400 dark:text-gray-500">
              Kolom: date, nrp, full_name, pola_kerja, pola_cuti, hari_ke, remark.
              Maks. 2000 baris.
            </p>
            <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
              <input
                id="pola-kerja-import-file"
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className={fieldClassName}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                aria-label="File Excel atau CSV"
              />
              {file && (
                <p className="mt-2 text-xs text-gray-500">Dipilih: {file.name}</p>
              )}
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="!py-2.5"
            onClick={handleDownloadExample}
          >
            Unduh contoh CSV
          </Button>

          {error && (
            <p className="text-sm text-error-500" role="alert">
              {error}
            </p>
          )}

          {result && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-gray-700 dark:text-gray-200">
                Inserted <strong>{result.inserted}</strong> of{" "}
                <strong>{result.total}</strong>
                {result.skipped > 0 ? ` (skipped ${result.skipped})` : ""}.
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-gray-500">
                  {result.errors.map((item) => (
                    <li key={`${item.row}-${item.nrp}-${item.reason}`}>
                      Row {item.row}
                      {item.nrp ? ` (${item.nrp})` : ""}: {item.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
            <Button type="submit" size="sm" disabled={saving || !file}>
              {saving ? "Importing…" : "Import"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
