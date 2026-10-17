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

/** Lanza la sincronización (solo lectura) con la escuela a través de la Edge Function. */
export async function syncSchool(): Promise<{ ok: boolean; classes: number; attendance: number }> {
  const { data, error } = await supabase.functions.invoke("school-sync", { body: {} });
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
