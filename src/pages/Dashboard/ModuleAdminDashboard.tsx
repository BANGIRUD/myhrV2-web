import { useAuth } from "../../context/AuthContext";
import type { MetricItem } from "./components/MetricCards";
import RoleDashboard from "./components/RoleDashboard";

type ModuleConfig = {
  label: string;
  notice: string;
  metrics: MetricItem[];
};

const MODULES: Record<string, ModuleConfig> = {
  irel: {
    label: "Industrial Relation",
    notice:
      "Coming next: PHK, standby and labour supply case follow-up for Industrial Relation.",
    metrics: [
      { label: "Open PHK cases", value: "5", hint: "Sample data" },
      { label: "Standby employees", value: "12", hint: "Sample data" },
      { label: "LS cases this month", value: "3", hint: "Sample data" },
    ],
  },
  meals: {
    label: "Meals",
    notice: "Coming next: meals order summary and roster-based meal counts.",
    metrics: [
      { label: "Meals ordered today", value: "1,102", hint: "Sample data" },
      { label: "Pending orders", value: "8", hint: "Sample data" },
      { label: "Roster on shift", value: "412", hint: "Sample data" },
    ],
  },
  safety: {
    label: "Safety",
    notice:
      "Coming next: sickness monitoring and personalia follow-up for Safety.",
    metrics: [
      { label: "Sick today", value: "9", hint: "Sample data" },
      { label: "Unfit employees", value: "17", hint: "Sample data" },
      { label: "Follow-ups open", value: "4", hint: "Sample data" },
    ],
  },
  attendance: {
    label: "Attendance",
    notice: "Coming next: worker fingerprint review and finger error queue.",
    metrics: [
      { label: "Finger errors open", value: "6", hint: "Sample data" },
      { label: "Manual finger today", value: "14", hint: "Sample data" },
      { label: "Devices offline", value: "1", hint: "Sample data" },
    ],
  },
};

const NOT_SET: ModuleConfig = {
  label: "Not set",
  notice:
    "No module is assigned to this account. Ask an administrator to set the module on your user.",
  metrics: [
    { label: "Assigned module", value: "—", hint: "Set in Master · Users" },
  ],
};

/** Module admin: widgets follow `user.module` (irel | meals | safety | attendance). */
export default function ModuleAdminDashboard() {
  const { user } = useAuth();
  const key = String(user?.module ?? "").toLowerCase();
  const config = MODULES[key] ?? NOT_SET;

  return (
    <RoleDashboard
      title={`${config.label} Dashboard`}
      subtitle="Module administration (sample data)."
      fallbackLevelLabel="Module Admin"
      accent="sky"
      columns={3}
      notice={config.notice}
      extraMeta={[{ label: "Module", value: config.label }]}
      metrics={config.metrics}
    />
  );
}
