import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { IcBars, IcChevronR, IcClock, IcCoffee, IcPlay, IcStop, IcSync, IcUser } from "../components/icons";
import { SyncBadge } from "../components/SyncBadge";
import { getProfile, getSessionEvents, getTodaySession, recordTimeEvent } from "../lib/fichaje";
import { listClasses } from "../lib/classes";
import { getIntegrationState, sendClock, type IntegrationState } from "../lib/school";
import { getAutoSend } from "../lib/prefs";
import { SCHOOL_START } from "../lib/config";
import { computeDay } from "../lib/sessions";
import { formatDateLong, formatDuration, formatHM, formatHMS, userTimezone, ymdInTz } from "../lib/time";
import { haptic } from "../lib/haptics";
import { useToast } from "../ui/ToastProvider";
import { useConfirm } from "../ui/ConfirmProvider";
import type { ClassItem, TimeEvent } from "../lib/types";

type ClockType = "clock_in" | "clock_out" | "break_start" | "break_end";

export default function Inicio() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const tz = userTimezone();
  const [now, setNow] = useState(() => new Date());
  const [events, setEvents] = useState<TimeEvent[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [integ, setInteg] = useState<IntegrationState | null>(null);
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    try {
      const session = await getTodaySession();
      setEvents(session ? await getSessionEvents(session.id) : []);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Error cargando la jornada", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
    listClasses().then(setClasses).catch(() => {});
    getIntegrationState().then(setInteg).catch(() => {});
    if (user) getProfile(user.id).then((p) => setName(p?.display_name || user.email?.split("@")[0] || "")).catch(() => {});
  }, [load, user]);

  const day = useMemo(() => computeDay(events, now), [events, now]);
  const lastEvent = events[events.length - 1] ?? null;
  const todayClasses = useMemo(() => {
    const todayYmd = ymdInTz(now, tz);
    return classes
      .filter((c) => c.class_date === todayYmd)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [classes, now, tz]);

  const classesCard = (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="row between" style={{ marginBottom: todayClasses.length ? 12 : 0 }}>
        <div className="h2" style={{ fontSize: "1rem" }}>Mis clases de hoy</div>
        <button className="btn btn-soft small" onClick={() => nav("/clases")}>Ver horario <IcChevronR width={14} height={14} /></button>
      </div>
      {todayClasses.length === 0 ? (
        <div className="muted small">
          {classes.length === 0 ? "Aparecerán al conectar con la escuela." : "No tienes clases hoy. 🎉"}
        </div>
      ) : (
        todayClasses.map((c) => (
          <div className="class-row" key={c.id}>
            <div className="ctime mono">{c.start_time.slice(0, 5)}</div>
            <div className="grow">
              <div style={{ fontWeight: 700 }}>{c.subject}</div>
              <div className="muted tiny">{c.end_time.slice(0, 5)}{c.classroom ? ` · ${c.classroom}` : ""}</div>
              {c.students.length > 0 && (
                <div className="chips" style={{ marginTop: 6 }}>
                  {c.students.map((s, i) => (<span className="chip" key={i}><IcUser width={11} height={11} /> {s}</span>))}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  async function clock(type: ClockType) {
    if (type === "clock_out") {
      const ok = await confirm({
        title: "¿Fichar salida?",
        message: "Se cerrará tu jornada de hoy. Podrás consultarla en el historial.",
        confirmText: "Fichar salida",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await recordTimeEvent(type);
      haptic();
      const t = formatHM(new Date(), tz);
      const msg: Record<ClockType, string> = {
        clock_in: `Entrada registrada · ${t}`,
        clock_out: `Salida registrada · jornada cerrada`,
        break_start: `Descanso iniciado · ${t}`,
        break_end: `Descanso terminado · ${t}`,
      };
      toast.show(msg[type], "success");
      await load();

      // Al fichar salida, enviar automáticamente a la escuela (solo desde la fecha de inicio).
      if (type === "clock_out") {
        const d = ymdInTz(new Date(), tz);
        if (getAutoSend() && d >= SCHOOL_START) {
          toast.show("Enviando a la escuela…", "info");
          sendClock(d)
            .then((r) => toast.show(r.status === "already" ? "Ya constaba en la escuela" : "Fichaje enviado a la escuela ✓", "success"))
            .catch((e) => toast.show(`No se pudo enviar a la escuela: ${e instanceof Error ? e.message : ""}`, "error"));
        }
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "No se pudo registrar", "error");
    } finally {
      setBusy(false);
    }
  }

  const lastLabel = (t: TimeEvent["type"]) =>
    t === "clock_in" ? "Entrada" : t === "clock_out" ? "Salida" : t === "break_start" ? "Descanso" : "Fin de descanso";

  // ---------- Jornada NO en curso → portada morada ----------
  if (day.state === "idle") {
    const finished = events.length > 0;
    return (
      <div className="screen purple fade-in">
        <div className="content top">
          <div className="row" style={{ gap: 12, alignItems: "center" }}>
            <div className="hlogo on-purple only-mobile"><IcBars width={22} height={22} /></div>
            <div className="greet-name" style={{ color: "#fff" }}>Hola{name ? `, ${name}` : ""}</div>
          </div>

          <div className="hero-date">{formatDateLong(now, tz)}</div>
          <div className="hero-clock mono">{formatHMS(now, tz)}</div>
          <div className="status-chip">
            <span className="dot" /> {finished ? "Jornada finalizada" : "Jornada no iniciada"}
          </div>

          {finished && (
            <div style={{ color: "rgba(255,255,255,.85)", marginTop: 14, fontWeight: 600 }}>
              Hoy: {formatDuration(day.workedMinutes)} trabajadas
            </div>
          )}

          <div className="clock-fab-wrap">
            <button className="clock-fab pulse" disabled={busy || loading} onClick={() => void clock("clock_in")}>
              <span className="ico"><IcPlay width={44} height={44} /></span>
              Fichar entrada
            </button>
          </div>

          {classesCard}
        </div>

        <div className="sync-card">
          <div className="sc-ico"><IcSync width={20} height={20} /></div>
          <div className="grow">
            <div style={{ fontWeight: 700 }}>Conexión con la escuela</div>
            <div className="sc-state">
              <span className="dot" style={{ background: integ?.connected ? "#5ff0b0" : "#ffc98a" }} />
              {integ?.connected ? "Conectada" : "Aún no conectada"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- EN jornada / en pausa → portada clara ----------
  const onBreak = day.state === "onbreak";
  const openHours = day.firstEntrada ? (now.getTime() - new Date(day.firstEntrada).getTime()) / 3600000 : 0;
  const forgotReminder = openHours >= 10;
  return (
    <div className="screen light fade-in">
      <div className="content top">
        <div className="row between">
          <div className="row" style={{ gap: 12 }}>
            <div className="hlogo only-mobile"><IcBars width={22} height={22} /></div>
            <div>
              <div className="greet-name">Hola{name ? `, ${name}` : ""}</div>
              <div className="muted">Tu jornada de hoy</div>
            </div>
          </div>
          <div className="avatar"><IcUser width={24} height={24} /></div>
        </div>

        {forgotReminder && (
          <div className="reminder" style={{ marginTop: 14 }}>
            <IcClock width={18} height={18} />
            <span>Llevas muchas horas con la jornada abierta. ¿Te olvidaste de fichar la salida?</span>
          </div>
        )}

        <div className={`working-card pop ${onBreak ? "onbreak" : ""}`} style={{ marginTop: 16 }}>
          <div className="wc-state"><span className="dot" /> {onBreak ? "En descanso" : "En jornada"}</div>
          <div className="wc-time mono">{formatDuration(day.workedMinutes)}</div>
          <div className="wc-label">Tiempo trabajado{onBreak ? " (descanso en curso)" : ""}</div>
          <button className="btn btn-white btn-block" disabled={busy} onClick={() => void clock("clock_out")}>
            <IcStop width={18} height={18} /> Fichar salida
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          {!onBreak ? (
            <button className="btn btn-soft btn-block btn-lg" disabled={busy} onClick={() => void clock("break_start")}>
              <IcCoffee width={18} height={18} /> Iniciar descanso
            </button>
          ) : (
            <button className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={() => void clock("break_end")}>
              <IcPlay width={18} height={18} /> Terminar descanso
            </button>
          )}
        </div>

        <div className="card flat" style={{ marginTop: 14 }}>
          <div className="inforow">
            <span className="k row" style={{ gap: 8 }}><IcClock width={17} height={17} className="muted" /> Inicio de jornada</span>
            <span className="v mono">{day.firstEntrada ? formatHM(day.firstEntrada, tz) : "—"}</span>
          </div>
          <div className="inforow">
            <span className="k row" style={{ gap: 8 }}><IcSync width={17} height={17} className="muted" /> Último fichaje</span>
            <span className="row" style={{ gap: 10 }}>
              {lastEvent && <span className="v mono small">{lastLabel(lastEvent.type)} · {formatHM(lastEvent.received_at_utc, tz)}</span>}
              <SyncBadge state="local" />
            </span>
          </div>
        </div>

        {classesCard}
      </div>
    </div>
  );
}
