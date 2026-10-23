import type { StructureDepartment } from "../../../types/auth";
import StructureTree from "./StructureTree";
import ValueChips from "./ValueChips";

type DashboardHeaderMeta = {
  label: string;
  value: string;
  /** Render comma-separated value as chips (e.g. multiple departments). */
  multi?: boolean;
};

type DashboardHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  meta?: DashboardHeaderMeta[];
  /** When non-empty, replaces `multi` meta items with a department → section tree. */
  structure?: StructureDepartment[];
};

export default function DashboardHeader({
  title,
  subtitle,
  badge,
  meta,
  structure,
}: DashboardHeaderProps) {
  const hasStructure = Boolean(structure && structure.length > 0);
  const visibleMeta = hasStructure
    ? (meta ?? []).filter((item) => !item.multi)
    : (meta ?? []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {title}
            </h1>
            {badge ? (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                {badge}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          ) : null}
        </div>

        {visibleMeta.length > 0 ? (
          <dl className="grid shrink-0 grid-cols-[auto_1fr] items-start gap-x-3 gap-y-2 text-sm sm:max-w-md">
            {visibleMeta.map((item) => (
              <div key={item.label} className="contents">
                <dt className="py-0.5 text-gray-400">{item.label}</dt>
                <dd className="min-w-0 font-medium text-gray-700 dark:text-gray-300">
                  {item.multi ? (
                    <ValueChips value={item.value} />
                  ) : (
                    <span className="block py-0.5">{item.value}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {hasStructure && structure ? <StructureTree departments={structure} /> : null}
    </div>
  );
}
