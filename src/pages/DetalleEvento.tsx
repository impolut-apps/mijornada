import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IcChevronL, IcCoffee, IcPlay, IcShield, IcStop } from "../components/icons";
import { SyncBadge } from "../components/SyncBadge";
import { getEventById } from "../lib/fichaje";
import { formatDateLong, formatHM } from "../lib/time";
import type { TimeEvent } from "../lib/types";

const meta = (t: TimeEvent["type"]) => {
  if (t === "clock_in") return { cls: "in", label: "Entrada", Icon: IcPlay };
  if (t === "clock_out") return { cls: "out", label: "Salida", Icon: IcStop };
  if (t === "break_start") return { cls: "brk", label: "Inicio de descanso", Icon: IcCoffee };
  if (t === "break_end") return { cls: "brk", label: "Fin de descanso", Icon: IcCoffee };
  return { cls: "out", label: "Corrección", Icon: IcStop };
};

export default function DetalleEvento() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [ev, setEv] = useState<TimeEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setEv(await getEventById(id));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="app"><div className="screen light"><div className="spinner">Un momento…</div></div></div>;
  if (!ev) return <div className="app"><div className="screen light"><div className="spinner">No se encontró este fichaje.</div></div></div>;

  const m = meta(ev.type);
  const tz = ev.timezone;
  const manual = ev.source === "manual";

  return (
    <div className="app">
      <div className="screen light slide-in" style={{ paddingBottom: 24 }}>
        <div className="page-head">
          <button className="iconbtn" onClick={() => nav(-1)}><IcChevronL width={22} height={22} /></button>
          <h1 className="h2">Detalle del fichaje</h1>
        </div>

        <div className="content" style={{ paddingTop: 4 }}>
          <div className="card">
            <div className="row between">
              <div className="row" style={{ gap: 12 }}>
                <div className={`lr-ico ${m.cls}`}><m.Icon width={18} height={18} /></div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{m.label}</div>
                  <div className="muted small" style={{ textTransform: "capitalize" }}>{formatDateLong(ev.received_at_utc, tz)}</div>
                </div>
              </div>
              <SyncBadge state="local" />
            </div>
          </div>

          <div className="card">
            <div className="h2" style={{ fontSize: "1rem", marginBottom: 6 }}>Detalles</div>
            <div className="inforow"><span className="k">Hora</span><span className="v mono">{formatHM(ev.received_at_utc, tz)}</span></div>
            <div className="inforow"><span className="k">Zona horaria</span><span className="v">{tz}</span></div>
            <div className="inforow"><span className="k">Cómo se registró</span><span className="v">{manual ? "Añadido a mano" : "Al pulsar el botón"}</span></div>
          </div>

          <div className="card" style={{ background: "var(--green-050)" }}>
            <div className="row" style={{ gap: 12 }}>
              <div className="lr-ico in" style={{ background: "var(--green)", color: "#fff" }}><IcShield width={18} height={18} /></div>
              <div>
                <div style={{ fontWeight: 800, color: "var(--green-700)" }}>Fichaje protegido</div>
                <div className="small" style={{ color: "var(--green-700)" }}>
                  Queda sellado con la fecha y la hora. Si alguien intentara cambiarlo, la app lo notaría.
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="h2" style={{ fontSize: "1rem", marginBottom: 6 }}>En la escuela</div>
            <div className="inforow"><span className="k">Estado</span><SyncBadge state="local" /></div>
            <div className="inforow"><span className="k">Enviado el</span><span className="v muted">Todavía no</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
