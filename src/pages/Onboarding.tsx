import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { IcBars } from "../components/icons";
import { upsertProfile } from "../lib/fichaje";
import { userTimezone } from "../lib/time";

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!user) return;
    setBusy(true);
    try {
      await upsertProfile({
        user_id: user.id,
        display_name: name.trim() || user.email?.split("@")[0] || "",
        timezone: userTimezone(),
        onboarded: true,
      });
    } catch {
      /* si aún no está la base lista, no bloqueamos: entramos igual */
    } finally {
      try {
        localStorage.setItem("mijornada-onboarded", "1");
      } catch {
        /* ignore */
      }
      setBusy(false);
      onDone();
    }
  }

  return (
    <div className="screen purple center-screen">
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div className="col center" style={{ alignItems: "center", marginBottom: 18 }}>
          <div className="clock-fab" style={{ width: 80, height: 80 }}><IcBars width={38} height={38} /></div>
          <div className="brand-title" style={{ fontSize: "1.4rem", marginTop: 12 }}>¡Bienvenida!</div>
          <div className="brand-sub">Vamos a prepararlo en un momento</div>
        </div>
        <div className="card">
          <h1 className="h2" style={{ marginBottom: 4 }}>¿Cómo te llamas?</h1>
          <p className="muted small" style={{ marginTop: 0 }}>Lo usaremos para saludarte. Puedes cambiarlo luego.</p>
          <label className="field">
            <span>Tu nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nerea" autoFocus />
          </label>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={() => void start()}>
            {busy ? "Un momento…" : "Empezar"}
          </button>
        </div>
      </div>
    </div>
  );
}
