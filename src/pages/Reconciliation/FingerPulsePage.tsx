import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import CalendarDateField from "../../components/form/CalendarDateField";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import TableLoadingOverlay from "../../components/ui/table/TableLoadingOverlay";
import { useAuth } from "../../context/AuthContext";
import { usePermission } from "../../hooks/usePermission";
import {
  fingerPulseService,
  type FingerPulseCompleteness,
  type FingerPulsePersonDay,
  type FingerPulsePunch,
  type FingerPulseRecentRun,
  type FingerPulseRunAction,
  type FingerPulseSource,
  type FingerPulseMissingOutPerson,
  type FingerPulseStructureKpi,
  type FingerPulseSummary,
  type FingerPulseWatermark,
} from "../../services/fingerPulse";
import { currentShiftDate, toIsoDate } from "../../utils/dateShift";

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  loading = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "sky" | "emerald" | "amber" | "rose" | "violet";
  loading?: boolean;
}) {
  const tones: Record<string, string> = {
    neutral: "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]",
    sky: "border-sky-200 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-950/30",
    emerald:
      "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30",
    amber:
      "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30",
    rose: "border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/30",
    violet:
      "border-violet-200 bg-violet-50/70 dark:border-violet-900/50 dark:bg-violet-950/30",
  };
  return (
    <div
      className={`relative overflow-hidden rounded-xl border px-3.5 py-3 transition ${tones[tone]} ${
        loading ? "opacity-70" : ""
      }`}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <div
          className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/5"
          aria-hidden
        />
      ) : null}
      <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded bg-gray-200/80 dark:bg-gray-700/80" />
      ) : (
        <div className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white">
          {typeof value === "number" ? value.toLocaleString("id-ID") : value}
        </div>
      )}
      {hint ? (
        <div
          className={`mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 ${
            loading ? "opacity-40" : ""
          }`}
        >
          {loading ? "Memuat…" : hint}
        </div>
      ) : null}
    </div>
  );
}

function fmtMissingDate(v?: string | null): string {
  if (!v) return "—";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return toIsoDate(d);
  } catch {
    /* ignore */
  }
  return s.slice(0, 10);
}

