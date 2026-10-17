import { supabase } from "./supabase";
import type { ClassItem } from "./types";

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
// Orden de la semana para mostrar (lunes primero)
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Lee las clases (de solo lectura; se rellenan desde la escuela). Opcional: por rango de fechas. */
export async function listClasses(range?: { from: string; to: string }): Promise<ClassItem[]> {
  let q = supabase.from("classes").select("*");
  if (range) q = q.gte("class_date", range.from).lte("class_date", range.to);
  const { data, error } = await q.order("class_date", { ascending: true }).order("start_time", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClassItem[];
}

export async function getClassById(id: string): Promise<ClassItem | null> {
  const { data, error } = await supabase.from("classes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ClassItem) ?? null;
}
