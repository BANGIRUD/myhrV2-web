import type { AuthUser } from "../../types/auth";

export function displayValue(
  value: string | number | null | undefined,
  fallback = "—",
) {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function getDisplayName(user: AuthUser | null | undefined) {
  return user?.full_name?.trim() || user?.username || "User";
}

export function getInitials(user: AuthUser | null | undefined) {
  const source = user?.full_name?.trim() || user?.username || "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function getLevelLabel(user: AuthUser | null | undefined) {
  return user?.level_name || user?.level_code || user?.level || null;
}