/** Display wall-clock datetime without UTC shift on naive SQL values. */
function fmtMissingDateTime(v?: string | null): string {
  if (v == null || v === "") return "—";
  const s = String(v);
  const m = s.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (m) return `${m[1]} ${m[2]}:${m[3]}`;
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return `${toIsoDate(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  } catch {
    /* ignore */
  }
  return "—";
}

function MissingOutPeopleList({
  people,
  totalCount,
  scopeLabel,
}: {
  people: FingerPulseMissingOutPerson[];
  totalCount: number;
  scopeLabel?: string;
}) {
  if (!totalCount) {
    return (
      <p className="px-4 py-2 text-xs text-gray-500">Tidak ada missing OUT.</p>
    );
  }
  return (
    <div className="border-t border-amber-100 bg-amber-50/60 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/20 sm:px-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
        Missing OUT
        {scopeLabel ? ` · ${scopeLabel}` : ""} ·{" "}
        {totalCount.toLocaleString("id-ID")} orang
      </div>
      {people.length === 0 ? (
        <p className="text-[11px] text-gray-500">
          Tidak ada baris detail untuk lingkup ini.
        </p>
      ) : (
        <div className="max-h-64 overflow-auto rounded-lg border border-amber-100/80 bg-white/80 dark:border-amber-900/40 dark:bg-gray-950/40">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-amber-50/95 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-amber-950/80">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 font-medium">
                  Tanggal
                </th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">
                  Finger in
                </th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">
                  Finger out
                </th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">NRP</th>
                <th className="px-3 py-2 font-medium">Nama karyawan</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr
                  key={`${p.nrp}-${p.date}-${p.section_name}`}
                  className="border-t border-amber-50 dark:border-amber-950/50"
                >
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-gray-700 dark:text-gray-300">
                    {fmtMissingDate(p.date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {fmtMissingDateTime(p.finger_in)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {fmtMissingDateTime(p.finger_out)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-gray-500 dark:text-gray-400">
                    {p.nrp || "—"}
                  </td>
                  <td className="max-w-[14rem] truncate px-3 py-1.5 text-gray-800 dark:text-gray-200">
                    {p.full_name || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StructureKpiPanel({
  rows,
  missingPeople,
  expandedDept,
  onToggleDept,
  loading = false,
}: {
  rows: FingerPulseStructureKpi[];
  missingPeople: FingerPulseMissingOutPerson[];
  expandedDept: string | null;
  onToggleDept: (dept: string) => void;
  loading?: boolean;
}) {
  const [openMissingKey, setOpenMissingKey] = useState<string | null>(null);

  const depts = useMemo(() => {
    type Agg = {
      department_name: string;
      person_count: number;
      fingered_count: number;
      complete_count: number;
      missing_out_count: number;
      no_in_count: number;
      non_oams_count: number;
      oams_count: number;
      sections: FingerPulseStructureKpi[];
    };
    const map = new Map<string, Agg>();
    for (const r of rows) {
      const key = r.department_name || "(Tanpa department)";
      let agg = map.get(key);
      if (!agg) {
        agg = {
          department_name: key,
          person_count: 0,
          fingered_count: 0,
          complete_count: 0,
          missing_out_count: 0,
          no_in_count: 0,
          non_oams_count: 0,
          oams_count: 0,
          sections: [],
        };
        map.set(key, agg);
      }
      agg.person_count += r.person_count;
      agg.fingered_count += r.fingered_count;
      agg.complete_count += r.complete_count;
      agg.missing_out_count += r.missing_out_count;
      agg.no_in_count += r.no_in_count;
      agg.non_oams_count += r.non_oams_count;
      agg.oams_count += r.oams_count;
      agg.sections.push(r);
    }
    return [...map.values()].sort(
      (a, b) => b.missing_out_count - a.missing_out_count || b.person_count - a.person_count,
    );
  }, [rows]);

  useEffect(() => {
    setOpenMissingKey(null);
  }, [expandedDept, rows]);

  if (loading && !rows.length) {
    return (
      <div
        className="space-y-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
        aria-busy="true"
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
          />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <p className="text-sm text-gray-500">
        Belum ada breakdown department untuk filter ini.
      </p>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 ${
        loading ? "opacity-60" : ""
      }`}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-white/40 pt-10 backdrop-blur-[1px] dark:bg-gray-950/30"
          aria-hidden
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
            Memuat KPI…
          </span>
        </div>
      ) : null}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
        <div>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Per department / section
          </div>
          <div className="text-[11px] text-gray-500">
            Klik department untuk section. Klik angka Missing OUT untuk daftar
            (hanya hari sebelum hari shift).
          </div>
        </div>
        <span className="text-[11px] text-gray-400">
          {depts.length} department
        </span>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {depts.map((d) => {
          const open = expandedDept === d.department_name;
          const fingerPct = pct(d.fingered_count, d.person_count);
          const missPct = pct(d.missing_out_count, d.person_count);
          const deptMissingKey = `dept:${d.department_name}`;
          const deptPeople = missingPeople.filter(
            (p) => p.department_name === d.department_name,
          );
          return (
            <div key={d.department_name}>
              <div className="flex w-full flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <button
                  type="button"
                  onClick={() => onToggleDept(d.department_name)}
                  className="min-w-0 flex-1 text-left transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400" aria-hidden>
                      {open ? "▾" : "▸"}
                    </span>
                    <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {d.department_name}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {d.sections.length} section
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="flex h-full">
                      <div
                        className="bg-emerald-500"
                        style={{
                          width: `${pct(d.complete_count, d.person_count)}%`,
                        }}
                        title="Lengkap"
                      />
                      <div
                        className="bg-amber-400"
                        style={{ width: `${missPct}%` }}
                        title="Missing OUT"
                      />
                    </div>
                  </div>
                </button>
                <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums sm:justify-end">
                  <span className="text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {d.person_count.toLocaleString("id-ID")}
                    </span>{" "}
                    orang
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Finger {d.fingered_count.toLocaleString("id-ID")} ({fingerPct}
                    %)
                  </span>
                  {d.missing_out_count > 0 ? (
                    <button
                      type="button"
                      className={`rounded-md px-1.5 py-0.5 text-amber-800 underline decoration-dotted underline-offset-2 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40 ${
                        openMissingKey === deptMissingKey
                          ? "bg-amber-50 dark:bg-amber-950/40"
                          : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!open) onToggleDept(d.department_name);
                        setOpenMissingKey((cur) =>
                          cur === deptMissingKey ? null : deptMissingKey,
                        );
                      }}
                    >
                      Missing {d.missing_out_count.toLocaleString("id-ID")} (
                      {missPct}%)
                    </button>
                  ) : (
                    <span className="text-gray-400">Missing 0</span>
                  )}
                </div>
              </div>
              {open && openMissingKey === deptMissingKey ? (
                <MissingOutPeopleList
                  people={deptPeople}
                  totalCount={d.missing_out_count}
                  scopeLabel={d.department_name}
                />
              ) : null}
              {open ? (
                <div className="border-t border-dashed border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-white/[0.015]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-4 py-2 font-medium">Section</th>
                          <th className="px-3 py-2 font-medium">Orang</th>
                          <th className="px-3 py-2 font-medium">Sudah finger</th>
                          <th className="px-3 py-2 font-medium">Lengkap</th>
                          <th className="px-3 py-2 font-medium">Missing OUT</th>
                          <th className="px-3 py-2 font-medium">Non OAMS</th>
                          <th className="px-3 py-2 font-medium">OAMS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...d.sections]
                          .sort(
                            (a, b) =>
                              b.missing_out_count - a.missing_out_count ||
                              b.person_count - a.person_count,
                          )
                          .map((s) => {
                            const secKey = `sec:${d.department_name}|${s.section_name}`;
                            const secPeople = missingPeople.filter(
                              (p) =>
                                p.department_name === d.department_name &&
                                p.section_name === s.section_name,
                            );
                            const secOpen = openMissingKey === secKey;
                            return (
                              <Fragment
                                key={`${d.department_name}-${s.section_name}`}
                              >
                                <tr className="border-t border-gray-100 dark:border-gray-900">
                                  <td className="px-4 py-2 text-gray-800 dark:text-gray-200">
                                    {s.section_name}
                                  </td>
                                  <td className="px-3 py-2 tabular-nums">
                                    {s.person_count.toLocaleString("id-ID")}
                                  </td>
                                  <td className="px-3 py-2 tabular-nums text-emerald-700 dark:text-emerald-400">
                                    {s.fingered_count.toLocaleString("id-ID")}{" "}
                                    <span className="text-gray-400">
                                      ({pct(s.fingered_count, s.person_count)}%)
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 tabular-nums">
                                    {s.complete_count.toLocaleString("id-ID")}
                                  </td>
                                  <td className="px-3 py-2 tabular-nums">
                                    {s.missing_out_count > 0 ? (
                                      <button
                                        type="button"
                                        className={`rounded px-1 py-0.5 text-amber-800 underline decoration-dotted underline-offset-2 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40 ${
                                          secOpen
                                            ? "bg-amber-50 dark:bg-amber-950/40"
                                            : ""
                                        }`}
                                        onClick={() =>
                                          setOpenMissingKey((cur) =>
                                            cur === secKey ? null : secKey,
                                          )
                                        }
                                      >
                                        {s.missing_out_count.toLocaleString(
                                          "id-ID",
                                        )}{" "}
                                        <span className="text-gray-400">
                                          (
                                          {pct(
                                            s.missing_out_count,
                                            s.person_count,
                                          )}
                                          %)
                                        </span>
                                      </button>
                                    ) : (
                                      <span className="text-gray-400">0</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 tabular-nums text-sky-700 dark:text-sky-400">
                                    {s.non_oams_count.toLocaleString("id-ID")}
                                  </td>
                                  <td className="px-3 py-2 tabular-nums text-emerald-700 dark:text-emerald-400">
                                    {s.oams_count.toLocaleString("id-ID")}
                                  </td>
                                </tr>
                                {secOpen ? (
                                  <tr className="border-t border-amber-100 dark:border-amber-900/40">
                                    <td colSpan={7} className="p-0">
                                      <MissingOutPeopleList
                                        people={secPeople}
                                        totalCount={s.missing_out_count}
                                        scopeLabel={s.section_name}
                                      />
                                    </td>
                                  </tr>
                                ) : null}
                              </Fragment>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function canRunFingerPulse(levelCode?: string | null): boolean {
  const code = String(levelCode || "").toLowerCase();
  return code === "superadmin" || code === "sa" || code === "hr_administrator";
}

function fmtRunWhen(v?: string | null): string {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v).slice(0, 19);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(v).slice(0, 19);
  }
}

/** Window dates from SQL often arrive as ISO datetime — keep YYYY-MM-DD only. */
function fmtRunDate(v?: string | null): string {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return toIsoDate(d);
  } catch {
    /* ignore */
  }
  return s.slice(0, 10);
}

const RUN_ACTION_LABEL: Record<FingerPulseRunAction, string> = {
  pulse: "Pulse",
  reconcile: "Reconcile",
  backfill: "Backfill",
};

const RUN_PHASES = [
  "Menarik data Biostar (Non OAMS + OAMS)…",
  "Menulis buffer stage…",
  "PROMOTE ke raw & canonical…",
] as const;

function fmtElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function RunSpinner({ tone = "brand" }: { tone?: "brand" | "white" }) {
  return (
    <span
      className={
        tone === "white"
          ? "h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/35 border-t-white"
          : "h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 dark:border-brand-800 dark:border-t-brand-300"
      }
      aria-hidden
    />
  );
}

function RunActionCard({
  title,
  description,
  badge,
  busy,
  disabled,
  variant = "outline",
  onClick,
  children,
}: {
  title: string;
  description: string;
  badge?: string;
  busy: boolean;
  disabled: boolean;
  variant?: "primary" | "outline";
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border bg-white p-3.5 shadow-theme-xs dark:bg-gray-950/60 ${
        busy
          ? "border-brand-400 ring-1 ring-brand-200 dark:border-brand-600 dark:ring-brand-900"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="mb-3 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {badge ? (
            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
      {children}
      <Button
        size="sm"
        variant={variant}
        disabled={disabled}
        className="mt-3 w-full"
        onClick={onClick}
        startIcon={busy ? <RunSpinner tone={variant === "primary" ? "white" : "brand"} /> : undefined}
      >
        {busy ? `Menjalankan ${title}…` : `Jalankan ${title}`}
      </Button>
    </div>
  );
}

function FingerPulseRunProgress({
  action,
  backfillFrom,
  backfillTo,
  elapsedSec,
  phaseIndex,
}: {
  action: FingerPulseRunAction;
  backfillFrom: string;
  backfillTo: string;
  elapsedSec: number;
  phaseIndex: number;
}) {
  const windowLabel =
    action === "backfill"
      ? `${backfillFrom} – ${backfillTo}`
      : action === "reconcile"
        ? "D-3 … D-1"
        : "hari shift";

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-brand-300 bg-white p-4 shadow-theme-sm dark:border-brand-800 dark:bg-gray-950"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden bg-brand-100 dark:bg-brand-950"
        aria-hidden
      >
        <div className="h-full w-1/3 animate-[fp-indet_1.4s_ease-in-out_infinite] rounded-full bg-brand-500" />
      </div>

      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 h-8 w-8 shrink-0 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-500 dark:border-brand-900 dark:border-t-brand-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Menjalankan {RUN_ACTION_LABEL[action]}
            </span>
            <span className="font-mono text-xs tabular-nums text-brand-600 dark:text-brand-300">
              {fmtElapsed(elapsedSec)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Window {windowLabel} · jangan tutup tab — pull Biostar bisa beberapa
            menit
          </p>
          <p className="mt-2 text-sm text-brand-700 transition-opacity dark:text-brand-300">
            {RUN_PHASES[phaseIndex % RUN_PHASES.length]}
          </p>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {RUN_PHASES.map((_, i) => (
              <span
                key={RUN_PHASES[i]}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i === phaseIndex % RUN_PHASES.length
                    ? "bg-brand-500"
                    : i < phaseIndex % RUN_PHASES.length
                      ? "bg-brand-300 dark:bg-brand-700"
                      : "bg-gray-200 dark:bg-gray-800"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fp-indet {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(380%); }
        }
      `}</style>
    </div>
  );
}

const PAGE_SIZE = 25;

const SOURCE_CHIPS: { id: FingerPulseSource; label: string; hint?: string }[] = [
  { id: "all", label: "Semua", hint: "Non OAMS + OAMS" },
  { id: "machine", label: "Non OAMS", hint: "Punch fingerprint mesin" },
  { id: "oams", label: "OAMS", hint: "Data OAMS" },
  { id: "both", label: "Keduanya", hint: "Ada di Non OAMS & OAMS" },
];

const COMP_CHIPS: {
  id: FingerPulseCompleteness;
  label: string;
  hint?: string;
}[] = [
  { id: "all", label: "Semua", hint: "Tanpa filter kelengkapan" },
  { id: "complete", label: "Lengkap", hint: "Ada IN dan OUT" },
  {
    id: "missing_out",
    label: "Missing OUT",
    hint: "Ada IN, belum OUT (tidak berlaku untuk hari shift hari ini)",
  },
  { id: "machine_only", label: "Hanya Non OAMS", hint: "Tanpa baris OAMS" },
  { id: "oams_only", label: "Hanya OAMS", hint: "Tanpa punch Non OAMS" },
];

/** Prefer wall-clock from ISO string (avoid UTC shift on naive SQL datetimes). */
function fmtClock(v?: string | null): string {
  if (!v) return "—";
  const m = String(v).match(/T(\d{2}:\d{2})/);
  if (m) return m[1];
  try {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  } catch {
    /* ignore */
  }
  return "—";
}

function truthy(v: number | boolean | undefined): boolean {
  return v === true || v === 1;
}

function lagLabel(sec?: number | null): string {
  if (sec == null || Number.isNaN(sec)) return "belum pernah sync";
  if (sec < 60) return `${sec}s lalu`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m lalu`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}j lalu`;
  return `${Math.floor(sec / 86400)}h lalu`;
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white"
          : "rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]"
      }
    >
      {children}
    </button>
  );
}

function DualClock({
  label,
  inn,
  out,
  tone,
}: {
  label: string;
  inn?: string | null;
  out?: string | null;
  tone: "machine" | "oams";
}) {
  const bar =
    tone === "machine"
      ? "border-sky-200 bg-sky-50/80 dark:border-sky-900/50 dark:bg-sky-950/30"
      : "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30";
  return (
    <div className={`min-w-[9.5rem] rounded-lg border px-3 py-2 ${bar}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 font-mono text-sm tabular-nums text-gray-800 dark:text-white/90">
        <span>{fmtClock(inn)}</span>
        <span className="text-gray-400">→</span>
        <span>{fmtClock(out)}</span>
      </div>
    </div>
  );
}

function PersonRow({
  row,
  date,
  expanded,
  onToggle,
  countMissingOut,
}: {
  row: FingerPulsePersonDay;
  date: string;
  expanded: boolean;
  onToggle: () => void;
  /** False for shift-date today — belum OUT masih normal. */
  countMissingOut: boolean;
}) {
  const [punches, setPunches] = useState<FingerPulsePunch[] | null>(null);
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchErr, setPunchErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!expanded) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setPunchLoading(true);
    setPunchErr(null);
    fingerPulseService
      .punches({ date, nrp: row.nrp }, ac.signal)
      .then((res) => {
        if (ac.signal.aborted) return;
        setPunches(res.data || []);
      })
      .catch((err: Error) => {
        if (ac.signal.aborted || err.name === "AbortError") return;
        setPunchErr(err.message || "Gagal memuat punch");
      })
      .finally(() => {
        if (!ac.signal.aborted) setPunchLoading(false);
      });
    return () => ac.abort();
  }, [expanded, date, row.nrp]);

  const hasM = truthy(row.has_machine);
  const hasO = truthy(row.has_oams);
  const conflict = truthy(row.has_conflict);

  return (
    <div className="border-b border-gray-100 last:border-b-0 dark:border-gray-800">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 px-4 py-3 text-left transition hover:bg-gray-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 dark:hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
              {row.nrp}
            </span>
            {hasM ? (
              <Badge size="sm" color="info">
                Non OAMS
              </Badge>
            ) : null}
            {hasO ? (
              <Badge size="sm" color="success">
                OAMS
              </Badge>
            ) : null}
            {conflict ? (
              <Badge size="sm" color="warning">
                Selisih
              </Badge>
            ) : null}
            {countMissingOut && row.best_in && !row.best_out ? (
              <Badge size="sm" color="error">
                Missing OUT
              </Badge>
            ) : null}
          </div>
          <div className="mt-0.5 truncate text-sm font-medium text-gray-800 dark:text-white/90">
            {row.full_name || "—"}
          </div>
          <div className="truncate text-xs text-gray-500 dark:text-gray-400">
            {[row.department_name, row.section_name].filter(Boolean).join(" · ") ||
              "—"}
            {hasO && row.area ? ` · ${row.area}` : ""}
            {hasO && row.unitjigsaw ? ` · ${row.unitjigsaw}` : ""}
            {hasO && row.shift ? ` · shift ${row.shift}` : ""}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <DualClock
            label="Non OAMS"
            inn={row.machine_in}
            out={row.machine_out}
            tone="machine"
          />
          <DualClock
            label="OAMS"
            inn={row.oams_in}
            out={row.oams_out}
            tone="oams"
          />
        </div>

        <span
          className="hidden text-gray-400 sm:inline"
          aria-hidden
        >
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-dashed border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Timeline Non OAMS
            {row.machine_punch_count
              ? ` · ${row.machine_punch_count} event`
              : ""}
          </div>
          {punchLoading ? (
            <p className="text-sm text-gray-500">Memuat punch…</p>
          ) : punchErr ? (
            <p className="text-sm text-error-600">{punchErr}</p>
          ) : !punches?.length ? (
            <p className="text-sm text-gray-500">Tidak ada punch Non OAMS.</p>
          ) : (
            <ol className="relative ms-2 space-y-2 border-s border-gray-200 ps-4 dark:border-gray-700">
              {punches.map((p) => (
                <li key={p.id} className="relative">
                  <span
                    className={`absolute -start-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-900 ${
                      p.event_label === "IN"
                        ? "bg-sky-500"
                        : p.event_label === "OUT"
                          ? "bg-amber-500"
                          : "bg-gray-400"
                    }`}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono tabular-nums text-gray-800 dark:text-white/90">
                      {p.time?.slice(0, 8) || "—"}
                    </span>
                    <Badge
                      size="sm"
                      color={
                        p.event_label === "IN"
                          ? "info"
                          : p.event_label === "OUT"
                            ? "warning"
                            : "light"
                      }
                    >
                      {p.event_label}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      event {p.ntnaevent ?? "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function FingerPulsePage() {
  const { canRead } = usePermission("hr_finger_pulse");
  const { user } = useAuth();
  const showRunPanel = canRunFingerPulse(user?.level_code);
  const [date, setDate] = useState(currentShiftDate);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [source, setSource] = useState<FingerPulseSource>("all");
  const [completeness, setCompleteness] =
    useState<FingerPulseCompleteness>("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<FingerPulsePersonDay[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<FingerPulseSummary | null>(null);
  const [byStructure, setByStructure] = useState<FingerPulseStructureKpi[]>(
    [],
  );
  const [missingOutPeople, setMissingOutPeople] = useState<
    FingerPulseMissingOutPerson[]
  >([]);
  const [watermarks, setWatermarks] = useState<FingerPulseWatermark[]>([]);
  const [recentRuns, setRecentRuns] = useState<FingerPulseRecentRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNrp, setExpandedNrp] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [backfillFrom, setBackfillFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    return toIsoDate(d);
  });
  const [backfillTo, setBackfillTo] = useState(() => toIsoDate(new Date()));
  const [runBusy, setRunBusy] = useState<FingerPulseRunAction | null>(null);
  const [runElapsedSec, setRunElapsedSec] = useState(0);
  const [runPhase, setRunPhase] = useState(0);
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [runErr, setRunErr] = useState<string | null>(null);
  const listAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
    setExpandedNrp(null);
    setExpandedDept(null);
  }, [date, qDebounced, source, completeness]);

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fingerPulseService.status(signal);
      setWatermarks(res.data?.watermarks || []);
      setRecentRuns(res.data?.recent_runs || []);
    } catch {
      /* non-fatal for the list */
    }
  }, []);

  const loadList = useCallback(async () => {
    listAbort.current?.abort();
    const ac = new AbortController();
    listAbort.current = ac;
    setLoading(true);
    setError(null);
    try {
      const res = await fingerPulseService.list(
        {
          date,
          q: qDebounced || undefined,
          source,
          completeness,
          page,
          page_size: PAGE_SIZE,
        },
        ac.signal,
      );
      if (ac.signal.aborted) return;
      setRows(res.data || []);
      setTotal(Number(res.meta?.total) || 0);
      setSummary(res.meta?.summary || null);
      setByStructure(res.meta?.by_structure || []);
      setMissingOutPeople(res.meta?.missing_out_people || []);
    } catch (err) {
      if (ac.signal.aborted || (err as Error).name === "AbortError") return;
      const body = (err as { body?: { error?: string; message?: string } })?.body;
      setError(
        body?.error ||
          body?.message ||
          (err as Error).message ||
          "Gagal memuat Finger Pulse",
      );
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [date, qDebounced, source, completeness, page]);

  const handleRun = useCallback(
    async (action: FingerPulseRunAction) => {
      if (runBusy) return;
      setRunBusy(action);
      setRunElapsedSec(0);
      setRunPhase(0);
      setRunMsg(null);
      setRunErr(null);
      try {
        const body =
          action === "backfill"
            ? { action, date_from: backfillFrom, date_to: backfillTo }
            : { action };
        const res = await fingerPulseService.run(body);
        setRunMsg(
          res.message ||
            res.data?.message ||
            `Finger Pulse ${action} selesai`,
        );
        await loadStatus();
        await loadList();
      } catch (err) {
        const body = (err as { body?: { error?: string; message?: string } })
          ?.body;
        setRunErr(
          body?.error ||
            body?.message ||
            (err as Error).message ||
            `Gagal menjalankan ${action}`,
        );
        await loadStatus();
      } finally {
        setRunBusy(null);
      }
    },
    [runBusy, backfillFrom, backfillTo, loadStatus, loadList],
  );

  useEffect(() => {
    if (!runBusy) return;
    const tick = window.setInterval(() => {
      setRunElapsedSec((s) => s + 1);
    }, 1000);
    const phase = window.setInterval(() => {
      setRunPhase((p) => p + 1);
    }, 4500);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(phase);
    };
  }, [runBusy]);

  useEffect(() => {
    const ac = new AbortController();
    void loadStatus(ac.signal);
    return () => ac.abort();
  }, [loadStatus]);

  useEffect(() => {
    void loadList();
    return () => listAbort.current?.abort();
  }, [loadList]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const syncBits = useMemo(() => {
    const non = watermarks.find((w) => w.stream === "non_oams");
    const oams = watermarks.find((w) => w.stream === "oams");
    const worstLag = Math.max(
      non?.lag_seconds ?? -1,
      oams?.lag_seconds ?? -1,
    );
    const failed =
      non?.last_status === "FAILED" || oams?.last_status === "FAILED";
    return { non, oams, worstLag, failed };
  }, [watermarks]);

  if (!canRead) {
    return (
      <div className="p-6">
        <PageMeta title="Finger Pulse | MyHR" description="Finger Pulse" />
        <PageBreadcrumb pageTitle="Finger Pulse" />
        <p className="text-sm text-gray-500">
          Anda tidak punya akses membaca Finger Pulse.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageMeta
        title="Finger Pulse | MyHR"
        description="Gabungan punch Non OAMS dan OAMS per karyawan/hari"
      />
      <PageBreadcrumb pageTitle="Finger Pulse" />

      {/* Sync strip */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Ingest Biostar
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Badge size="sm" color={syncBits.failed ? "error" : "success"}>
              {syncBits.failed ? "FAILED" : "OK"}
            </Badge>
            <span>
              Non OAMS {lagLabel(syncBits.non?.lag_seconds)} · OAMS{" "}
              {lagLabel(syncBits.oams?.lag_seconds)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
          <span className="rounded-md bg-sky-50 px-2 py-1 dark:bg-sky-950/40">
            Non OAMS {summary?.machine_count ?? "—"}
          </span>
          <span className="rounded-md bg-emerald-50 px-2 py-1 dark:bg-emerald-950/40">
            OAMS {summary?.oams_count ?? "—"}
          </span>
          <span className="rounded-md bg-violet-50 px-2 py-1 dark:bg-violet-950/40">
            Keduanya {summary?.both_count ?? "—"}
          </span>
          <span className="rounded-md bg-amber-50 px-2 py-1 dark:bg-amber-950/40">
            Missing OUT {summary?.missing_out_count ?? "—"}
          </span>
        </div>
      </div>

      {showRunPanel ? (
        <section
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] md:p-5"
          aria-label="Manual Finger Pulse"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Sinkronisasi manual
                </h2>
                <Badge size="sm" color="warning">
                  Uji / darurat
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Jalankan pull Biostar dari UI (sama dengan cron CLI). Pilih satu
                aksi — hanya satu proses pada satu waktu. Produksi nanti tetap
                lewat Task Scheduler.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!!runBusy}
              className="shrink-0"
              onClick={() => void loadStatus()}
            >
              Refresh status
            </Button>
          </div>

          {runBusy ? (
            <FingerPulseRunProgress
              action={runBusy}
              backfillFrom={backfillFrom}
              backfillTo={backfillTo}
              elapsedSec={runElapsedSec}
              phaseIndex={runPhase}
            />
          ) : null}

          {runMsg && !runBusy ? (
            <div
              className="flex items-start gap-2 rounded-lg border border-success-200 bg-success-50 px-3 py-2.5 text-sm text-success-700 dark:border-success-900/50 dark:bg-success-950/30 dark:text-success-300"
              role="status"
            >
              <span className="mt-0.5 font-semibold" aria-hidden>
                ✓
              </span>
              <span className="min-w-0 flex-1">{runMsg}</span>
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-success-700/80 hover:underline dark:text-success-300"
                onClick={() => setRunMsg(null)}
              >
                Tutup
              </button>
            </div>
          ) : null}
          {runErr && !runBusy ? (
            <div
              className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:border-error-900/50 dark:bg-error-950/30 dark:text-error-300"
              role="alert"
            >
              <span className="mt-0.5 font-semibold" aria-hidden>
                !
              </span>
              <span className="min-w-0 flex-1">{runErr}</span>
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-error-700/80 hover:underline dark:text-error-300"
                onClick={() => setRunErr(null)}
              >
                Tutup
              </button>
            </div>
          ) : null}

          <div
            className={`grid gap-3 transition sm:grid-cols-2 xl:grid-cols-3 ${
              runBusy ? "pointer-events-none opacity-50" : ""
            }`}
            aria-disabled={!!runBusy}
          >
            <RunActionCard
              title="Pulse"
              badge="Rutin"
              description="Tarik punch hari shift sekarang (sebelum 07:30 = kemarin). Mirip job setiap 15 menit."
              busy={runBusy === "pulse"}
              disabled={!!runBusy}
              variant="primary"
              onClick={() => void handleRun("pulse")}
            />

            <RunActionCard
              title="Reconcile"
              badge="Harian"
              description="Isi ulang D-3 sampai D-1 untuk mengejar dump mesin yang terlambat."
              busy={runBusy === "reconcile"}
              disabled={!!runBusy}
              variant="outline"
              onClick={() => void handleRun("reconcile")}
            />

            <RunActionCard
              title="Backfill"
              badge="Rentang"
              description="Isi ulang tanggal tertentu (maks. 31 hari). Cocok untuk percobaan atau perbaikan data."
              busy={runBusy === "backfill"}
              disabled={
                !!runBusy ||
                !backfillFrom ||
                !backfillTo ||
                backfillFrom > backfillTo
              }
              variant="outline"
              onClick={() => void handleRun("backfill")}
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    Dari
                  </label>
                  <CalendarDateField
                    value={backfillFrom}
                    onChange={setBackfillFrom}
                    maxDate={backfillTo}
                    disabled={!!runBusy}
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    Sampai
                  </label>
                  <CalendarDateField
                    value={backfillTo}
                    onChange={setBackfillTo}
                    maxDate={toIsoDate(new Date())}
                    disabled={!!runBusy}
                  />
                </div>
              </div>
              {backfillFrom && backfillTo && backfillFrom > backfillTo ? (
                <p className="mt-2 text-[11px] text-error-600">
                  Tanggal “Dari” harus sebelum atau sama dengan “Sampai”.
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                  {backfillFrom && backfillTo
                    ? `${backfillFrom} → ${backfillTo}`
                    : "Pilih rentang tanggal"}
                </p>
              )}
            </RunActionCard>
          </div>

          {recentRuns.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Riwayat run terbaru
                </h3>
                <span className="text-[11px] text-gray-400">
                  {Math.min(8, recentRuns.length)} terakhir
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-gray-100 bg-gray-50/80 text-[10px] uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Mode</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Window</th>
                      <th className="px-3 py-2.5 font-medium">Mulai</th>
                      <th className="px-3 py-2.5 font-medium">In / New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRuns.slice(0, 8).map((r, i) => (
                      <tr
                        key={r.id ?? `${r.mode}-${r.started_at}-${i}`}
                        className="border-b border-gray-50 last:border-0 dark:border-gray-900"
                      >
                        <td className="px-3 py-2 font-mono text-gray-800 dark:text-gray-200">
                          {r.mode || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            size="sm"
                            color={
                              String(r.status || "").toUpperCase() === "OK" ||
                              String(r.status || "").toUpperCase() ===
                                "SUCCESS"
                                ? "success"
                                : String(r.status || "")
                                      .toUpperCase()
                                      .includes("FAIL")
                                  ? "error"
                                  : String(r.status || "").toUpperCase() ===
                                      "RUNNING"
                                    ? "warning"
                                    : "light"
                            }
                          >
                            {r.status || "—"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums text-gray-600 dark:text-gray-400">
                          {[fmtRunDate(r.date_from), fmtRunDate(r.date_to)]
                            .filter(Boolean)
                            .join(" – ") || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {fmtRunWhen(r.started_at)}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-gray-600 dark:text-gray-400">
                          {r.rows_in ?? "—"} / {r.raw_new ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Person-day filters + list */}
      <section
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] md:p-5"
        aria-label="Person-day Finger Pulse"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Data person-day
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Gabungan punch Non OAMS dan OAMS per karyawan per hari.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => {
              void loadStatus();
              void loadList();
            }}
          >
            Refresh data
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)]">
          <div>
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Tanggal
            </label>
            <CalendarDateField
              value={date}
              onChange={setDate}
              maxDate={currentShiftDate()}
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Cari karyawan
            </label>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="NRP atau nama…"
              className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="min-w-0">
            <legend className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Sumber data
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sumber data">
              {SOURCE_CHIPS.map((c) => (
                <Chip
                  key={c.id}
                  active={source === c.id}
                  onClick={() => setSource(c.id)}
                >
                  <span className="inline-flex flex-col items-start leading-tight sm:flex-row sm:items-center sm:gap-1.5">
                    <span>{c.label}</span>
                    {c.hint && source === c.id ? (
                      <span className="hidden text-[10px] font-normal opacity-80 sm:inline">
                        · {c.hint}
                      </span>
                    ) : null}
                  </span>
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500 sm:hidden">
              {SOURCE_CHIPS.find((c) => c.id === source)?.hint}
            </p>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Kelengkapan
            </legend>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Kelengkapan"
            >
              {COMP_CHIPS.map((c) => (
                <Chip
                  key={c.id}
                  active={completeness === c.id}
                  onClick={() => setCompleteness(c.id)}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
              {COMP_CHIPS.find((c) => c.id === completeness)?.hint}
            </p>
          </fieldset>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Person-day"
            value={total}
            hint="Total baris filter ini"
            tone="neutral"
            loading={loading}
          />
          <KpiCard
            label="Sudah finger"
            value={summary?.fingered_count ?? 0}
            hint={`${pct(summary?.fingered_count ?? 0, total)}% punya IN`}
            tone="emerald"
            loading={loading}
          />
          <KpiCard
            label="Lengkap"
            value={summary?.complete_count ?? 0}
            hint="IN + OUT"
            tone="sky"
            loading={loading}
          />
          <KpiCard
            label="Missing OUT"
            value={summary?.missing_out_count ?? 0}
            hint={
              date >= currentShiftDate()
                ? "Hari shift ini: belum dihitung (OUT boleh kosong)"
                : `${pct(summary?.missing_out_count ?? 0, total)}% dari total`
            }
            tone="amber"
            loading={loading}
          />
          <KpiCard
            label="Non OAMS"
            value={summary?.machine_count ?? 0}
            hint="Ada punch Non OAMS"
            tone="sky"
            loading={loading}
          />
          <KpiCard
            label="OAMS"
            value={summary?.oams_count ?? 0}
            hint="Ada data OAMS"
            tone="violet"
            loading={loading}
          />
        </div>

        <StructureKpiPanel
          rows={byStructure}
          missingPeople={missingOutPeople}
          expandedDept={expandedDept}
          loading={loading}
          onToggleDept={(dept) =>
            setExpandedDept((cur) => (cur === dept ? null : dept))
          }
        />

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Hasil
          </span>
          <span className="text-xs text-gray-500">
            {loading ? "Memuat…" : `${total.toLocaleString("id-ID")} baris`}
          </span>
        </div>

        <div className="relative">
          {loading && rows.length > 0 ? (
            <TableLoadingOverlay label="Memuat Finger Pulse…" />
          ) : null}

          {error ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-error-600">{error}</p>
              <button
                type="button"
                className="mt-3 text-sm text-brand-600 underline"
                onClick={() => void loadList()}
              >
                Coba lagi
              </button>
            </div>
          ) : loading && rows.length === 0 ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              Tidak ada data untuk filter ini.
            </p>
          ) : (
            <div
              className={
                loading ? "opacity-50 pointer-events-none" : undefined
              }
            >
              {rows.map((row) => (
                <PersonRow
                  key={`${row.nrp}-${row.date}`}
                  row={row}
                  date={date}
                  countMissingOut={date < currentShiftDate()}
                  expanded={expandedNrp === row.nrp}
                  onToggle={() =>
                    setExpandedNrp((cur) =>
                      cur === row.nrp ? null : row.nrp,
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>

        {pageCount > 1 ? (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <span className="text-xs text-gray-500">
              Halaman {page} / {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pageCount || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
        </div>
      </section>
    </div>
  );
}
