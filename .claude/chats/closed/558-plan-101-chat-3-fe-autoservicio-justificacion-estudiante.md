> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 101 · **Chat**: 3 · **Fase**: F3 · **Creado**: 2026-08-14 · **Estado**: ⏳ pendiente arrancar.
>
> **exclusive**: `false` · **isolation**: `worktree` · **touches**: `src/app/features/intranet/pages/estudiante/**`, `src/app/features/intranet/pages/profesor/models/attendance-course.models.ts` · **hot-paths**: `pages/profesor/models/attendance-course.models.ts` (compartido entre feature profesor y estudiante — coordinar si F4 u otro chat lo toca en paralelo).

---

# Plan 101 F3 — Frontend: autoservicio de justificación (Secundaria)

## PLAN FILE

[`educa-coord/plans/xrepo-101-justificacion-inasistencia-secundaria.md`](../../../educa-coord/plans/xrepo-101-justificacion-inasistencia-secundaria.md) — sección **F3**.

El plan es intención + decisiones. La sección **IMPLEMENTATION DETAIL** de abajo trae el contrato **real** que quedó del backend (F2, brief 557, commit `c93a3a2`) — confirmado leyendo el código shipped, no especulado. Es el punto de partida confiable.

## OBJETIVO

Un estudiante de Secundaria con una fila "Faltó" sube una justificación (adjunto + comentario opcional) desde su vista de asistencia. La fila refleja el estado real de su propia solicitud (pendiente / aprobada / rechazada), no solo el resultado final. Bloquea reenvío mientras haya una solicitud activa; permite reintentar tras un rechazo. Aplica en **ambas vistas** — son implementaciones independientes, no un componente compartido (ver IMPLEMENTATION DETAIL).

## MODO SUGERIDO

Arrancar con `/execute`. Flujo: `/execute` → `/validate` → cierre. Razón: el backend ya está shipped y su contrato está confirmado abajo — lo que falta es implementación FE, no diseño ni investigación de contrato.

## PRE-WORK OBLIGATORIO

- Leer sección **F3** del plan (`xrepo-101-...md`).
- Confirmar que F1 (brief 556, ✅ cerrado) sigue mergeado en `main` antes de tocar `student-attendance-tab.component` — este brief construye sobre ese archivo, no lo reemplaza.
- Sin dependencia de F4 (bandeja) — F3 y F4 son hermanas, pueden avanzar en paralelo, pero **sí** comparten `attendance-course.models.ts` (ver hot-path arriba) — si F4 está corriendo en paralelo, coordinar el orden de merge de ese archivo puntual.

## ALCANCE

**Modelos (agregar campo/valor que faltan, confirmados como gap real contra el backend shipped)**
- `src/app/features/intranet/pages/estudiante/models/estudiante.models.ts` — el `MiAsistenciaCursoItemDto` local (líneas ~81-85) le falta `asistenciaCursoId: number` (el backend lo agregó en F2 y hoy no está espejado acá — sin este campo no se puede llamar al endpoint de crear solicitud). Agregar también los tipos para el DTO de solicitud (mirror de `SolicitudJustificacionAsistenciaDto` del backend — ver campos exactos en IMPLEMENTATION DETAIL).
- `src/app/features/intranet/pages/profesor/models/attendance-course.models.ts` — agregar `'J'` a `ESTADOS_ASISTENCIA_CURSO` (hoy `['P','T','F']`), más su entrada en `ESTADO_ASISTENCIA_LABELS` ("Justificado"), `ESTADO_ASISTENCIA_SEVERITIES` y `ESTADO_ASISTENCIA_ICONS`. Es el archivo canónico compartido con profesor — no duplicar el enum en el lado estudiante.

**Servicios (extender, no crear paralelos)**
- `src/app/features/intranet/pages/estudiante/services/estudiante-api.service.ts` — agregar `crearSolicitudJustificacion(formData: FormData)` (`POST /api/justificacion-asistencia`, ruta absoluta — **no** cuelga de `baseUrl` de `EstudianteCurso`, es un controller distinto) y `getMisSolicitudes()` (`GET /api/justificacion-asistencia/mis-solicitudes`).
- Confirmar si `EstudianteFacade` (inyectado como `api` en `student-attendance.component.ts`) y el facade/store usado por el tab de salones (`estudiante-salones.facade`/`.store`, confirmar nombre exacto del archivo — no se confirmó la ruta en esta investigación) necesitan exponer pass-through de los métodos nuevos, siguiendo el mismo patrón que ya usan para `getMiAsistencia`.

