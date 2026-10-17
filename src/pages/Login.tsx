import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { IcBars } from "../components/icons";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signIn(email.trim(), password);
    if (error) setError(error);
    setBusy(false);
  }

  return (
    <div className="screen purple center-screen">
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div className="col center" style={{ alignItems: "center", marginBottom: 20 }}>
          <div className="clock-fab" style={{ width: 84, height: 84, boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>
            <IcBars width={40} height={40} />
          </div>
          <div className="brand-title" style={{ fontSize: "1.5rem", marginTop: 14 }}>MiJornada</div>
          <div className="brand-sub">Tu tiempo, bajo control</div>
        </div>

        <form className="card" onSubmit={onSubmit}>
          <h1 className="h2" style={{ marginBottom: 14 }}>Inicia sesión</h1>
          <label className="field">
            <span>Correo</span>
            <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <p className="muted tiny center" style={{ marginTop: 12 }}>
            Este acceso es el de <strong>tu</strong> app, no el de la escuela.
          </p>
        </form>
      </div>
    </div>
  );
}
