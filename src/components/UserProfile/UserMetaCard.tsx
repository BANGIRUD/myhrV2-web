import { useState } from "react";
import type { AuthUser } from "../../types/auth";
import Badge from "../ui/badge/Badge";
import {
  displayValue,
  getDisplayName,
  getInitials,
  getLevelLabel,
} from "./profileUtils";

type UserMetaCardProps = {
  user: AuthUser;
};

export default function UserMetaCard({ user }: UserMetaCardProps) {
  const [copied, setCopied] = useState(false);
  const displayName = getDisplayName(user);
  const levelLabel = getLevelLabel(user);
  const initials = getInitials(user);

  async function handleCopyUsername() {
    if (!user.username) return;
    try {
      await navigator.clipboard.writeText(user.username);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
      <div className="flex flex-col items-center gap-6 xl:flex-row xl:items-center">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-brand-50 text-xl font-semibold text-brand-600 dark:border-gray-700 dark:bg-brand-500/15 dark:text-brand-400"
          aria-hidden="true"
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1 text-center xl:text-left">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {displayName}
          </h4>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 xl:justify-start">
            <button
              type="button"
              onClick={handleCopyUsername}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              title="Copy username"
              aria-label={`Copy username ${user.username}`}
            >
              <span className="font-mono">{user.username}</span>
              <svg
                className="h-3.5 w-3.5 text-gray-400"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M6.5 2.5h6A1.5 1.5 0 0 1 14 4v6a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 5 10V4a1.5 1.5 0 0 1 1.5-1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M3.5 5.5H3A1.5 1.5 0 0 0 1.5 7v6A1.5 1.5 0 0 0 3 14.5h6A1.5 1.5 0 0 0 10.5 13v-.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
              </svg>
            </button>
            {copied ? (
              <span className="text-xs text-success-600 dark:text-success-500">
                Copied
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 xl:justify-start">
            {levelLabel ? (
              <Badge color="primary" size="sm">
                {levelLabel}
              </Badge>
            ) : null}
            {user.level_code && user.level_name ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {user.level_code}
              </span>
            ) : null}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Jobsite {displayValue(user.by_jobsite)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
