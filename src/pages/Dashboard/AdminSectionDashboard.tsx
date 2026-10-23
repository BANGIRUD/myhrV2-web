import { useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import CalendarDateField from "../../components/form/CalendarDateField";
import { useAuth } from "../../context/AuthContext";
import { useAdminSectionDashboard } from "../../hooks/useAdminSectionDashboard";
import type { AdminSectionFilters } from "../../hooks/useAdminSectionDashboard";
import { useDashboardStructure } from "../../hooks/useDashboardStructure";
import type { ShiftFilter } from "../../services/dashboard";
import { currentShiftDate, formatDisplayDate, toMonth } from "../../utils/dateShift";
import { structureLabel } from "../../utils/structure";
import AttendanceTable from "./components/AttendanceTable";
import DashboardHeader from "./components/DashboardHeader";
import DashboardPanel from "./components/DashboardPanel";
import EmployeeUnfitTable from "./components/EmployeeUnfitTable";
import MetricCards from "./components/MetricCards";
import WorkPatternBars from "./components/WorkPatternBars";

const SHIFT_LABEL: Record<ShiftFilter, string> = {
  all: "All Shift",
  day: "Day Shift",
  night: "Night Shift",
};

const inputClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800 dark:disabled:text-gray-500";

const nf = new Intl.NumberFormat("id-ID");
const nf1 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** `2026-10-05` → `October 2026`. */
function formatMonthLabel(isoDate: string) {
  const [y, m] = isoDate.split("-").map(Number);
  if (!y || !m) return isoDate;
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function displayValue(value: string | number | null | undefined, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export default function AdminSectionDashboard() {
  const { user } = useAuth();
  const structure = useDashboardStructure();

  // Draft = what the form shows; applied = what the data is loaded for.
  const [draft, setDraft] = useState<AdminSectionFilters>(() => ({
    department: "",
    section: "",
    date: currentShiftDate(),
    shift: "all",
  }));
  const [applied, setApplied] = useState<AdminSectionFilters>(draft);

  const { attendance, pola, unfit, reload } = useAdminSectionDashboard(applied);

  // Section stays disabled until a department is picked; then only that department's sections.
  const sectionOptions = useMemo(
    () =>
      draft.department
        ? structure.sections.filter(
            (s) => String(s.departmentId) === draft.department,
          )
        : [],
    [structure.sections, draft.department],
  );
  const sectionLocked = !draft.department;

  const summary = useMemo(() => {
    const worker = pola.rows.reduce((s, r) => s + r.total_worker, 0);
    const roster = pola.rows.reduce((s, r) => s + r.total_pola_kerja, 0);
    const achievement = worker === 0 ? 0 : Math.round((roster * 1000) / worker) / 10;
    return { worker, roster, achievement };
  }, [pola.rows]);

  // Pola kerja is checked on the 1st of the applied month (legacy rule).
  const rosterDate = formatDisplayDate(`${toMonth(applied.date)}-01`);
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
  const busy = attendance.loading || pola.loading || unfit.loading;

  function handleDepartmentChange(value: string) {
    setDraft((d) => ({ ...d, department: value, section: "" }));
  }

  function handleApply() {
    if (!draft.date) return;
    if (dirty) setApplied(draft);
    else reload();
  }

  const levelLabel =
    user?.level_name || user?.level_code || user?.level || "Admin Section";
  const scoped = attendance.meta?.scoped ?? structure.scoped;
  const metricHint = (text: string) => (pola.loading ? "Loading…" : text);

  return (
    <>
      <PageMeta
        title="Admin Section Dashboard | MyHR"
        description="Admin Section attendance and roster dashboard"
      />

      <div className="space-y-6">
        <DashboardHeader
          title="Admin Section Dashboard"
          subtitle="Attendance, roster and fitness monitoring for your sections."
          badge={displayValue(levelLabel)}
          structure={user?.structure_tree}
          meta={[
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
          ]}
        />

        {/* Filter bar */}
        <form
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleApply();
          }}
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Dashboard Filter
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block text-sm">
              <span className="mb-1.5 block text-gray-500 dark:text-gray-400">
                Department
              </span>
              <select
                className={inputClass}
                value={draft.department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                disabled={structure.loading}
              >
                <option value="">{scoped ? "All my departments" : "All departments"}</option>
                {structure.departments.map((opt) => (
                  <option key={opt.id} value={String(opt.id)}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-gray-500 dark:text-gray-400">
                Section
              </span>
              <select
                className={inputClass}
                value={draft.section}
                onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value }))}
                disabled={structure.loading || sectionLocked}
                title={sectionLocked ? "Select a department first" : undefined}
              >
                <option value="">
                  {sectionLocked
                    ? "Select department first"
                    : scoped
                      ? "All my sections"
                      : "All sections"}
                </option>
                {sectionOptions.map((opt) => (
                  <option key={opt.id} value={String(opt.id)}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-gray-500 dark:text-gray-400">
                Date
              </span>
              <CalendarDateField
                value={draft.date}
                onChange={(date) => setDraft((d) => ({ ...d, date }))}
                placeholder="Pilih tanggal"
                inputClassName={`${inputClass} pr-10`}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-gray-500 dark:text-gray-400">
                Shift
              </span>
              <select
                className={inputClass}
                value={draft.shift}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, shift: e.target.value as ShiftFilter }))
                }
              >
                {(Object.keys(SHIFT_LABEL) as ShiftFilter[]).map((key) => (
                  <option key={key} value={key}>
                    {SHIFT_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy || !draft.date}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Loading…" : "Apply"}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Showing {formatDisplayDate(applied.date)} · {SHIFT_LABEL[applied.shift]}
            {scoped ? " · limited to your assigned sections" : ""}
            {dirty ? " · filters changed, press Apply to refresh" : ""}
            {structure.error ? ` · ${structure.error}` : ""}
          </p>
        </form>

        <MetricCards
          columns={4}
          metrics={[
            {
              label: "Active Workers",
              value: pola.loading ? "…" : nf.format(summary.worker),
              hint: metricHint("In the selected sections"),
            },
            {
              label: "With Pola Kerja",
              value: pola.loading ? "…" : nf.format(summary.roster),
              hint: metricHint(`Roster assigned on ${rosterDate}`),
            },
            {
              label: "Without Pola Kerja",
              value: pola.loading ? "…" : nf.format(summary.worker - summary.roster),
              hint: metricHint("Need a roster assignment"),
              tone:
                pola.loading || summary.worker - summary.roster === 0 ? "success" : "warning",
            },
            {
              label: "Pola Kerja Coverage",
              value: pola.loading ? "…" : `${nf1.format(summary.achievement)}%`,
              hint: metricHint("With pola kerja ÷ active workers"),
            },
          ]}
        />

        <DashboardPanel
          title="Status Absensi"
          subtitle={`Attendance plan vs actual per section · ${formatDisplayDate(applied.date)} · ${SHIFT_LABEL[applied.shift]}`}
          loading={attendance.loading}
          error={attendance.error}
          empty={attendance.rows.length === 0}
          emptyText="No attendance rows for the selected filter."
          onRetry={reload}
        >
          <AttendanceTable rows={attendance.rows} shift={applied.shift} />
        </DashboardPanel>

        <DashboardPanel
          title="Summary Pola Kerja"
          subtitle={`Active workers with a work pattern per section · ${formatMonthLabel(applied.date)}`}
          loading={pola.loading}
          error={pola.error}
          empty={pola.rows.length === 0}
          emptyText="No roster data for the selected filter."
          onRetry={reload}
        >
          <WorkPatternBars rows={pola.rows} rosterDate={rosterDate} />
        </DashboardPanel>

        <DashboardPanel
          title="Employee Unfit"
          subtitle="Workers currently not fit to work"
          loading={unfit.loading}
          error={unfit.error}
          empty={unfit.rows.length === 0}
          emptyText="No unfit employees for the selected filter."
          onRetry={reload}
          actions={
            unfit.rows.length > 0 ? (
              <span className="rounded-full bg-error-50 px-2.5 py-0.5 text-xs font-medium text-error-600 dark:bg-error-500/15 dark:text-error-400">
                {unfit.meta?.total ?? unfit.rows.length} workers
              </span>
            ) : null
          }
        >
          <EmployeeUnfitTable rows={unfit.rows} />
        </DashboardPanel>
      </div>
    </>
  );
}
