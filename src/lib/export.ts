import { computeDay } from "./sessions";
import { formatHM } from "./time";
import type { TimeEvent, WorkSession } from "./types";

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV de resumen diario (una fila por jornada). */
export function buildDailyCsv(sessions: WorkSession[], eventsBySession: Map<string, TimeEvent[]>, tz: string): string {
  const header = ["Fecha", "Entrada", "Salida", "Horas", "Pausa (min)", "Estado", "Sincronización"];
  const lines = [header.map(csvCell).join(",")];
  for (const s of sessions) {
    const evs = eventsBySession.get(s.id) ?? [];
    const day = computeDay(evs, new Date());
    lines.push(
      [
        s.work_date,
        day.firstEntrada ? formatHM(day.firstEntrada, tz) : "-",
        day.lastSalida ? formatHM(day.lastSalida, tz) : "-",
        (s.computed_minutes / 60).toFixed(2),
        Math.round(day.breakMinutes),
        s.status === "open" ? "En curso" : "Finalizada",
        "Local", // honesto: aún sin integración
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return lines.join("\n");
}

/** CSV de evidencias (una fila por evento, con hashes). */
export function buildEventsCsv(events: TimeEvent[], tz: string): string {
  const header = ["ID", "Tipo", "Hora servidor (UTC)", "Hora local", "Zona", "Hash", "Hash previo"];
  const lines = [header.map(csvCell).join(",")];
  for (const e of events) {
    lines.push(
      [
        e.id,
        e.type,
        e.received_at_utc,
        formatHM(e.received_at_utc, tz),
        e.timezone,
        e.hash,
        e.prev_hash,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return lines.join("\n");
}

/** Abre un informe imprimible; la persona elige "Guardar como PDF" en el diálogo. */
export function openPrintableReport(
  sessions: WorkSession[],
  eventsBySession: Map<string, TimeEvent[]>,
  tz: string,
  name: string
) {
  const rows = sessions
    .map((s) => {
      const day = computeDay(eventsBySession.get(s.id) ?? [], new Date());
      return `<tr>
        <td>${s.work_date}</td>
        <td>${day.firstEntrada ? formatHM(day.firstEntrada, tz) : "-"}</td>
        <td>${day.lastSalida ? formatHM(day.lastSalida, tz) : "-"}</td>
        <td style="text-align:right">${(s.computed_minutes / 60).toFixed(2)} h</td>
      </tr>`;
    })
    .join("");
  const total = sessions.reduce((a, s) => a + s.computed_minutes, 0);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Mis fichajes</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1d2230;padding:28px;}
      h1{font-size:20px;margin:0 0 2px;} .sub{color:#777;margin:0 0 18px;font-size:13px;}
      table{width:100%;border-collapse:collapse;font-size:13px;}
      th,td{padding:9px 10px;border-bottom:1px solid #eee;text-align:left;}
      th{color:#777;font-weight:600;} tfoot td{font-weight:700;border-top:2px solid #ddd;}
      .brand{color:#5b4bd6;font-weight:800;}
    </style></head><body>
    <h1><span class="brand">MiJornada</span> — Mis fichajes</h1>
    <p class="sub">${name ? name + " · " : ""}Generado el ${formatHM(new Date(), tz)} · ${new Date().toLocaleDateString("es-ES")}</p>
    <table>
      <thead><tr><th>Día</th><th>Entrada</th><th>Salida</th><th style="text-align:right">Horas</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4">Sin fichajes</td></tr>`}</tbody>
      <tfoot><tr><td colspan="3">Total</td><td style="text-align:right">${(total / 60).toFixed(2)} h</td></tr></tfoot>
    </table>
    <script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>
    </body></html>`;
  const w = window.open("", "_blank");
  if (!w) throw new Error("Permite las ventanas emergentes para descargar el PDF");
  w.document.write(html);
  w.document.close();
}

export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
