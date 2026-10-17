import { supabase } from "./supabase";
import type { ClassItem } from "./types";

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
// Orden de la semana para mostrar (lunes primero)
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Lee las clases (de solo lectura; se rellenan desde la escuela). */
export async function listClasses(): Promise<ClassItem[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClassItem[];
}
