export type TimeEventType = "clock_in" | "clock_out" | "break_start" | "break_end" | "correction";

export interface TimeEvent {
  id: string;
  user_id: string;
  work_session_id: string;
  type: TimeEventType;
  occurred_at_utc: string;
  received_at_utc: string;
  local_time: string;
  timezone: string;
  corrects_event_id: string | null;
  source: string;
  idempotency_key: string;
  prev_hash: string;
  hash: string;
  created_at: string;
}

export type SessionStatus = "open" | "closed";

export interface WorkSession {
  id: string;
  user_id: string;
  work_date: string; // YYYY-MM-DD
  status: SessionStatus;
  computed_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  display_name: string | null;
  role: string | null;
  timezone: string | null;
  onboarded: boolean | null;
  updated_at: string;
}

export interface ClassItem {
  id: string;
  user_id: string;
  external_id: string | null;
  weekday: number; // 0=domingo .. 6=sábado
  class_date: string | null;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  subject: string;
  classroom: string | null;
  students: string[];
  synced_at: string;
  created_at: string;
}

/** Estado de la jornada en curso. */
export type DayState = "idle" | "working" | "onbreak";

/** Estado de sincronización con la plataforma de la escuela (honesto hasta integrar). */
export type SyncState = "local" | "pending" | "synced" | "needs_review";

export interface Segment {
  startIso: string;
  endIso: string | null; // null = en curso
}

/** Resumen calculado de una jornada a partir de sus eventos. */
export interface DaySummary {
  state: DayState;
  segments: Segment[];
  workedMinutes: number;
  breakMinutes: number;
  firstEntrada: string | null;
  lastSalida: string | null;
}
