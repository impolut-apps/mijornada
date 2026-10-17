import { useEffect, useState } from "react";
import { IcClose } from "./icons";
import ClaseDetailContent from "./ClaseDetailContent";
import { getClassById } from "../lib/classes";
import type { ClassItem } from "../lib/types";

/** Detalle de una clase como ventana modal flotante. */
export default function ClaseModal({ classId, onClose }: { classId: string; onClose: () => void }) {
  const [cls, setCls] = useState<ClassItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getClassById(classId)
      .then((c) => active && setCls(c))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [classId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3 className="h2">Detalle de la clase</h3>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar"><IcClose width={20} height={20} /></button>
        </div>
        {loading ? (
          <div className="spinner">Un momento…</div>
        ) : cls ? (
          <ClaseDetailContent cls={cls} />
        ) : (
          <div className="muted small">No se encontró la clase.</div>
        )}
      </div>
    </div>
  );
}
