import Badge from '../../components/ui/badge/Badge';
import TableLoadingOverlay from '../../components/ui/table/TableLoadingOverlay';

type Props = {
  rows: Record<string, unknown>[];
  loading: boolean;
  selected: Record<string, unknown> | null;
  onSelect: (row: Record<string, unknown>) => void;
  startNo?: number;
  searchHint?: boolean;
  /** Show vendor column (Employees LS). */
  showVendor?: boolean;
  title?: string;
};

/** ISO / Date / datetime → `YYYY-MM-DD` only. */
export function toIsoDateOnly(value: unknown): string {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const raw = String(value).trim();
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const mo = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  return raw;
}

function statusTone(
  name: string,
): 'success' | 'info' | 'warning' | 'error' | 'light' | 'dark' {
  const u = name.toUpperCase();
  if (u.includes('PHK') || u.includes('RESIGN') || u.includes('KELUAR')) {
    return 'error';
  }
  if (u.includes('MAGANG')) return 'warning';
  if (u.includes('STAFF')) return 'success';
  if (u.includes('NONSTAFF') || u.includes('NON STAFF')) return 'info';
  return 'light';
}

function lokasiTone(name: string): 'info' | 'dark' | 'light' {
  const u = name.toUpperCase();
  if (u === 'HAULING') return 'info';
  if (u === 'MINING') return 'dark';
  return 'light';
}

export default function EmployeesTable({
  rows,
  loading,
  selected,
  onSelect,
  startNo = 1,
  searchHint = false,
  showVendor = false,
  title = 'Daftar karyawan',
}: Props) {
  const colCount = showVendor ? 10 : 9;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Diurutkan department → section → nama.
          </p>
        </div>
        {loading ? (
          <p className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <span
              className="h-3 w-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 dark:border-brand-500/40 dark:border-t-brand-300"
              aria-hidden
            />
            Memuat…
          </p>
        ) : (
          <p className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
            {rows.length} karyawan
          </p>
        )}
      </div>

      <div className="relative">
        {loading && rows.length > 0 ? (
          <TableLoadingOverlay label="Memuat data karyawan…" />
        ) : null}
        <div className="max-h-[min(72vh,760px)] overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100/95 text-xs font-semibold uppercase tracking-wide text-slate-600 backdrop-blur-sm dark:bg-gray-800/95 dark:text-gray-300">
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 dark:border-gray-700">
                  No
                </th>
                <th className="sticky left-0 z-30 min-w-[200px] border-b border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95 sm:px-5">
                  Karyawan
                </th>
                <th className="min-w-[140px] border-b border-slate-200 px-3 py-3 dark:border-gray-700">
                  Jabatan
                </th>
                <th className="min-w-[140px] border-b border-slate-200 px-3 py-3 dark:border-gray-700">
                  Department
                </th>
                <th className="min-w-[120px] border-b border-slate-200 px-3 py-3 dark:border-gray-700">
                  Section
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 dark:border-gray-700">
                  Status
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 dark:border-gray-700">
                  Lokasi
                </th>
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 dark:border-gray-700">
                  Staff
                </th>
                {showVendor ? (
                  <th className="min-w-[140px] border-b border-slate-200 px-3 py-3 dark:border-gray-700">
                    Vendor
                  </th>
                ) : null}
                <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 dark:border-gray-700">
                  Tgl Masuk Kerja
                </th>
              </tr>
            </thead>
            <tbody
              className={
                loading && rows.length > 0
                  ? 'pointer-events-none opacity-50 transition-opacity'
                  : ''
              }>
              {loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-5 py-14 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-sm text-gray-500">
                      <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
                      Memuat data karyawan…
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Tidak ada data
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchHint
                        ? 'Coba kata kunci atau filter lain.'
                        : 'Belum ada karyawan untuk filter ini.'}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const rowKey = String(row.id ?? `emp-${index}`);
                  const isSelected = selected === row;
                  const nrp = String(row.nrp ?? '').trim() || '—';
                  const name =
                    String(row.full_name ?? '').trim() || 'Tanpa nama';
                  const jabatan = String(row.jabatan ?? '').trim() || '—';
                  const department =
                    String(row.department_name ?? '').trim() || '—';
                  const section = String(row.section_name ?? '').trim() || '—';
                  const status = String(row.status_name ?? '').trim();
                  const lokasi = String(row.lokasi_kerja ?? '').trim();
                  const staff = String(row.staff_nonstaff ?? '').trim();
                  const vendor = String(row.vendor_name ?? '').trim();
                  const masuk = toIsoDateOnly(row.tanggal_masuk);

                  return (
                    <tr
                      key={rowKey}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-brand-50/90 dark:bg-brand-500/15'
                          : index % 2 === 0
                            ? 'bg-white dark:bg-transparent'
                            : 'bg-slate-50/80 dark:bg-white/[0.02]'
                      } hover:bg-brand-50/50 dark:hover:bg-white/[0.05]`}
                      onClick={() => onSelect(row)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelect(row);
                        }
                      }}
                      tabIndex={0}
                      aria-label={`Detail ${name}`}>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-3 text-xs text-gray-400 dark:border-gray-800">
                        {startNo + index}
                      </td>
                      <td
                        className={`sticky left-0 z-[1] min-w-[200px] border-b border-gray-100 px-4 py-3 sm:px-5 dark:border-gray-800 ${
                          isSelected
                            ? 'bg-brand-50/90 dark:bg-gray-900'
                            : index % 2 === 0
                              ? 'bg-white dark:bg-gray-900'
                              : 'bg-slate-50/80 dark:bg-gray-900'
                        }`}>
                        <p className="font-medium text-gray-900 dark:text-white/90">
                          {name}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {nrp}
                        </p>
                      </td>
                      <td className="max-w-[220px] border-b border-gray-100 px-3 py-3 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                        <span
                          className="line-clamp-2"
                          title={jabatan}>
                          {jabatan}
                        </span>
                      </td>
                      <td className="max-w-[180px] border-b border-gray-100 px-3 py-3 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                        <span
                          className="line-clamp-2"
                          title={department}>
                          {department}
                        </span>
                      </td>
                      <td className="max-w-[180px] border-b border-gray-100 px-3 py-3 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                        <span
                          className="line-clamp-2"
                          title={section}>
                          {section}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-3 dark:border-gray-800">
                        {status ? (
                          <Badge
                            size="sm"
                            color={statusTone(status)}>
                            {status}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-3 dark:border-gray-800">
                        {lokasi ? (
                          <Badge
                            size="sm"
                            color={lokasiTone(lokasi)}>
                            {lokasi}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-3 text-xs font-medium uppercase tracking-wide text-gray-600 dark:border-gray-800 dark:text-gray-300">
                        {staff || '—'}
                      </td>
                      {showVendor ? (
                        <td className="max-w-[180px] border-b border-gray-100 px-3 py-3 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                          <span
                            className="line-clamp-2"
                            title={vendor || undefined}>
                            {vendor || '—'}
                          </span>
                        </td>
                      ) : null}
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-3 font-mono text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300">
                        {masuk || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
