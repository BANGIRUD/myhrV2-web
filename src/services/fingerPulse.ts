import { api } from "../lib/api";

export type FingerPulseSource = "all" | "machine" | "oams" | "both";
export type FingerPulseCompleteness =
  | "all"
  | "complete"
  | "missing_out"
  | "machine_only"
  | "oams_only";

export type FingerPulsePersonDay = {
  date: string;
  nrp: string;
  full_name: string;
  department_name?: string | null;
  section_name?: string | null;
  worker_source?: string | null;
  id_finger?: number | null;
  machine_in?: string | null;
  machine_out?: string | null;
  machine_punch_count?: number;
  oams_in?: string | null;
  oams_out?: string | null;
  area?: string | null;
  unitjigsaw?: string | null;
  excavator?: string | null;
  type?: string | null;
  shift?: string | null;
  statusunit?: string | null;
  has_machine: number | boolean;
  has_oams: number | boolean;
  has_conflict: number | boolean;
  best_in?: string | null;
  best_out?: string | null;
};

export type FingerPulseSummary = {
  machine_count: number;
  oams_count: number;
  both_count: number;
  fingered_count?: number;
  complete_count?: number;
  missing_out_count: number;
  no_in_count?: number;
};

export type FingerPulseStructureKpi = {
  department_name: string;
  section_name: string;
  person_count: number;
  fingered_count: number;
  complete_count: number;
  missing_out_count: number;
  no_in_count: number;
  non_oams_count: number;
  oams_count: number;
};

export type FingerPulseMissingOutPerson = {
  date: string | null;
  nrp: string;
  full_name: string;
  finger_in?: string | null;
  finger_out?: string | null;
  department_name?: string;
  section_name?: string;
};

export type FingerPulsePunch = {
  id: number;
  date: string;
  time: string;
  nuserid: number;
  susername?: string | null;
  ntnaevent?: string | null;
  event_label: string;
};

export type FingerPulseWatermark = {
  stream: string;
  last_success_at?: string | null;
  last_status?: string | null;
  last_error?: string | null;
  lag_seconds?: number | null;
  last_rows_in?: number | null;
  last_raw_new?: number | null;
};

export type FingerPulseRunAction = "pulse" | "reconcile" | "backfill";

export type FingerPulseRecentRun = {
  id?: number;
  mode?: string;
  stream?: string | null;
  status?: string;
  date_from?: string | null;
  date_to?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  rows_in?: number | null;
  raw_new?: number | null;
  merged?: number | null;
  error_message?: string | null;
  batch_id?: string | null;
};

export type FingerPulseRunResult = {
  success: boolean;
  mode: FingerPulseRunAction;
  date_from: string;
  date_to: string;
  batch_id: string;
  staged?: { non_oams: number; oams: number };
  days?: Array<{
    date: string;
    non_oams_pulled: number;
    non_oams_staged: number;
    oams_pulled: number;
    oams_staged: number;
  }>;
  promote?: { success?: boolean; message?: string; [k: string]: unknown };
  message?: string;
};

type ListResponse = {
  success: boolean;
  message: string;
  data?: FingerPulsePersonDay[];
  meta?: {
    total?: number;
    page?: number;
    page_size?: number;
    summary?: FingerPulseSummary;
    by_structure?: FingerPulseStructureKpi[];
    missing_out_people?: FingerPulseMissingOutPerson[];
  };
};

type StatusResponse = {
  success: boolean;
  data?: {
    watermarks?: FingerPulseWatermark[];
    recent_runs?: FingerPulseRecentRun[];
    config?: Record<string, unknown> | null;
  };
};

type RunResponse = {
  success: boolean;
  message: string;
  data?: FingerPulseRunResult;
  error?: string;
};

type PunchesResponse = {
  success: boolean;
  data?: FingerPulsePunch[];
};

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const fingerPulseService = {
  status(signal?: AbortSignal) {
    return api.get<StatusResponse>("/hr/finger-pulse/status", { signal });
  },

  list(
    opts: {
      date: string;
      q?: string;
      source?: FingerPulseSource;
      completeness?: FingerPulseCompleteness;
      page?: number;
      page_size?: number;
    },
    signal?: AbortSignal,
  ) {
    return api.get<ListResponse>(
      `/hr/finger-pulse${qs({
        date: opts.date,
        q: opts.q,
        source: opts.source,
        completeness: opts.completeness,
        page: opts.page,
        page_size: opts.page_size,
      })}`,
      { signal },
    );
  },

  punches(opts: { date: string; nrp: string }, signal?: AbortSignal) {
    return api.get<PunchesResponse>(
      `/hr/finger-pulse/punches${qs({ date: opts.date, nrp: opts.nrp })}`,
      { signal },
    );
  },

  /** Manual ingest (same as CLI). Long-running — do not abort casually. */
  run(
    opts: {
      action: FingerPulseRunAction;
      date_from?: string;
      date_to?: string;
    },
    signal?: AbortSignal,
  ) {
    return api.post<RunResponse>("/hr/finger-pulse/run", opts, { signal });
  },
};
