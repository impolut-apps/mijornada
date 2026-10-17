import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IcChevronL, IcCoffee, IcPlay, IcStop } from "../components/icons";
import { SyncBadge } from "../components/SyncBadge";
import { getSessionById, getSessionEvents } from "../lib/fichaje";
import { getSyncJob, sendClock, type SyncJob } from "../lib/school";
import { computeDay } from "../lib/sessions";
import { formatDateLong, formatDuration, formatHM, userTimezone } from "../lib/time";
import { useToast } from "../ui/ToastProvider";
import { useConfirm } from "../ui/ConfirmProvider";
import type { SyncState, TimeEvent, WorkSession } from "../lib/types";

type Item =
  | { kind: "in" | "out"; time: string; title: string; sub: string }
  | { kind: "brk"; time: string; title: string; sub: string; dur: string };

function buildItems(events: TimeEvent[], tz: string): Item[] {
  const items: Item[] = [];
  let pendingBreak: TimeEvent | null = null;
  for (const e of events) {
    if (e.type === "clock_in") items.push({ kind: "in", time: formatHM(e.received_at_utc, tz), title: "Entrada", sub: "Jornada iniciada" });
    else if (e.type === "clock_out") items.push({ kind: "out", time: formatHM(e.received_at_utc, tz), title: "Salida", sub: "Jornada finalizada" });
    else if (e.type === "break_start") pendingBreak = e;
    else if (e.type === "break_end" && pendingBreak) {
      const mins = (new Date(e.received_at_utc).getTime() - new Date(pendingBreak.received_at_utc).getTime()) / 60000;
      items.push({
        kind: "brk",
        time: `${formatHM(pendingBreak.received_at_utc, tz)} - ${formatHM(e.received_at_utc, tz)}`,
        title: "Descanso",
        sub: "",
        dur: formatDuration(mins),
      });
      pendingBreak = null;
    }
  }
  if (pendingBreak) items.push({ kind: "brk", time: `${formatHM(pendingBreak.received_at_utc, tz)} - …`, title: "Descanso", sub: "En curso", dur: "" });
  return items;
}

export default function DetalleJornada() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const tz = userTimezone();
  const [session, setSession] = useState<WorkSession | null>(null);
  const [events, setEvents] = useState<TimeEvent[]>([]);
  const [job, setJob] = useState<SyncJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSessionById(id);
        setSession(s);
        if (s) {
          setEvents(await getSessionEvents(s.id));
          setJob(await getSyncJob(s.work_date).catch(() => null));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const items = useMemo(() => buildItems(events, tz), [events, tz]);
  const day = useMemo(() => computeDay(events, new Date()), [events]);

  const syncState: SyncState =
    job?.status === "synced" ? "synced" : job?.status === "pending" ? "pending" : job?.status === "needs_review" || job?.status === "failed" ? "needs_review" : "local";

  async function sendToSchool() {
    if (!session) return;
    const ok = await confirm({
      title: "¿Enviar este día a la escuela?",
      message: `Se registrará en la plataforma de la escuela tu jornada del ${formatDateLong(session.work_date + "T12:00:00", tz)}. Primero comprueba que no esté ya fichado.`,
      confirmText: "Enviar a la escuela",
    });
    if (!ok) return;
    setSending(true);
    try {
      const r = await sendClock(session.work_date);
      toast.show(r.status === "already" ? "Ese día ya estaba fichado en la escuela" : "Enviado y verificado ✓", "success");
      setJob(await getSyncJob(session.work_date).catch(() => null));
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "No se pudo enviar", "error");
      setJob(await getSyncJob(session.work_date).catch(() => null));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="app screen light"><div className="spinner">Cargando…</div></div>;
  if (!session) return <div className="app screen light"><div className="spinner">Jornada no encontrada.</div></div>;

  return (
    <div className="app">
      <div className="screen light slide-in" style={{ paddingBottom: 24 }}>
        <div className="page-head">
          <button className="iconbtn" onClick={() => nav(-1)}><IcChevronL width={22} height={22} /></button>
          <h1 className="h2">Detalle del día</h1>
        </div>

        <div className="content" style={{ paddingTop: 4 }}>
          <div className="card">
            <div className="row between">
              <span className="muted" style={{ fontWeight: 600, textTransform: "capitalize" }}>{formatDateLong(session.work_date + "T12:00:00", tz)}</span>
              <SyncBadge state={syncState} />
            </div>
            <div className="mono" style={{ fontSize: "2.4rem", fontWeight: 800, marginTop: 8, color: "var(--primary)" }}>
              {formatDuration(session.computed_minutes)}
            </div>
            <div className="muted small">Tiempo total {day.breakMinutes > 0 ? `· ${formatDuration(day.breakMinutes)} en descansos` : ""}</div>

            <div className="timeline" style={{ marginTop: 18 }}>
              {items.map((it, i) => (
                <div className="tl-item" key={i}>
                  <div className={`tl-node ${it.kind}`}>
                    {it.kind === "in" ? <IcPlay width={14} height={14} /> : it.kind === "out" ? <IcStop width={13} height={13} /> : <IcCoffee width={14} height={14} />}
                  </div>
                  <div className="tl-body">
                    <div>
                      <div className="tl-title">{it.title}</div>
                      <div className="tl-sub">{it.kind === "brk" ? it.time : it.sub}</div>
                    </div>
                    <div className="tl-time">{it.kind === "brk" ? it.dur : it.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="h2" style={{ fontSize: "1rem", marginBottom: 6 }}>Datos del día</div>
            <div className="inforow"><span className="k">Número de día</span><span className="v mono">#{session.id.slice(0, 8).toUpperCase()}</span></div>
            <div className="inforow"><span className="k">Zona horaria</span><span className="v">{tz}</span></div>
            <div className="inforow"><span className="k">Guardado el</span><span className="v" style={{ textTransform: "capitalize" }}>{formatDateLong(session.created_at, tz)}</span></div>
          </div>

          <div className="card">
            <div className="row between" style={{ marginBottom: 6 }}>
              <div className="h2" style={{ fontSize: "1rem" }}>En la escuela</div>
              <SyncBadge state={syncState} />
            </div>
            {job?.status === "synced" ? (
              <div className="inforow"><span className="k">Registrado</span><span className="v">{job.method === "already" ? "Ya estaba fichado" : "Enviado y verificado"}{job.start_sent ? ` · ${job.start_sent.slice(0, 5)}–${job.end_sent?.slice(0, 5)}` : ""}</span></div>
            ) : (
              <p className="muted small" style={{ marginTop: 0 }}>
                {job?.last_error ? job.last_error : "Este día aún no se ha enviado a la escuela."}
              </p>
            )}
            {session.status === "closed" && syncState !== "synced" && (
              <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 10 }} disabled={sending} onClick={() => void sendToSchool()}>
                {sending ? "Enviando…" : "Enviar a la escuela"}
              </button>
            )}
            {session.status !== "closed" && (
              <p className="muted small" style={{ marginTop: 8 }}>Ficha la salida para poder enviar el día.</p>
            )}
          </div>

          <button className="btn btn-ghost btn-block btn-lg" style={{ marginTop: 12 }} onClick={() => nav("/comparacion")}>
            Comparar con la escuela
          </button>
        </div>
      </div>
    </div>
  );
}
