export type MetricItem = {
  label: string;
  value: string;
  hint?: string;
  /** Colours the value: `warning` for things that need action, `success` when complete. */
  tone?: "default" | "warning" | "success";
};

const VALUE_TONE: Record<NonNullable<MetricItem["tone"]>, string> = {
  default: "text-gray-800 dark:text-white/90",
  warning: "text-warning-600 dark:text-warning-400",
  success: "text-success-600 dark:text-success-400",
};

type MetricCardsProps = {
  metrics: MetricItem[];
  columns?: 2 | 3 | 4;
};

const COLUMN_CLASS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
};

export default function MetricCards({
  metrics,
  columns = 4,
}: MetricCardsProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 md:gap-6 ${COLUMN_CLASS[columns]}`}
    >
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
        >
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {metric.label}
          </span>
          <h3
            className={`mt-2 font-bold text-title-sm ${VALUE_TONE[metric.tone ?? "default"]}`}
          >
            {metric.value}
          </h3>
          {metric.hint ? (
            <p className="mt-2 text-xs text-gray-400">{metric.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
