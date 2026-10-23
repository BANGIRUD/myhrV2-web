import RoleDashboard from "./components/RoleDashboard";

export default function SectionHeadDashboard() {
  return (
    <RoleDashboard
      title="Section Head Dashboard"
      subtitle="Section-wide oversight (sample data)."
      fallbackLevelLabel="Section Head"
      accent="sky"
      showStructure
      notice="Coming next: section KPI rollup, GL backlog, and section attendance ratio."
      metrics={[
        { label: "Section headcount", value: "86", hint: "Sample data" },
        { label: "Awaiting SH approval", value: "14", hint: "Sample data" },
        { label: "Section attendance", value: "94.1%", hint: "Sample data" },
      ]}
    />
  );
}
