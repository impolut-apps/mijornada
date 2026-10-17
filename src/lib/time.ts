export function userTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid";
  } catch {
    return "Europe/Madrid";
  }
}

export function tzAbbrev(tz: string, d = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("es-ES", { timeZone: tz, timeZoneName: "short" }).formatToParts(d);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

export function formatHM(d: Date | string, tz?: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(date);
}

export function formatHMS(d: Date, tz?: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: tz,
  }).format(d);
}

export function formatDateLong(d: Date | string, tz?: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: tz,
  }).format(date);
}

/** "Lun, 13 oct 2025" a partir de YYYY-MM-DD (fecha de jornada, sin zona). */
export function formatDayShort(ymd: string): string {
  const d = new Date(ymd + "T12:00:00");
  const s = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Minutos → "4h 12m" / "45m". */
export function formatDuration(totalMinutes: number): string {
  const m = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h ${String(min).padStart(2, "0")}m`;
}

/** YYYY-MM-DD en la zona dada. */
export function ymdInTz(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return parts; // en-CA da YYYY-MM-DD
}

export function addDays(d: Date, days: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}
