import { useEffect } from "react";
import Button from "../../components/ui/button/Button";
import { CloseIcon } from "../../icons";
import { formatDisplayDate } from "../../utils/dateShift";

type Props = {
  open: boolean;
  row: Record<string, unknown> | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function toDateLabel(value: unknown): string {
  if (!value) return "—";
  const raw = String(value);
  const iso = /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : raw;
  return formatDisplayDate(iso) || "—";
}

export default function SicknessCancelModal({
  open,
  row,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open || !row) return null;

  const name = String(row.full_name ?? "").trim() || "Karyawan";
  const nrp = String(row.nrp ?? "").trim() || "—";
  const start = toDateLabel(row.start_date);
  const end = toDateLabel(row.end_date);
  const category = String(row.category_name ?? row.category ?? "").trim();

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[3px] transition"
        aria-label="Tutup dialog"
        onClick={() => {
          if (!loading) onClose();
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sakit-cancel-title"
        aria-describedby="sakit-cancel-desc"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-2xl dark:border-rose-500/20 dark:bg-gray-900"
      >
        <div className="bg-gradient-to-br from-rose-50 via-white to-white px-5 pb-4 pt-5 dark:from-rose-500/10 dark:via-gray-900 dark:to-gray-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-sm dark:bg-rose-500/20 dark:text-rose-300">
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M12 8v5M12 16.5h.01M10.3 3.8 2.6 17.2c-.7 1.3.2 2.9 1.7 2.9h15.4c1.5 0 2.4-1.6 1.7-2.9L13.7 3.8c-.7-1.3-2.7-1.3-3.4 0Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <h3
                  id="sakit-cancel-title"
                  className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white/90"
                >
                  Batalkan pengajuan?
                </h3>
                <p
                  id="sakit-cancel-desc"
                  className="mt-1 text-sm leading-5 text-slate-500 dark:text-gray-400"
                >
                  Pengajuan akan soft-delete dan tidak bisa diproses SH/HR.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-white/10 dark:text-gray-300"
              aria-label="Close"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-gray-700 dark:bg-white/[0.03]">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white/90">
              {name}
            </p>
            <p className="mt-0.5 font-mono text-xs tracking-wide text-slate-500 dark:text-gray-400">
              NRP {nrp}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-gray-400">
              <span className="rounded-full bg-white px-2 py-0.5 font-medium tabular-nums shadow-sm dark:bg-gray-800">
                {start} → {end}
              </span>
              {category ? (
                <span className="rounded-full bg-white px-2 py-0.5 font-medium shadow-sm dark:bg-gray-800">
                  {category}
                </span>
              ) : null}
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-400 dark:text-gray-500">
            Catatan sistem:{" "}
            <span className="font-medium text-slate-600 dark:text-gray-300">
              CANCEL : INCORRECT DATA
            </span>
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="!px-3.5"
          >
            Pertahankan
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="!border-rose-600 !bg-rose-600 !px-3.5 hover:!bg-rose-700 dark:!bg-rose-600"
          >
            {loading ? "Membatalkan…" : "Ya, batalkan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
