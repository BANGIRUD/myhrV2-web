import { useCallback, useEffect, useState } from "react";
import Button from "../../components/ui/button/Button";
import { ApiError } from "../../lib/api";
import { hrMasterService } from "../../services/hrMaster";

type ExceptionRow = {
  id: number;
  section_id: number;
  section_name: string | null;
  job_rank: number;
  job_rank_name: string | null;
};

type Option = { id: number; name: string };

const fieldClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

type Props = {
  canUpdate: boolean;
};

export default function FingerprintDepartmentExceptionPanel({ canUpdate }: Props) {
  const [rows, setRows] = useState<ExceptionRow[]>([]);
  const [sections, setSections] = useState<Option[]>([]);
  const [ranks, setRanks] = useState<Option[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [jobRank, setJobRank] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [exc, structure, enums] = await Promise.all([
      hrMasterService.listFingerErrorDepartmentExceptions(),
      hrMasterService.listStructure({ type: "section" }),
      hrMasterService.list("enums", { type: "position", page_size: 500 }),
    ]);
    setRows(exc.data || []);
    setSections(
      (structure.data || [])
        .map((row) => ({
          id: Number(row.id),
          name: String(row.name ?? row.id),
        }))
        .filter((row) => Number.isFinite(row.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    setRanks(
      (enums.data || [])
        .map((row) => ({
          id: Number(row.id),
          name: String(row.name ?? row.id),
        }))
        .filter((row) => Number.isFinite(row.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, []);

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof ApiError ? err.message : "Gagal memuat pengecualian");
    });
  }, [load]);

  const add = async () => {
    if (!sectionId || !jobRank) {
      setError("Pilih section dan jabatan.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await hrMasterService.createFingerErrorDepartmentException({
        section_id: Number(sectionId),
        job_rank: Number(jobRank),
      });
      setSectionId("");
      setJobRank("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menambah");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    setSaving(true);
    setError("");
    try {
      await hrMasterService.deleteFingerErrorDepartmentException(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
        Pengecualian antrean Department
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Selain jabatan Section Head ke atas, pasangan section dan jabatan di
        sini ikut muncul di menu Department → Fingerprint.
      </p>
      {canUpdate && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-gray-500">
              Section
            </span>
            <select
              className={fieldClassName}
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              aria-label="Section pengecualian"
            >
              <option value="">Pilih section</option>
              {sections.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-gray-500">
              Jabatan
            </span>
            <select
              className={fieldClassName}
              value={jobRank}
              onChange={(e) => setJobRank(e.target.value)}
              aria-label="Jabatan pengecualian"
            >
              <option value="">Pilih jabatan</option>
              {ranks.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" size="sm" disabled={saving} onClick={() => void add()}>
            Tambah
          </Button>
        </div>
      )}
      {error ? (
        <p className="mt-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="mt-3 divide-y divide-gray-100 text-sm dark:divide-gray-800">
        {rows.length === 0 ? (
          <li className="py-2 text-gray-400">Belum ada pengecualian.</li>
        ) : (
          rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="font-medium text-gray-800 dark:text-white/90">
                  {row.section_name || `Section ${row.section_id}`}
                </span>
                <span className="text-gray-500"> · {row.job_rank_name || `Rank ${row.job_rank}`}</span>
              </span>
              {canUpdate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => void remove(row.id)}
                >
                  Hapus
                </Button>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
