import RoleDashboard from "./components/RoleDashboard";
import ProfileSummaryCard from "./components/ProfileSummaryCard";

/** Self-service home: own profile, improvement and family data (legacy `Dashboard/user`). */
export default function EmployeeDashboard() {
  return (
    <RoleDashboard
      title="My Dashboard"
      subtitle="Your profile and submissions (sample data)."
      fallbackLevelLabel="Employee"
      accent="brand"
      showStructure
      columns={3}
      notice="Coming next: improvement submissions and family data from your employee record."
      metrics={[
        { label: "Improvement submitted", value: "3", hint: "Sample data" },
        { label: "Family members", value: "4", hint: "Sample data" },
        { label: "Leave balance", value: "8 days", hint: "Sample data" },
      ]}
    >
      <ProfileSummaryCard />
    </RoleDashboard>
  );
}
