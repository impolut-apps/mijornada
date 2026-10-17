import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// App web (PWA) desplegada en la raíz del dominio (Vercel). base "/" para que los
// recursos carguen bien también en rutas con varios niveles (p. ej. /historial/:id).
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: { port: 5173, host: true },
  build: { outDir: "dist", sourcemap: true },
});
