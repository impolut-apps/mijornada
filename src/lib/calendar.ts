export const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"]; // lunes..domingo
export const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Lunes de la semana de `d`. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = lunes
  return addDays(x, -dow);
}

export function weekDays(anchor: Date): Date[] {
  const mon = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

/** Matriz del mes (semanas de 7 días, empezando en lunes), cubriendo el mes de `anchor`. */
export function monthMatrix(anchor: Date): Date[][] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  const weeks: Date[][] = [];
  let cur = start;
  for (let w = 0; w < 6; w++) {
    const row = Array.from({ length: 7 }, (_, i) => addDays(cur, i));
    weeks.push(row);
    cur = addDays(cur, 7);
    // parar si ya pasamos el mes y completamos la semana
    if (cur.getMonth() !== anchor.getMonth() && w >= 3 && row[6].getMonth() !== anchor.getMonth()) break;
  }
  return weeks;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dayNames(d: Date): string {
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(d);
}
