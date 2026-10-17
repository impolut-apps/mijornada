import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { IcBell, IcChevronR, IcClock, IcDownload, IcLogout, IcPlug, IcSettings, IcShield, IcSync, IcUser } from "../components/icons";
import { buildDailyCsv, buildEventsCsv, downloadText, openPrintableReport } from "../lib/export";
import { getEventsForSessions, getProfile, listSessions, upsertProfile, verifyIntegrity } from "../lib/fichaje";
import { addDays, userTimezone, ymdInTz } from "../lib/time";
import { applyTheme, getStoredTheme, type Theme } from "../lib/theme";
import { canInstall, isIos, isStandalone, promptInstall } from "../lib/pwa";
import { useToast } from "../ui/ToastProvider";
import { useConfirm } from "../ui/ConfirmProvider";
import type { TimeEvent } from "../lib/types";

export default function Ajustes() {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const tz = userTimezone();
  const [name, setName] = useState("");
  const [role, setRole] = useState("Profesor de música");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [working, setWorking] = useState(false);
  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  const [installable, setInstallable] = useState(canInstall());

  function changeTheme(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  useEffect(() => {
    const onReady = () => setInstallable(true);
    window.addEventListener("pwa-installable", onReady);
    return () => window.removeEventListener("pwa-installable", onReady);
  }, []);

  async function install() {
    const ok = await promptInstall();
    if (ok) {
      toast.show("¡App instalada!", "success");
      setInstallable(false);
    }
  }

  const showInstallCard = !isStandalone() && (installable || isIos());

  useEffect(() => {
    if (!user) return;
    getProfile(user.id)
      .then((p) => {
        setName(p?.display_name || user.email?.split("@")[0] || "");
        setRole(p?.role || "Profesor de música");
      })
      .catch(() => setName(user.email?.split("@")[0] || ""));
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      await upsertProfile({ user_id: user.id, display_name: name, role, timezone: tz });
      setEditing(false);
      toast.show("Guardado", "success");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "No se pudo guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function loadData() {
    const today = new Date();
    const ss = await listSessions(ymdInTz(addDays(today, -366), tz), ymdInTz(today, tz));
    const evs = await getEventsForSessions(ss.map((s) => s.id));
    const map = new Map<string, TimeEvent[]>();
    for (const e of evs) {
      const a = map.get(e.work_session_id) ?? [];
      a.push(e);
      map.set(e.work_session_id, a);
    }
    return { ss, evs, map };
  }

  async function doExport(kind: "daily" | "events" | "pdf") {
    setWorking(true);
    try {
      const { ss, evs, map } = await loadData();
      const stamp = ymdInTz(new Date(), tz);
      if (kind === "daily") downloadText(`mis-fichajes-${stamp}.csv`, buildDailyCsv(ss, map, tz));
      else if (kind === "events") downloadText(`detalle-fichajes-${stamp}.csv`, buildEventsCsv(evs, tz));
      else openPrintableReport(ss, map, tz, name);
      if (kind !== "pdf") toast.show("Descargado", "success");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "No se pudo descargar", "error");
    } finally {
      setWorking(false);
      setShowExport(false);
    }
  }

  async function checkIntegrity() {
    setWorking(true);
    try {
      const r = await verifyIntegrity();
      if (r.ok) {
        await confirm({
          title: "✓ Todo correcto",
          message: `Hemos revisado tus ${r.checked} fichajes y ninguno se ha modificado. Todo está como lo dejaste.`,
          confirmText: "Perfecto",
          cancelText: "Cerrar",
        });
      } else {
        await confirm({
          title: "⚠ Atención",
          message: "Hemos detectado que algún fichaje podría haberse cambiado. Guarda una copia (Descargar) y avísanos.",
          confirmText: "Entendido",
          cancelText: "Cerrar",
          danger: true,
        });
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "No se pudo comprobar", "error");
    } finally {
      setWorking(false);
    }
  }

  async function doSignOut() {
    const ok = await confirm({ title: "¿Cerrar sesión?", message: "Tendrás que volver a entrar con tu correo y contraseña.", confirmText: "Cerrar sesión", danger: true });
    if (ok) await signOut();
  }

  const initials = (name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="screen light">
      <div className="page-head">
        <IcSettings width={26} height={26} style={{ color: "var(--primary)" }} />
        <h1 className="h1">Ajustes</h1>
      </div>

      <div className="content" style={{ paddingTop: 4 }}>
        {/* Perfil */}
        <div className="card">
          <div className="row" style={{ gap: 14 }}>
            <div className="avatar">{initials}</div>
            <div className="grow">
              {!editing ? (
                <>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{name || "—"}</div>
                  <div className="muted small">{role}</div>
                </>
              ) : (
                <>
                  <label className="field" style={{ marginBottom: 8 }}>
                    <span>Tu nombre</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} />
                  </label>
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span>Tu puesto</span>
                    <input value={role} onChange={(e) => setRole(e.target.value)} />
                  </label>
                </>
              )}
            </div>
            {!editing ? (
              <button className="btn btn-soft" onClick={() => setEditing(true)}>Editar</button>
            ) : (
              <button className="btn btn-primary" disabled={saving} onClick={() => void saveProfile()}>{saving ? "…" : "Guardar"}</button>
            )}
          </div>
        </div>

        {/* Instalar como app */}
        {showInstallCard && (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="row" style={{ gap: 12 }}>
              <div className="set-ico"><IcDownload width={19} height={19} /></div>
              <div className="grow">
                <div style={{ fontWeight: 700 }}>Instala la app en tu móvil</div>
                {installable ? (
                  <div className="muted small">Tendrás su icono en la pantalla de inicio.</div>
                ) : (
                  <div className="muted small">En iPhone: pulsa <strong>Compartir</strong> y luego <strong>“Añadir a pantalla de inicio”</strong>.</div>
                )}
              </div>
              {installable && (
                <button className="btn btn-primary" onClick={() => void install()}>Instalar</button>
              )}
            </div>
          </div>
        )}

        {/* Opciones */}
        <div className="card" style={{ padding: 4, marginTop: 14 }}>
          <div className="set-row">
            <div className="set-ico"><IcUser width={19} height={19} /></div>
            <div className="grow"><div className="st">Mi cuenta</div><div className="ss">{user?.email}</div></div>
          </div>
          <div className="set-row">
            <div className="set-ico"><IcClock width={19} height={19} /></div>
            <div className="grow"><div className="st">Zona horaria</div><div className="ss">{tz}</div></div>
          </div>
          <div className="set-row press" onClick={() => void checkIntegrity()}>
            <div className="set-ico" style={{ background: "var(--green-050)", color: "var(--green-700)" }}><IcShield width={19} height={19} /></div>
            <div className="grow"><div className="st">Comprobar que nada ha cambiado</div><div className="ss">Revisa que tus fichajes siguen intactos</div></div>
            <IcChevronR className="chev" style={{ color: "var(--muted)" }} />
          </div>
          <div className="set-row press" onClick={() => setShowExport((v) => !v)}>
            <div className="set-ico"><IcDownload width={19} height={19} /></div>
            <div className="grow"><div className="st">Descargar mis fichajes</div><div className="ss">{working ? "Preparando…" : "En Excel o PDF"}</div></div>
            <IcChevronR className="chev" style={{ color: "var(--muted)" }} />
          </div>
          {showExport && (
            <div className="col" style={{ gap: 10, padding: "0 16px 14px" }}>
              <button className="btn btn-soft btn-block" disabled={working} onClick={() => void doExport("pdf")}>Descargar PDF</button>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-soft grow" disabled={working} onClick={() => void doExport("daily")}>Resumen por días</button>
                <button className="btn btn-soft grow" disabled={working} onClick={() => void doExport("events")}>Detalle completo</button>
              </div>
            </div>
          )}
          <div className="set-row">
            <div className="set-ico" style={{ background: "#fdf1df", color: "var(--amber)" }}><IcPlug width={19} height={19} /></div>
            <div className="grow"><div className="st">Conexión con la escuela</div><div className="ss">Aún no conectada</div></div>
          </div>
          <div className="set-row" style={{ opacity: 0.6, cursor: "default" }}>
            <div className="set-ico"><IcSync width={19} height={19} /></div>
            <div className="grow"><div className="st">Probar la conexión</div><div className="ss">Disponible cuando se conecte la escuela</div></div>
          </div>
          <div className="set-row">
            <div className="set-ico"><IcBell width={19} height={19} /></div>
            <div className="grow"><div className="st">Avisos</div><div className="ss">Recordatorios de fichaje</div></div>
          </div>
        </div>

        {/* Apariencia */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="h2" style={{ fontSize: "1rem", marginBottom: 10 }}>Aspecto</div>
          <div className="pills">
            {([["light", "Claro"], ["dark", "Oscuro"], ["system", "Automático"]] as [Theme, string][]).map(([t, label]) => (
              <button key={t} className={`pill ${theme === t ? "active" : ""}`} onClick={() => changeTheme(t)}>{label}</button>
            ))}
          </div>
        </div>

        <button className="btn btn-danger-soft btn-block btn-lg" style={{ marginTop: 16 }} onClick={() => void doSignOut()}>
          <IcLogout width={18} height={18} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}
