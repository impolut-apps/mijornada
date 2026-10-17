import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import AppLayout from "./components/AppLayout";
import Sidebar from "./components/Sidebar";
import { getProfile } from "./lib/fichaje";
import Ajustes from "./pages/Ajustes";
import Clases from "./pages/Clases";
import ClaseDetalle from "./pages/ClaseDetalle";
import Comparacion from "./pages/Comparacion";
import DetalleJornada from "./pages/DetalleJornada";
import Historial from "./pages/Historial";
import Inicio from "./pages/Inicio";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import SetupNotice from "./pages/SetupNotice";
import Splash from "./pages/Splash";

function AuthedApp() {
  const { user } = useAuth();
  const [state, setState] = useState<"loading" | "needs-onboarding" | "ready">("loading");

  const check = useCallback(async () => {
    if (!user) return;
    let localFlag = false;
    try {
      localFlag = localStorage.getItem("mijornada-onboarded") === "1";
    } catch {
      /* ignore */
    }
    if (localFlag) {
      setState("ready");
      return;
    }
    try {
      const p = await getProfile(user.id);
      setState(p?.onboarded ? "ready" : "needs-onboarding");
    } catch {
      setState("ready"); // si falla la lectura, no bloqueamos el uso
    }
  }, [user]);

  useEffect(() => {
    void check();
  }, [check]);

  if (state === "loading") return <Splash />;
  if (state === "needs-onboarding") return <Onboarding onDone={() => setState("ready")} />;

  return (
    <>
      <Sidebar />
      <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<AppLayout />}>
        <Route index element={<Inicio />} />
        <Route path="clases" element={<Clases />} />
        <Route path="historial" element={<Historial />} />
        <Route path="comparacion" element={<Comparacion />} />
        <Route path="ajustes" element={<Ajustes />} />
      </Route>
      <Route path="historial/:id" element={<DetalleJornada />} />
      <Route path="clases/:id" element={<ClaseDetalle />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const { configured, loading, user } = useAuth();

  if (!configured) return <SetupNotice />;
  if (loading) return <Splash />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return <AuthedApp />;
}
