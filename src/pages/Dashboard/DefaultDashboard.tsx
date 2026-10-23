import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import DashboardHeader from "./components/DashboardHeader";
import ProfileSummaryCard from "./components/ProfileSummaryCard";

/**
 * Neutral fallback for levels without a dedicated dashboard
 * (see `DASHBOARD_BY_LEVEL` in resolveDashboardRole.ts).
 */
export default function DefaultDashboard() {
  const { user } = useAuth();
  const levelLabel =
    user?.level_name || user?.level_code || user?.level || undefined;

  return (
    <>
      <PageMeta
        title="MyHR Dashboard"
        description="MyHR home for levels without a dedicated dashboard"
      />

      <div className="space-y-6">
        <DashboardHeader
          title="MyHR Dashboard"
          subtitle="No dedicated dashboard is configured for this level yet."
          badge={levelLabel}
        />
        <ProfileSummaryCard />
      </div>
    </>
  );
}
