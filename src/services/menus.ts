import { api } from "../lib/api";
import type { ApiResponse, MenuPermission } from "../types/auth";

export const menusService = {
  permissions: () =>
    api.get<ApiResponse<MenuPermission[]>>("/menus/permissions"),

  navigation: () =>
    api.get<ApiResponse<MenuPermission[]>>("/menus/navigation"),
};
