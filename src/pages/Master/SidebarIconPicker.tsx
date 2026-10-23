import {
  SIDEBAR_ICON_OPTIONS,
  resolveSidebarIcon,
} from "../../config/sidebarIcons";

type Props = {
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
};

export default function SidebarIconPicker({
  value,
  onChange,
  disabled = false,
}: Props) {
  const selected = value.trim().toLowerCase();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-slate-50/80 px-3 py-2 dark:border-gray-700 dark:bg-white/[0.03]">
        <span
          className="menu-item-icon-size flex size-9 items-center justify-center text-brand-500"
          aria-hidden
        >
          {resolveSidebarIcon(selected || "grid")}
        </span>
        <div className="min-w-0 text-xs">
          <p className="font-medium text-gray-700 dark:text-gray-200">
            Icon terpilih
          </p>
          <p className="truncate text-gray-500 dark:text-gray-400">
            {selected || "(kosong → fallback sidebar)"}
          </p>
        </div>
        {selected ? (
          <button
            type="button"
            className="ml-auto text-xs font-medium text-gray-500 underline-offset-2 hover:underline disabled:opacity-50"
            onClick={() => onChange("")}
            disabled={disabled}
          >
            Hapus
          </button>
        ) : null}
      </div>

      <div
        role="listbox"
        aria-label="Pilih icon sidebar"
        className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-gray-200 p-2 sm:grid-cols-5 md:grid-cols-6 dark:border-gray-700"
      >
        {SIDEBAR_ICON_OPTIONS.map((opt) => {
          const active = selected === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="option"
              aria-selected={active}
              title={`${opt.label} (${opt.key})`}
              disabled={disabled}
              onClick={() => onChange(opt.key)}
              className={[
                "flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-[10px] leading-tight transition",
                "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/30",
                "disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-300"
                  : "border-transparent bg-gray-50 text-gray-600 hover:border-gray-200 hover:bg-white dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-gray-600",
              ].join(" ")}
            >
              <span className="menu-item-icon-size flex size-7 items-center justify-center">
                {opt.node}
              </span>
              <span className="w-full truncate text-center">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
