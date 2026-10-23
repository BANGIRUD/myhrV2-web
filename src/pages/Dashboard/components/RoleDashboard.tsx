import type { ReactNode } from "react";
import PageMeta from "../../../components/common/PageMeta";
import { useAuth } from "../../../context/AuthContext";
import { structureLabel } from "../../../utils/structure";
import DashboardHeader from "./DashboardHeader";
import MetricCards, { type MetricItem } from "./MetricCards";

type Accent = "amber" | "sky" | "violet" | "emerald" | "rose" | "brand";

const NOTICE_CLASS: Record<Accent, string> = {
  amber:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  sky: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  violet:
    "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  rose: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
  brand:
    "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200",
};

type RoleDashboardProps = {
  title: string;
  subtitle?: string;
  /** Level label used when the session has no `level_name`. */
  fallbackLevelLabel: string;
  accent?: Accent;
  /** Short "what comes next" note shown while the data is still sample data. */
  notice?: string;
  metrics: MetricItem[];
  columns?: 2 | 3 | 4;
  /** Show department / section scope (structure-scoped levels). */
  showStructure?: boolean;
  /** Extra header facts, e.g. worker scope or module. */
  extraMeta?: { label: string; value: string }[];
  children?: ReactNode;
};

/**
 * Shared shell for role dashboards that are still on sample data:
 * header (level badge + scope), "coming next" notice and metric cards.
 */
export default function RoleDashboard({
  title,
  subtitle,
  fallbackLevelLabel,
  accent = "brand",
  notice,
  metrics,
  columns = 3,
  showStructure = false,
  extraMeta = [],
  children,
}: RoleDashboardProps) {
  const { user } = useAuth();
  const levelLabel =
    user?.level_name || user?.level_code || user?.level || fallbackLevelLabel;

  const meta = [
    ...(showStructure
      ? [
          {
            label: "Dept",
            value: structureLabel(user?.department_name, user?.department),
            multi: true,
          },
          {
            label: "Section",
            value: structureLabel(user?.section_name, user?.section),
            multi: true,
          },
        ]
      : []),
    ...extraMeta,
  ];

  return (
    <>
      <PageMeta title={`${title} | MyHR`} description={`${title} (sample data)`} />

      <div className="space-y-6">
        <DashboardHeader
          title={title}
          subtitle={subtitle}
          badge={levelLabel}
          structure={showStructure ? user?.structure_tree : undefined}
          meta={meta}
        />

        {notice ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${NOTICE_CLASS[accent]}`}
          >
            {notice}
          </div>
        ) : null}

        <MetricCards columns={columns} metrics={metrics} />

        {children}
      </div>
    </>
  );
}
