import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base relativa para que el build funcione tanto en Vercel como dentro del APK (Capacitor).
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { port: 5173, host: true },
  build: { outDir: "dist", sourcemap: true },
});
