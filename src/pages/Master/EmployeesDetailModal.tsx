import { useEffect, useState, type ReactNode } from "react";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import {
  AlertIcon,
  CalenderIcon,
  CloseIcon,
  DocsIcon,
  EnvelopeIcon,
  EyeCloseIcon,
  EyeIcon,
  GroupIcon,
  LockIcon,
  UserCircleIcon,
  UserIcon,
} from "../../icons";
import { ApiError } from "../../lib/api";
import { hrMasterService } from "../../services/hrMaster";
import { toIsoDateOnly } from "./EmployeesTable";

type Props = {
  open: boolean;
  /** List-row seed (needs id + worker_source). */
  row: Record<string, unknown> | null;
  showVendor?: boolean;
  onClose: () => void;
};

function text(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

/** Prefer joined name; fall back to raw text (never bare numeric id alone). */
function named(
  nameValue: unknown,
  rawValue?: unknown,
  preferRawText = false,
): string {
  const name = text(nameValue);
  if (name) return name;
  const raw = text(rawValue);
  if (!raw) return "";
  if (preferRawText && !/^\d+$/.test(raw)) return raw;
  if (/^\d+$/.test(raw)) return "";
  return raw;
}

function initialsOf(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="group min-w-0 rounded-xl border border-slate-100/90 bg-gradient-to-br from-white to-slate-50/80 px-3.5 py-2.5 shadow-theme-xs transition hover:border-brand-200/70 hover:shadow-sm dark:border-gray-800 dark:from-white/[0.04] dark:to-white/[0.01] dark:hover:border-brand-500/30">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-gray-500">
        {label}
      </p>
      <p
        className={`mt-1 break-words text-sm font-medium text-slate-800 dark:text-gray-100 ${
          mono ? "font-mono text-xs tabular-nums font-normal" : ""
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  accent = "brand",
  children,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  accent?: "brand" | "sky" | "amber" | "rose" | "violet" | "emerald";
  children: ReactNode;
}) {
  const accentClass = {
    brand:
      "bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/20",
    sky: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/20",
    amber:
      "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20",
    rose: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/20",
    violet:
      "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/20",
    emerald:
      "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20",
  }[accent];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.02]">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.12] blur-2xl dark:opacity-20"
        style={{
          background:
            accent === "brand"
              ? "var(--color-brand-500, #465fff)"
              : undefined,
        }}
        aria-hidden
      />
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${accentClass}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white/90">
            {title}
          </h4>
          {subtitle ? (
            <p className="text-xs text-slate-400 dark:text-gray-500">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function statusTone(
  name: string,
): "success" | "info" | "warning" | "error" | "light" | "dark" {
  const u = name.toUpperCase();
  if (u.includes("PHK") || u.includes("RESIGN") || u.includes("KELUAR")) {
    return "error";
  }
  if (u.includes("MAGANG")) return "warning";
  if (u.includes("STAFF")) return "success";
  if (u.includes("NONSTAFF") || u.includes("NON STAFF")) return "info";
  return "light";
}

function lokasiTone(name: string): "info" | "dark" | "light" {
  const u = name.toUpperCase();
  if (u === "HAULING") return "info";
  if (u === "MINING") return "dark";
  return "light";
}

function sourceLabel(source: string): string {
  const s = source.toLowerCase();
  if (s === "sis") return "Karyawan SIS";
  if (s === "vendor" || s === "ls") return "Karyawan LS";
  return source || "—";
}

function resolveSource(
  row: Record<string, unknown> | null,
  showVendor: boolean,
): "sis" | "ls" {
  const src = text(row?.worker_source).toLowerCase();
  if (src === "vendor" || src === "ls") return "ls";
  if (src === "sis") return "sis";
  return showVendor ? "ls" : "sis";
}

export default function EmployeesDetailModal({
  open,
  row,
  showVendor = false,
  onClose,
}: Props) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [canViewGrade, setCanViewGrade] = useState(false);
  const [gradeRevealed, setGradeRevealed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !row?.id) {
      setDetail(null);
      setError("");
      setLoading(false);
      setCanViewGrade(false);
      setGradeRevealed(false);
      return;
    }

    const id = String(row.id);
    const source = resolveSource(row, showVendor);
    let cancelled = false;

    setLoading(true);
    setError("");
    setDetail(null);
    setGradeRevealed(false);
    setCanViewGrade(false);

    void (async () => {
      try {
        const result = await hrMasterService.getWorker(id, source);
        if (cancelled) return;
        setDetail(result.data ?? null);
        setCanViewGrade(Boolean(result.meta?.can_view_grade));
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Gagal memuat detail karyawan",
        );
        setDetail(null);
        setCanViewGrade(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, row?.id, row?.worker_source, showVendor]);

  if (!open || !row) return null;

  const data = detail ?? row;
  const name = text(data.full_name) || "Tanpa nama";
  const nrp = text(data.nrp) || "—";
  const jabatan = text(data.jabatan);
  const status = named(data.status_name);
  const lokasi = text(data.lokasi_kerja);
  const dept = named(data.department_name);
  const section = named(data.section_name);
  const source = sourceLabel(
    text(data.worker_source) || resolveSource(row, showVendor),
  );
  const isLs =
    text(data.worker_source).toLowerCase() === "vendor" ||
    resolveSource(row, showVendor) === "ls";

  return (
    <div className="fixed inset-0 z-99999 overflow-y-auto overscroll-contain">
      <div className="flex min-h-full items-start justify-center px-4 py-6 sm:items-center sm:px-6 sm:py-8">
        <button
          type="button"
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-[3px]"
          aria-label="Tutup detail karyawan"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="employee-detail-title"
          className="relative my-auto flex max-h-[min(88vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-slate-50 shadow-theme-lg dark:border-gray-800 dark:bg-gray-950"
        >
        {/* Hero header */}
        <div className="relative shrink-0 overflow-hidden border-b border-brand-500/10 bg-gradient-to-br from-brand-600 via-brand-500 to-sky-500 px-5 pb-5 pt-5 text-white dark:from-brand-700 dark:via-brand-600 dark:to-sky-700">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-sky-300/20 blur-xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
            aria-hidden
          />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="relative shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold tracking-wide shadow-theme-sm ring-2 ring-white/35 backdrop-blur-sm">
                  {initialsOf(name)}
                </div>
                <span
                  className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand-600 shadow-theme-xs"
                  title={source}
                >
                  {isLs ? (
                    <GroupIcon className="size-3.5 fill-current" />
                  ) : (
                    <UserIcon className="size-3.5 fill-current" />
                  )}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  Detail karyawan
                </p>
                <h3
                  id="employee-detail-title"
                  className="mt-0.5 truncate text-xl font-semibold tracking-tight"
                >
                  {name}
                </h3>
                <p className="mt-0.5 truncate text-sm text-white/80">
                  {jabatan || "—"}
                  {dept ? ` · ${dept}` : ""}
                  {section ? ` / ${section}` : ""}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 font-mono text-[11px] tabular-nums ring-1 ring-white/20">
                    <CalenderIcon className="size-3 fill-current opacity-80" />
                    {nrp}
                  </span>
                  <Badge size="sm" color="light">
                    {source}
                  </Badge>
                  {status ? (
                    <Badge size="sm" color={statusTone(status)}>
                      {status}
                    </Badge>
                  ) : null}
                  {lokasi ? (
                    <Badge size="sm" color={lokasiTone(lokasi)}>
                      {lokasi}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25"
              aria-label="Tutup"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-4 sm:px-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-gray-500">
              <span className="relative flex h-12 w-12 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/20" />
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
              </span>
              Memuat detail dari master karyawan…
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              <AlertIcon className="mt-0.5 size-5 shrink-0 fill-current" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              <Section
                title="Kepegawaian"
                subtitle="Struktur & status kerja"
                accent="brand"
                icon={<UserCircleIcon className="size-5 fill-current" />}
              >
                <Field label="NRP" value={nrp} mono />
                <Field label="Nama lengkap" value={name} />
                <Field label="Jabatan" value={text(data.jabatan)} />
                <Field
                  label="Level jabatan"
                  value={named(
                    data.level_jabatan_name,
                    data.level_jabatan,
                    true,
                  )}
                />
                <Field
                  label="Klasifikasi jabatan"
                  value={named(data.klasifikasi_jabatan_name)}
                />
                <Field label="Job rank" value={named(data.job_rank_name)} />
                <Field label="Department" value={named(data.department_name)} />
                <Field label="Section" value={named(data.section_name)} />
                <div className="group min-w-0 rounded-xl border border-amber-100/90 bg-gradient-to-br from-amber-50/80 to-white px-3.5 py-2.5 shadow-theme-xs dark:border-amber-500/20 dark:from-amber-500/10 dark:to-white/[0.02] sm:col-span-2">
                  <div className="flex items-center gap-1.5">
                    <LockIcon className="size-3.5 fill-current text-amber-600 dark:text-amber-400" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700/80 dark:text-amber-400/80">
                      Grade
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <p className="min-w-0 flex-1 break-words font-mono text-sm tabular-nums text-slate-800 dark:text-gray-100">
                      {canViewGrade && gradeRevealed
                        ? text(data.grade) || "—"
                        : "••••"}
                    </p>
                    <button
                      type="button"
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                        canViewGrade
                          ? "border-amber-200 bg-white text-amber-700 shadow-theme-xs hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-amber-500/30 dark:bg-gray-800 dark:text-amber-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/15 dark:hover:text-brand-300"
                          : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600"
                      }`}
                      disabled={!canViewGrade}
                      title={
                        canViewGrade
                          ? gradeRevealed
                            ? "Sembunyikan Grade"
                            : "Tampilkan Grade"
                          : "Tidak punya akses melihat Grade (atur di Edit Policy → Workers Grade)"
                      }
                      aria-label={
                        canViewGrade
                          ? gradeRevealed
                            ? "Sembunyikan Grade"
                            : "Tampilkan Grade"
                          : "Grade terkunci"
                      }
                      onClick={() => {
                        if (!canViewGrade) return;
                        setGradeRevealed((v) => !v);
                      }}
                    >
                      {canViewGrade && gradeRevealed ? (
                        <EyeCloseIcon className="fill-current size-5" />
                      ) : (
                        <EyeIcon className="fill-current size-5" />
                      )}
                    </button>
                  </div>
                </div>
                <Field label="Area kerja" value={text(data.area_kerja)} />
                <Field
                  label="Status karyawan"
                  value={named(data.status_karyawan_name)}
                />
                <Field label="Status" value={named(data.status_name)} />
                <Field label="Lokasi kerja" value={lokasi} />
                <Field
                  label="Staff / Nonstaff"
                  value={text(data.staff_nonstaff)}
                />
                <Field
                  label="Lokal / Nonlokal"
                  value={text(data.lokal_nonlokal)}
                />
                <Field label="POH" value={text(data.poh)} />
                <Field
                  label="Direct / Indirect"
                  value={text(data.direct_indirect)}
                />
                <Field
                  label="Tanggal masuk"
                  value={toIsoDateOnly(data.tanggal_masuk)}
                  mono
                />
                <Field
                  label="Akhir kontrak"
                  value={toIsoDateOnly(data.tanggal_akhirkontrak)}
                  mono
                />
                <Field
                  label="Akhir kontrak 2"
                  value={toIsoDateOnly(data.tanggal_akhirkontrak2)}
                  mono
                />
                <Field
                  label="Efektif Diadaro"
                  value={toIsoDateOnly(data.tanggal_efektif_diadaro)}
                  mono
                />
                <Field
                  label="Tanggal keluar"
                  value={toIsoDateOnly(data.tanggal_keluar)}
                  mono
                />
                <Field label="Alasan keluar" value={text(data.alasan_keluar)} />
                <Field label="Remark" value={named(data.remark_name)} />
                <Field label="Code position" value={text(data.code_position)} />
                {showVendor || text(data.worker_source) === "vendor" ? (
                  <Field label="Vendor" value={named(data.vendor_name)} />
                ) : null}
              </Section>

              <Section
                title="Data pribadi"
                subtitle="Identitas & demografi"
                accent="sky"
                icon={<UserIcon className="size-5 fill-current" />}
              >
                <Field label="Gender" value={text(data.gender)} />
                <Field label="Tempat lahir" value={text(data.tempat_lahir)} />
                <Field
                  label="Tanggal lahir"
                  value={toIsoDateOnly(data.tanggal_lahir)}
                  mono
                />
                <Field
                  label="Kabupaten lahir"
                  value={text(data.kabupaten_lahir)}
                />
                <Field
                  label="Provinsi lahir"
                  value={text(data.provinsi_lahir)}
                />
                <Field label="Agama" value={text(data.agama)} />
                <Field label="Suku" value={text(data.suku)} />
                <Field
                  label="Golongan darah"
                  value={text(data.golongan_darah)}
                />
                <Field
                  label="Status keluarga"
                  value={named(
                    data.status_keluarga_name,
                    data.status_keluarga,
                    true,
                  )}
                />
                <Field label="Status pajak" value={text(data.status_pajak)} />
                <Field label="No. KTP" value={text(data.no_ktp)} mono />
                <Field label="No. KK" value={text(data.no_kk)} mono />
              </Section>

              <Section
                title="Pendidikan"
                subtitle="Riwayat sekolah"
                accent="violet"
                icon={<DocsIcon className="size-5 fill-current" />}
              >
                <Field label="Pendidikan" value={text(data.pendidikan)} />
                <Field label="Sekolah" value={text(data.nama_sekolah)} />
                <Field label="Jurusan" value={text(data.jurusan)} />
                <Field label="No. ijazah" value={text(data.no_ijasah)} />
                <Field
                  label="Masuk sekolah"
                  value={toIsoDateOnly(data.tanggal_masuk_sekolah)}
                  mono
                />
                <Field
                  label="Lulus sekolah"
                  value={toIsoDateOnly(data.tanggal_lulus_sekolah)}
                  mono
                />
              </Section>

              <Section
                title="Kontak & alamat"
                subtitle="Komunikasi & domisili"
                accent="emerald"
                icon={<EnvelopeIcon className="size-5 fill-current" />}
              >
                <Field label="No. WA" value={text(data.no_wa)} />
                <Field label="No. telp" value={text(data.no_telp)} />
                <Field label="Email SIS" value={text(data.email_sis)} />
                <Field label="Email pribadi" value={text(data.email_pribadi)} />
                <Field label="Alamat KTP" value={text(data.alamat)} />
                <Field
                  label="Kabupaten alamat"
                  value={text(data.kabupaten_alamat)}
                />
                <Field
                  label="Provinsi alamat"
                  value={text(data.provinsi_alamat)}
                />
                <Field
                  label="Tinggal dengan"
                  value={text(data.tinggal_dengan)}
                />
                <Field
                  label="Alamat tinggal"
                  value={text(data.alamat_tinggal)}
                />
                <Field
                  label="Kabupaten tinggal"
                  value={text(data.kabupaten_tinggal)}
                />
                <Field
                  label="Provinsi tinggal"
                  value={text(data.provinsi_tinggal)}
                />
              </Section>

              <Section
                title="Kontak darurat"
                subtitle="Yang dapat dihubungi"
                accent="rose"
                icon={<AlertIcon className="size-5 fill-current" />}
              >
                <Field
                  label="Nama darurat 1"
                  value={text(data.nama_telp_darurat)}
                />
                <Field label="No. darurat 1" value={text(data.no_telp_darurat)} />
                <Field
                  label="Hubungan 1"
                  value={text(data.hub_keluarga_darurat)}
                />
                <Field
                  label="Alamat darurat 1"
                  value={text(data.alamat_no_telp_darurat)}
                />
                <Field
                  label="Nama darurat 2"
                  value={text(data.nama_telp_darurat2)}
                />
                <Field
                  label="No. darurat 2"
                  value={text(data.no_telp_darurat2)}
                />
                <Field
                  label="Hubungan 2"
                  value={text(data.hub_keluarga_darurat2)}
                />
                <Field
                  label="Alamat darurat 2"
                  value={text(data.alamat_no_telp_darurat2)}
                />
              </Section>

              <Section
                title="Administrasi"
                subtitle="BPJS, pajak, bank & seragam"
                accent="amber"
                icon={<DocsIcon className="size-5 fill-current" />}
              >
                <Field
                  label="No. BPJS"
                  value={text(data.no_bpjs_karyawan)}
                  mono
                />
                <Field
                  label="No. Jamsostek"
                  value={text(data.no_jamsostek)}
                  mono
                />
                <Field label="No. NPWP" value={text(data.no_npwp)} mono />
                <Field label="Alamat NPWP" value={text(data.alamat_npwp)} />
                <Field
                  label="Tanggal NPWP"
                  value={toIsoDateOnly(data.tanggal_npwp)}
                  mono
                />
                <Field
                  label="No. rekening"
                  value={text(data.no_rekening)}
                  mono
                />
                <Field label="Nama rekening" value={text(data.nama_rekening)} />
                <Field label="Bank" value={text(data.bank_rekening)} />
                <Field label="No. Simponi" value={text(data.no_simponi)} mono />
                <Field label="Ukuran baju" value={text(data.ukuran_baju)} />
                <Field label="Ukuran celana" value={text(data.ukuran_celana)} />
                <Field label="Ukuran sepatu" value={text(data.ukuran_sepatu)} />
                <Field label="SIM" value={text(data.sim)} />
                <Field
                  label="Jenis penerimaan"
                  value={text(data.jenis_penerimaan)}
                />
                <Field
                  label="Jarak titik jemput"
                  value={text(data.jarak_titik_jemput)}
                />
                <Field
                  label="Keterangan"
                  value={text(data.keterangan_karyawan)}
                />
              </Section>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200/80 bg-white/80 px-5 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
          <p className="hidden text-xs text-slate-400 sm:block dark:text-gray-500">
            Tekan Esc untuk menutup
          </p>
          <Button
            size="sm"
            variant="outline"
            className="!py-2.5"
            onClick={onClose}
          >
            Tutup
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
