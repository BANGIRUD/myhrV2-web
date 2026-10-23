import RoleDashboard from "./components/RoleDashboard";

type ManagementDashboardProps = {
  /** `superadmin` adds the system panel on top of the executive view. */
  variant?: "management" | "superadmin";
};

/**
 * Executive site view (PJO): KPI summary, manpower, MPP, attendance and
 * employee-unfit rollups across every department (legacy `Dashboard/management`).
 */
export default function ManagementDashboard({
  variant = "management",
}: ManagementDashboardProps) {
  const isSuperadmin = variant === "superadmin";

  return (
    <RoleDashboard
      title={isSuperadmin ? "Super Admin Dashboard" : "Management Dashboard"}
      subtitle="Site-wide executive overview (sample data)."
      fallbackLevelLabel={isSuperadmin ? "Super Admin" : "Management"}
      accent="emerald"
      columns={4}
      notice="Coming next: primary KPI summary, managerial structure, manpower charts (population, tenure, education, age), MPP, attendance and employee unfit."
      extraMeta={[{ label: "Scope", value: "All departments" }]}
      metrics={[
        { label: "Total manpower", value: "1,248", hint: "Sample data" },
        { label: "MPP fulfilment", value: "92.3%", hint: "Sample data" },
        { label: "Attendance today", value: "96.4%", hint: "Sample data" },
        { label: "Employee unfit", value: "17", hint: "Sample data" },
        ...(isSuperadmin
          ? [
              { label: "Active users", value: "350", hint: "System · sample" },
              { label: "Levels", value: "10", hint: "System · sample" },
              { label: "Menus", value: "110", hint: "System · sample" },
              { label: "Login (24h)", value: "128", hint: "System · sample" },
            ]
          : []),
      ]}
    />
  );
}