**Componente nuevo — diálogo de carga**
- Diálogo standalone (ej. `justificar-inasistencia-dialog.component.ts`, ubicación sugerida junto a `student-attendance-tab` o en un directorio compartido de `pages/estudiante/` si se va a invocar desde ambas vistas). Construir el `FormData` **a mano** (no hay wrapper genérico reusable — ver IMPLEMENTATION DETAIL) con los campos exactos que espera el backend: `AsistenciaCursoId` (del `MiAsistenciaCursoItemDto.asistenciaCursoId` de la fila), `Comentario` (opcional), y el archivo bajo el campo `documento`. Mismo patrón de UI que `health-justification-dialog.component.ts` (`p-fileUpload` modo `basic`, límites de tipo/tamaño del lado cliente como validación temprana — el backend ya valida 10MB / `.pdf/.jpg/.jpeg/.png/.webp`, replicar los mismos límites en el diálogo para no depender solo del error del servidor).

**Vistas — ambas, cambios independientes**
- `student-attendance-tab.component.ts`/`.html` (tab en "Mis Salones") y `student-attendance.component.ts` (standalone, `/intranet/estudiante/asistencia`) — en cada una:
  - Cargar `mis-solicitudes` junto con `mi-asistencia` y cruzar por `asistenciaCursoId` para saber, por fila, si hay una solicitud activa y su estado (el backend **no** expone esto en el DTO de asistencia — confirmado, ver IMPLEMENTATION DETAIL).
  - Fila con `estado === 'F'`, nivel Secundaria, y sin solicitud activa → mostrar acción "Justificar" que abre el diálogo.
  - Fila con solicitud `PENDIENTE` → tag "Pendiente de aprobación", sin acción.
  - Fila con solicitud `RECHAZADA` → tag "Rechazada" (+ motivo visible, ej. tooltip) y acción "Reintentar" (reabre el diálogo).
  - Fila con `estado === 'J'` (backend ya la devuelve así tras aprobar) → tag "Justificado" vía las labels/severities nuevas de `attendance-course.models.ts`.
  - Nivel Inicial/Primaria → sin cambios, sigue el comportamiento de F1 (mensaje `MENSAJE_JUSTIFICACION_GESTIONADA`, ya está bien acotado por nivel en ambos componentes).

## TESTS MÍNIMOS

- Estudiante Secundaria, fila "Faltó" sin solicitud → ve botón "Justificar"; sube adjunto válido → fila pasa a "Pendiente de aprobación", botón desaparece.
- Mismo estudiante intenta subir una segunda solicitud sobre la misma fila mientras la primera sigue pendiente → sin acción disponible (el backend además la rechazaría si se fuerza, pero el FE no debe ni ofrecer la opción).
- Solicitud rechazada (simular vía backend/bandeja) → fila muestra "Rechazada" + puede reintentar; reintento crea una solicitud nueva.
- Solicitud aprobada → fila muestra "Justificado" (estado `'J'` real del backend).
- Estudiante Inicial/Primaria → columna Justificación sin cambios respecto a F1 (regresión).
- Estudiante Secundaria sin ninguna falta → no ve ninguna acción en ninguna fila (criterio de cierre del plan original).
- Adjunto inválido (tipo o tamaño) → error claro antes o al enviar, sin romper el resto de la tabla.
- Verificar en ambas vistas (tab de salón + standalone) por separado — son implementaciones distintas, un fix en una no se propaga a la otra automáticamente.
- Verificar en vivo contra TEST DB, "ver como" un estudiante real de Secundaria.

## REGLAS OBLIGATORIAS

- Standalone components + `OnPush` — todos los componentes tocados ya lo son, mantenerlo.
- `inject()`, signals — seguir el estilo ya usado en ambos componentes (`computed()`, `effect()`, señales privadas + `.asReadonly()` en el standalone).
- `takeUntilDestroyed` en las suscripciones nuevas (patrón ya usado en `student-attendance.component.ts`).
- No introducir un wrapper genérico de upload nuevo — replicar el patrón manual de `FormData` ya usado en `health-justification-dialog.component.ts`, es el precedente real del dominio.
- No duplicar el enum `EstadoAsistenciaCurso` — la fuente canónica es `attendance-course.models.ts` (profesor), el lado estudiante solo re-exporta.

