import { useState } from "react";
import type { StructureDepartment } from "../../../types/auth";
import { STRUCTURE_ALL_LABEL } from "../../../utils/structure";

type StructureTreeProps = {
  departments: StructureDepartment[];
  /** Departments visible before "Show all". */
  initialVisible?: number;
};

const numberFormat = new Intl.NumberFormat("id-ID");

function formatCount(value: number | undefined) {
  return numberFormat.format(value ?? 0);
}

function plural(count: number, word: string) {
  return `${word}${count === 1 ? "" : "s"}`;
}

export default function StructureTree({
  departments,
  initialVisible = 6,
}: StructureTreeProps) {
  const [expanded, setExpanded] = useState(false);

  const totalDepartments = departments.filter((d) => d.id !== null).length;
  const totalSections = departments.reduce((sum, d) => sum + d.sections.length, 0);
  const totalWorkers = departments.reduce((sum, d) => sum + (d.worker_count ?? 0), 0);

  const sorted = [...departments].sort(
    (a, b) => (b.worker_count ?? 0) - (a.worker_count ?? 0),
  );
  const canCollapse = sorted.length > initialVisible;
  const visible = expanded || !canCollapse ? sorted : sorted.slice(0, initialVisible);

  const summary = [
    { label: plural(totalDepartments, "Department"), value: totalDepartments },
    { label: plural(totalSections, "Section"), value: totalSections },
    { label: "Active workers", value: totalWorkers },
  ];

  return (
    <section aria-label="Department and section structure" className="space-y-3">
      <dl className="grid grid-cols-3 gap-3">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <dt className="text-xs text-gray-500 dark:text-gray-400">{item.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-white/90">
              {formatCount(item.value)}
            </dd>
          </div>
        ))}
      </dl>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((department) => (
          <li
            key={department.id ?? "unassigned"}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="flex items-start justify-between gap-3">
              <p
                className="min-w-0 truncate text-sm font-semibold text-gray-800 dark:text-white/90"
                title={department.name ?? undefined}
              >
                {department.name ?? "Other sections"}
              </p>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold text-brand-600 dark:text-brand-400">
                  {formatCount(department.worker_count)}
                </span>
                <span className="block text-[11px] leading-tight text-gray-400">
                  workers
                </span>
              </span>
            </div>

            {department.sections.length > 0 ? (
              <ul className="mt-3 space-y-1.5 border-l-2 border-gray-100 pl-3 dark:border-gray-800">
                {department.sections.map((section) => (
                  <li
                    key={section.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span
                      className="min-w-0 truncate text-gray-700 dark:text-gray-300"
                      title={section.name}
                    >
                      {section.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
                      {formatCount(section.worker_count)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-3 border-l-2 border-gray-100 pl-3 dark:border-gray-800">
                <li className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    {STRUCTURE_ALL_LABEL} sections
                  </span>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
                    {formatCount(department.worker_count)}
                  </span>
                </li>
              </ul>
            )}
          </li>
        ))}
      </ul>

      {canCollapse ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:focus-visible:ring-offset-gray-900"
          >
            {expanded
              ? "Show fewer departments"
              : `Show all ${sorted.length} departments`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
