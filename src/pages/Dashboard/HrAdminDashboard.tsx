import { useAuth } from "../../context/AuthContext";
import RoleDashboard from "./components/RoleDashboard";

const SCOPE_LABEL: Record<string, string> = {
  sis: "SIS",
  ls: "Labour Supply (vendor)",
  all: "SIS + Labour Supply",
};

/** HR operations: leave, permit, sickness, finger error — filtered by `worker_scope`. */
export default function HrAdminDashboard() {
  const { user } = useAuth();
  const scope = String(user?.worker_scope ?? "").toLowerCase();

  return (
    <RoleDashboard
      title="HR Admin Dashboard"
      subtitle="HR operations queue (sample data)."
      fallbackLevelLabel="HR Admin"
      accent="rose"
      columns={4}
      notice="Coming next: HR approval queue, leave / permit / sickness / standby summaries and finger error follow-up, limited to your worker scope."
      extraMeta={[
        { label: "Worker scope", value: SCOPE_LABEL[scope] ?? "Not set" },
      ]}
      metrics={[
        { label: "Pending HR approval", value: "23", hint: "Sample data" },
        { label: "Leave this month", value: "58", hint: "Sample data" },
        { label: "Sick / permit today", value: "11", hint: "Sample data" },
        { label: "Finger errors open", value: "6", hint: "Sample data" },
      ]}
    />
  );
}