## IMPLEMENTATION DETAIL (ADR-0006)

Contrato real confirmado leyendo el código shipped de F2 (commit `c93a3a2`) — no especulado:

**Controller `JustificacionAsistenciaController`** (`api/justificacion-asistencia`):

| Verbo + ruta | Capability | Entrada |
|---|---|---|
| `POST /api/justificacion-asistencia` | `JUSTIFICACION_ASISTENCIA` | `[FromForm]`: `AsistenciaCursoId` (int, requerido), `Comentario` (string?, máx 500), + `IFormFile documento` (parámetro suelto, nombre de campo `documento` en minúscula) |
| `GET /api/justificacion-asistencia/mis-solicitudes` | `JUSTIFICACION_ASISTENCIA` | sin params — identidad por token |
| `GET /api/justificacion-asistencia/bandeja` | `JUSTIFICACION_ASISTENCIA_APROBAR` | (usada por F4, no por este chat) |
| `POST /api/justificacion-asistencia/{id}/aprobar` | `JUSTIFICACION_ASISTENCIA_APROBAR` | (F4) |
| `POST /api/justificacion-asistencia/{id}/rechazar` | `JUSTIFICACION_ASISTENCIA_APROBAR` | (F4) |

**`SolicitudJustificacionAsistenciaDto`** (mismo shape en `mis-solicitudes` y `bandeja`):
```
id, asistenciaCursoId, horarioId, cursoNombre, salonDescripcion, fecha,
estudianteId, estudianteNombre, estado ("PENDIENTE"|"APROBADA"|"RECHAZADA"),
comentario, documentoUrl, documentoNombre, motivoRechazo,
resueltoPorRol, fechaResolucion, fechaSolicitud
```
(nombres en camelCase del lado FE tras el `JsonSerializer` default — confirmar casing real al integrar, el backend usa PascalCase en C#).

**Gap crítico confirmado — el backend NO cruza asistencia con solicitud**: `GET /api/estudiantecurso/horario/{horarioId}/mi-asistencia` (el que ya usan ambas vistas) devuelve `estado: 'F'` igual para una falta sin justificar, una con solicitud pendiente, y una con solicitud rechazada — la única diferencia visible en ese endpoint es `estado: 'J'` tras aprobar. **Este chat tiene que pedir `mis-solicitudes` por separado y cruzar por `asistenciaCursoId` en el cliente** — no hay atajo de una sola llamada, ya se confirmó que no existe ese campo en el DTO de asistencia.

**`MiAsistenciaCursoItemDto` del backend** (`DTOs/AsistenciaCurso/MiAsistenciaCursoItemDto.cs`) ya tiene `AsistenciaCursoId` desde F2 — el **FE todavía no lo tiene** en su interfaz local (`estudiante.models.ts`), es un gap real a cerrar en este chat, no una suposición.

**Componentes actuales (post-F1, confirmado leyendo el código)**:
- `student-attendance-tab.component.ts` — puramente presentacional, recibe `asistenciaData` por `input()`, no hace HTTP propio. El padre (`estudiante-salones` feature, componente/store/facade — confirmar nombre exacto de archivo al arrancar, no se verificó la ruta exacta en esta investigación) es quien carga los datos vía `this.facade.loadAsistencia(horarioId)`.
- `student-attendance.component.ts` (standalone) — sí hace su propio HTTP vía `EstudianteFacade` (`api.getMiAsistencia(horarioId)`), tiene su propia copia de `getEstadoLabel`/`getEstadoSeverity`/`getJustificacionDisplay` — **es una implementación completamente independiente del tab**, no comparten código más allá de los tipos/labels importados. Confirmar esto explica por qué el plan pide tocar "ambas vistas" como trabajo separado, no una sola vez.
- Ambos ya tienen el gate de nivel de F1 (`MENSAJE_JUSTIFICACION_GESTIONADA` solo para Inicial/Primaria) funcionando correctamente — no tocar esa rama, solo extender el `else` (hoy `'-'`/`—`) para el caso Secundaria.

**Upload**: no hay wrapper genérico de `multipart/form-data` de negocio en el FE (`FileUploadBuilder` es específico de subida directa a blob storage con campos fijos, no aplica). El precedente real es `health-justification-dialog.component.ts` armando `FormData` a mano y emitiéndolo hacia el padre, que lo postea sin headers manuales (el browser setea el boundary).

**Estado de ejecución**: 0% — este chat arranca desde cero.

## APRENDIZAJES TRANSFERIBLES

- El componente standalone y el tab **duplican** la lógica de labels/severity/mensaje de nivel — es deuda preexistente, no algo que haya que resolver en este chat (no hacer un refactor de extracción de componente compartido sin que el usuario lo pida explícitamente — no estaba en el alcance del plan).
- `estudiante.models.ts` define sus propias interfaces `MiAsistenciaCursoItemDto`/`MiAsistenciaCursoResumenDto` en vez de importar las del backend generadas — están desincronizadas del DTO real (le falta `asistenciaCursoId`). Vale la pena, al tocar este archivo, chequear si hay más gaps de sincronización mientras se está ahí, sin convertirlo en un audit completo.
- El servicio `student-attendance-api.service.ts` (con base `ConsultaAsistencia`) es un servicio **distinto y no relacionado** — apunta a la asistencia diaria biométrica, no a la asistencia por curso. No confundirlo ni extenderlo por error.

## FUERA DE ALCANCE

- La bandeja de aprobación (F4) — endpoints `bandeja`/`aprobar`/`rechazar` no se consumen en este chat.
- Refactor para unificar `student-attendance-tab` y `student-attendance.component` en un solo componente compartido.
- Cambios al backend.
- Justificar tardanzas (`T`).

## VALIDACIÓN FINAL

- `ng lint` y `ng build` sin errores.
- Verificación manual en vivo contra TEST DB, "ver como" un estudiante real de Secundaria con al menos una falta: subir justificación, ver estado pendiente, y (si es posible coordinar con alguien que tenga acceso a la bandeja aún no construida) verificar aprobación/rechazo vía Swagger/Postman directo contra el backend para confirmar que el FE lo refleja bien sin depender de F4.
- Confirmar regresión de Inicial/Primaria (F1) intacta.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] `educa-coord/plans/maestro.md` — confirmar que `P101` sigue reflejando el estado real (F1+F2 shipped, F3 shipped).
- [ ] Brief movido `running/` → `closed/`.
- [ ] Commit final único (código + move del brief) en `educa-web`.

