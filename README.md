# App de fichaje (Nerea)

App independiente de registro horario: guarda **tu** fichaje en tu propia base de datos (Supabase),
de forma **verificable y exportable**, y —en una fase posterior y con autorización— lo sincronizará
con la plataforma de la escuela.

- **Frontend:** React + TypeScript (Vite), mobile-first.
- **Backend/datos:** Supabase (PostgreSQL + Auth + RLS).
- **PWA** desplegada en Vercel: instalable en móvil y se actualiza sola en cada despliegue.

El informe técnico completo está en [`docs/`](docs/README.md).

## Puesta en marcha

### 1. Crear el proyecto Supabase
1. Entra en https://supabase.com → **New project** (elige región Europa, p. ej. `eu-west`).
2. **Settings → API**: copia `Project URL` y `anon public` key.
3. **SQL Editor** → pega y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
4. **Authentication → Providers → Email**: deja activado Email. Para un único usuario, crea tu cuenta
   en **Authentication → Users → Add user** (email + contraseña). (Opcional: desactiva "Allow new users".)

### 2. Variables de entorno
```bash
cp .env.example .env
# edita .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
```

### 3. Desarrollo
```bash
npm install
npm run dev
```

### 4. Build web (lo que se despliega en Vercel)
```bash
npm run build      # genera /dist
npm run preview    # previsualiza el build
```

**Vercel:** importa el repo → framework **Vite** → añade las variables `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY` en Project Settings → Environment Variables. Cada push a `main` se publica solo.

### 5. Instalar como app (PWA)
No hace falta APK ni tienda. Desde el móvil, con la web abierta:
- **Android (Chrome):** menú **⋮** → *Instalar app* (o el botón "Instalar" en Ajustes).
- **iPhone (Safari):** **Compartir** → *Añadir a pantalla de inicio*.

Se actualiza sola en cada despliegue; no hay que reinstalar nada.

## Seguridad
- Las claves de `.env` (URL + anon) son **públicas** y pueden ir al cliente.
- **Nunca** subas al repo ni al cliente la `service_role` key ni credenciales de la escuela.
- El registro es append-only vía RLS + RPC; límites explicados en
  [`docs/security-and-limitations.md`](docs/security-and-limitations.md).

## Estado
- [x] Cimientos: app React + Auth Supabase + esquema con cadena de hashes.
- [x] Panel principal: entrada/salida, estado de jornada, tiempo transcurrido, registros de hoy.
- [ ] Historial completo + filtros + exportación CSV/PDF.
- [ ] Evidencias: export firmado a destino independiente.
- [ ] Integración con la escuela (fase posterior, con aprobación).
- [ ] Conciliación de discrepancias.
