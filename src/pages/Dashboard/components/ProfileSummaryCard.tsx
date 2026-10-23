import type { ReactNode } from "react";
import { useAuth } from "../../../context/AuthContext";
import { structureLabel } from "../../../utils/structure";
import StructureTree from "./StructureTree";
import ValueChips from "./ValueChips";

function displayValue(
  value: string | number | null | undefined,
  fallback = "—",
) {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-800 dark:text-white/90">
        {children}
      </dd>
    </div>
  );
}

/** "Signed in as" card with account facts and the user's structure scope. */
export default function ProfileSummaryCard() {
  const { user } = useAuth();

  const displayName = user?.full_name?.trim() || user?.username || "Guest";
  const levelLabel =
    user?.level_name || user?.level_code || user?.level || "—";
  const structureTree = user?.structure_tree ?? [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
        Signed in as {displayName}
      </h2>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Username">{displayValue(user?.username)}</Field>
        <Field label="Level">{displayValue(levelLabel)}</Field>
        {structureTree.length === 0 ? (
          <>
            <Field label="Department">
              <ValueChips
                value={structureLabel(user?.department_name, user?.department)}
              />
            </Field>
            <Field label="Section">
              <ValueChips
                value={structureLabel(user?.section_name, user?.section)}
              />
            </Field>
          </>
        ) : null}
        <Field label="Email">{displayValue(user?.email)}</Field>
        <Field label="User ID">{displayValue(user?.id)}</Field>
      </dl>

      {structureTree.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            Structure
          </h3>
          <StructureTree departments={structureTree} />
        </div>
      ) : null}
    </div>
  );
}
