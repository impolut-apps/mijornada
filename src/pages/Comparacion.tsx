import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IcChevronL, IcClock } from "../components/icons";
import { SkeletonCard } from "../components/Skeleton";
import { getEventsForSessions, listSessions } from "../lib/fichaje";
import { addDays, formatDayShort, formatDuration, userTimezone, ymdInTz } from "../lib/time";
import type { WorkSession } from "../lib/types";

export default function Comparacion() {
  const nav = useNavigate();
  const tz = userTimezone();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date();
        const ss = await listSessions(ymdInTz(addDays(today, -13), tz), ymdInTz(today, tz));
        await getEventsForSessions(ss.map((s) => s.id)); // precarga (no usada directamente aquí)
        setSessions(ss);
      } finally {
        setLoading(false);
      }
    })();
  }, [tz]);

  // Sin conexión con la escuela todavía: todo está "por enviar".
  const counts = useMemo(
    () => ({ coinciden: 0, porEnviar: sessions.length, diferencias: 0, faltan: 0 }),
    [sessions]
  );

  const legend = [
    { c: "var(--green)", label: "Coinciden", n: counts.coinciden },
    { c: "var(--amber)", label: "Por enviar", n: counts.porEnviar },
    { c: "#e05a5a", label: "Diferencias", n: counts.diferencias },
    { c: "#9aa1b2", label: "Faltan", n: counts.faltan },
  ];

  return (
    <div className="app">
      <div className="screen light slide-in" style={{ paddingBottom: 24 }}>
        <div className="page-head">
          <button className="iconbtn" onClick={() => nav(-1)}><IcChevronL width={22} height={22} /></button>
          <h1 className="h2">Comparar con la escuela</h1>
        </div>

        <div className="content" style={{ paddingTop: 4 }}>
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="card">
              <div className="donut-wrap">
                <div className="donut" style={{ background: `conic-gradient(var(--amber) 0% ${sessions.length ? 100 : 0}%, var(--grey-050) 0)` }}>
                  <div className="hole">
                    <div className="pct">{sessions.length ? "0%" : "—"}</div>
                    <div className="muted tiny">Coinciden</div>
                  </div>
                </div>
                <div className="legend grow">
                  {legend.map((l) => (
                    <div className="li" key={l.label}>
                      <span className="dot" style={{ background: l.c }} />
                      <span>{l.label}</span>
                      <span className="n">{l.n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="notice" style={{ marginTop: 14 }}>
            <IcClock width={18} height={18} />
            Todavía no está conectada la escuela. Cuando la conectemos, aquí verás si tus fichajes coinciden con los suyos. De momento están guardados a salvo en tu app.
          </div>

          {!loading && sessions.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="h2" style={{ fontSize: "1rem", marginBottom: 8 }}>Tus últimos días</div>
              {sessions.map((s) => (
                <div className="inforow" key={s.id}>
                  <span>
                    <div style={{ fontWeight: 700, fontSize: ".92rem" }}>{formatDayShort(s.work_date)}</div>
                    <div className="muted tiny mono">{formatDuration(s.computed_minutes)}</div>
                  </span>
                  <span className="badge badge-amber"><IcClock /> Por enviar</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
