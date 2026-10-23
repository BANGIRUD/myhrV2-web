import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import { authService } from "../services/auth";
import { menusService } from "../services/menus";
import type {
  AuthUser,
  MenuPermission,
  PermissionAction,
} from "../types/auth";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  permissions: MenuPermission[];
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  permissions: MenuPermission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    username: string,
    password: string,
    options?: { remember_me?: boolean },
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  can: (menuCode: string, action: PermissionAction) => boolean;
  isSuperadmin: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const emptyState: AuthState = {
  token: null,
  user: null,
  permissions: [],
};

const FULL_MENU_ACCESS_LEVELS = new Set(["superadmin", "sa"]);

function loadStoredAuth(): AuthState {
  try {
    const raw = localStorage.getItem(api.storageKey);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as AuthState;
    return {
      token: parsed.token || null,
      user: parsed.user || null,
      // Restore permissions from storage when present; refresh from HR API after bootstrap.
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
    };
  } catch {
    return emptyState;
  }
}

function persistAuth(state: AuthState) {
  if (!state.token) {
    localStorage.removeItem(api.storageKey);
    return;
  }
  localStorage.setItem(api.storageKey, JSON.stringify(state));
}

/**
 * Menu bypass: superadmin only (matches BE isFullMenuAccessUser).
 * approval_stage "all" (administrator / management) is data scope, not menu scope.
 */
function isSuperadminUser(user: AuthUser | null) {
  if (!user) return false;
  const code = String(user.level_code || user.level || "").toLowerCase();
  return FULL_MENU_ACCESS_LEVELS.has(code);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => loadStoredAuth());
  const [isLoading, setIsLoading] = useState(true);

  /** Load HR menu permissions; empty if endpoint fails. */
  const refreshPermissions = useCallback(async () => {
    try {
      const result = await menusService.permissions();
      const permissions = result.data || [];
      setState((prev) => {
        const next = { ...prev, permissions };
        persistAuth(next);
        return next;
      });
    } catch {
      setState((prev) => {
        const next = { ...prev, permissions: [] };
        persistAuth(next);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        if (state.token) {
          const profile = await authService.me();
          if (!active) return;
          if (profile.data) {
            setState((prev) => {
              const next = {
                ...prev,
                user: profile.data || prev.user,
              };
              persistAuth(next);
              return next;
            });
          }
        }
        // Failures leave permissions as [].
        await refreshPermissions();
      } catch {
        if (state.token && active) {
          setState(emptyState);
          persistAuth(emptyState);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    bootstrap();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (
      username: string,
      password: string,
      options?: { remember_me?: boolean },
    ) => {
      const result = await authService.login(username, password, options);
      if (!result.success || !result.data) {
        throw new Error(result.message || "Login failed");
      }

      const next: AuthState = {
        token: result.data.token,
        user: result.data.user,
        permissions: [],
      };
      persistAuth(next);
      setState(next);

      // Load HR menu permissions after login.
      try {
        const permissionsResult = await menusService.permissions();
        const withPermissions = {
          ...next,
          permissions: permissionsResult.data || [],
        };
        persistAuth(withPermissions);
        setState(withPermissions);
      } catch {
        // Permissions optional at login time.
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      if (state.token) await authService.logout();
    } catch {
      // Ignore logout API errors.
    }
    setState(emptyState);
    persistAuth(emptyState);
  }, [state.token]);

  const isSuperadmin = isSuperadminUser(state.user);

  const can = useCallback(
    (menuCode: string, action: PermissionAction) => {
      if (isSuperadmin) return true;

      const permission = state.permissions.find(
        (item) => item.menu_code === menuCode,
      );

      if (!permission) {
        return false;
      }

      switch (action) {
        case "read":
          return Boolean(permission.can_read);
        case "insert":
          return Boolean(permission.can_insert);
        case "update":
          return Boolean(permission.can_update);
        case "delete":
          return Boolean(permission.can_delete);
        case "export":
          return Boolean(permission.can_export);
        case "import":
          return Boolean(permission.can_import);
        case "approve":
          return Boolean(permission.can_approve);
        default:
          return false;
      }
    },
    [isSuperadmin, state.permissions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token: state.token,
      user: state.user,
      permissions: state.permissions,
      isAuthenticated: Boolean(state.token && state.user),
      isLoading,
      login,
      logout,
      refreshPermissions,
      can,
      isSuperadmin,
    }),
    [
      state.token,
      state.user,
      state.permissions,
      isLoading,
      login,
      logout,
      refreshPermissions,
      can,
      isSuperadmin,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}


