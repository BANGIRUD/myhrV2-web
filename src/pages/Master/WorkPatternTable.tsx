import Badge from "../../components/ui/badge/Badge";
import { formatDisplayDate } from "../../utils/dateShift";

type Props = {
  rows: Record<string, unknown>[];
  loading: boolean;
  selected: Record<string, unknown> | null;
  onSelect: (row: Record<string, unknown>) => void;
  searchHint?: boolean;
};

type EmployeeGroup = {
  nrp: string;
  fullName: string;
  jabatan: string;
  department: string;
  section: string;
  band: 0 | 1;
  rows: Record<string, unknown>[];
};

function remarkTone(
  remark: string,
): "success" | "info" | "light" | "warning" | "error" | "dark" {
  const code = remark.trim().toUpperCase();
  if (code === "D") return "success";
  if (code === "N") return "info";
  if (code === "OFF") return "dark";
  if (code === "CT" || code === "CTN" || code === "CTB") return "light";
  if (code === "S" || code === "I") return "warning";
  if (code === "A" || code === "L") return "error";
  return "light";
}

function toDateLabel(value: unknown): string {
  if (!value) return "—";
  const raw = String(value);
  const iso = /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : raw;
  return formatDisplayDate(iso);
}

function groupByEmployee(rows: Record<string, unknown>[]): EmployeeGroup[] {
  const map = new Map<string, EmployeeGroup>();
  for (const row of rows) {
    const nrp = String(row.nrp ?? "").trim() || "—";
    let group = map.get(nrp);
    if (!group) {
      group = {
        nrp,
        fullName: String(row.full_name ?? "").trim() || "Tanpa nama",
        jabatan: String(row.jabatan ?? "").trim(),
        department: String(row.department_name ?? "").trim(),
        section: String(row.section_name ?? "").trim(),
        band: 0,
        rows: [],
      };
      map.set(nrp, group);
    }
    group.rows.push(row);
  }

  return [...map.values()].map((group, index) => ({
    ...group,
    band: (index % 2) as 0 | 1,
  }));
}

export default function WorkPatternTable({
  rows,
  loading,
  selected,
  onSelect,
  searchHint = false,
}: Props) {
  const groups = groupByEmployee(rows);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            Daftar pola kerja
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Dikelompokkan per karyawan agar lebih mudah dipindai.
          </p>
        </div>
        {!loading && (
          <p className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
            {groups.length} karyawan · {rows.length} baris
          </p>
        )}
      </div>

      <div className="max-h-[min(72vh,760px)] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-100/95 text-xs font-semibold uppercase tracking-wide text-slate-600 backdrop-blur-sm dark:bg-gray-800/95 dark:text-gray-300">
              <th className="sticky left-0 z-30 whitespace-nowrap border-b border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95 sm:px-5">
                Karyawan
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 dark:border-gray-700">
                Tanggal
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 dark:border-gray-700">
                Pola
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-center dark:border-gray-700">
                Hari ke
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-center dark:border-gray-700">
                Ket.
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 dark:border-gray-700 sm:px-5">
                Jabatan / Unit
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-sm text-gray-500">
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
                    Memuat pola kerja…
                  </div>
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Tidak ada data
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchHint
                      ? "Coba ubah kata kunci atau filter bulan/unit."
                      : "Belum ada seed pola kerja untuk filter ini."}
                  </p>
                </td>
              </tr>
            ) : (
              groups.map((group) =>
                group.rows.map((row, rowIndex) => {
                  const isFirst = rowIndex === 0;
                  const rowKey = String(row.id ?? `${group.nrp}-${rowIndex}`);
                  const isSelected = selected === row;
                  const remark = String(row.remark ?? "").trim();
                  const polaKerja = String(row.pola_kerja ?? "").trim() || "—";
                  const polaCuti = String(row.pola_cuti ?? "").trim();
                  const unitBits = [group.department, group.section].filter(
                    Boolean,
                  );

                  const rowBg =
                    group.band === 1
                      ? "bg-slate-50/90 dark:bg-white/[0.03]"
                      : "bg-white dark:bg-transparent";
                  const stickyBg =
                    group.band === 1
                      ? "bg-slate-50 dark:bg-gray-900"
                      : "bg-white dark:bg-gray-900";

                  return (
                    <tr
                      key={rowKey}
                      className={`cursor-pointer outline-none transition-colors hover:bg-brand-50/80 dark:hover:bg-brand-500/10 ${rowBg} ${
                        isSelected
                          ? "!bg-brand-50 ring-1 ring-inset ring-brand-200 dark:!bg-brand-500/15 dark:ring-brand-500/30"
                          : ""
                      }`}
                      onClick={() => onSelect(row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect(row);
                        }
                      }}
                      tabIndex={0}
                      aria-label={`Pola kerja ${group.fullName} ${toDateLabel(row.date)}`}
                    >
                      <td
                        className={`sticky left-0 z-10 max-w-[220px] border-b border-gray-100 px-4 py-2.5 align-top shadow-[1px_0_0_0_rgba(0,0,0,0.04)] dark:border-gray-800 sm:px-5 ${stickyBg} ${
                          isSelected
                            ? "!bg-brand-50 dark:!bg-[#1a2332]"
                            : ""
                        }`}
                      >
                        {isFirst ? (
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900 dark:text-white/90">
                              {group.fullName}
                            </p>
                            <p className="mt-0.5 font-mono text-xs tracking-wide text-slate-500 dark:text-gray-400">
                              {group.nrp}
                              {group.rows.length > 1
                                ? ` · ${group.rows.length} baris`
                                : ""}
                            </p>
                          </div>
                        ) : (
                          <span className="sr-only">
                            {group.fullName} ({group.nrp})
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2.5 align-middle tabular-nums text-gray-800 dark:border-gray-800 dark:text-gray-200">
                        {toDateLabel(row.date)}
                      </td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2.5 align-middle dark:border-gray-800">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-800 dark:text-gray-100">
                            {polaKerja}
                          </span>
                          {polaCuti ? (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                              cuti {polaCuti}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2.5 text-center align-middle tabular-nums text-gray-700 dark:border-gray-800 dark:text-gray-300">
                        {row.hari_ke != null && String(row.hari_ke) !== ""
                          ? String(row.hari_ke)
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2.5 text-center align-middle dark:border-gray-800">
                        {remark ? (
                          <Badge size="sm" color={remarkTone(remark)}>
                            {remark}
                          </Badge>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">
                            —
                          </span>
                        )}
                      </td>
                      <td className="max-w-[260px] border-b border-gray-100 px-4 py-2.5 align-middle dark:border-gray-800 sm:px-5">
                        {isFirst ? (
                          <div className="min-w-0">
                            <p className="truncate text-gray-700 dark:text-gray-300">
                              {group.jabatan || "—"}
                            </p>
                            {unitBits.length > 0 ? (
                              <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-500">
                                {unitBits.join(" · ")}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700">
                            ·
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
