import { useState } from "react";
import { IcCheckCircle, IcClock, IcClose, IcMusic, IcUser } from "./icons";
import { dayNames, parseYmd } from "../lib/calendar";
import { setOccurrence } from "../lib/school";
import { useToast } from "../ui/ToastProvider";
import { useConfirm } from "../ui/ConfirmProvider";
import type { ClassItem } from "../lib/types";

/** Contenido del detalle de una clase (reutilizado por la página y el modal). */
export default function ClaseDetailContent({ cls }: { cls: ClassItem }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [nd, setNd] = useState<boolean>(cls.not_delivered);
  const [busy, setBusy] = useState(false);
  const canMark = Boolean(cls.source_id);

  async function toggle() {
    const target = !nd;
    const ok = await confirm({
      title: target ? "¿Marcar como no impartida?" : "¿Restablecer la clase?",
      message: target
        ? "Se marcará en la escuela que esta clase no se ha impartido."
        : "Se quitará la marca de 'no impartida' en la escuela.",
      confirmText: target ? "Marcar no impartida" : "Restablecer",
      danger: target,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await setOccurrence(cls.id, target);
      setNd(r.not_delivered);
      toast.show(r.not_delivered ? "Marcada como no impartida" : "Clase restablecida", "success");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "No se pudo actualizar", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        <div className="row between">
          <div className="row" style={{ gap: 12 }}>
            <div className="lr-ico brk" style={{ background: "var(--primary-050)", color: "var(--primary)" }}><IcMusic width={18} height={18} /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>{cls.subject}</div>
              {cls.class_date && <div className="muted small" style={{ textTransform: "capitalize" }}>{dayNames(parseYmd(cls.class_date))}</div>}
            </div>
          </div>
          {nd ? <span className="badge badge-amber"><IcClose width={12} height={12} /> No impartida</span> : <span className="badge badge-green"><IcCheckCircle /> Impartida</span>}
        </div>
        <div className="inforow" style={{ marginTop: 8 }}>
          <span className="k row" style={{ gap: 8 }}><IcClock width={16} height={16} className="muted" /> Horario</span>
          <span className="v mono">{cls.start_time.slice(0, 5)} – {cls.end_time.slice(0, 5)}</span>
        </div>
        {cls.classroom && <div className="inforow"><span className="k">Aula</span><span className="v">{cls.classroom}</span></div>}
      </div>

      <div className="card">
        <div className="h2" style={{ fontSize: "1rem", marginBottom: 4 }}>Impartición</div>
        <p className="muted small" style={{ marginTop: 0 }}>
          {nd ? "Esta clase está marcada como no impartida en la escuela." : "Esta clase consta como impartida."}
        </p>
        {canMark ? (
          <button
            className={`btn btn-block ${nd ? "btn-soft" : "btn-danger-soft"}`}
            disabled={busy}
            onClick={() => void toggle()}
          >
            {busy ? "Guardando…" : nd ? "Restablecer (marcar como impartida)" : "Marcar como no impartida"}
          </button>
        ) : (
          <p className="muted tiny">Para marcarla, sincroniza las clases desde la pestaña Clases.</p>
        )}
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
