import RoleDashboard from "./components/RoleDashboard";

/** HR lead: full HR domain across SIS and Labour Supply (training, MPP, attendance, reports). */
export default function HrAdministratorDashboard() {
  return (
    <RoleDashboard
      title="HR Administrator Dashboard"
      subtitle="HR domain overview across SIS and Labour Supply (sample data)."
      fallbackLevelLabel="HR Administrator"
      accent="rose"
      columns={4}
      notice="Coming next: HR approval backlog, MPP and attendance ratio, training and SS/QCC progress, summary reports."
      extraMeta={[{ label: "Worker scope", value: "SIS + Labour Supply" }]}
      metrics={[
        { label: "Pending final approval", value: "31", hint: "Sample data" },
        { label: "MPP fulfilment", value: "92.3%", hint: "Sample data" },
        { label: "Attendance ratio", value: "96.4%", hint: "Sample data" },
        { label: "Training this month", value: "14", hint: "Sample data" },
      ]}
    />
  );
}
