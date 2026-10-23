import { useEffect, useMemo, useState } from "react";
import type { EmployeeUnfitRow } from "../../../services/dashboard";
import { formatDisplayDate } from "../../../utils/dateShift";

type EmployeeUnfitTableProps = {
  rows: EmployeeUnfitRow[];
};

type SortKey = "days" | "name" | "section";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;
const nf = new Intl.NumberFormat("id-ID");

/** Duration buckets: how long a worker has been unfit. */
const DURATION_BUCKETS = [
  { max: 30, label: "< 30 days", bar: "bg-warning-400", text: "text-warning-600 dark:text-warning-400" },
  { max: 90, label: "30–90 days", bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
  { max: 180, label: "90–180 days", bar: "bg-error-400", text: "text-error-600 dark:text-error-400" },
  { max: Infinity, label: "> 180 days", bar: "bg-error-600", text: "text-error-700 dark:text-error-500" },
] as const;

function bucketOf(days: number | null) {
  const d = days ?? 0;
  return DURATION_BUCKETS.find((b) => d < b.max) ?? DURATION_BUCKETS[DURATION_BUCKETS.length - 1];
}

/** "357 days" -> "≈ 11 mo"; empty when under a month. */
function approxMonths(days: number): string {
  if (days < 30) return "";
  const months = Math.floor(days / 30);
  if (months < 12) return `≈ ${months} mo`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `≈ ${years} yr ${rest} mo` : `≈ ${years} yr`;
}

function isFollowUp(reason: string | null): boolean {
  return /follow/i.test(reason ?? "");
}

function reasonLabel(reason: string | null): string {
  if (!reason) return "—";
  return isFollowUp(reason) ? "Follow-up required" : "Unfit";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-3 py-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 rounded text-xs font-semibold uppercase tracking-wide hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:text-white ${
          active ? "text-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {label}
        <span aria-hidden className={active ? "" : "opacity-30"}>
          {active && dir === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}

function Stat({
  label,
  value,
  hint,
  valueClass = "text-gray-800 dark:text-white/90",
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold ${valueClass}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
    </div>
  );
}

export default function EmployeeUnfitTable({ rows }: EmployeeUnfitTableProps) {
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<"all" | "unfit" | "followup">("all");
  const [sortKey, setSortKey] = useState<SortKey>("days");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const stats = useMemo(() => {
    const days = rows.map((r) => r.total_hari ?? 0);
    const total = rows.length;
    const followUp = rows.filter((r) => isFollowUp(r.reason)).length;
    const avg = total ? Math.round(days.reduce((a, b) => a + b, 0) / total) : 0;
    const longTerm = days.filter((d) => d > 180).length;
    const maxDays = days.reduce((a, b) => Math.max(a, b), 0);
    return { total, followUp, avg, longTerm, maxDays };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (reasonFilter === "followup" && !isFollowUp(r.reason)) return false;
      if (reasonFilter === "unfit" && isFollowUp(r.reason)) return false;
      if (!q) return true;
      return (
        r.nrp.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.section_name ?? "").toLowerCase().includes(q) ||
        (r.department_name ?? "").toLowerCase().includes(q)
      );
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "days") return ((a.total_hari ?? 0) - (b.total_hari ?? 0)) * dir;
      if (sortKey === "name") return a.full_name.localeCompare(b.full_name) * dir;
      const sa = `${a.department_name ?? ""} ${a.section_name ?? ""}`;
      const sb = `${b.department_name ?? ""} ${b.section_name ?? ""}`;
      return sa.localeCompare(sb) * dir;
    });
  }, [rows, search, reasonFilter, sortKey, sortDir]);

  useEffect(() => setPage(1), [search, reasonFilter, sortKey, sortDir, rows]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const showDepartment = useMemo(
    () => new Set(rows.map((r) => r.department_name ?? "")).size > 1,
    [rows],
  );

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "days" ? "desc" : "asc");
    }
  };

  const filterBtn = (id: typeof reasonFilter, label: string, count: number) => (
    <button
      key={id}
      type="button"
      aria-pressed={reasonFilter === id}
      onClick={() => setReasonFilter(id)}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-brand-500 ${
        reasonFilter === id
          ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
          : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
      }`}
    >
      {label} <span className="opacity-70">({nf.format(count)})</span>
    </button>
  );

  return (
    <div className="space-y-4 p-5 md:p-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Unfit workers" value={nf.format(stats.total)} hint="Currently not fit to work" />
        <Stat
          label="Follow-up required"
          value={nf.format(stats.followUp)}
          hint="Need a medical follow-up"
          valueClass={stats.followUp ? "text-orange-600 dark:text-orange-400" : undefined}
        />
        <Stat
          label="Average duration"
          value={`${nf.format(stats.avg)} days`}
          hint={`Longest: ${nf.format(stats.maxDays)} days`}
        />
        <Stat
          label="Unfit > 180 days"
          value={nf.format(stats.longTerm)}
          hint="Long-term cases"
          valueClass={stats.longTerm ? "text-error-600 dark:text-error-400" : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by reason">
          {filterBtn("all", "All", stats.total)}
          {filterBtn("unfit", "Unfit", stats.total - stats.followUp)}
          {filterBtn("followup", "Follow-up required", stats.followUp)}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search NRP, name or section…"
          aria-label="Search unfit employees"
          className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 sm:w-64 dark:border-gray-700 dark:text-white/90"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="max-h-[32rem] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <SortHeader label="Employee" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
                <SortHeader label="Section" active={sortKey === "section"} dir={sortDir} onClick={() => toggleSort("section")} />
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Unfit since
                </th>
                <SortHeader label="Duration" active={sortKey === "days"} dir={sortDir} onClick={() => toggleSort("days")} align="right" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const days = row.total_hari ?? 0;
                const bucket = bucketOf(row.total_hari);
                const widthPct = stats.maxDays ? Math.max(4, Math.round((days / stats.maxDays) * 100)) : 0;
                const followUp = isFollowUp(row.reason);
                return (
                  <tr
                    key={`${row.nrp}-${row.start_date ?? ""}`}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 dark:border-gray-800/80 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                        >
                          {initials(row.full_name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-800 dark:text-white/90">{row.full_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">NRP {row.nrp}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-gray-800 dark:text-white/90">{row.section_name ?? "—"}</p>
                      {showDepartment ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.department_name ?? "—"}</p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          followUp
                            ? "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
                            : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
                        }`}
                      >
                        <span aria-hidden className={`size-1.5 rounded-full ${followUp ? "bg-orange-500" : "bg-error-500"}`} />
                        {reasonLabel(row.reason)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-300">
                      {row.start_date ? formatDisplayDate(String(row.start_date).slice(0, 10)) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="ml-auto w-36">
                        <p className={`text-right font-semibold tabular-nums ${bucket.text}`}>
                          {nf.format(days)} {days === 1 ? "day" : "days"}
                          {approxMonths(days) ? (
                            <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                              {approxMonths(days)}
                            </span>
                          ) : null}
                        </p>
                        <div
                          className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
                          title={bucket.label}
                        >
                          <div className={`h-full rounded-full ${bucket.bar}`} style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-gray-500 dark:text-gray-400">
                    No workers match the current search or filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            Showing {filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1}–
            {Math.min(current * PAGE_SIZE, filtered.length)} of {nf.format(filtered.length)}
          </span>
          <span className="flex items-center gap-3" aria-label="Duration legend">
            {DURATION_BUCKETS.map((b) => (
              <span key={b.label} className="inline-flex items-center gap-1">
                <span aria-hidden className={`size-2 rounded-full ${b.bar}`} />
                {b.label}
              </span>
            ))}
          </span>
        </div>
        {pageCount > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current <= 1}
              className="rounded-lg border border-gray-300 px-3 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Previous
            </button>
            <span>
              Page {current} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current >= pageCount}
              className="rounded-lg border border-gray-300 px-3 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
