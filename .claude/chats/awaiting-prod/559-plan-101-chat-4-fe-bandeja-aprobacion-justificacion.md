> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 101 · **Chat**: 4 · **Fase**: F4 · **Creado**: 2026-08-14 · **Estado**: ⏳ pendiente arrancar.
>
> **exclusive**: `false` · **isolation**: `worktree` · **touches**: `src/app/features/intranet/shared/services/justificacion-asistencia/**` (nuevo), `src/app/features/intranet/pages/admin/justificacion-asistencia/**` o equivalente (nuevo, ver decisión de ubicación abajo), `src/app/features/intranet/intranet.routes.ts`, `src/app/features/intranet/shared/config/intranet-menu.config.ts`, `src/app/shared/types/capability-codes.generated.ts` · **hot-paths**: `intranet.routes.ts` e `intranet-menu.config.ts` (archivos centrales tocados por muchos chats — confirmar diff acotado antes de commitear).

---

# Plan 101 F4 — Frontend: bandeja de aprobación (profesor/administrativo)

## PLAN FILE

[`educa-coord/plans/xrepo-101-justificacion-inasistencia-secundaria.md`](../../../educa-coord/plans/xrepo-101-justificacion-inasistencia-secundaria.md) — sección **F4**.

El plan es intención + decisiones. La sección **IMPLEMENTATION DETAIL** de abajo trae el contrato real del backend (F2) + los patrones/precedentes reales del FE (investigados post-F3) + un set de **decisiones de arquitectura ya tomadas** para este chat (no quedan abiertas al ejecutor, salvo la marcada explícitamente como bloqueante).

## OBJETIVO

Un profesor ve, en una bandeja, las solicitudes pendientes de sus propios horarios; cualquier rol administrativo ve todas las de Secundaria. Ambos pueden aprobar o rechazar (rechazo con motivo obligatorio). El backend ya resuelve el scoping server-side desde un único endpoint — este chat es la UI que lo consume, no lógica de negocio nueva.

## MODO SUGERIDO

Arrancar con `/execute`. Flujo: `/execute` → `/validate` → cierre. Razón: contrato de backend confirmado, precedente de UI (`ticket-bandeja`) confirmado, decisiones de ubicación/estructura ya tomadas en este brief. Si al ejecutar la verificación de `PRE-WORK` (punto sobre `CAP_Ruta`) revela que falta seed en backend, ese sub-paso puntual usa `/ask` antes de bloquear todo el chat — no requiere `/design` aparte.

## PRE-WORK OBLIGATORIO — verificar ANTES de escribir código

1. **Bloqueante potencial**: confirmar que el backend ya tiene seedeado un `CAP_Ruta` para la capability `JUSTIFICACION_ASISTENCIA_APROBAR` (tabla de capabilities/roles). El guard de rutas del FE (`permissionsGuard`) no gatea por código de capability directamente — gatea por **coincidencia exacta del path de la ruta** contra el catálogo `CAP_Ruta → rol` que el backend emite. Sin ese seed, la ruta nueva de este chat no será accesible aunque el usuario tenga la capability. Si falta, es un cambio de datos/seed en `Educa.API` (no código de dominio) — coordinar como sub-tarea de este mismo chat o, si el proyecto lo exige, un brief BE aparte de una línea. Confirmar antes de elegir el path final de la ruta (ver Decisión 1 abajo).
2. Correr `npm run gen:caps` (o el script equivalente) contra un entorno con la capability ya seedeada, para que `JUSTIFICACION_ASISTENCIA_APROBAR` aparezca en `src/app/shared/types/capability-codes.generated.ts`. Si el generador no puede correr contra el entorno disponible, agregar el literal a mano — hay precedente reciente (`ADMIN_RENDIMIENTO` fue agregado así, con comentario explicando por qué).
3. Confirmar contra el código real si `SolicitudJustificacionAsistencia` tiene manejo de concurrencia (RowVersion / conflicto 409) en el backend — determina si aprobar/rechazar necesita manejo de conflicto (dos admins resolviendo la misma solicitud a la vez) o si alcanza con un flujo simple. Ver Decisión 4 abajo.

