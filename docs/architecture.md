# Arquitectura observada — Plataforma "Mi escuela"

> Reconocimiento del 16–17/10/2026, solo lectura, con sesión de Profesor iniciada manualmente por el usuario.
> Convención: **[HECHO]** = observado directamente · **[HIPÓTESIS]** = inferido, pendiente de confirmar.
> No se incluyen datos personales de terceros, cookies, tokens ni secretos.

## 1. Resumen

Plataforma web de gestión de una escuela de música (alumnos, profesores, clases, fichaje horario).
Acceso en `http://113.30.148.43/` con tres perfiles: **Cliente**, **Profesor**, **Administrador**.
Este análisis se centra en el perfil **Profesor** (cuenta de empleado), único autorizado y necesario para el fichaje.

## 2. Tecnologías

| Capa | Observación | Fuente |
|---|---|---|
| Sistema operativo | **Ubuntu** | [HECHO] detector tipo Wappalyzer aportado por el usuario |
| Servidor web / proxy | **Nginx 1.18.0** (servidor web y proxy inverso) | [HECHO] Wappalyzer |
| UI framework | **Bootstrap 5.3.8** (vendorizado en `/static/vendor/`) | [HECHO] recursos cargados |
| PWA | La app es **instalable como PWA** | [HECHO] Wappalyzer |
| Frontend JS | JavaScript propio modular, sin framework SPA (no React/Vue/Angular detectado) | [HECHO] |
| Backend | **No identificado** por las herramientas | [HIPÓTESIS] ver §5 |

## 3. Tipo de aplicación

**[HECHO]** Aplicación **multipágina (MPA) renderizada en servidor**: cada pantalla es una URL que
devuelve HTML completo; la navegación recarga página. No es una SPA.

**[HECHO]** La interactividad (envíos, filtros, mensajería) se hace con **formularios HTML `POST`/`GET`**
clásicos y JavaScript propio de apoyo, no con una API JSON cliente-servidor.

## 4. Recursos de cliente observados

CSS (en `/static/css/` y `/static/vendor/`), con *cache-busting* por query string (`?v=YYYYMMDD-...`):
`bootstrap.min.css`, `app.css`, `workspace-filters.css`, `workspace-theme.css`, `daily-workspace.css`,
`member-workspace.css`, `workspace-navigation.css`, `teacher-panel.css`.

JS (en `/static/js/`):
`security.js`, `session-activity.js`, `app.js`, `operations.js`, `messaging.js`, `workspace.js`,
`row-actions.js`, `workspace-filters.js`, `workspace-navigation.js`, `portal.js`.
Vendor: `bootstrap.bundle.min.js`.

**[HIPÓTESIS]** Los nombres (`workspace`, `daily-workspace`, `member-workspace`, `row-actions`,
`session-activity`) sugieren un patrón de "espacios de trabajo" reutilizado entre perfiles, con control
de sesión por inactividad (`session-activity.js`) y utilidades de seguridad en cliente (`security.js`).

## 5. Backend y base de datos (no verificado)

No hay evidencia directa del lenguaje/framework ni del motor de base de datos. Señales indirectas:

- **[HECHO]** Cada formulario incluye un campo oculto `csrf_token` con valor por sesión.
- **[HECHO]** Atributo propio `data-submit-once` en botones de envío (anti doble-click en cliente).
- **[HIPÓTESIS]** El patrón `csrf_token` + plantillas HTML + formularios es típico de frameworks como
  **Flask (Flask-WTF)** o **Django**. No es verificable sin acceso al servidor y no debe asumirse.
- **[HIPÓTESIS]** Hay persistencia relacional (fichajes, clases, alumnos, resúmenes mensuales), pero el
  motor concreto (PostgreSQL/MySQL/SQLite) **no es observable** desde el cliente.

## 6. Diagrama (observado)

```mermaid
flowchart LR
  B[Navegador\nProfesor] -- HTTP --> N[Nginx 1.18.0\nUbuntu]
  N -- proxy --> A[App servidor\n(framework no identificado)]
  A --- D[(Persistencia\nno identificada)]
  B -. GET HTML .- A
  B -. POST formularios\n+ csrf_token .-> A
```

## 7. Notas de seguridad relevantes a la arquitectura

- **[HECHO]** El acceso es por **`http://` sin TLS** sobre IP pública. Credenciales y cookie de sesión
  viajan en claro. Es un riesgo serio (ver `security-and-limitations.md`), no un fallo que debamos
  explotar, pero sí a reportar en la auditoría autorizada.
- **[HECHO]** La zona `/teacher/` es **autenticada**; en el reconocimiento se accedió porque el usuario
  ya tenía sesión iniciada manualmente, no por un bypass.

## 8. Qué sabemos / qué falta

- **Sabemos:** front MPA server-rendered + Bootstrap + PWA, tras Nginx/Ubuntu; auth por cookie de
  sesión; formularios con CSRF.
- **Falta por comprobar:** lenguaje/framework y BD del backend (no imprescindible para la integración);
  forma exacta del `POST /login` (se confirmará, con tu aprobación, en una prueba de login controlada).
