import type { ReactNode } from "react";
import TableLoadingOverlay from "../../../components/ui/table/TableLoadingOverlay";

type DashboardPanelProps = {
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  onRetry?: () => void;
  /** Right-aligned header content (e.g. counters). */
  actions?: ReactNode;
  children: ReactNode;
};

/** Card with a title and the shared loading / error / empty states of dashboard panels. */
export default function DashboardPanel({
  title,
  subtitle,
  loading = false,
  error = null,
  empty = false,
  emptyText = "No data for the selected filter.",
  onRetry,
  actions,
  children,
}: DashboardPanelProps) {
  let body: ReactNode;
  if (error) {
    body = (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 px-5 py-10 text-center md:px-6"
      >
        <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-9 items-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  } else if (loading && empty) {
    body = (
      <div className="space-y-3 p-5 md:p-6" aria-busy="true" aria-live="polite">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
          />
        ))}
      </div>
    );
  } else if (empty) {
    body = (
      <div className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400 md:px-6">
        {emptyText}
      </div>
    );
  } else {
    body = (
      <div className="relative">
        {loading ? <TableLoadingOverlay label="Memuat panel…" /> : null}
        <div
          className={
            loading
              ? "pointer-events-none opacity-50 transition-opacity"
              : undefined
          }
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800 md:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
      {body}
    </section>
  );
}
