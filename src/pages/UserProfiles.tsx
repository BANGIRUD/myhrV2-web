import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import ChangePasswordCard from "../components/UserProfile/ChangePasswordCard";
import { useAuth } from "../context/AuthContext";

export default function UserProfiles() {
  const { user, isLoading } = useAuth();

  return (
    <>
      <PageMeta
        title="MyHR Profile"
        description="View your MyHR account details and change your password"
      />
      <PageBreadcrumb pageTitle="Profile" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-5 lg:mb-7">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Profile
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Account details from your signed-in session. Profile fields are
            read-only; use Security to change your password.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Loading profile…
          </div>
        ) : !user ? (
          <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No signed-in user found. Please sign in again.
          </div>
        ) : (
          <div className="space-y-6">
            <UserMetaCard user={user} />
            <UserInfoCard user={user} />
            <ChangePasswordCard user={user} />
          </div>
        )}
      </div>
    </>
  );
}
