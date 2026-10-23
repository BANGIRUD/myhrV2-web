import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { hrMasterService } from "../services/hrMaster";
import {
  scopeStructureOptions,
  type SectionOption,
  type StructureOption,
} from "../utils/structure";

/** Department / section filter options, limited to what the signed-in user may see. */
export function useDashboardStructure() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<StructureOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      hrMasterService.listStructure({ type: "department" }),
      hrMasterService.listStructure({ type: "section" }),
    ])
      .then(([deptRes, sectRes]) => {
        if (cancelled) return;
        setDepartments(
          (deptRes.data ?? []).map((r) => ({
            id: Number(r.id),
            name: String(r.name ?? r.id),
          })),
        );
        setSections(
          (sectRes.data ?? []).map((r) => ({
            id: Number(r.id),
            name: String(r.name ?? r.id),
            departmentId:
              r.ref_id === null || r.ref_id === undefined || r.ref_id === ""
                ? null
                : Number(r.ref_id),
          })),
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load structure");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scoped = useMemo(
    () => scopeStructureOptions(user, departments, sections),
    [user, departments, sections],
  );

  return { ...scoped, loading, error };
}
