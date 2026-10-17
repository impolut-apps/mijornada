export default function SetupNotice() {
  return (
    <div className="center-screen">
      <div className="card" style={{ maxWidth: 440 }}>
        <h1 className="h2" style={{ marginBottom: 10 }}>Falta configurar Supabase</h1>
        <p className="muted small">
          Copia <code>.env.example</code> a <code>.env</code> con tu <code>VITE_SUPABASE_URL</code> y
          <code> VITE_SUPABASE_ANON_KEY</code>, y reinicia el servidor de desarrollo.
        </p>
        <ol className="muted small" style={{ paddingLeft: 18, lineHeight: 1.8 }}>
          <li>supabase.com → New project</li>
          <li>Settings → API → copia URL y anon key</li>
          <li>SQL Editor → ejecuta <code>supabase/schema.sql</code></li>
        </ol>
      </div>
    </div>
  );
}
