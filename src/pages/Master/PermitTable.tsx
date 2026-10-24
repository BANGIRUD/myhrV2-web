import { useState, type ReactNode } from "react";
import Badge from "../../components/ui/badge/Badge";
import TableLoadingOverlay from "../../components/ui/table/TableLoadingOverlay";
import { hrMasterService } from "../../services/hrMaster";
import { formatDisplayDate } from "../../utils/dateShift";

type Props = {
  rows: Record<string, unknown>[];
  loading: boolean;
  searchHint?: boolean;
  /** 1-based row number of the first visible row (paging). */
  startNo?: number;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit?: (row: Record<string, unknown>) => void;
  onCancel?: (row: Record<string, unknown>) => void;
  onDetail?: (row: Record<string, unknown>) => void;
  /** First approver shown in the Persetujuan column. */
  approvalParty?: { header: string; short: string; perRow?: boolean };
  statusCounts?: {
    label: string;
    total: number;
    people?: { nrp: string; name: string; section: string }[];
  }[];
};

const COL_COUNT = 11;

const th =
  "whitespace-nowrap border-b border-slate-200 px-3.5 py-2.5 text-center align-middle text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:border-gray-700 dark:text-gray-300";
const td =
  "border-b border-gray-100 px-3.5 py-3 align-middle text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300";

function toDateLabel(value: unknown): string {
  if (!value) return "";
  const raw = String(value);
  const iso = /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : raw;
  return formatDisplayDate(iso);
}

function toDateTimeLabel(value: unknown): string {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = raw.slice(0, 10);
    const t = raw.length > 11 ? raw.slice(11, 16) : "";
    return t ? `${formatDisplayDate(d)} ${t}` : formatDisplayDate(d);
  }
  return raw;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function dash(value: string): string {
  return value || "—";
}

function progressTone(
  progress: string,
): "success" | "info" | "light" | "warning" | "error" {
  const p = progress.toLowerCase();
  // "Waiting approve by …" contains "approve by" — check waiting first.
  if (p.includes("waiting")) return "warning";
  if (p.includes("rejected")) return "error";
  if (p.includes("approve by")) return "success";
  return "light";
}

function ProgressIconWaiting() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 5.2V8.2l2 1.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgressIconApproved() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5.4 8.1 7.1 9.8l3.5-3.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgressIconRejected() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6 6l4 4M10 6l-4 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function progressIcon(progress: string): ReactNode {
  const p = progress.toLowerCase();
  if (p.includes("waiting")) return <ProgressIconWaiting />;
  if (p.includes("rejected")) return <ProgressIconRejected />;
  if (p.includes("approve by")) return <ProgressIconApproved />;
  return <ProgressIconWaiting />;
}

function Stacked({
  primary,
  secondary,
  title,
}: {
  primary: string;
  secondary?: string;
  title?: string;
}) {
  return (
    <div className="min-w-0" title={title}>
      <p className="truncate leading-5 text-gray-800 dark:text-gray-100">
        {dash(primary)}
      </p>
      {secondary ? (
        <p className="mt-0.5 truncate text-[11px] leading-4 text-gray-400 dark:text-gray-500">
          {secondary}
        </p>
      ) : null}
    </div>
  );
}

function flagOn(value: unknown): boolean {
  const raw = text(value).toLowerCase();
  return raw === "true" || raw === "1";
}

/** From hr.edit_policy (module ijin) via IJIN_SP can_edit. */
function canEditPermitRow(row: Record<string, unknown>): boolean {
  return flagOn(row.can_edit);
}

function canCancelPermitRow(row: Record<string, unknown>): boolean {
  if (text(row.can_cancel)) return flagOn(row.can_cancel);
  return flagOn(row.can_edit);
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

function fileKind(path: string): "pdf" | "image" | "file" {
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpe?g|gif|webp)$/.test(lower)) return "image";
  return "file";
}

function fileLabel(path: string, index: number, total: number): string {
  const name = path.split(/[/\\]/).pop() || `bukti-${index + 1}`;
  const short = name.length > 18 ? `${name.slice(0, 14)}…` : name;
  return total > 1 ? short : name.length > 22 ? `${name.slice(0, 18)}…` : name;
}

