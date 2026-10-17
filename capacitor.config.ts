import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nerea.fichaje",
  appName: "Fichaje",
  webDir: "dist",
  // Para APK con backend en la nube (Supabase) no hace falta `server.url`:
  // el build estático de /dist se empaqueta dentro de la app.
};

export default config;
