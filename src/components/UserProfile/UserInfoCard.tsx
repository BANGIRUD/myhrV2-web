import type { AuthUser } from "../../types/auth";
import { structureLabel } from "../../utils/structure";
import { displayValue } from "./profileUtils";

type UserInfoCardProps = {
  user: AuthUser;
};

type InfoField = {
  label: string;
  value: string;
};

export default function UserInfoCard({ user }: UserInfoCardProps) {
  const fields: InfoField[] = [
    { label: "Email", value: displayValue(user.email) },
    { label: "Phone", value: displayValue(user.phone) },
    {
      label: "Department",
      value: structureLabel(user.department_name, user.department),
    },
    { label: "Section", value: structureLabel(user.section_name, user.section) },
    { label: "Approval stage", value: displayValue(user.approval_stage) },
    { label: "Structure", value: displayValue(user.structure) },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
      <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
        Account information
      </h4>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-7">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
              {field.label}
            </dt>
            <dd className="text-sm font-medium text-gray-800 dark:text-white/90 break-words">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
