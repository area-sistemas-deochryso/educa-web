<!-- created: 2026-08-11 -->

# estudiante-audit-justificacion-inasistencia

> **Origen**: F1 audit funcional del plan [`audit-estudiante-navegacion-2026-08.md`](../plan/audit-estudiante-navegacion-2026-08.md).
> **Severidad**: 🟡 (aclaración de UI, no feature nueva — ver reencuadre abajo).
> **Tipo**: decisión de producto tomada (2026-08-12) — camino combinado, ver abajo. Requiere `/design` antes de `/execute` (feature nueva con moderación, no es solo copy).

## Reproducción

1. Loguear como estudiante, ir a "Mi Asistencia" (`/intranet/estudiante/asistencia`) o al tab "Asistencia" dentro de "Mis Salones".
2. Ver la tabla con columnas Fecha / Estado / Justificación.
3. Con los datos de prueba de esta sesión, el único registro es "Presente" — la columna "Justificación" muestra "—".

**Actual**: no se pudo probar el caso real (no hay ninguna falta en los datos de prueba), pero por inspección de la UI no hay ningún botón/acción visible en la fila para adjuntar una justificación, ni siquiera en el estado actual "Presente" donde no aplicaría. Queda como pregunta abierta si existe algún flujo (quizás solo visible cuando el estado es "Falto") que no se pudo disparar en esta sesión.

## Reencuadre — por qué esto no es simplemente "agregar botón de subir justificación"

Pensando desde el rol real de quien usa esta pantalla: un estudiante de inicial o primaria temprana **no es quien decide o gestiona por qué faltó** — eso es responsabilidad de un padre/tutor/adulto, típicamente coordinado directamente con el colegio (llamada, nota, WhatsApp al profesor) y no necesariamente algo que deba resolverse desde la cuenta del propio menor logueado en la intranet. Construir un "botón para que el chico justifique su falta" podría estar resolviendo el problema equivocado.

## Decisión tomada (2026-08-12)

Camino combinado por nivel — se implementan **los dos caminos en paralelo, segmentados por nivel**:

- **Inicial/primaria** (camino 1 — copy): la justificación sigue siendo responsabilidad del tutor, no del menor logueado. El "—" pasa a tener un tooltip/mensaje aclaratorio tipo "Las justificaciones las gestiona el colegio con tu apoderado" — mismo patrón que "Historial de Asistencia" para el caso biométrico. Sin acción ni botón nuevo.
- **Secundaria** (camino 2 — autoservicio con moderación): el estudiante puede subir una justificación desde esta pantalla. Queda pendiente de aprobación (por el profesor del curso o por personal administrativo — cualquiera de los dos roles puede aprobar) antes de reflejarse como justificada en la tabla. Es una feature nueva: requiere `/design` propio (flujo de carga, estado "pendiente de aprobación", bandeja de aprobación para profesor/administrativo) antes de tocar UI de estudiante.

## Componente probable

Mismo componente de asistencia usado en `estudiante-audit-asistencia-duplicada` (`student-attendance-tab.component` u homólogo standalone). La segmentación por nivel (inicial/primaria vs. secundaria) probablemente ya existe como dato del salón/estudiante en otros componentes del sistema — reutilizar, no inventar un nuevo criterio de nivel.

## Criterio de cierre

- Inicial/primaria: copy nuevo implementado y consistente en ambas vistas (standalone + tab de salón).
- Secundaria: `/design` de la feature de autoservicio completado (incluye bandeja de aprobación) antes de `/execute`.
- Regresión: un estudiante de secundaria sin faltas justificables no ve ninguna acción disponible donde no aplica.

## Out-of-scope

- Flujo de justificación desde la cuenta de administrador/coordinador (si ya existe ahí, no se tocó en este audit — el audit fue 100% desde la cuenta de estudiante).
