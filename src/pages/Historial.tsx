import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IcCalendar, IcChevronR } from "../components/icons";
import { SyncBadge } from "../components/SyncBadge";
import { SkeletonRows } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { addManualDay, getEventsForSessions, listSessions } from "../lib/fichaje";
import { computeDay } from "../lib/sessions";
import { addDays, formatDayShort, formatDuration, formatHM, userTimezone, ymdInTz } from "../lib/time";
import { useToast } from "../ui/ToastProvider";
import type { TimeEvent, WorkSession } from "../lib/types";

type Range = "7d" | "month" | "custom";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default function Historial() {
  const nav = useNavigate();
  const tz = userTimezone();
  const [range, setRange] = useState<Range>("7d");
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [eventsBySession, setEventsBySession] = useState<Map<string, TimeEvent[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [monthly, setMonthly] = useState<{ ym: string; minutes: number }[]>([]);
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [addDay, setAddDay] = useState("");
  const [addStart, setAddStart] = useState("");
  const [addEnd, setAddEnd] = useState("");
  const [adding, setAdding] = useState(false);

  async function saveManualDay() {
    if (!addDay || !addStart || !addEnd) {
      toast.show("Rellena el día y las horas", "error");
      return;
    }
    setAdding(true);
    try {
      await addManualDay(addDay, addStart, addEnd);
      toast.show("Día añadido", "success");
      setShowAdd(false);
      setAddDay("");
      setAddStart("");
      setAddEnd("");
      await load();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "No se pudo añadir", "error");
    } finally {
      setAdding(false);
    }
  }

  const bounds = useMemo(() => {
    const today = new Date();
    const to = ymdInTz(today, tz);
    if (range === "7d") return { from: ymdInTz(addDays(today, -6), tz), to };
    if (range === "month") return { from: to.slice(0, 8) + "01", to };
    return { from: customFrom || to, to: customTo || to };
  }, [range, tz, customFrom, customTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ss = await listSessions(bounds.from, bounds.to);
      const evs = await getEventsForSessions(ss.map((s) => s.id));
      const map = new Map<string, TimeEvent[]>();
      for (const e of evs) {
        const arr = map.get(e.work_session_id) ?? [];
        arr.push(e);
        map.set(e.work_session_id, arr);
      }
      setSessions(ss);
      setEventsBySession(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando el historial");
    } finally {
      setLoading(false);
    }
  }, [bounds.from, bounds.to]);

  useEffect(() => {
    void load();
  }, [load]);

  // Resumen mensual del año en curso (independiente del filtro)
  useEffect(() => {
    (async () => {
      try {
        const today = new Date();
        const year = ymdInTz(today, tz).slice(0, 4);
        const ss = await listSessions(`${year}-01-01`, ymdInTz(today, tz));
        const acc = new Map<string, number>();
        for (const s of ss) {
          const ym = s.work_date.slice(0, 7);
          acc.set(ym, (acc.get(ym) ?? 0) + s.computed_minutes);
        }
        setMonthly([...acc.entries()].map(([ym, minutes]) => ({ ym, minutes })).sort((a, b) => (a.ym < b.ym ? 1 : -1)));
      } catch {
        /* ignore */
      }
    })();
  }, [tz, sessions.length]);

  function ranges(evs: TimeEvent[]): string {
    const { segments } = computeDay(evs, new Date());
    if (segments.length === 0) return "Sin registros";
    return segments.map((s) => `${formatHM(s.startIso, tz)} - ${s.endIso ? formatHM(s.endIso, tz) : "…"}`).join("  ·  ");
  }

  const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

  return (
    <div className="screen light">
      <div className="page-head">
        <IcCalendar width={26} height={26} style={{ color: "var(--primary)" }} />
        <h1 className="h1">Historial</h1>
      </div>

      <div className="content" style={{ paddingTop: 4 }}>
        <div className="pills">
          <button className={`pill ${range === "7d" ? "active" : ""}`} onClick={() => setRange("7d")}>Últimos 7 días</button>
          <button className={`pill ${range === "month" ? "active" : ""}`} onClick={() => setRange("month")}>Este mes</button>
          <button className={`pill ${range === "custom" ? "active" : ""}`} onClick={() => setRange("custom")}>Personalizado</button>
        </div>

        <button className="btn btn-soft btn-block" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>
          + Añadir un día
        </button>

        {range === "custom" && (
          <div className="row" style={{ gap: 10, marginTop: 12 }}>
            <label className="field grow" style={{ margin: 0 }}>
              <span>Desde</span>
              <input type="date" value={customFrom} max={bounds.to} onChange={(e) => setCustomFrom(e.target.value)} />
            </label>
            <label className="field grow" style={{ margin: 0 }}>
              <span>Hasta</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </label>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          {loading ? (
            <SkeletonRows count={4} />
          ) : error ? (
            <p className="error">{error}</p>
          ) : sessions.length === 0 ? (
            <EmptyState icon={<IcCalendar width={30} height={30} />} title="Sin jornadas" subtitle="No hay fichajes en este periodo." />
          ) : (
            sessions.map((s) => {
              const evs = eventsBySession.get(s.id) ?? [];
              return (
                <div key={s.id} className="listrow press" onClick={() => nav(`/historial/${s.id}`)}>
                  <div className="grow">
                    <div className="row between">
                      <span style={{ fontWeight: 700 }}>{formatDayShort(s.work_date)}</span>
                      <SyncBadge state="local" />
                    </div>
                    <div className="lr-hours mono" style={{ marginTop: 4 }}>{formatDuration(s.computed_minutes)}</div>
                    <div className="lr-ranges">{ranges(evs)}</div>
                  </div>
                  <IcChevronR className="chev" />
                </div>
              );
            })
          )}
        </div>

        {monthly.length > 0 && (
          <div className="card" style={{ marginTop: 18 }}>
            <div className="h2" style={{ fontSize: "1rem", marginBottom: 6 }}>Resumen mensual</div>
            {monthly.map((m) => (
              <div className="inforow" key={m.ym}>
                <span className="k" style={{ textTransform: "capitalize" }}>{monthName(m.ym)}</span>
                <span className="v mono">{formatDuration(m.minutes)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="h2 center" style={{ marginBottom: 4 }}>Añadir un día</h3>
            <p className="muted small center" style={{ marginTop: 0 }}>Para un día que olvidaste fichar.</p>
            <label className="field"><span>Día</span>
              <input type="date" value={addDay} max={ymdInTz(new Date(), tz)} onChange={(e) => setAddDay(e.target.value)} />
            </label>
            <div className="row" style={{ gap: 10 }}>
              <label className="field grow"><span>Entrada</span>
                <input type="time" value={addStart} onChange={(e) => setAddStart(e.target.value)} />
              </label>
              <label className="field grow"><span>Salida</span>
                <input type="time" value={addEnd} onChange={(e) => setAddEnd(e.target.value)} />
              </label>
            </div>
            <div className="col" style={{ gap: 10, marginTop: 6 }}>
              <button className="btn btn-primary btn-block btn-lg" disabled={adding} onClick={() => void saveManualDay()}>
                {adding ? "Guardando…" : "Guardar"}
              </button>
              <button className="btn btn-ghost btn-block btn-lg" onClick={() => setShowAdd(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
