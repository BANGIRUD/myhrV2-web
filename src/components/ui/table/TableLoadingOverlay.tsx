type Props = {
  label?: string;
};

/**
 * Covers the visible table viewport while rows stay on screen
 * (page change / filter reload). Parent must be `relative`.
 */
export default function TableLoadingOverlay({
  label = "Memuat data…",
}: Props) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-white/55 backdrop-blur-[1.5px] dark:bg-gray-950/50"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500 dark:border-gray-600 dark:border-t-brand-400"
          aria-hidden
        />
        {label}
      </div>
    </div>
  );
}
