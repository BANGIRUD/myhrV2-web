import { useEffect, useState } from "react";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { CloseIcon } from "../../icons";
import { hrMasterService } from "../../services/hrMaster";
import { formatDisplayDate } from "../../utils/dateShift";

type Props = {
  open: boolean;
  row: Record<string, unknown> | null;
  /** personalia: still waiting for HR after the atasan agreed. */
  finalHr?: boolean;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onApprove: () => void;
  onReject: (note: string) => void;
};

function text(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function toDateLabel(value: unknown): string {
  if (!value) return "—";
  const raw = String(value);
  const iso = /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : raw;
  return formatDisplayDate(iso) || "—";
}

function toDateTimeLabel(value: unknown): string {
  if (!value) return "—";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = raw.slice(0, 10);
    const t = raw.length > 11 ? raw.slice(11, 16) : "";
    const date = formatDisplayDate(d);
    return t && date ? `${date} ${t}` : date || "—";
  }
  return raw;
}

function evidencePaths(row: Record<string, unknown>): string[] {
  const fromAgg = text(row.evidence_paths);
  if (fromAgg) {
    return fromAgg
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
  }
  const legacy = text(row.path_evident);
  return legacy ? [legacy] : [];
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-800 dark:text-gray-100">
        {value || "—"}
      </p>
    </div>
  );
}

export default function SicknessSectionDetailModal({
  open,
  row,
  finalHr = false,
  loading = false,
  error = "",
  onClose,
  onApprove,
  onReject,
}: Props) {
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote("");
    setRejecting(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, row?.id, loading, onClose]);

  if (!open || !row) return null;

  const progress = text(row.progress);
  const waiting = finalHr
    ? progress === "Waiting approve by HR"
    : text(row.status_progress) === "false";
  const rejected = progress.startsWith("Rejected") || text(row.reject) === "true";
  const atasanName = text(row.by_checked_name);
  const atasanRole = text(row.by_checked_role);
  const atasanWhen = toDateTimeLabel(row.by_date_verified_section);
  const hrName = text(row.by_approved_name);
  const hrWhen = toDateTimeLabel(row.approved_at);
  const rejectBy = text(row.reject_by);
  const rejectWhen = toDateTimeLabel(row.reject_date);
  const savedNote = text(row.note);
  const paths = evidencePaths(row);
  const start = toDateLabel(row.start_date);
  const end = toDateLabel(row.end_date);
  const days =
    row.day == null || String(row.day) === "" ? "" : `${row.day} hari`;

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        aria-label="Tutup"
        onClick={() => {
          if (!loading) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sakit-section-detail-title"
        className="relative flex max-h-[min(90vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-gray-800">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600">
              Detail pengajuan
            </p>
            <h3
              id="sakit-section-detail-title"
              className="mt-0.5 truncate text-lg font-semibold text-slate-900 dark:text-white/90"
            >
              {text(row.full_name) || "Karyawan"}
            </h3>
            <p className="font-mono text-xs text-slate-500">{text(row.nrp) || "—"}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
            aria-label="Tutup"
            onClick={() => {
              if (!loading) onClose();
            }}
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {progress ? (
            <Badge size="sm" color={waiting ? "warning" : "light"}>
              {progress}
            </Badge>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Unit"
              value={[text(row.department_name), text(row.section_name)]
                .filter(Boolean)
                .join(" · ")}
            />
            <Field label="Kategori" value={text(row.category_name)} />
            <Field label="Dokter" value={text(row.name_doctor)} />
            <Field label="Instansi" value={text(row.name_agency)} />
            <Field label="Surat" value={toDateLabel(row.date_issue)} />
            <Field
              label="Periode"
              value={`${start} → ${end}${days ? ` (${days})` : ""}`}
            />
          </div>
          <Field label="Diagnosa" value={text(row.diagnosa)} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Diinput oleh"
              value={[text(row.name_input), toDateTimeLabel(row.created_at)]
                .filter((part) => part && part !== "—")
                .join(" · ")}
            />
            <Field
              label="Atasan"
              value={
                atasanName || (atasanWhen !== "—" ? atasanWhen : "")
                  ? [atasanRole, atasanName].filter(Boolean).join(" · ") +
                    (atasanWhen !== "—" ? ` · ${atasanWhen}` : "")
                  : ""
              }
            />
            <Field
              label="HR"
              value={
                hrName || (hrWhen !== "—" ? hrWhen : "")
                  ? ["HR", hrName].filter(Boolean).join(" · ") +
                    (hrWhen !== "—" ? ` · ${hrWhen}` : "")
                  : ""
              }
            />
          </div>
          <div
            className={
              rejected
                ? "rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10"
                : undefined
            }
          >
            <Field label="Catatan" value={savedNote || text(row.description)} />
            {rejected && (rejectBy || rejectWhen !== "—") ? (
              <p className="mt-2 text-xs text-rose-700/80 dark:text-rose-300/80">
                Ditolak oleh {[rejectBy, rejectWhen !== "—" ? rejectWhen : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Bukti
            </p>
            {paths.length === 0 ? (
              <p className="mt-0.5 text-sm text-slate-500">Tidak ada lampiran</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {paths.map((path) => (
                  <li key={path}>
                    <button
                      type="button"
                      className="text-sm font-medium text-sky-700 hover:underline dark:text-sky-300"
                      onClick={() => void hrMasterService.openSicknessEvidence(path)}
                    >
                      {path.split("/").pop() || path}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          ) : null}
          {waiting && rejecting ? (
            <textarea
              className="h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              placeholder="Catatan tolak (opsional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-gray-800">
          {waiting && rejecting ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => setRejecting(false)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => onReject(note.trim())}
                className="text-rose-700 ring-rose-200 hover:bg-rose-50 dark:text-rose-300"
                startIcon={
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
                    <path
                      d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              >
                {loading ? "Menyimpan…" : "Konfirmasi tolak"}
              </Button>
            </>
          ) : waiting ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => setRejecting(true)}
                startIcon={
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
                    <path
                      d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              >
                Tolak
              </Button>
              <Button
                size="sm"
                disabled={loading}
                onClick={onApprove}
                startIcon={
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
                    <path
                      d="M3.5 8.2 6.4 11 12.5 4.8"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              >
                {loading ? "Menyimpan…" : "Setujui"}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={onClose}>
              Tutup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
