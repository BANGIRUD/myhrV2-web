import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { usePermission } from "../../hooks/usePermission";
import {
  hrMasterService,
  type LevelPermissionFlag,
  type LevelPermissionRow,
} from "../../services/hrMaster";

type LevelOption = { id: number; code: string; name: string };

const FLAGS: { key: LevelPermissionFlag; label: string; hint: string }[] = [
  { key: "can_read", label: "Read", hint: "Show in sidebar (with Menus → Sidebar on)" },
  { key: "can_insert", label: "Insert", hint: "Create" },
  { key: "can_update", label: "Update", hint: "Edit" },
  { key: "can_delete", label: "Delete", hint: "Remove" },
  { key: "can_export", label: "Export", hint: "Export" },
  { key: "can_approve", label: "Approve", hint: "Approve" },
];

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function cloneRows(rows: LevelPermissionRow[]): LevelPermissionRow[] {
  return rows.map((row) => ({ ...row }));
}

function rowsEqual(a: LevelPermissionRow[], b: LevelPermissionRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left.menu_id !== right.menu_id) return false;
    for (const { key } of FLAGS) {
      if (asBool(left[key]) !== asBool(right[key])) return false;
    }
  }
  return true;
}

export default function LevelPermissionsPage() {
  const { isSuperadmin } = usePermission("hr_level_permissions");
  // Backend PUT is superadmin-only (requireFullMenuAccess).
  const canEdit = isSuperadmin;

  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [levelId, setLevelId] = useState("");
  const [includeLegacy, setIncludeLegacy] = useState(false);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<LevelPermissionRow[]>([]);
  const [baseline, setBaseline] = useState<LevelPermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const dirty = useMemo(() => !rowsEqual(rows, baseline), [rows, baseline]);

  const selectedLevel = levels.find((l) => String(l.id) === levelId) ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await hrMasterService.list("levels");
        if (cancelled) return;
        const opts = (res.data || [])
          .map((row) => ({
            id: Number(row.id),
            code: String(row.code ?? ""),
            name: String(row.name ?? ""),
          }))
          .filter((row) => Number.isFinite(row.id) && row.code);
        setLevels(opts);
        setLevelId((prev) => {
          if (prev) return prev;
          const admin = opts.find((l) => l.code === "admin_section");
          return String((admin ?? opts[0])?.id ?? "");
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load levels.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!levelId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setMessage("");
      try {
        const res = await hrMasterService.listLevelPermissions({
          level_id: levelId,
          include_legacy: includeLegacy,
          q: search.trim() || undefined,
        });
        if (cancelled) return;
        const next = (res.data || []).map((row) => ({
          ...row,
          can_read: asBool(row.can_read),
          can_insert: asBool(row.can_insert),
          can_update: asBool(row.can_update),
          can_delete: asBool(row.can_delete),
          can_export: asBool(row.can_export),
          can_approve: asBool(row.can_approve),
        }));
        setRows(next);
        setBaseline(cloneRows(next));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load permissions.");
          setRows([]);
          setBaseline([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [levelId, includeLegacy, search]);

  const toggle = (menuId: number, flag: LevelPermissionFlag) => {
    if (!canEdit) return;
    setRows((prev) =>
      prev.map((row) =>
        Number(row.menu_id) === menuId
          ? { ...row, [flag]: !asBool(row[flag]) }
          : row,
      ),
    );
    setMessage("");
  };

  const setAllRead = (value: boolean) => {
    if (!canEdit) return;
    setRows((prev) => prev.map((row) => ({ ...row, can_read: value })));
    setMessage("");
  };

  const discard = () => {
    setRows(cloneRows(baseline));
    setMessage("");
    setError("");
  };

  const save = async () => {
    if (!canEdit || !levelId || !dirty) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await hrMasterService.saveLevelPermissions({
        level_id: Number(levelId),
        rows: rows.map((row) => ({
          id: row.id ?? null,
          menu_id: Number(row.menu_id),
          can_read: asBool(row.can_read),
          can_insert: asBool(row.can_insert),
          can_update: asBool(row.can_update),
          can_delete: asBool(row.can_delete),
          can_export: asBool(row.can_export),
          can_approve: asBool(row.can_approve),
        })),
      });
      const refreshed = await hrMasterService.listLevelPermissions({
        level_id: levelId,
        include_legacy: includeLegacy,
        q: search.trim() || undefined,
      });
      const next = (refreshed.data || []).map((row) => ({
        ...row,
        can_read: asBool(row.can_read),
        can_insert: asBool(row.can_insert),
        can_update: asBool(row.can_update),
        can_delete: asBool(row.can_delete),
        can_export: asBool(row.can_export),
        can_approve: asBool(row.can_approve),
      }));
      setRows(next);
      setBaseline(cloneRows(next));
      setMessage("Permissions saved. Affected users see the new sidebar after refresh.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  const readCount = rows.filter((r) => asBool(r.can_read)).length;

  return (
    <>
      <PageMeta
        title="Level Permissions | MyHR"
        description="Permission matrix mapping each level to HR menus."
      />
      <PageBreadcrumb pageTitle="Level Permissions" />

      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Menu access by level
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Toggle which menus appear for a role. Read controls the sidebar
                (Menus → Sidebar must also be on). Applies to every user of that
                level — not per username.
              </p>
            </div>
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={discard}
                  disabled={!dirty || saving}
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={save}
                  disabled={!dirty || saving || loading}
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
                Read only
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                Level
              </span>
              <select
                value={levelId}
                onChange={(e) => setLevelId(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
              >
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name} ({level.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">
                Search menu
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Code or name…"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 md:w-56 dark:border-gray-700 dark:text-white/90"
              />
            </label>

            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={includeLegacy}
                onChange={(e) => setIncludeLegacy(e.target.checked)}
                className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/30"
              />
              Include legacy menus
            </label>
          </div>

          {selectedLevel ? (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Editing <span className="font-medium text-gray-700 dark:text-gray-200">{selectedLevel.name}</span>
              {" · "}
              {readCount} of {rows.length} menus readable
              {dirty ? " · unsaved changes" : ""}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 text-sm text-error-600 dark:text-error-400">
              {error}
            </p>
          ) : null}
          {message ? (
            <p role="status" className="mt-3 text-sm text-success-600 dark:text-success-400">
              {message}
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {loading ? (
            <div className="space-y-3 p-5 md:p-6" aria-busy="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400 md:px-6">
              No menus match the current filter.
            </p>
          ) : (
            <div className="max-h-[36rem] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      Menu
                    </th>
                    {FLAGS.map((flag) => (
                      <th
                        key={flag.key}
                        scope="col"
                        title={flag.hint}
                        className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      >
                        {flag.label}
                      </th>
                    ))}
                  </tr>
                  {canEdit ? (
                    <tr className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/80">
                      <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                        Quick actions
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => setAllRead(true)}
                            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => setAllRead(false)}
                            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
                          >
                            None
                          </button>
                        </div>
                      </td>
                      <td colSpan={FLAGS.length - 1} />
                    </tr>
                  ) : null}
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const readable = asBool(row.can_read);
                    const sidebarOff = !asBool(row.show_sidebar);
                    return (
                      <tr
                        key={String(row.menu_id)}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 dark:border-gray-800/80 dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800 dark:text-white/90">
                            {row.menu_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {row.menu_code}
                            {row.parent_name ? ` · under ${row.parent_name}` : ""}
                            {sidebarOff ? " · sidebar off in Menus" : ""}
                            {!asBool(row.is_active) ? " · inactive" : ""}
                          </p>
                        </td>
                        {FLAGS.map((flag) => {
                          const checked = asBool(row[flag.key]);
                          const warnRead = flag.key === "can_read" && checked && sidebarOff;
                          return (
                            <td key={flag.key} className="px-2 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!canEdit || saving}
                                onChange={() => toggle(Number(row.menu_id), flag.key)}
                                aria-label={`${row.menu_name} ${flag.label}`}
                                title={
                                  warnRead
                                    ? "Read is on, but Menus.show_sidebar is off — still hidden in sidebar"
                                    : flag.hint
                                }
                                className={`size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                                  warnRead ? "ring-2 ring-warning-400" : ""
                                } ${flag.key === "can_read" && readable ? "" : ""}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Superadmin always sees every active menu and is the only role that can
          save this matrix. Users of the selected level must refresh (or log in
          again) after you save.
        </p>
      </div>
    </>
  );
}
