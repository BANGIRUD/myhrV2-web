import { useMemo } from "react";
import type { ReactNode } from "react";
import type { AttendanceRow, ShiftFilter } from "../../../services/dashboard";

type Pair = { plan: number; actual: number };

type Tone = {
  /** Group header cell (bottom accent + tint). */
  head: string;
};

type Column = {
  key: string;
  label: string;
  /** Alpha has no plan: workers are rostered to work, never "planned" absent. */
  planless?: boolean;
  tone: Tone;
  pick: (r: AttendanceRow, shift: ShiftFilter) => Pair;
};

const alphaActual = (r: AttendanceRow, shift: ShiftFilter) =>
  shift === "day"
    ? r.actual_alpha_day
    : shift === "night"
      ? r.actual_alpha_night
      : r.actual_alpha;

const COLUMNS: Column[] = [
  {
    key: "day",
    label: "Day",
    tone: {
      head: "border-warning-400 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
    },
    pick: (r) => ({ plan: r.plan_day, actual: r.actual_day }),
  },
  {
    key: "night",
    label: "Night",
    tone: {
      head: "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
    },
    pick: (r) => ({ plan: r.plan_night, actual: r.actual_night }),
  },
  {
    key: "off",
    label: "Off",
    tone: {
      head: "border-gray-400 bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300",
    },
    pick: (r) => ({ plan: r.plan_off, actual: r.actual_off }),
  },
  {
    key: "cuti",
    label: "Cuti",
    tone: {
      head: "border-blue-light-400 bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400",
    },
    pick: (r) => ({ plan: r.plan_cuti, actual: r.actual_cuti }),
  },
  {
    key: "sakit",
    label: "Sickness",
    tone: {
      head: "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    },
    pick: (r) => ({ plan: r.plan_sakit, actual: r.actual_sakit }),
  },
  {
    key: "izin",
    label: "Izin",
    tone: {
      head: "border-success-400 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    },
    pick: (r) => ({ plan: r.plan_izin, actual: r.actual_izin }),
  },
  {
    key: "lain",
    label: "Lain-Lain",
    tone: {
      head: "border-theme-purple-500 bg-theme-purple-500/10 text-theme-purple-500",
    },
    pick: (r) => ({ plan: r.plan_lain_lain, actual: r.actual_lain_lain }),
  },
  {
    key: "alpha",
    label: "Alpha",
    planless: true,
    tone: {
      head: "border-error-500 bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
    },
    pick: (r, shift) => ({ plan: 0, actual: alphaActual(r, shift) }),
  },
];

const nf = new Intl.NumberFormat("id-ID");

type Group = { key: string; department: string; rows: AttendanceRow[] };

/** Rows come ordered by department; group them so each department is written once. */
function groupByDepartment(rows: AttendanceRow[]): Group[] {
  const map = new Map<string, Group>();
  for (const row of rows) {
    const key = row.department_id ?? row.department;
    const g = map.get(key);
    if (g) g.rows.push(row);
    else map.set(key, { key, department: row.department, rows: [row] });
  }
  return [...map.values()];
}

type AttendanceTableProps = {
  rows: AttendanceRow[];
  shift: ShiftFilter;
};

export default function AttendanceTable({ rows, shift }: AttendanceTableProps) {
  const groups = useMemo(() => groupByDepartment(rows), [rows]);

  const totals = COLUMNS.map((col) =>
    rows.reduce(
      (sum, row) => {
        const { plan, actual } = col.pick(row, shift);
        return { plan: sum.plan + plan, actual: sum.actual + actual };
      },
      { plan: 0, actual: 0 },
    ),
  );
  const total = (key: string) => totals[COLUMNS.findIndex((c) => c.key === key)];
  const day = total("day");
  const night = total("night");
  const alpha = total("alpha");

  return (
    <div>
      <div className="flex flex-wrap gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 md:px-6">
        {shift !== "night" ? (
          <SummaryChip
            label="Day shift"
            value={`${nf.format(day.actual)} / ${nf.format(day.plan)}`}
            hint="actual / plan"
            dot="bg-warning-400"
          />
        ) : null}
        {shift !== "day" ? (
          <SummaryChip
            label="Night shift"
            value={`${nf.format(night.actual)} / ${nf.format(night.plan)}`}
            hint="actual / plan"
            dot="bg-brand-400"
          />
        ) : null}
        <SummaryChip
          label="Alpha"
          value={nf.format(alpha.actual)}
          hint="scheduled but absent"
          dot="bg-error-500"
          danger={alpha.actual > 0}
        />
        <SummaryChip
          label="Sections"
          value={nf.format(rows.length)}
          hint={`${groups.length} department${groups.length === 1 ? "" : "s"}`}
          dot="bg-gray-400"
        />
      </div>

      <div className="max-h-[34rem] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th
                rowSpan={2}
                scope="col"
                className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
              >
                Department
              </th>
              <th
                rowSpan={2}
                scope="col"
                className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
              >
                Section
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  colSpan={col.planless ? 1 : 2}
                  scope="colgroup"
                  className={`border-b-2 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide ${col.tone.head}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
            <tr>
              {COLUMNS.map((col) =>
                col.planless ? (
                  <SubHead key={col.key} label="Actual" />
                ) : (
                  <SubHeadPair key={col.key} />
                ),
              )}
            </tr>
          </thead>

          <tbody>
            {groups.map((group, gi) =>
              group.rows.map((row, ri) => {
                const first = ri === 0;
                const topLine =
                  first && gi > 0 ? "border-t border-gray-200 dark:border-gray-800" : "";
                return (
                  <tr
                    key={row.id}
                    className="group/row transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  >
                    {first ? (
                      <td
                        rowSpan={group.rows.length}
                        className={`border-l-4 border-brand-500 bg-gray-50/70 px-4 py-3 align-middle dark:bg-white/[0.02] ${
                          gi > 0 ? "border-t border-t-gray-200 dark:border-t-gray-800" : ""
                        }`}
                      >
                        <div className="font-semibold text-gray-800 dark:text-white/90">
                          {group.department}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-400">
                          {group.rows.length} section{group.rows.length === 1 ? "" : "s"}
                        </div>
                      </td>
                    ) : null}
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 text-gray-700 dark:text-gray-300 ${topLine}`}
                    >
                      {row.section}
                    </td>
                    {COLUMNS.map((col) => (
                      <StatusCells
                        key={col.key}
                        col={col}
                        {...col.pick(row, shift)}
                        className={topLine}
                      />
                    ))}
                  </tr>
                );
              }),
            )}
          </tbody>

          <tfoot className="sticky bottom-0 z-10">
            <tr>
              <td
                colSpan={2}
                className="border-t-2 border-gray-300 bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                Total
              </td>
              {COLUMNS.map((col, i) => (
                <StatusCells
                  key={col.key}
                  col={col}
                  {...totals[i]}
                  total
                  className="border-t-2 border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900"
                />
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="border-t border-gray-100 px-5 py-3 text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400 md:px-6">
        <strong className="font-semibold text-gray-600 dark:text-gray-300">Plan</strong> = scheduled
        in the work roster ·{" "}
        <strong className="font-semibold text-gray-600 dark:text-gray-300">Actual</strong> = recorded
        attendance (finger, cuti, sakit, izin, travel) ·{" "}
        <strong className="font-semibold text-gray-600 dark:text-gray-300">Alpha</strong> = scheduled
        to work but not present. <span className="text-warning-600">Orange</span> actual means below plan.
      </p>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  hint,
  dot,
  danger = false,
}: {
  label: string;
  value: string;
  hint: string;
  dot: string;
  danger?: boolean;
}) {
  return (
    <div className="flex min-w-[9rem] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-white/[0.03]">
      <span className={`size-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <div className="leading-tight">
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        <div
          className={`text-base font-semibold ${
            danger ? "text-error-600 dark:text-error-400" : "text-gray-800 dark:text-white/90"
          }`}
        >
          {value}
        </div>
        <div className="text-[11px] text-gray-400">{hint}</div>
      </div>
    </div>
  );
}

const subHeadClass =
  "border-b border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:bg-gray-900";

function SubHead({ label }: { label: string }) {
  return (
    <th scope="col" className={subHeadClass}>
      {label}
    </th>
  );
}

function SubHeadPair() {
  return (
    <>
      <SubHead label="Plan" />
      <SubHead label="Actual" />
    </>
  );
}

function StatusCells({
  col,
  plan,
  actual,
  total = false,
  className = "",
}: Pair & { col: Column; total?: boolean; className?: string }) {
  const muted = "text-gray-300 dark:text-gray-600";
  const weight = total ? "font-semibold" : "";

  const planCell = col.planless ? null : (
    <td className={`px-2 py-2.5 text-center tabular-nums ${className}`}>
      {plan === 0 ? (
        <span className={muted}>–</span>
      ) : (
        <span className={`text-gray-500 dark:text-gray-400 ${weight}`}>{nf.format(plan)}</span>
      )}
    </td>
  );

  let actualNode: ReactNode;
  if (actual === 0 && (col.planless || plan === 0)) {
    actualNode = <span className={muted}>–</span>;
  } else if (col.planless) {
    actualNode = (
      <span className="inline-flex min-w-[2rem] justify-center rounded-full bg-error-50 px-2 py-0.5 font-semibold text-error-600 dark:bg-error-500/15 dark:text-error-400">
        {nf.format(actual)}
      </span>
    );
  } else if (actual < plan) {
    actualNode = (
      <span className="font-semibold text-warning-600 dark:text-warning-400">
        {nf.format(actual)}
      </span>
    );
  } else {
    actualNode = (
      <span className="font-semibold text-gray-800 dark:text-white/90">{nf.format(actual)}</span>
    );
  }

  return (
    <>
      {planCell}
      <td className={`px-2 py-2.5 text-center tabular-nums ${className}`}>{actualNode}</td>
    </>
  );
}
