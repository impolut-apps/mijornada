import { supabase } from "./supabase";

export interface IntegrationState {
  user_id: string;
  connected: boolean;
  last_sync_at: string | null;
  last_status: string | null;
  last_error: string | null;
  updated_at: string;
}

export interface PlatformRecord {
  id: string;
  user_id: string;
  work_date: string;
  entrada: string | null;
  salida: string | null;
  horas: number | null;
  fetched_at: string;
}

/** Lanza la sincronización (solo lectura) con la escuela. Opcionalmente para un rango de fechas. */
export async function syncSchool(range?: { from: string; to: string }): Promise<{ ok: boolean; classes: number; attendance: number }> {
  const { data, error } = await supabase.functions.invoke("school-sync", { body: range ?? {} });
  if (error) {
    // Intentar extraer el mensaje de error devuelto por la función
    let msg = error.message;
    try {
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const j = await ctx.json();
        if (j?.error) msg = j.error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg || "No se pudo sincronizar");
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as { ok: boolean; classes: number; attendance: number };
}

export interface SyncJob {
  id: string;
  user_id: string;
  work_date: string;
  status: "pending" | "synced" | "needs_review" | "failed";
  method: string | null;
  start_sent: string | null;
  end_sent: string | null;
  last_error: string | null;
  last_attempt_at: string | null;
}

export type ClockResult = { ok: boolean; status: string; message?: string; error?: string; horas?: number };

/** Fase B: envía a la escuela el fichaje de un día concreto. */
export async function sendClock(day: string): Promise<ClockResult> {
  const { data, error } = await supabase.functions.invoke("school-sync", { body: { action: "clock", day } });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const j = await ctx.json();
        if (j?.error) msg = j.error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg || "No se pudo enviar");
  }
  const d = data as ClockResult;
  if (!d.ok && d.error) throw new Error(d.error);
  return d;
}

export async function getSyncJob(day: string): Promise<SyncJob | null> {
  const { data, error } = await supabase.from("sync_jobs").select("*").eq("work_date", day).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SyncJob) ?? null;
}

export async function listSyncJobs(fromDate: string, toDate: string): Promise<SyncJob[]> {
  const { data, error } = await supabase.from("sync_jobs").select("*").gte("work_date", fromDate).lte("work_date", toDate);
  if (error) throw new Error(error.message);
  return (data ?? []) as SyncJob[];
}

export async function getIntegrationState(): Promise<IntegrationState | null> {
  const { data, error } = await supabase.from("integration_state").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return (data as IntegrationState) ?? null;
}

export async function listPlatformRecords(fromDate: string, toDate: string): Promise<PlatformRecord[]> {
  const { data, error } = await supabase
    .from("platform_records")
    .select("*")
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlatformRecord[];
}
