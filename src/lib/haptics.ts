/** Vibración breve en móviles que lo soporten (no-op en escritorio). */
export function haptic(ms = 18) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}
