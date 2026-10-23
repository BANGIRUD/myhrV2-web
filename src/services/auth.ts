import { api } from "../lib/api";
import type { ApiResponse, AuthUser } from "../types/auth";

type LoginResponse = ApiResponse<{
  token: string;
  expiresAt?: number;
  user: AuthUser;
}>;

export type LoginOptions = {
  remember_me?: boolean;
};

export type ChangePasswordPayload = {
  old_password: string;
  new_password: string;
  renew_password: string;
};

export const authService = {
  login: (username: string, password: string, options: LoginOptions = {}) =>
    api.post<LoginResponse>(
      "/auth/login",
      { username, password, remember_me: Boolean(options.remember_me) },
      { skipAuth: true },
    ),

  me: () => api.get<ApiResponse<AuthUser>>("/auth/me"),

  logout: () => api.post<ApiResponse<null>>("/auth/logout"),

  changePassword: (payload: ChangePasswordPayload) =>
    api.post<ApiResponse<null>>("/auth/change-password", payload),
};
