import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  dashboardService,
  type AttendanceRow,
  type DashboardMeta,
  type EmployeeUnfitRow,
  type WorkPatternRow,
  type ShiftFilter,
} from "../services/dashboard";
import { toMonth } from "../utils/dateShift";

export type AdminSectionFilters = {
  department: string;
  section: string;
  date: string;
  shift: ShiftFilter;
};

export type PanelState<T> = {
  rows: T[];
  meta: DashboardMeta | null;
  loading: boolean;
  error: string | null;
};

const initial = <T,>(): PanelState<T> => ({
  rows: [],
  meta: null,
  loading: true,
  error: null,
});

function isAbort(err: unknown) {
  return err instanceof DOMException && err.name === "AbortError";
}

function track<T>(
  signal: AbortSignal,
  run: () => Promise<{ data?: T[]; meta?: DashboardMeta }>,
  set: Dispatch<SetStateAction<PanelState<T>>>,
) {
  set((prev) => ({ ...prev, loading: true, error: null }));
  run()
    .then((res) => {
      if (signal.aborted) return;
      set({ rows: res.data ?? [], meta: res.meta ?? null, loading: false, error: null });
    })
    .catch((err: unknown) => {
      if (signal.aborted || isAbort(err)) return;
      set({
        rows: [],
        meta: null,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load data",
      });
    });
}

/**
 * Loads attendance, pola kerja and unfit for the applied filters.
 * Each panel keeps its own loading/error state; new filters (or `reload`)
 * abort the requests still in flight. Unfit ignores date/shift, so it is not
 * refetched when only those change.
 */
export function useAdminSectionDashboard(filters: AdminSectionFilters) {
  const { department, section, date, shift } = filters;
  const [attendance, setAttendance] = useState(initial<AttendanceRow>);
  const [pola, setPola] = useState(initial<WorkPatternRow>);
  const [unfit, setUnfit] = useState(initial<EmployeeUnfitRow>);
  const [nonce, setNonce] = useState(0);
  const month = toMonth(date);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    track(
      signal,
      () => dashboardService.attendance({ department, section, date, shift }, { signal }),
      setAttendance,
    );
    return () => controller.abort();
  }, [department, section, date, shift, nonce]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    track(
      signal,
      () => dashboardService.workPattern({ department, section, month }, { signal }),
      setPola,
    );
    return () => controller.abort();
  }, [department, section, month, nonce]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    track(
      signal,
      () => dashboardService.employeeUnfit({ department, section }, { signal }),
      setUnfit,
    );
    return () => controller.abort();
  }, [department, section, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { attendance, pola, unfit, reload };
}
