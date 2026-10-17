# Seguridad, riesgos y limitaciones

> Distingue entre **integridad verificable**, **disponibilidad** y **autenticidad de la hora**.
> Ningún registro es "infalsificable"; aquí se explica hasta dónde llega cada mecanismo.

## 1. Alcance y autorización

- El proyecto se limita a **mi cuenta de Profesor** y a los datos a los que tengo acceso autorizado.
- La integración (escritura de fichajes) está **autorizada por el titular** del sistema. Conviene tener
  esa autorización **por escrito** (quién autoriza, cargo, cuenta, fechas).
- La **auditoría de seguridad** (buscar vulnerabilidades, intentar accesos sin credenciales) es un trabajo
  **aparte** y requiere **autorización escrita con alcance definido**, preferiblemente sobre un entorno de
  pruebas. No se ha realizado ni se realizará sin ese marco.

## 2. Observaciones de seguridad de la plataforma (no intrusivas)

| Observación | Tipo | Comentario |
|---|---|---|
| Acceso por **`http://` sin TLS** sobre IP pública | [HECHO] | Credenciales y cookie de sesión viajan en claro; riesgo de interceptación. Recomendable HTTPS. A reportar en la auditoría. |
| Formularios con **`csrf_token`** por sesión | [HECHO] | Buena práctica anti-CSRF presente. |
| Control de **duplicados** (botón deshabilitado en días fichados) | [HECHO] | Al menos en cliente; conviene confirmar validación en servidor. |
| `data-submit-once` anti doble-envío | [HECHO] | Mitigación en cliente. |

> Estas son observaciones pasivas de lo que el navegador ya cargó, no pruebas de intrusión.

## 3. Límites de nuestros mecanismos de integridad

### Cadena de hashes
- **Sirve para:** detectar manipulaciones *a posteriori* si un atacante modifica un registro **sin**
  recomputar toda la cadena.
- **No sirve para:** impedir manipulación por quien controla la BD **y** el código: un administrador con
  control total puede reescribir datos **y** recomputar hashes. Un hash encadenado por sí solo **no es**
  prueba infalsificable.

### Append-only a nivel de aplicación
- **Sirve para:** evitar borrados/sobrescrituras accidentales o desde la UI.
- **No sirve para:** frenar a quien tenga acceso directo a la BD con permisos de administración.

### Hora
- **received_at_utc** (hora de servidor) es más fiable que la del dispositivo, pero **no es hora
  certificada**. Autenticidad temporal fuerte requeriría un **sellado de tiempo (TSA, RFC 3161)** o un
  **anclaje externo** (ver §4).

## 4. Reforzar la integridad (recomendado)

Para acercarse a "verificable por un tercero", combinar:
1. **Exportación firmada**: export diario/semanal firmado con una **clave privada** que viva **fuera** de
   la app principal (idealmente en un dispositivo/servicio distinto). Así, aunque la BD se altere, existe
   una copia firmada independiente.
2. **Destino independiente**: enviar esas copias a un almacenamiento que la app **no pueda modificar**
   (bucket WORM / *object lock*, o un repositorio al que solo se pueda **añadir**).
3. **Sellado de tiempo (TSA)** sobre el hash del export, para autenticidad temporal frente a terceros.
4. (Opcional) **Anclaje**: publicar periódicamente el hash raíz en un medio público inmutable.

Cada capa reduce el conjunto de quién podría falsificar sin ser detectado, pero **ninguna** lo elimina
del todo. Hay que ser honesto sobre ello en cualquier informe.

## 5. Protección de datos (RGPD)

- El panel contiene **datos personales de alumnos** (posibles menores). **No** se recopilan, copian ni
  incluyen en informes; se usan datos ficticios en la documentación.
- Nuestra app solo necesita **mis** fichajes. No almacenar datos de terceros.

## 6. Manejo de secretos

- **Nunca** en código, logs ni repositorio: contraseña de la escuela, cookie de sesión, `csrf_token`.
- Credenciales de la integración en un **gestor de secretos** / variables de entorno cifradas.
- Logs de sincronización: guardar **respuestas normalizadas** (estado, horas), nunca cookies ni tokens.

## 7. Disponibilidad vs. integridad vs. autenticidad (resumen honesto)

| Propiedad | Qué garantizamos | Qué NO garantizamos |
|---|---|---|
| **Disponibilidad** | Mi registro propio sobrevive a caídas de la escuela | Que la escuela esté disponible |
| **Integridad verificable** | Detección de alteraciones si no se recomputa la cadena | Inmutabilidad frente a un admin con control total |
| **Autenticidad de la hora** | Hora de servidor en UTC, coherente | Hora certificada por un tercero (salvo TSA) |
