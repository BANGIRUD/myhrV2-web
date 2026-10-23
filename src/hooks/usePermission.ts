import { useAuth } from "../context/AuthContext";
import type { PermissionAction } from "../types/auth";

export function usePermission(menuCode: string) {
  const { can, permissions, isSuperadmin } = useAuth();

  return {
    canRead: can(menuCode, "read"),
    canInsert: can(menuCode, "insert"),
    canUpdate: can(menuCode, "update"),
    canDelete: can(menuCode, "delete"),
    canExport: can(menuCode, "export"),
    canImport: can(menuCode, "import"),
    canApprove: can(menuCode, "approve"),
    canAction: (action: PermissionAction) => can(menuCode, action),
    permission: permissions.find((item) => item.menu_code === menuCode) || null,
    isSuperadmin,
  };
}
