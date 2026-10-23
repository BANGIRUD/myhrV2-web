import { useMemo, useState } from "react";
import type { WorkPatternRow } from "../../../services/dashboard";

type WorkPatternBarsProps = {
  rows: WorkPatternRow[];
  /** Human readable date the roster is checked on, e.g. `01 Oct 2026`. */
  rosterDate: string;
};

const nf = new Intl.NumberFormat("id-ID");
const pf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

const pct = (done: number, total: number) =>
  total === 0 ? 0 : Math.round((done * 1000) / total) / 10;

/** Colour by completeness: full → green, ≥95% → brand, ≥80% → amber, below → red. */
function tone(value: number) {
  if (value >= 100) return { bar: "bg-success-500", text: "text-success-600 dark:text-success-400" };
  if (value >= 95) return { bar: "bg-brand-500", text: "text-brand-600 dark:text-brand-400" };
  if (value >= 80) return { bar: "bg-warning-500", text: "text-warning-600 dark:text-warning-400" };
  return { bar: "bg-error-500", text: "text-error-600 dark:text-error-400" };
}

type Group = {
  department: string;
  rows: WorkPatternRow[];
  worker: number;
  roster: number;
};

function groupByDepartment(rows: WorkPatternRow[]): Group[] {
  const map = new Map<string, Group>();
  for (const row of rows) {
    const g = map.get(row.department) ?? {
      department: row.department,
      rows: [],
      worker: 0,
      roster: 0,
    };
    g.rows.push(row);
    g.worker += row.total_worker;
    g.roster += row.total_pola_kerja;
    map.set(row.department, g);
  }
  return [...map.values()];
}

function Bar({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div
        className={`h-full rounded-full transition-[width] ${tone(clamped).bar}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function MissingBadge({ count }: { count: number }) {
  if (count <= 0) {
    return (
      <span className="rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-600 dark:bg-success-500/15 dark:text-success-400">
        Complete
      </span>
    );
  }
  return (
    <span className="rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-medium text-warning-700 dark:bg-warning-500/15 dark:text-warning-400">
      {nf.format(count)} without pola kerja
    </span>
  );
}

function SectionRow({ row }: { row: WorkPatternRow }) {
  const missing = row.total_worker - row.total_pola_kerja;
  const value = row.achievement;
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm text-gray-700 dark:text-gray-300" title={row.section}>
            {row.section || row.department}
          </span>
          <MissingBadge count={missing} />
        </div>
        <div className="shrink-0 text-sm tabular-nums">
          <span className="text-gray-500 dark:text-gray-400">
            {nf.format(row.total_pola_kerja)} of {nf.format(row.total_worker)}
          </span>
          <span className={`ml-2 font-semibold ${tone(value).text}`}>{pf.format(value)}%</span>
        </div>
      </div>
      <Bar value={value} label={`${row.section} pola kerja coverage`} />
    </div>
  );
}

/**
 * Pola kerja (work-pattern roster) completeness: how many active workers of each section
 * already have a roster row on the 1st of the selected month.
 */
export default function WorkPatternBars({ rows, rosterDate }: WorkPatternBarsProps) {
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);

  const worker = rows.reduce((s, r) => s + r.total_worker, 0);
  const roster = rows.reduce((s, r) => s + r.total_pola_kerja, 0);
  const missing = worker - roster;
  const overall = pct(roster, worker);

  const groups = useMemo(() => {
    const visible = onlyIncomplete
      ? rows.filter((r) => r.total_worker > r.total_pola_kerja)
      : rows;
    return groupByDepartment(visible);
  }, [rows, onlyIncomplete]);

  return (
    <div className="space-y-5 p-5 md:p-6">
      {/* Overall */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-gray-800 dark:text-white/90">
              All selected sections
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {nf.format(roster)} of {nf.format(worker)} active workers have a pola kerja
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MissingBadge count={missing} />
            <span className={`text-2xl font-bold tabular-nums ${tone(overall).text}`}>
              {pf.format(overall)}%
            </span>
          </div>
        </div>
        <Bar value={overall} label="Overall pola kerja coverage" />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Pola kerja checked on <strong className="text-gray-700 dark:text-gray-300">{rosterDate}</strong>
        </p>
        <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            checked={onlyIncomplete}
            onChange={(e) => setOnlyIncomplete(e.target.checked)}
          />
          Show incomplete sections only
        </label>
      </div>

      {/* Per department */}
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-success-200 bg-success-50/50 px-4 py-8 text-center text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
          Every worker in the selected sections already has a pola kerja.
        </div>
      ) : (
        <div className="max-h-[28rem] space-y-6 overflow-y-auto pr-2">
          {groups.map((group) => {
            const value = pct(group.roster, group.worker);
            return (
              <section key={group.department} aria-label={group.department}>
                <div className="mb-3 flex items-baseline justify-between gap-3 border-l-4 border-brand-500 pl-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-800 dark:text-white/90">
                    {group.department}
                  </h3>
                  <span className="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {nf.format(group.roster)} of {nf.format(group.worker)} ·{" "}
                    <span className={`font-semibold ${tone(value).text}`}>{pf.format(value)}%</span>
                  </span>
                </div>
                <div className="space-y-4 pl-4">
                  {group.rows.map((row) => (
                    <SectionRow key={row.id} row={row} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <strong className="font-semibold text-gray-600 dark:text-gray-300">Active workers</strong> = SIS
        and vendor workers who are not resigned / terminated / mutated.{" "}
        <strong className="font-semibold text-gray-600 dark:text-gray-300">Has pola kerja</strong> = a
        roster row exists on the 1st of the month. Without one, the worker cannot be planned in
        Status Absensi. This panel follows the selected <em>month</em>, not the exact day.
      </p>
    </div>
  );
}
