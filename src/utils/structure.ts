/** Empty department / section on a user means unrestricted (all). */
export const STRUCTURE_ALL_LABEL = "All";

export function structureLabel(
  name: string | number | null | undefined,
  id?: string | number | null,
): string {
  const value = name ?? id;
  if (value === null || value === undefined) return STRUCTURE_ALL_LABEL;
  const text = String(value).trim();
  return text === "" ? STRUCTURE_ALL_LABEL : text;
}

export type StructureOption = { id: number; name: string };
export type SectionOption = StructureOption & { departmentId: number | null };

function idSet(csv: string | null | undefined): Set<number> {
  return new Set(
    String(csv ?? "")
      .split(",")
      .map((v) => Number.parseInt(v.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0),
  );
}

/**
 * Departments / sections a user may pick on structure dashboards. Mirrors the
 * backend (`resolveSectionScope`): all-access levels see everything; every other user
 * sees exactly the sections assigned in their user row, or every section of their
 * departments when no section is assigned.
 */
export function scopeStructureOptions(
  user: {
    approval_stage?: string | null;
    structure_scoped?: boolean | null;
    department?: string | null;
    section?: string | null;
  } | null,
  departments: StructureOption[],
  sections: SectionOption[],
): { departments: StructureOption[]; sections: SectionOption[]; scoped: boolean } {
  const unrestricted =
    !user ||
    String(user.approval_stage ?? "").toLowerCase() === "all" ||
    user.structure_scoped === false;
  if (unrestricted) return { departments, sections, scoped: false };

  const ownDepartments = idSet(user.department);
  const ownSections = idSet(user.section);
  const departmentWide = ownSections.size === 0;
  const allowedSections = sections.filter(
    (s) =>
      ownSections.has(s.id) ||
      (departmentWide && s.departmentId !== null && ownDepartments.has(s.departmentId)),
  );
  // Departments follow the allowed sections; own departments are only listed when they widen the scope.
  const allowedDepartmentIds = new Set<number>(departmentWide ? ownDepartments : []);
  for (const s of allowedSections) {
    if (s.departmentId !== null) allowedDepartmentIds.add(s.departmentId);
  }
  return {
    departments: departments.filter((d) => allowedDepartmentIds.has(d.id)),
    sections: allowedSections,
    scoped: true,
  };
}
