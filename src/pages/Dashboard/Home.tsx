import type { ComponentType } from "react";
import { useAuth } from "../../context/AuthContext";
import AdminSectionDashboard from "./AdminSectionDashboard";
import DefaultDashboard from "./DefaultDashboard";
import DepartmentHeadDashboard from "./DepartmentHeadDashboard";
import EmployeeDashboard from "./EmployeeDashboard";
import GroupLeaderDashboard from "./GroupLeaderDashboard";
import HrAdminDashboard from "./HrAdminDashboard";
import HrAdministratorDashboard from "./HrAdministratorDashboard";
import ManagementDashboard from "./ManagementDashboard";
import ModuleAdminDashboard from "./ModuleAdminDashboard";
import SectionHeadDashboard from "./SectionHeadDashboard";
import { resolveDashboardRole, type DashboardRole } from "./resolveDashboardRole";

const SuperadminDashboard = () => <ManagementDashboard variant="superadmin" />;

/** One dashboard per canonical level; add new levels here and in resolveDashboardRole.ts. */
const DASHBOARDS: Record<DashboardRole, ComponentType> = {
  superadmin: SuperadminDashboard,
  management: ManagementDashboard,
  department_head: DepartmentHeadDashboard,
  section_head: SectionHeadDashboard,
  group_leader: GroupLeaderDashboard,
  admin_section: AdminSectionDashboard,
  hr_admin: HrAdminDashboard,
  hr_administrator: HrAdministratorDashboard,
  module_admin: ModuleAdminDashboard,
  employee: EmployeeDashboard,
  unknown: DefaultDashboard,
};

/**
 * Dashboard entry at `/` — picks the dashboard for the signed-in level.
 */
export default function Home() {
  const { user } = useAuth();
  const Dashboard = DASHBOARDS[resolveDashboardRole(user)];
  return <Dashboard />;
}
