import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IcChevronR, IcCoffee, IcPlay, IcShield, IcStop, IcSync } from "../components/icons";
import { SyncBadge } from "../components/SyncBadge";
import { SkeletonRows } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { getEventsForSessions, listSessions } from "../lib/fichaje";
import { addDays, formatDateLong, formatHM, userTimezone, ymdInTz } from "../lib/time";
import type { TimeEvent } from "../lib/types";

type Filter = "all" | "clock_in" | "clock_out" | "break";

const meta = (t: TimeEvent["type"]) => {
  if (t === "clock_in") return { cls: "in", label: "Entrada", Icon: IcPlay };
  if (t === "clock_out") return { cls: "out", label: "Salida", Icon: IcStop };
  if (t === "break_start") return { cls: "brk", label: "Inicio de descanso", Icon: IcCoffee };
  if (t === "break_end") return { cls: "brk", label: "Fin de descanso", Icon: IcCoffee };
  return { cls: "out", label: "Corrección", Icon: IcStop };
};

export default function Evidencias() {
  const nav = useNavigate();
  const tz = userTimezone();
  const [filter, setFilter] = useState<Filter>("all");
  const [events, setEvents] = useState<TimeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date();
        const ss = await listSessions(ymdInTz(addDays(today, -45), tz), ymdInTz(today, tz));
        const evs = await getEventsForSessions(ss.map((s) => s.id));
        evs.sort((a, b) => new Date(b.received_at_utc).getTime() - new Date(a.received_at_utc).getTime());
        setEvents(evs);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando evidencias");
      } finally {
        setLoading(false);
      }
    })();
  }, [tz]);

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    if (filter === "break") return events.filter((e) => e.type === "break_start" || e.type === "break_end");
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  return (
    <div className="screen light">
      <div className="page-head">
        <IcShield width={26} height={26} style={{ color: "var(--primary)" }} />
        <h1 className="h1">Evidencias</h1>
      </div>

      <div className="content" style={{ paddingTop: 4 }}>
        <p className="muted small" style={{ marginTop: 0 }}>
          Aquí tienes cada fichaje guardado, con la prueba de que no se ha cambiado.
        </p>

        <button className="notice press" style={{ width: "100%", border: "none", cursor: "pointer", marginBottom: 14 }} onClick={() => nav("/comparacion")}>
          <IcSync width={18} height={18} /> Comparar con la escuela
        </button>

        <div className="pills">
          <button className={`pill ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>Todos</button>
          <button className={`pill ${filter === "clock_in" ? "active" : ""}`} onClick={() => setFilter("clock_in")}>Entrada</button>
          <button className={`pill ${filter === "clock_out" ? "active" : ""}`} onClick={() => setFilter("clock_out")}>Salida</button>
          <button className={`pill ${filter === "break" ? "active" : ""}`} onClick={() => setFilter("break")}>Pausa</button>
        </div>

        <div style={{ marginTop: 16 }}>
          {loading ? (
            <SkeletonRows count={5} />
          ) : error ? (
            <p className="error">{error}</p>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<IcShield width={30} height={30} />} title="Sin evidencias" subtitle="Aquí aparecerán tus fichajes con su trazabilidad." />
          ) : (
            filtered.map((e) => {
              const m = meta(e.type);
              return (
                <div key={e.id} className="listrow" onClick={() => nav(`/evidencias/${e.id}`)}>
                  <div className={`lr-ico ${m.cls}`}><m.Icon width={18} height={18} /></div>
                  <div className="grow">
                    <div className="row between">
                      <span style={{ fontWeight: 700 }}>{m.label}</span>
                      <SyncBadge state="local" />
                    </div>
                    <div className="muted small">{formatDateLong(e.received_at_utc, tz)} · {formatHM(e.received_at_utc, tz)}</div>
                    <div className="lr-id">#EVT-{e.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                  <IcChevronR className="chev" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
