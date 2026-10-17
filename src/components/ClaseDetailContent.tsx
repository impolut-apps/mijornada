import { IcClock, IcMusic, IcUser } from "./icons";
import { dayNames, parseYmd } from "../lib/calendar";
import type { ClassItem } from "../lib/types";

/** Contenido del detalle de una clase (reutilizado por la página y el modal). */
export default function ClaseDetailContent({ cls }: { cls: ClassItem }) {
  return (
    <>
      <div className="card">
        <div className="row" style={{ gap: 12 }}>
          <div className="lr-ico brk" style={{ background: "var(--primary-050)", color: "var(--primary)" }}><IcMusic width={18} height={18} /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>{cls.subject}</div>
            {cls.class_date && <div className="muted small" style={{ textTransform: "capitalize" }}>{dayNames(parseYmd(cls.class_date))}</div>}
          </div>
        </div>
        <div className="inforow" style={{ marginTop: 8 }}>
          <span className="k row" style={{ gap: 8 }}><IcClock width={16} height={16} className="muted" /> Horario</span>
          <span className="v mono">{cls.start_time.slice(0, 5)} – {cls.end_time.slice(0, 5)}</span>
        </div>
        {cls.classroom && <div className="inforow"><span className="k">Aula</span><span className="v">{cls.classroom}</span></div>}
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: cls.students.length ? 10 : 0 }}>
          <div className="h2" style={{ fontSize: "1rem" }}>Alumnos</div>
          <span className="badge badge-grey">{cls.students.length}</span>
        </div>
        {cls.students.length === 0 ? (
          <div className="muted small">Sin lista de alumnos.</div>
        ) : (
          cls.students.map((s, i) => (
            <div key={i} className="row" style={{ gap: 10, padding: "9px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <div className="avatar" style={{ width: 34, height: 34, fontSize: ".8rem" }}><IcUser width={16} height={16} /></div>
              <span style={{ fontWeight: 600 }}>{s}</span>
            </div>
          ))
        )}
      </div>

      <p className="muted tiny center" style={{ marginTop: 8 }}>Datos obtenidos de la escuela.</p>
    </>
  );
}
