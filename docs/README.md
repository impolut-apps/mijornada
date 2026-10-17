# Informe de ingeniería inversa — App de fichaje (Fase 1 y 2)

Reconocimiento del 16–17/10/2026 sobre `http://113.30.148.43/`, perfil **Profesor**, **solo lectura**,
con sesión iniciada manualmente por el usuario. **No se ha enviado ningún fichaje** ni se ha modificado nada.
Sin datos personales de terceros, sin cookies, sin tokens.

## Documentos
1. [architecture.md](architecture.md) — tecnologías y arquitectura observadas.
2. [routes-and-screens.md](routes-and-screens.md) — rutas y pantallas.
3. [timekeeping-flow.md](timekeeping-flow.md) — flujo técnico de fichaje.
4. [integration-options.md](integration-options.md) — alternativas de sincronización.
5. [data-model.md](data-model.md) — modelo de datos de mi app.
6. [security-and-limitations.md](security-and-limitations.md) — riesgos y límites.
7. [implementation-plan.md](implementation-plan.md) — plan por fases.

## Conclusión

**Qué sabemos (hechos):**
- Front **MPA renderizado en servidor** + **Bootstrap 5.3.8**, instalable como **PWA**, tras **Nginx
  1.18.0 / Ubuntu**. Sin SPA.
- Auth por **cookie de sesión**; formularios con **`csrf_token`**.
- El fichaje es **por día**, no "entrada/salida en vivo":
  - `POST /teacher/clock-auto` (hoy, desde horario),
  - `POST /teacher/clock-auto-day` (`target_date`),
  - `POST /teacher/clock-manual` (`day`, `start`, `end`).
- Histórico legible en `GET /teacher/attendance?from_date&to_date` (tabla Entrada/Salida/Horas). **Sin
  exportación CSV oficial.**
- Control de **duplicados** (días fichados deshabilitados) y no se puede fichar en el futuro.

**Qué falta por comprobar:**
- Lenguaje/framework y BD del backend (no imprescindible).
- Contrato exacto de `POST /login` y formato de respuesta de los `clock-*` → **prueba de login
  controlada**, solo con tu aprobación.
- Reglas finas (solapamientos, reescritura, errores) → prueba controlada, sin datos reales.

**Método de integración más fiable:** automatización con **mi sesión autenticada** (cliente HTTP con
sesión; Playwright de reserva), con **verificación por relectura** del histórico y **comprobación previa
de estado** para no duplicar. La prioridad es que mi **registro propio** (independiente, append-only,
verificable y exportable) exista siempre, falle o no la escuela.

## Puertas de control pendientes
1. **Tu revisión de este informe.** ← aquí
2. Aprobación antes de la primera **prueba de login real**.
3. Aprobación antes del **primer fichaje real** enviado a la escuela.
