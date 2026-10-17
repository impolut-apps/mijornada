# Plan de implementación por fases

> No se pasa a la integración real (envíos a la escuela) hasta tu **aprobación explícita** y la
> confirmación de que el método está autorizado.

## Decisiones finales (17/10/2026)

- **Frontend:** React + TypeScript (Vite). **Mobile-first**, desktop cuidado. UI moderna e intuitiva.
- **Empaquetado:** **APK con Capacitor** (Android) + build `/dist` desplegado en **Vercel** (web/PWA).
- **Backend y datos:** **Supabase** (PostgreSQL + Auth + RLS). **No** hay servidor Node propio para la app base.
- **Login de la app:** **Supabase Auth**.
- **Sincronización futura:** **Supabase Edge Functions** (Deno/TypeScript) + tareas programadas
  (pg_cron / scheduled functions). Secretos de la escuela **nunca** en cliente ni repo; en Supabase
  Secrets, accesibles solo desde la Edge Function (service role).
- **Regla de sincronización (día):** si el fichaje **coincide con una clase guardada** → `clock-auto`/
  `clock-auto-day` (por horario); si **no coincide** → `clock-manual`.
- **Sin pausas:** solo entrada/salida.
- **Primera entrega:** solo la app independiente (registro + historial + export), sin tocar la escuela.

## Stack propuesto (justificado)

| Pieza | Elección | Razón |
|---|---|---|
| Frontend | React + TypeScript (Vite) | Responsive, rápido, tipado; PWA sencilla; base del APK Capacitor |
| Backend/datos | **Supabase** (Postgres + Auth + RLS) | Sin servidor propio; auth lista; RLS para append-only; corre en la nube (PC apagado) |
| Tareas/segundo plano | Supabase Edge Functions + pg_cron | Sincronización sin mantener otro host |
| Integración | Cliente HTTP con sesión (variante A) en Edge Function; Playwright de reserva | Ver `integration-options.md` |
| Empaquetado | Capacitor (APK) + Vercel (web) | App móvil y web desde una misma base |
| Despliegue | Vercel (front) + Supabase (datos/func), **HTTPS**, secretos gestionados, backups | La app funciona con el PC del usuario apagado |

## Fases

### Fase A — Cimientos (sin tocar la escuela)
- Repo, estructura, CI, linter/formatador.
- Esquema PostgreSQL (`data-model.md`), migraciones, permisos append-only.
- Auth de un usuario; zona horaria configurable.

### Fase B — Registro independiente (núcleo, prioridad absoluta)
- Panel: estado de jornada, iniciar/finalizar, pausas; fecha/hora; tiempo transcurrido; último fichaje.
- Escritura transaccional de `time_events` + `work_sessions` con idempotencia y cadena de hashes.
- Historial, filtros por fecha, cálculo de horas, **exportación CSV** y PDF con marcas temporales.
- **Entregable usable aunque la integración no exista todavía.**

### Fase C — Evidencias y copias firmadas
- `audit_events` encadenados.
- Export firmado criptográficamente a destino independiente (WORM/append-only); opcional TSA.
- Herramienta de verificación de integridad.

### Fase D — Capa de integración (desacoplada)
- Interfaz `TimekeepingProvider` + implementación "Mi escuela".
- `checkConnection()` (login + lectura, **sin escribir**) para probar conexión sin fichar.
- Cola `sync_jobs` → `sync_attempts` con backoff, idempotencia y **verificación por relectura**.
- **Prueba de login controlada** (con tu aprobación) para fijar el contrato de `POST /login` y respuestas.

### Fase E — Conciliación (ver `reconciliation` en el brief)
- Leer `/teacher/attendance` por rango, parsear, cachear en `platform_records`.
- Comparar y clasificar diferencias (coincide, pendiente, ausente aquí/allí, diferencia de hora,
  modificado, duplicado, no verificable).
- Informe comparativo por día/semana/mes, exportable.

### Fase F — Pruebas y validación
- Tests: registro independiente, fallos de conexión, reintentos, prevención de duplicados, respuestas
  ambiguas, cambios de esquema externo, local vs UTC, detección de modificaciones, export, restore.
- Entorno de pruebas / datos simulados. **Ningún fichaje real** hasta tu aprobación.

### Fase G — Despliegue y operación
- HTTPS, secretos, backups, monitorización, cola en segundo plano siempre activa.

## Puertas de control (no avanzar sin esto)

1. **Revisión de este informe** por tu parte. ← estamos aquí
2. Aprobación explícita antes de la **primera prueba de login real**.
3. Aprobación explícita antes del **primer fichaje real** enviado a la escuela.

## Flujo obligatorio del fichaje (resumen)

```mermaid
flowchart TD
  X[Acción de fichaje] --> E[Guardar time_event\n+ hora servidor + hash\n(transacción)]
  E --> J[Crear sync_job\nidempotency_key]
  J --> Q{¿Día ya fichado\nen la escuela?}
  Q -- sí y coincide --> OK[synced]
  Q -- no --> P[POST /teacher/clock-*]
  P --> V[Releer /teacher/attendance]
  V -- coincide --> OK
  V -- no coincide --> R[needs_review]
  P -- error/ambiguo --> RT[pending\nreintento con backoff]
```
