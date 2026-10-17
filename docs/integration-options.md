# Opciones de integración con la plataforma original

> Evaluadas en el orden de preferencia del brief. Conclusión al final.

## Resumen de alternativas

| # | Opción | ¿Disponible? | Veredicto |
|---|---|---|---|
| 1 | API oficial documentada | **No** (el titular confirma: app "a código", sin API) | Descartada |
| 2 | Integración autorizada del proveedor | **No** (desarrollo propio interno, sin proveedor externo) | Descartada |
| 3 | Export/import oficial soportado | **No** observado (sin CSV/PDF en "Mis fichajes") | Descartada como vía de escritura; ver §3 para lectura |
| 4 | **Automatización con mi sesión autenticada** | **Sí**, y **autorizada** por el titular | **Opción elegida** |

## 1–2. API / integración de proveedor
No existen. La escuela confirma que es una web app propia sin API ni integración soportada. No se debe
presuponer ni "descubrir" una API no documentada: eso entraría en terreno de seguridad, fuera de este alcance.

## 3. Export/import oficial
No hay exportación oficial. Sin embargo, **la lectura** del histórico sí es viable de forma legítima:
`GET /teacher/attendance?from_date=...&to_date=...` devuelve la tabla diaria. La usaremos para
**verificar** y **conciliar**, no para escribir.

## 4. Automatización con sesión autenticada (elegida)

Autorizada por el titular del sistema. Consiste en que **nuestro backend** reproduzca exactamente las
mismas operaciones que haría el profesor en su navegador, con su sesión.

### 4.1 Dos implementaciones posibles

| Variante | Cómo | Pros | Contras |
|---|---|---|---|
| **A. Cliente HTTP con sesión** (recomendada) | `POST /login` → guardar cookie → `GET /teacher/` para extraer `csrf_token` → `POST /teacher/clock-*` → `GET /teacher/attendance` para verificar | Ligera, rápida, fácil de testear, barata en servidor | Hay que replicar login y manejo de CSRF; sensible a cambios de HTML |
| **B. Navegador headless** (Playwright) | Automatiza el navegador real sobre la UI | Robusta ante JS/anti-automatización; "ve" lo mismo que el usuario | Pesada, más lenta, más frágil en CI, más recursos |

**Recomendación:** empezar por **A**. Si aparece protección anti-automatización en el login (JS
obligatorio, challenge), conmutar a **B** para el paso de login y seguir en HTTP para el resto.

### 4.2 Contrato de la integración (interfaz `TimekeepingProvider`)

```ts
interface TimekeepingProvider {
  checkConnection(): Promise<ConnStatus>;           // login + GET panel, sin escribir
  clockAutoToday(): Promise<ProviderResult>;        // POST /teacher/clock-auto
  clockAutoDay(date: string): Promise<ProviderResult>; // POST /teacher/clock-auto-day
  clockManual(day: string, start: string, end: string): Promise<ProviderResult>; // POST /teacher/clock-manual
  readAttendance(from: string, to: string): Promise<AttendanceRow[]>; // GET /teacher/attendance (parseado)
  // Normaliza respuestas y detecta discrepancias contra nuestros registros.
}
```

### 4.3 Verificación (no fiar del envío)

Una operación **no** se marca `synced` por haber hecho el `POST`. Tras enviar:
1. Releer `GET /teacher/attendance` del `day`.
2. Comprobar que la fila tiene Entrada/Salida/Horas esperadas.
3. Solo entonces → `synced`. Si no coincide o no se puede leer → `needs_review` / `pending`.

### 4.4 Idempotencia y duplicados

- La plataforma ya **deshabilita** días fichados. Antes de enviar, **consultar** el estado del día:
  si ya está fichado y coincide, no reenviar (marcar `synced`).
- Clave de idempotencia por `(empleado, day, tipo)` en **nuestra** BD para no lanzar dos veces la misma op.

### 4.5 Riesgos de acoplamiento
El HTML puede cambiar (`?v=` cambia a menudo). Mitigaciones: selectores robustos, *tests* de contrato
que fallen pronto si cambia la estructura, y alertas que pasen la sync a `needs_review` en vez de romper.

## Conclusión

El método más fiable y autorizado es la **variante A** (cliente HTTP con sesión), con **verificación por
relectura** del histórico y **comprobación previa de estado** para no duplicar. Queda pendiente, como
primer paso técnico real y **con tu aprobación explícita**, una **prueba de login controlada** para fijar
el contrato exacto de `POST /login` y el formato de respuesta de los `clock-*`.