## COMMIT MESSAGE sugerido

```
feat(attendance): add student self-service justification upload

Secundaria students can upload a justification for an unjustified
absence from their attendance view, see its pending/approved/rejected
status, and retry after a rejection. Cross-references
"mis-solicitudes" against "mi-asistencia" client-side since the
backend doesn't join them (Plan 101 F3).
```

## CIERRE

Al cerrar, confirmar si F4 (bandeja) ya está en curso o si conviene arrancarla ahora — comparten `attendance-course.models.ts`, avisar si hubo conflicto de merge en ese archivo puntual.

### Resultado de la verificación final (2026-08-15)

- `ng lint` y `ng build` sin errores. 2528/2529 tests (1 timeout preexistente no relacionado).
- Verificación manual en vivo contra TEST DB con par real Secundaria (profesor RAMIREZ BERNARDO JOSE DANIEL, DNI 76357038 — estudiante ALBINES MENDIETA JEREMY, DNI 78080883, salón 1RO SECUNDARIA A, Biología):
  - Falta registrada por el profesor (`F`) → confirmada en TEST DB.
  - Estudiante ve botón "Justificar" y sube adjunto+comentario → `POST /api/justificacion-asistencia` 200 OK, fila pasa a "Pendiente de aprobación" en **ambas vistas** (tab de "Mis Salones" y standalone `/intranet/estudiante/asistencia`).
- **Gap conocido**: no se pudo verificar en vivo el ciclo rechazo→reintentar→aprobación→estado `'J'` porque no existe UI de bandeja (F4 fuera de alcance) y llamar a `/rechazar`/`/aprobar` a mano requería leer el token CSRF (`XSRF-TOKEN`) desde la consola del navegador — bloqueado correctamente por el clasificador de seguridad (mismo criterio que bloquea contraseñas). Ese tramo del flujo queda cubierto solo por los tests unitarios de `estudiante-salones.facade.spec.ts`/`.store.spec.ts` (casos de aprobación/rechazo simulados). Se recomienda re-verificar en vivo cuando F4 (bandeja) esté implementada y dé un camino de UI real para aprobar/rechazar.
