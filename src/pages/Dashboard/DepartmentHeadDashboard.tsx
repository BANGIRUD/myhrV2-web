import RoleDashboard from "./components/RoleDashboard";

export default function DepartmentHeadDashboard() {
  return (
    <RoleDashboard
      title="Department Head Dashboard"
      subtitle="Department rollup (sample data)."
      fallbackLevelLabel="Department Head"
      accent="violet"
      showStructure
      notice="Coming next: multi-section comparison, DH approval queue, and department MPP summary."
      metrics={[
        { label: "Dept headcount", value: "312", hint: "Sample data" },
        { label: "Awaiting DH approval", value: "21", hint: "Sample data" },
        { label: "Sections under dept", value: "7", hint: "Sample data" },
      ]}
    />
  );
}
