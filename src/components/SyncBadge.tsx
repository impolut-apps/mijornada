import type { SyncState } from "../lib/types";
import { IcCheckCircle, IcClock } from "./icons";

/**
 * Etiqueta de estado en lenguaje sencillo (sin tecnicismos).
 * "Guardado" = a salvo en tu app. "Enviado" = también está en la escuela.
 */
export function SyncBadge({ state, onPurple = false }: { state: SyncState; onPurple?: boolean }) {
  if (state === "synced")
    return (
      <span className="badge badge-green">
        <IcCheckCircle /> Enviado
      </span>
    );
  if (state === "pending")
    return (
      <span className="badge badge-amber">
        <IcClock /> Por enviar
      </span>
    );
  if (state === "needs_review")
    return (
      <span className="badge badge-amber">
        <IcClock /> Revisar
      </span>
    );
  return (
    <span className={`badge ${onPurple ? "badge-onpurple" : "badge-grey"}`}>
      <IcCheckCircle /> Guardado
    </span>
  );
}
