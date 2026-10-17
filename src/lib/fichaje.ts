import { supabase } from "./supabase";
import { userTimezone } from "./time";
import type { Profile, TimeEvent, WorkSession } from "./types";

type ClockType = "clock_in" | "clock_out" | "break_start" | "break_end";

/** Registra un evento de fichaje; la hora real y los hashes los fija el servidor. */
export async function recordTimeEvent(type: ClockType): Promise<TimeEvent> {
  const { data, error } = await supabase.rpc("record_time_event", {
    p_type: type,
    p_occurred_at: new Date().toISOString(),
    p_timezone: userTimezone(),
  });
  if (error) throw new Error(error.message);
  return data as TimeEvent;
}

export async function getTodaySession(): Promise<WorkSession | null> {
  const { data, error } = await supabase.rpc("get_today_session", { p_timezone: userTimezone() });
  if (error) throw new Error(error.message);
  return (data as WorkSession) ?? null;
}

/** Añade (o corrige) un día con hora de entrada y salida. */
export async function addManualDay(day: string, start: string, end: string): Promise<WorkSession> {
  const { data, error } = await supabase.rpc("add_manual_day", {
    p_day: day,
    p_start: start,
    p_end: end,
    p_timezone: userTimezone(),
  });
  if (error) throw new Error(error.message);
  return data as WorkSession;
}

/** Comprueba que ningún fichaje se ha modificado. */
export async function verifyIntegrity(): Promise<{ ok: boolean; checked: number }> {
  const { data, error } = await supabase.rpc("verify_integrity");
  if (error) throw new Error(error.message);
  return data as { ok: boolean; checked: number };
}

export async function getSessionEvents(workSessionId: string): Promise<TimeEvent[]> {
  const { data, error } = await supabase
    .from("time_events")
    .select("*")
    .eq("work_session_id", workSessionId)
    .order("received_at_utc", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TimeEvent[];
}

export async function getSessionById(id: string): Promise<WorkSession | null> {
  const { data, error } = await supabase.from("work_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as WorkSession) ?? null;
}

/** Jornadas entre dos fechas (YYYY-MM-DD), de más reciente a más antigua. */
export async function listSessions(fromDate: string, toDate: string): Promise<WorkSession[]> {
  const { data, error } = await supabase
    .from("work_sessions")
    .select("*")
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as WorkSession[];
}

export async function getEventsForSessions(sessionIds: string[]): Promise<TimeEvent[]> {
  if (sessionIds.length === 0) return [];
  const { data, error } = await supabase
    .from("time_events")
    .select("*")
    .in("work_session_id", sessionIds)
    .order("received_at_utc", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TimeEvent[];
}

export async function getEventById(id: string): Promise<TimeEvent | null> {
  const { data, error } = await supabase.from("time_events").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TimeEvent) ?? null;
}

// ---------- Perfil ----------------------------------------------------------

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile) ?? null;
}

export async function upsertProfile(p: Partial<Profile> & { user_id: string }): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
