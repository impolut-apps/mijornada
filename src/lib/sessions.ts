import type { DaySummary, DayState, Segment, TimeEvent } from "./types";

/**
 * Resume una jornada a partir de sus eventos (en orden) usando una máquina de estados.
 * El tiempo trabajado EXCLUYE las pausas. Si la jornada sigue en curso, el último
 * segmento queda abierto (endIso = null) y se cuenta hasta `now`.
 */
export function computeDay(events: TimeEvent[], now: Date = new Date()): DaySummary {
  const ordered = [...events].sort(
    (a, b) => new Date(a.received_at_utc).getTime() - new Date(b.received_at_utc).getTime()
  );

  let state: DayState = "idle";
  let segStart: string | null = null;
  let workedMs = 0;
  let breakMs = 0;
  let breakStart: string | null = null;
  const segments: Segment[] = [];
  let firstEntrada: string | null = null;
  let lastSalida: string | null = null;

  const ms = (a: string, b: string) => new Date(b).getTime() - new Date(a).getTime();

  for (const ev of ordered) {
    const t = ev.received_at_utc;
    switch (ev.type) {
      case "clock_in":
        if (state === "idle") {
          state = "working";
          segStart = t;
          if (!firstEntrada) firstEntrada = t;
        }
        break;
      case "break_start":
        if (state === "working" && segStart) {
          workedMs += ms(segStart, t);
          segments.push({ startIso: segStart, endIso: t });
          segStart = null;
          breakStart = t;
          state = "onbreak";
        }
        break;
      case "break_end":
        if (state === "onbreak") {
          if (breakStart) breakMs += ms(breakStart, t);
          breakStart = null;
          segStart = t;
          state = "working";
        }
        break;
      case "clock_out":
        if (state === "working" && segStart) {
          workedMs += ms(segStart, t);
          segments.push({ startIso: segStart, endIso: t });
          segStart = null;
        } else if (state === "onbreak" && breakStart) {
          breakMs += ms(breakStart, t);
          breakStart = null;
        }
        lastSalida = t;
        state = "idle";
        break;
      default:
        break;
    }
  }

  // Segmento/pausa en curso → contar hasta ahora
  const nowIso = now.toISOString();
  if (state === "working" && segStart) {
    workedMs += ms(segStart, nowIso);
    segments.push({ startIso: segStart, endIso: null });
  } else if (state === "onbreak" && breakStart) {
    breakMs += ms(breakStart, nowIso);
  }

  return {
    state,
    segments,
    workedMinutes: Math.max(0, workedMs / 60000),
    breakMinutes: Math.max(0, breakMs / 60000),
    firstEntrada,
    lastSalida,
  };
}