function IconPdf() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" aria-hidden>
      <path
        d="M4 1.5h5.2L12.5 5v9.5H4V1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M9 1.5V5h3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 9.2h1.1c.7 0 1.2.4 1.2 1s-.5 1-1.2 1H5.5V9.2Zm0 0V12.8M9.2 12.8V9.2h.9c.7 0 1.2.5 1.2 1.2v1.2c0 .7-.5 1.2-1.2 1.2h-.9Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconImage() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" aria-hidden>
      <rect
        x="2"
        y="3"
        width="12"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="5.5" cy="6.5" r="1.1" fill="currentColor" />
      <path
        d="M2.8 11.2 5.8 8.4l2.2 2.1 1.6-1.5 3.6 2.2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPaperclip() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" aria-hidden>
      <path
        d="M10.2 4.8 5.4 9.6a2 2 0 0 0 2.8 2.8l5.3-5.3a3.2 3.2 0 0 0-4.5-4.5L3.5 8.1a4.4 4.4 0 0 0 6.2 6.2l4.2-4.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EvidenceCell({ paths }: { paths: string[] }) {
  const [open, setOpen] = useState(false);

  if (paths.length === 0) {
    return (
      <span
        className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-300 dark:bg-white/5 dark:text-gray-600"
        title="Tidak ada bukti"
        aria-label="Tidak ada bukti"
      >
        <IconPaperclip />
      </span>
    );
  }

  const openPath = (path: string) => {
    void hrMasterService.openPermitEvidence(path);
  };

  if (paths.length === 1) {
    const path = paths[0];
    const kind = fileKind(path);
    return (
      <button
        type="button"
        onClick={() => openPath(path)}
        title={`Buka bukti: ${path.split(/[/\\]/).pop()}`}
        className="group inline-flex max-w-[140px] items-center gap-1.5 rounded-full border border-sky-200/80 bg-gradient-to-b from-sky-50 to-sky-100/70 px-2.5 py-1 text-left text-sky-700 shadow-sm transition hover:border-sky-300 hover:from-sky-100 hover:to-sky-50 hover:shadow dark:border-sky-500/30 dark:from-sky-500/20 dark:to-sky-500/10 dark:text-sky-300 dark:hover:border-sky-400/40"
      >
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white/80 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
          {kind === "pdf" ? <IconPdf /> : <IconImage />}
        </span>
        <span className="min-w-0 truncate text-[11px] font-semibold tracking-wide">
          {kind === "pdf" ? "PDF" : "Gambar"}
        </span>
        <span className="text-[10px] font-medium text-sky-500/80 opacity-0 transition group-hover:opacity-100 dark:text-sky-400/80">
          buka
        </span>
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={`${paths.length} file bukti — klik untuk daftar`}
        className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-gradient-to-b from-sky-50 to-sky-100/70 px-2.5 py-1 text-sky-700 shadow-sm transition hover:border-sky-300 hover:shadow dark:border-sky-500/30 dark:from-sky-500/20 dark:to-sky-500/10 dark:text-sky-300"
      >
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white/80 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
          <IconPaperclip />
        </span>
        <span className="text-[11px] font-semibold tabular-nums">
          {paths.length} file
        </span>
        <svg
          viewBox="0 0 12 12"
          className={`size-3 shrink-0 text-sky-500 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          aria-hidden
        >
          <path
            d="M3 4.5 6 7.5 9 4.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <div className="flex w-[150px] flex-col gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {paths.map((path, i) => {
            const kind = fileKind(path);
            return (
              <button
                key={`${path}-${i}`}
                type="button"
                onClick={() => openPath(path)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-sky-50 dark:text-gray-200 dark:hover:bg-sky-500/10"
                title={path}
              >
                <span className="text-sky-600 dark:text-sky-400">
                  {kind === "pdf" ? <IconPdf /> : <IconImage />}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {fileLabel(path, i, paths.length)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type StatusPerson = {
  nrp: string;
  name: string;
  section: string;
  start_date?: string;
  end_date?: string;
  category?: string;
};
type StatusCount = {
  label: string;
  total: number;
  people?: StatusPerson[];
};

function shortDate(value?: string) {
  if (!value) return "";
  const iso = /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : value;
  return formatDisplayDate(iso) || iso;
}

function periodLabel(person: StatusPerson) {
  return [shortDate(person.start_date), shortDate(person.end_date)]
    .filter(Boolean)
    .join("  –  ");
}

function categoryTone(category?: string) {
  const value = (category || "").toLowerCase();
  if (value.includes("jalan")) {
    return { bg: "#e0f2fe", fg: "#0369a1", soft: "bg-sky-100 text-sky-800" };
  }
  if (value.includes("pasca")) {
    return { bg: "#fef3c7", fg: "#b45309", soft: "bg-amber-100 text-amber-800" };
  }
  return { bg: "#ffe4e6", fg: "#be123c", soft: "bg-rose-100 text-rose-800" };
}

function shownPeople(item: StatusCount, limit: number) {
  const people = item.people ?? [];
  return {
    rows: people.slice(0, limit),
    hidden: Math.max(item.total - Math.min(people.length, limit), 0),
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shareStatusSnapshot(item: StatusCount) {
  const { rows, hidden } = shownPeople(item, 18);
  const width = 920;
  const rowH = 58;
  const height = 108 + rows.length * rowH + (hidden ? 36 : 16) + 24;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.font = "600 22px Segoe UI, sans-serif";
  ctx.fillText("MyHR · Permit", 28, 40);
  ctx.fillStyle = "#475569";
  ctx.font = "16px Segoe UI, sans-serif";
  ctx.fillText(`${item.label} · ${item.total} orang`, 28, 68);

  rows.forEach((person, index) => {
    const y = 92 + index * rowH;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 20, y, width - 40, rowH - 8, 12);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = "600 15px Segoe UI, sans-serif";
    const who = person.name || person.nrp || "—";
    ctx.fillText(`${index + 1}.  ${who}`, 36, y + 22);
    ctx.fillStyle = "#64748b";
    ctx.font = "13px Segoe UI, sans-serif";
    ctx.fillText([person.nrp, person.section].filter(Boolean).join("  ·  "), 36, y + 40);
    const period = periodLabel(person) || "—";
    ctx.fillStyle = "#0f766e";
    ctx.font = "700 14px Segoe UI, sans-serif";
    const periodWidth = ctx.measureText(period).width;
    const tone = categoryTone(person.category);
    ctx.font = "600 12px Segoe UI, sans-serif";
    const cat = person.category || "SAKIT";
    const catWidth = ctx.measureText(cat).width + 16;
    const catX = width - 36 - catWidth;
    ctx.font = "700 14px Segoe UI, sans-serif";
    ctx.fillText(period, catX - 16 - periodWidth, y + 30);
    ctx.fillStyle = tone.bg;
    roundRect(ctx, catX, y + 14, catWidth, 22, 11);
    ctx.fill();
    ctx.fillStyle = tone.fg;
    ctx.font = "600 12px Segoe UI, sans-serif";
    ctx.fillText(cat, catX + 8, y + 29);
  });
  if (hidden > 0) {
    ctx.fillStyle = "#64748b";
    ctx.font = "13px Segoe UI, sans-serif";
    ctx.fillText(`dan ${hidden} lainnya`, 28, height - 18);
  }

  const png = new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("png"));
        return;
      }
      resolve(blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" }));
    }, "image/png");
  });
  if (!navigator.clipboard || !window.ClipboardItem) {
    throw new Error("clipboard");
  }
  return navigator.clipboard.write([
    new ClipboardItem({ "image/png": png }),
  ]);
}

function StatusPeoplePanel({ item }: { item: StatusCount }) {
  const { rows, hidden } = shownPeople(item, 12);
  const [copyNote, setCopyNote] = useState("");
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-gray-700 dark:bg-white/[0.03]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-gray-200">
          {item.label}
        </p>
        <button
          type="button"
          title="Salin gambar untuk ditempel di WhatsApp"
          onClick={() => {
            void Promise.resolve(shareStatusSnapshot(item))
              .then(() =>
                setCopyNote("Gambar disalin. Tempel di WhatsApp dengan Ctrl+V."),
              )
              .catch(() =>
                setCopyNote("Gambar belum tersalin. Izinkan clipboard di browser, lalu coba lagi."),
              );
          }}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
            <rect x="2.2" y="3" width="11.6" height="8.2" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="6" cy="6.4" r="1.1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3.6 10.2 6.2 7.8l1.8 1.6 2-2.1 2.4 2.9" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {copyNote ? (
        <p className="mb-2 text-[11px] text-emerald-700 dark:text-emerald-300">{copyNote}</p>
      ) : null}
      <ul className="space-y-1.5">
        {rows.map((person, index) => {
          const tone = categoryTone(person.category);
          return (
            <li
              key={`${person.nrp}-${person.start_date}-${index}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white px-3 py-2 text-xs dark:bg-gray-900"
            >
              <span className="min-w-0 font-semibold text-slate-800 dark:text-gray-100">
                {index + 1}. {person.name || person.nrp || "—"}
              </span>
              <span className="text-slate-500 dark:text-gray-400">
                {[person.nrp, person.section].filter(Boolean).join(" · ")}
              </span>
              <span className="font-bold text-teal-700 dark:text-teal-300">
                {periodLabel(person) || "—"}
              </span>
              {person.category ? (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.soft}`}>
                  {person.category}
                </span>
              ) : null}
            </li>
          );
        })}
        {hidden > 0 ? (
          <li className="px-1 text-[11px] text-slate-500">dan {hidden} lainnya</li>
        ) : null}
      </ul>
    </div>
  );
}

export default function PermitTable({
  rows,
  loading,
  searchHint = false,
  startNo = 1,
  canUpdate = false,
  canDelete = false,
  onEdit,
  onCancel,
  onDetail,
  statusCounts = [],
  approvalParty = { header: "Section / HR", short: "SH" },
}: Props) {
  const showActions = canUpdate || canDelete || Boolean(onDetail);
  const [openStatus, setOpenStatus] = useState("");
  const openItem = statusCounts.find((item) => item.label === openStatus);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      {statusCounts.length > 0 ? (
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
          <div className="flex flex-wrap gap-2">
            {statusCounts.map((item) => {
              const tone = progressTone(item.label);
              const chip =
                tone === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                  : tone === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                    : tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";
              const active = openStatus === item.label;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setOpenStatus(active ? "" : item.label)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${chip} ${active ? "ring-2 ring-slate-400/40" : ""}`}
                >
                  {progressIcon(item.label)}
                  <span>{item.label}</span>
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums dark:bg-black/20">
                    {item.total}
                  </span>
                </button>
              );
            })}
          </div>
          {openItem ? <StatusPeoplePanel item={openItem} /> : null}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            Data rekonsiliasi Permit
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Periode pengajuan berdasarkan tanggal mulai–akhir. Scroll
            horizontal untuk audit persetujuan.
          </p>
        </div>
        {loading ? (
          <p className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <span
              className="h-3 w-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 dark:border-brand-500/40 dark:border-t-brand-300"
              aria-hidden
            />
            Memuat…
          </p>
        ) : (
          <p className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
            {rows.length} baris
          </p>
        )}
      </div>

      <div className="relative">
        {loading && rows.length > 0 ? (
          <TableLoadingOverlay label="Memuat data ijin…" />
        ) : null}
        <div className="max-h-[min(72vh,760px)] overflow-auto">
        <table className="min-w-[1280px] w-full border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-50/95 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 backdrop-blur-sm dark:bg-gray-800/95 dark:text-gray-500">
              <th
                colSpan={4}
                className="border-b border-slate-200 px-4 py-1.5 text-center align-middle sm:px-5"
              >
                Pengajuan
              </th>
              <th
                colSpan={1}
                className="border-b border-l border-slate-200 px-3.5 py-1.5 text-center align-middle dark:border-gray-700"
              >
                Izin
              </th>
              <th
                colSpan={1}
                className="border-b border-l border-slate-200 px-3.5 py-1.5 text-center align-middle dark:border-gray-700"
              >
                Periode
              </th>
              <th
                colSpan={2}
                className="border-b border-l border-slate-200 px-3.5 py-1.5 text-center align-middle dark:border-gray-700"
              >
                Status
              </th>
              <th
                colSpan={2}
                className="border-b border-l border-slate-200 px-3.5 py-1.5 text-center align-middle dark:border-gray-700"
              >
                Persetujuan
              </th>
              {showActions ? (
                <th
                  colSpan={1}
                  className="border-b border-l border-slate-200 px-3.5 py-1.5 pr-4 text-center align-middle dark:border-gray-700 sm:pr-5"
                >
                  Aksi
                </th>
              ) : null}
            </tr>
            <tr className="bg-slate-100/95 backdrop-blur-sm dark:bg-gray-800/95">
              <th
                className={`${th} sticky left-0 z-30 w-12 bg-slate-100/95 px-4 backdrop-blur-sm sm:px-5`}
              >
                No
              </th>
              <th
                className={`${th} sticky left-12 z-30 min-w-[196px] bg-slate-100/95 backdrop-blur-sm sm:left-[3.25rem]`}
              >
                Karyawan
              </th>
              <th className={`${th} min-w-[160px]`}>Diinput</th>
              <th className={`${th} border-r border-slate-200 dark:border-gray-700`}>
                Unit
              </th>
              <th className={`${th} border-r border-slate-200 dark:border-gray-700`}>
                Kategori
              </th>
              <th className={`${th} border-r border-slate-200 dark:border-gray-700`}>
                Mulai–akhir
              </th>
              <th className={th}>Pengajuan</th>
              <th className={`${th} border-r border-slate-200 dark:border-gray-700`}>
                Bukti
              </th>
              <th className={th}>{approvalParty.header}</th>
              <th className={`${th} min-w-[240px] ${showActions ? "" : "px-4 sm:px-5"}`}>
                Catatan tolak
              </th>
              {showActions ? (
                <th className={`${th} px-4 sm:px-5`}>Aksi</th>
              ) : null}
            </tr>
          </thead>
          <tbody
            className={
              loading && rows.length > 0
                ? "pointer-events-none opacity-50 transition-opacity"
                : undefined
            }
          >
            {loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={showActions ? COL_COUNT : COL_COUNT - 1}
                  className="px-5 py-14 text-center"
                >
                  <div className="inline-flex flex-col items-center gap-2 text-sm text-gray-500">
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
                    Memuat data ijin…
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={showActions ? COL_COUNT : COL_COUNT - 1}
                  className="px-5 py-14 text-center"
                >
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Tidak ada data
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchHint
                      ? "Coba ubah kata kunci atau filter bulan/unit/status."
                      : "Belum ada pengajuan ijin pada bulan ini."}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const progress = text(row.progress);
                const category = text(row.category_name);
                const paths = evidencePaths(row);
                const start = toDateLabel(row.start_date);
                const end = toDateLabel(row.end_date);
                const days =
                  row.day == null || String(row.day) === ""
                    ? ""
                    : `${row.day} hari`;
                const shName = text(row.by_checked_name);
                const partyShort =
                  approvalParty.perRow && text(row.by_checked_role)
                    ? text(row.by_checked_role)
                    : approvalParty.short;
                const shDate = toDateTimeLabel(row.by_date_verified_section);
                const hrName = text(row.by_approved_name);
                const hrDate = toDateTimeLabel(row.approved_at);
                const rejectBy = text(row.reject_by);
                const rejectDate = toDateTimeLabel(row.reject_date);
                const note =
                  text(row.note) ||
                  (progress.startsWith("Rejected") || text(row.reject) === "true"
                    ? text(row.description)
                    : "");
                const rejected =
                  progress.startsWith("Rejected") || text(row.reject) === "true";
                const inputBy = text(row.name_input);
                const inputAt = toDateTimeLabel(row.created_at);
                const canEditRow = canEditPermitRow(row);
                const canCancelRow = canCancelPermitRow(row);
                const zebra = index % 2 === 1;
                const rowBg = rejected
                  ? "bg-rose-50/70 dark:bg-rose-500/[0.08]"
                  : zebra
                    ? "bg-slate-50/80 dark:bg-white/[0.025]"
                    : "bg-white dark:bg-transparent";
                const stickyBg = rejected
                  ? "bg-rose-50 dark:bg-rose-950/50"
                  : zebra
                    ? "bg-slate-50 dark:bg-gray-900"
                    : "bg-white dark:bg-gray-900";

                return (
                  <tr
                    key={String(row.id ?? index)}
                    className={`transition-colors hover:bg-brand-50/70 dark:hover:bg-brand-500/10 ${rowBg}`}
                  >
                    <td
                      className={`${td} sticky left-0 z-10 w-12 px-4 text-center tabular-nums text-gray-400 sm:px-5 ${stickyBg}`}
                    >
                      {startNo + index}
                    </td>
                    <td
                      className={`${td} sticky left-12 z-10 min-w-[196px] max-w-[240px] shadow-[1px_0_0_0_rgba(0,0,0,0.06)] sm:left-[3.25rem] ${stickyBg}`}
                    >
                      <p className="truncate font-semibold leading-5 text-gray-900 dark:text-white/90">
                        {dash(text(row.full_name))}
                      </p>
                      <p className="mt-1 flex min-w-0 items-center gap-1.5">
                        <span className="shrink-0 rounded-md bg-teal-50 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wide text-teal-800 dark:bg-teal-500/15 dark:text-teal-200">
                          {dash(text(row.nrp))}
                        </span>
                        <span
                          className="min-w-0 truncate text-[11px] leading-4 text-slate-500 dark:text-gray-400"
                          title={text(row.jabatan)}
                        >
                          {dash(text(row.jabatan))}
                        </span>
                      </p>
                    </td>
                    <td className={`${td} min-w-[160px]`}>
                      <p className="truncate font-medium text-gray-800 dark:text-gray-100" title={inputBy}>
                        {dash(inputBy)}
                      </p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-gray-400">
                        {dash(inputAt)}
                      </p>
                    </td>
                    <td
                      className={`${td} min-w-[160px] max-w-[200px] border-r border-gray-100 dark:border-gray-800`}
                    >
                      <Stacked
                        primary={text(row.department_name)}
                        secondary={text(row.section_name)}
                        title={`${text(row.department_name)} · ${text(row.section_name)}`}
                      />
                    </td>
                    <td
                      className={`${td} min-w-[148px] max-w-[220px] border-r border-gray-100 text-center dark:border-gray-800`}
                    >
                      <p className="line-clamp-3 leading-5" title={category}>
                        {dash(category)}
                      </p>
                    </td>
                    <td
                      className={`${td} min-w-[168px] whitespace-nowrap border-r border-gray-100 dark:border-gray-800`}
                    >
                      <p className="tabular-nums leading-5 text-gray-800 dark:text-gray-100">
                        {start || "—"}
                        <span className="px-1.5 text-gray-300 dark:text-gray-600">
                          →
                        </span>
                        {end || "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-gray-400">
                        {days || "—"}
                      </p>
                    </td>
                    <td className={`${td} min-w-[196px]`}>
                      {progress ? (
                        <Badge
                          size="sm"
                          color={progressTone(progress)}
                          startIcon={progressIcon(progress)}
                        >
                          {progress}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className={`${td} min-w-[128px] overflow-visible border-r border-gray-100 text-center dark:border-gray-800`}
                    >
                      <EvidenceCell paths={paths} />
                    </td>
                    <td className={`${td} min-w-[200px]`}>
                      <Stacked
                        primary={
                          shName
                            ? `${partyShort} · ${shName}`
                            : `${partyShort} · —`
                        }
                        secondary={shDate || undefined}
                      />
                      <div className="mt-1.5">
                        {hrName ? (
                          <Stacked
                            primary={`HR · ${hrName}`}
                            secondary={hrDate || undefined}
                          />
                        ) : progress === "Rejected by HR" ? (
                          <div className="min-w-0">
                            <p className="truncate leading-5 text-rose-800/90 dark:text-rose-200/90">
                              HR · {rejectBy || "Menolak"}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] leading-4 text-rose-700/70 dark:text-rose-300/70">
                              {rejectDate ? `Menolak · ${rejectDate}` : "Menolak"}
                            </p>
                          </div>
                        ) : (
                          <Stacked
                            primary="HR · —"
                            secondary={hrDate || undefined}
                          />
                        )}
                      </div>
                    </td>
                    <td
                      className={`${td} min-w-[240px] max-w-[420px] whitespace-normal ${showActions ? "" : "px-4 sm:px-5"}`}
                    >
                      {note || (progress !== "Rejected by HR" && (rejectBy || rejectDate)) ? (
                        <div
                          title={
                            progress === "Rejected by HR"
                              ? note
                              : [note, rejectBy, rejectDate].filter(Boolean).join(" · ")
                          }
                        >
                          <p className="whitespace-pre-wrap break-words leading-5 text-gray-800 dark:text-gray-100">
                            {note || "—"}
                          </p>
                          {progress !== "Rejected by HR" && (rejectBy || rejectDate) ? (
                            <p className="mt-1 text-[11px] leading-4 text-rose-700/80 dark:text-rose-300/80">
                              {[rejectBy, rejectDate].filter(Boolean).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                    {showActions ? (
                      <td className={`${td} whitespace-nowrap px-4 sm:px-5`}>
                        {canEditRow || canCancelRow || onDetail ? (
                          <div className="inline-flex items-center rounded-xl border border-slate-200/90 bg-slate-50/90 p-0.5 shadow-sm dark:border-gray-700 dark:bg-white/[0.04]">
                            {canUpdate && canEditRow && onEdit ? (
                              <button
                                type="button"
                                onClick={() => onEdit(row)}
                                title="Ubah pengajuan"
                                className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100/90 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 dark:text-sky-300 dark:hover:bg-sky-500/15"
                              >
                                <svg
                                  viewBox="0 0 16 16"
                                  className="size-3.5 shrink-0"
                                  fill="none"
                                  aria-hidden
                                >
                                  <path
                                    d="M9.2 3.3 12.7 6.8M3 13l.7-3.2L10.8 2.7a1.4 1.4 0 0 1 2 0l.5.5a1.4 1.4 0 0 1 0 2L6.2 12.3 3 13Z"
                                    stroke="currentColor"
                                    strokeWidth="1.35"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                Ubah
                              </button>
                            ) : null}
                            {onDetail ? (
                              <button
                                type="button"
                                onClick={() => onDetail(row)}
                                title="Detail pengajuan"
                                className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:text-gray-200 dark:hover:bg-white/10"
                              >
                                <svg
                                  viewBox="0 0 16 16"
                                  className="size-3.5 shrink-0"
                                  fill="none"
                                  aria-hidden
                                >
                                  <path
                                    d="M1.8 8S3.8 4.2 8 4.2 14.2 8 14.2 8 12.2 11.8 8 11.8 1.8 8 1.8 8Z"
                                    stroke="currentColor"
                                    strokeWidth="1.35"
                                  />
                                  <circle
                                    cx="8"
                                    cy="8"
                                    r="1.8"
                                    stroke="currentColor"
                                    strokeWidth="1.35"
                                  />
                                </svg>
                                Detail
                              </button>
                            ) : null}
                            {canDelete && canCancelRow && onCancel ? (
                              <button
                                type="button"
                                onClick={() => onCancel(row)}
                                title="Batalkan pengajuan"
                                className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 dark:text-rose-400 dark:hover:bg-rose-500/15"
                              >
                                <svg
                                  viewBox="0 0 16 16"
                                  className="size-3.5 shrink-0"
                                  fill="none"
                                  aria-hidden
                                >
                                  <path
                                    d="M3.5 4.5h9M6 4.5V3.4c0-.5.4-.9.9-.9h2.2c.5 0 .9.4.9.9v1.1M6.5 7v4.5M9.5 7v4.5M4.5 4.5l.5 8.1c0 .5.4.9.9.9h4.2c.5 0 .9-.4.9-.9l.5-8.1"
                                    stroke="currentColor"
                                    strokeWidth="1.35"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                Batalkan
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-300 dark:bg-white/5 dark:text-gray-600">
                            —
                          </span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
