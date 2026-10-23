import RoleDashboard from "./components/RoleDashboard";

export default function GroupLeaderDashboard() {
  return (
    <RoleDashboard
      title="Group Leader Dashboard"
      subtitle="Team approvals and shift attendance (sample data)."
      fallbackLevelLabel="Group Leader"
      accent="amber"
      showStructure
      notice="Coming next: pending approvals, team attendance snapshot, and escalate-to-section-head actions."
      metrics={[
        { label: "Pending my approval", value: "9", hint: "Sample data" },
        { label: "Team on shift today", value: "24", hint: "Sample data" },
        { label: "Overdue requests", value: "2", hint: "Sample data" },
      ]}
    />
  );
}
