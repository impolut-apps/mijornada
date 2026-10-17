const AUTO_SEND_KEY = "mijornada-autosend";

/** Enviar a la escuela automáticamente al fichar salida (activado por defecto). */
export function getAutoSend(): boolean {
  try {
    const v = localStorage.getItem(AUTO_SEND_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function setAutoSend(v: boolean) {
  try {
    localStorage.setItem(AUTO_SEND_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}