## ALCANCE

**Capability codes**
- `src/app/shared/types/capability-codes.generated.ts` — agregar `JUSTIFICACION_ASISTENCIA_APROBAR` (regenerado o a mano, ver PRE-WORK #2).

**Servicio HTTP nuevo**
- `src/app/features/intranet/shared/services/justificacion-asistencia/justificacion-asistencia-bandeja-api.service.ts` (propuesto) — `providedIn: 'root'`, base `${environment.apiUrl}/api/justificacion-asistencia`. Métodos: `getBandeja(): Observable<SolicitudJustificacionAsistenciaDto[]>` (`GET .../bandeja`), `aprobar(id: number): Observable<void>` (`POST .../{id}/aprobar`, sin body), `rechazar(id: number, motivo: string): Observable<void>` (`POST .../{id}/rechazar`, body `{ motivo }`). Nombres de método siguiendo la convención de `TicketAdminService` (`getBandeja`/`actualizarEstado`), pero endpoints separados para aprobar/rechazar en vez de un solo cambio de estado genérico, porque el backend los expone así (rechazar requiere motivo, aprobar no).
- Ubicación en `shared/services/` (no en `pages/profesor/` ni `pages/admin/`) — decisión explícita: el servicio lo consumen ambos roles y no hay precedente de un "admin-api.service.ts" genérico bajo el cual encajarlo; `shared/services/attendance/` ya es el precedente de "servicio de asistencia consumido cross-role" en este mismo dominio.

**Modelos**
- Definir (o mover a `shared/`) el tipo `SolicitudJustificacionAsistenciaDto` — hoy vive solo en `pages/estudiante/models/estudiante.models.ts` (shippeado por F3). Este chat lo necesita también del lado profesor/admin. Reusar vía import cruzado (`../../estudiante/models`, mismo patrón que `estudiante.models.ts` ya usa en sentido inverso para importar de `profesor/models`) en vez de duplicar la interfaz — **no** copiar el tipo a un archivo nuevo.
- `attendance-course.models.ts` — **no** requiere cambios, F3 ya agregó `'J'`/labels/severities/icons completos. Confirmar esto contra el código antes de asumir que hace falta tocarlo (evita un diff innecesario en un archivo hot-path).

**Componente nuevo — bandeja**
- `JustificacionAsistenciaBandejaComponent` (nombre y ubicación exacta a definir contra la convención de carpetas del proyecto al ejecutar — candidato: `pages/admin/justificacion-asistencia/` o un directorio cross-role si el proyecto tiene convención para eso). Estructura: standalone, `OnInit`, gate por `userPermisos.hasCapability('JUSTIFICACION_ASISTENCIA_APROBAR')` a nivel componente (**no** por rol) — mismo patrón que `TicketBandejaComponent.canAccess` y `AttendanceComponent.canViewAdminPanel`. Tabla con filtro por estado (Pendiente por default), columna de adjunto (link a `documentoUrl`), acción "Aprobar" (confirm simple) y "Rechazar" (abre diálogo pidiendo `motivo`, mínimo 1 carácter, igual que el backend).
- **Sin branching por rol dentro del componente** — el backend ya resuelve qué ve cada quien desde el mismo endpoint sin parámetros. No replicar el patrón de `AttendanceComponent` (4 subcomponentes por rol) porque ahí la razón de ser es que cada rol ve datos/UI genuinamente distintos; acá es la misma tabla para todos, solo cambia el contenido que devuelve el backend.

**Ruteo y menú**
- `intranet.routes.ts` — una sola ruta nueva (path final depende de PRE-WORK #1), `loadComponent` al componente de bandeja.
- `intranet-menu.config.ts` — **dos** entradas de menú apuntando a la misma ruta (mismo patrón que `AttendanceComponent`, que tiene 4 entradas de `MENU_ITEMS` para una sola ruta): una con `modulo: 'profesor'` + `soloParaRol: ['Profesor']`, otra con `modulo: 'administrador'` + `soloParaRol: ADMIN_ROLES` (constante ya exportada en el mismo archivo). Ambas con `capability: 'JUSTIFICACION_ASISTENCIA_APROBAR'`.

## TESTS MÍNIMOS

- Profesor con horarios de Secundaria y solicitudes pendientes propias → las ve en la bandeja; solicitudes de horarios ajenos no aparecen.
- Rol administrativo (cualquiera de los 5 clusters admin) → ve todas las solicitudes pendientes de Secundaria sin importar el horario.
- Profesor sin la capability (o de un colegio/nivel sin Secundaria) → no ve el ítem de menú ni puede acceder a la ruta directo por URL.
- Aprobar una solicitud → desaparece de "Pendiente" (o pasa a otro filtro si el filtro incluye resueltas), y el estudiante después ve su fila como "Justificado" (verificar cruzando con F3 si es posible en la misma sesión de test).
- Rechazar sin motivo → el diálogo no deja enviar. Rechazar con motivo → la solicitud pasa a Rechazada, el estudiante puede reintentar (F3).
- Dos usuarios (ej. dos admins) intentando resolver la misma solicitud casi al mismo tiempo → al menos no debe romper la UI ni mostrar datos inconsistentes (ver Decisión 4 sobre el nivel de manejo de conflicto).
- Verificar en vivo contra TEST DB, con un profesor real y con un rol administrativo real, no solo con datos mockeados.

## REGLAS OBLIGATORIAS

- Standalone components + `OnPush`.
- Gate de UI por capability (`hasCapability`), no por nombre de rol hardcodeado — igual que el resto del proyecto.
- `max-lines: 300` en services — si el servicio nuevo crece, dividir en sub-servicios como ya hace `ProfesorApiService` con sus 3 sub-services, no sumar todo a un archivo agregador existente.
- No inventar un guard de ruta por capability nuevo — el mecanismo real del proyecto es `permissionsGuard` + coincidencia de path contra `CAP_Ruta`, no un `canActivate` por código.

## IMPLEMENTATION DETAIL (ADR-0006)

Contrato y precedentes confirmados por investigación (no reinvestigar):

**Endpoints backend** (F2, ya shipped):
- `GET /api/justificacion-asistencia/bandeja` — capability `JUSTIFICACION_ASISTENCIA_APROBAR`, sin params, scoping resuelto server-side.
- `POST /api/justificacion-asistencia/{id}/aprobar` — sin body.
- `POST /api/justificacion-asistencia/{id}/rechazar` — body `{ motivo }` (requerido, 1-500 chars).
- DTO de cada fila: `id, asistenciaCursoId, horarioId, cursoNombre, salonDescripcion, fecha, estudianteId, estudianteNombre, estado, comentario, documentoUrl, documentoNombre, motivoRechazo, resueltoPorRol, fechaResolucion, fechaSolicitud`.

**Estado post-F3 confirmado** (no asumir, ya verificado contra el código real):
- `attendance-course.models.ts` ya tiene `'J'` completo (`ESTADOS_ASISTENCIA_CURSO`, labels "Justificado", severity `info`, ícono `pi pi-file-check`) — nada que hacer ahí.
- `SolicitudJustificacionAsistenciaDto` y `EstadoSolicitudJustificacion` (`'PENDIENTE'|'APROBADA'|'RECHAZADA'`) ya existen del lado FE, en `pages/estudiante/models/estudiante.models.ts` (líneas ~101-120) — shippeados por F3 para el autoservicio del estudiante. Reusar desde ahí.

**Precedente de bandeja real** (`ticket-bandeja.component.ts` + `ticket-bandeja.facade.ts` + `ticket-admin.service.ts`, `pages/admin/ayuda-tickets/`):
- Gate por capability a nivel componente (`canAccess` computed), no route guard por código.
- Facade con signals (`tickets`, `loading`, `error`, `filtroEstado`, `updatingId`), acción de cambio de estado con manejo explícito de conflicto 409 (refetch + warning en vez de propagar el error crudo).
- Servicio plano `HttpClient`, `providedIn: 'root'`.
- Layout: filtro `p-select` arriba + `p-table` con acción por fila.
- **Diferencia clave a replicar distinto**: tickets cambia de estado con un `p-select` inline (cualquier estado a cualquier estado); acá "rechazar" necesita un input de texto obligatorio (motivo), así que la acción de rechazo va en un diálogo, no en un select inline. "Aprobar" sí puede ser un botón directo con confirmación simple.

**Precedente de pantalla compartida entre roles** (`AttendanceComponent`, `pages/cross-role/attendance-component/`):
- Una sola ruta (`asistencia`), **4** entradas de `MENU_ITEMS` (una por rol) apuntando a esa misma ruta, cada una con `soloParaRol` para evitar bleed cross-rol, todas compartiendo la misma capability (`ASISTENCIA`).
- Ahí el componente sí branchea por rol internamente (4 subcomponentes) porque cada rol ve una vista genuinamente distinta. **No aplica acá** — la bandeja es una sola tabla para todos, el backend ya hizo el trabajo de scoping. Replicar solo el patrón de "múltiples entradas de menú → misma ruta", no el branching interno.

**Mecanismo real de gate de rutas** (`permissionsGuard`, `core/guards/permissions/permisos.guard.ts`): registrado una sola vez como `canActivateChild` en el árbol de `IntranetLayoutComponent`. Compara el **path completo de la ruta** contra el catálogo `CAP_Ruta` que el backend emite para el usuario — **no** hay un guard por código de capability en el árbol de rutas del FE. Esto es lo que hace bloqueante el PRE-WORK #1: si el backend no tiene seedeado un `CAP_Ruta` para `JUSTIFICACION_ASISTENCIA_APROBAR`, la ruta nueva no será alcanzable sin importar cómo se escriba el FE.

**Servicio existente del dominio de asistencia por curso, lado profesor** (`ProfesorAsistenciaApiService`, `pages/profesor/services/`): base `/api/AsistenciaCurso` (distinto controller/URL root del nuestro, `/api/justificacion-asistencia`) — por eso este chat no suma métodos ahí, crea un servicio nuevo en `shared/services/`.

**Gap de catálogo de capabilities confirmado**: `capability-codes.generated.ts` todavía no tiene `JUSTIFICACION_ASISTENCIA_APROBAR` — sin agregarlo, `hasCapability('JUSTIFICACION_ASISTENCIA_APROBAR')` no tipa contra `MenuItemDef.capability: CapabilityCode`.

**Estado de ejecución**: 0% — este chat arranca desde cero.

## Decisiones de arquitectura ya tomadas (no reabrir al ejecutar)

| # | Decisión | Elección | Por qué |
|---|---|---|---|
| 1 | Ruteo | Una sola ruta nueva, dos entradas de menú (Profesor + cluster administrativo) apuntando a la misma | Patrón `AttendanceComponent`; el backend ya scopea, no hace falta ruta por rol. |
| 2 | Branching por rol dentro del componente | Ninguno — un solo componente, un solo template | El backend resuelve "qué ve cada quien"; replicar el branching de `AttendanceComponent` sería complejidad sin necesidad, esa pantalla la tiene porque ahí sí hay vistas genuinamente distintas por rol. |
| 3 | Ubicación del servicio HTTP | `shared/services/justificacion-asistencia/`, servicio nuevo, no sumar a `ProfesorAsistenciaApiService` | URL root distinto al de asistencia por curso; lo consumen dos roles, no hay "admin-api.service.ts" genérico bajo el cual encajarlo. |
| 4 | Manejo de conflicto (dos aprobadores concurrentes) | Mínimo viable: si el backend devuelve 404/409 al aprobar/rechazar algo ya resuelto, refetch de la bandeja + mensaje claro (no reventar la UI). **No** portar el `WalFacadeHelper` completo de tickets salvo que la verificación de PRE-WORK #3 confirme que el backend tiene concurrencia real (RowVersion) que lo justifique | Evita sobre-construir; el patrón de tickets resuelve un problema que puede no aplicar acá con la misma severidad — confirmar antes de copiar la maquinaria completa. |

## APRENDIZAJES TRANSFERIBLES

- El tipo `SolicitudJustificacionAsistenciaDto` quedó bajo `pages/estudiante/models/` porque F3 lo necesitaba ahí primero — no es un error de F3, pero si en algún momento un tercer consumidor lo necesita, vale la pena promoverlo a una ubicación compartida real en vez de seguir sumando imports cruzados entre features hermanas.
- El mecanismo de gate de rutas del proyecto es más indirecto de lo que parece a primera vista (path-matching contra un catálogo backend, no un guard por código) — cualquier ruta nueva en este proyecto tiene esta misma dependencia oculta de seed backend, vale la pena que quede como aprendizaje general, no solo de este chat.

## FUERA DE ALCANCE

- Cambios al backend (salvo, si hiciera falta, el seed de `CAP_Ruta` detectado en PRE-WORK #1 — y aun así, coordinarlo como el mínimo cambio de datos necesario, no reabrir diseño de backend).
- Notificación en tiempo real de nuevas solicitudes en la bandeja (ya fuera de alcance del plan completo, no solo de este chat).
- Cualquier cambio a la vista de estudiante (F3, ya cerrada).
- Promover `SolicitudJustificacionAsistenciaDto` a una ubicación compartida — se resuelve con import cruzado por ahora.

## VALIDACIÓN FINAL

- `ng lint` y `ng build` sin errores.
- Verificación manual en vivo contra TEST DB: "ver como" un profesor con solicitudes propias pendientes, y por separado un rol administrativo, confirmando que cada uno ve el alcance correcto. Aprobar una y confirmar (si se puede coordinar con una sesión de F3 o directo contra el endpoint de estudiante) que se refleja como "Justificado".

## CRITERIOS DE CIERRE

- [x] `ng lint` sin errores.
- [x] `ng build` (SSR) sin errores.
- [x] `npm test` — 2529/2529 (1 falla flaky en `eslint-config-guards.spec.ts`, no relacionada, confirmada re-corriendo aislada).
- [ ] Verificación manual en vivo contra TEST DB — **bloqueada** hasta que corra el seed `CAP_Ruta` (`Educa.API` chat 560, en `open/`, aún no ejecutado — decisión del usuario: brief BE aparte).
- [ ] `educa-coord/plans/maestro.md` — marcar `P101` como completo (F1-F4 shipped) — diferido hasta que la verificación en vivo pase.
- [ ] `educa-coord/plans/xrepo-101-justificacion-inasistencia-secundaria.md` — actualizar el header de Estado a completo — diferido, mismo motivo.
- [x] Brief movido `running/` → `awaiting-prod/` (no `closed/` — validación final pendiente).
- [x] Commit del código FE en `educa-web` (branch `chat/559-...`, dentro del worktree). El seed de `Educa.API` es un commit separado, a cargo del chat 560.

> **Validación prod**: ⏳ pendiente desde 2026-08-17 — depende de (1) `Educa.API` chat 560 corriendo el seed `CAP_Ruta`, (2) verificación manual "ver como" profesor + rol admin contra TEST DB.

## COMMIT MESSAGE sugerido

```
feat(attendance): add approval inbox for justification requests

Single shared route/component for teachers (own schedules only) and
administrative roles (all Secundaria requests) to approve or reject
student-submitted absence justifications, backed by the existing
GET/POST /api/justificacion-asistencia endpoints (Plan 101 F4, closes
the plan).
```

## CIERRE

Al cerrar, este es el último brief del Plan 101 (F1-F4 completos) — confirmar con el usuario si corresponde push/deploy coordinado de `educa-web` y `Educa.API`, dado que el plan completo cruza ambos repos.
