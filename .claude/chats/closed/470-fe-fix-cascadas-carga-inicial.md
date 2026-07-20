# 470 — FE: eliminar cascadas de resolución de curso/roster en carga inicial

> **Repo destino**: `educa-web`
> **Estado**: ✅ CERRADO
> **Creado**: 2026-07-20 · **Modo sugerido**: `/investigate` → `/design` (hay una decisión de contrato FE-BE antes de tocar código) → `/execute`
> **Origen**: `educa-coord` chat 469 (auditoría de tiempo de carga inicial), hallazgos 1, 2 y 4 — commit coord `dbd866d`

## Contexto

El brief 469 (`educa-coord/chats/closed/469-audit-tiempo-carga-inicial.md`) midió tiempo de carga inicial (dev, con reset de SW/IndexedDB, priming de Vite para descartar artefactos de compilación) en 22 rutas × 3 roles. 5 de las 6 rutas que superaron el segundo comparten el mismo patrón: la pantalla necesita el resultado de una llamada previa (curso activo del estudiante, roster del profesor) antes de poder pedir su dato real, y esa segunda llamada arranca recién cuando la primera termina — 300-700ms en serie que serían evitables.

## Hallazgos a resolver

### 1. Estudiante — Mi Asistencia, Foro, Mensajería (1084-1404ms medido)

Las 3 rutas dependen de `GET /api/EstudianteCurso/mis-horarios` para conocer el `horarioId` antes de pedir el dato específico:

- `src/app/features/intranet/pages/estudiante/attendance/student-attendance.component.ts:186-208` — `ngOnInit` espera `getMisHorarios()`, recién en el callback (o el `effect` de líneas 175-183) dispara `loadAsistencia(horarioId)` → `getMiAsistencia(horarioId)` (línea 233) → `GET /api/EstudianteCurso/horario/{id}/mi-asistencia`.
- `src/app/features/intranet/pages/estudiante/foro/estudiante-foro.component.ts:80` — mismo patrón.
- Mensajería: timing de red idéntico a Foro (mismas 2 llamadas encadenadas tras `mis-horarios`); no se abrió el archivo línea por línea en la auditoría, pero es candidato al mismo fix.

En estudiantes con un solo curso (caso típico), el ID es determinable de antemano — la cascada es evitable.

**Fix propuesto (idea)**: evaluar con backend si conviene un endpoint que resuelva el dato por estudiante directamente (sin `horarioId` explícito) cuando hay un solo curso activo, devolviendo todos si hay varios. Alternativa FE-only (más barata, mitiga pero no elimina el caso de entrada directa por URL/bookmark): precargar `mis-horarios` en un resolver/guard compartido a nivel de sección Estudiante, para que ya esté resuelto cuando el usuario navega a cualquiera de estas 3 rutas.

### 2. Profesor — Mis Cursos (1231ms medido)

`ProfesorFacade.loadData()` (`src/app/features/intranet/pages/profesor/services/profesor.facade.ts:53-57`) ya carga `horarios` + `salonTutoria` + `misEstudiantes` en paralelo vía `forkJoin` (correcto). El problema es una segunda tanda de 2 llamadas que arranca recién cuando `misEstudiantes` resuelve y no se identificó su disparador exacto en la auditoría — candidato: el efecto `smartNotif.saveHorarioSnapshot(horarios)` (línea 68) u otro cómputo derivado en el componente de Cursos.

**Fix propuesto (idea)**: instrumentar (Network tab con nombres reales, no ofuscados) para identificar la llamada exacta que dispara la segunda tanda; evaluar si puede sumarse al `forkJoin` inicial en lugar de encadenarse tras `misEstudiantes`.

### 4 (parcial). Profesor — Asistencia (1023ms, borderline)

Mismo patrón que el hallazgo 2 — cascada corta tras la carga paralela inicial de `ProfesorFacade`. Prioridad menor (apenas sobre el umbral, no bloquea el contenido principal).

## Criterio de cierre

- [x] Causa raíz de la segunda tanda de llamadas en Profesor > Mis Cursos identificada con nombre real de endpoint (no ofuscado).
- [x] Decisión de diseño tomada (endpoint nuevo por estudiante vs. precarga FE) para el caso Estudiante, con el usuario.
- [x] Fix implementado para al menos los 2 hallazgos de mayor severidad (Estudiante Asistencia/Foro/Mensajería, Profesor Cursos).
- [x] Re-medición post-fix — ver nota de cierre (verificación funcional; ms absolutos no comparables por caché frío del worktree).
- [x] `educa-coord/chats/closed/469-audit-tiempo-carga-inicial.md` actualizado con nota de que el fix se derivó y shippeó acá (más brief de seguimiento 471 para la parte BE).

## Cierre (2026-07-20)

**Hallazgo 2 (Profesor Mis Cursos) — causa raíz real, distinta de la sospechada por 469**: no era `smartNotif.saveHorarioSnapshot` (no hace HTTP, solo IndexedDB). Confirmado en Network tab real (login profesor, hard reload a `/intranet/profesor/cursos`): `GET /api/sistema/notificaciones/activas` se disparaba **dos veces** tras el `forkJoin`. Causa: `NotificationsService` (`src/app/core/services/notifications/notifications.service.ts`) llama `checkNotifications()` desde dos rutas de init independientes en el constructor — `initialize()` (tras su propio storage load) y un `effect()` sobre `SmartNotificationService.initialized()` (otra carga IndexedDB independiente). Bug app-wide (cualquier rol, cualquier carga en frío), no específico de Cursos — probable contribuyente también al hallazgo 4 (Profesor Asistencia, borderline).

**Fix**: cachear `apiNotifications` en un signal dentro de `NotificationsService`; el `effect()` de `watchSmartInit()` ahora re-fusiona (`applyNotifications`) en vez de re-disparar el HTTP. Verificado: 1 sola llamada a `notificaciones/activas` en vez de 2 (Network tab, reproducido en 2 corridas).

**Hallazgo 1 (Estudiante Asistencia/Foro/Mensajería) — decisión de diseño con el usuario**: se confirmó que la alternativa FE-only (precarga en resolver/guard) **no reduce el escenario que midió el audit 469** (hard reload / entrada directa a la ruta) — el método del audit navega directo a cada ruta, así que un prefetch compartido no llega a tiempo. Solo ayuda en navegación SPA caliente dentro de la sesión (ej. visitar Mi Horario y después Mi Asistencia). Usuario decidió: **FE-only ahora, BE después**.

**Fix FE-only implementado**: cache de sesión (`shareReplay`) sobre `EstudianteApiService.getMisHorarios()` — punto único que usan las 5 páginas de estudiante (antes cada una refetcheaba `mis-horarios` en su propio `ngOnInit`, incluso `StudentSchedulesFacade`/`EstudianteSalonesFacade` que llaman a `EstudianteApiService` directo, no vía `EstudianteFacade`). Verificado: navegar Mi Horario → Mi Asistencia (SPA, sin reload) dispara **1 sola** llamada a `mis-horarios` en vez de 2.

**BE derivado**: `educa-coord/chats/open/471-be-endpoint-mi-asistencia-sin-horarioid.md` — endpoint que resuelva el curso activo del estudiante sin `horarioId` previo, único camino para bajar el tiempo que audit 469 realmente midió.

**Re-medición**: la medición en ms absolutos post-fix se hizo en un dev server aislado (`:4202`) levantado en el worktree de este chat — el caché de build de Angular/Vite (`.angular/cache`) arrancó vacío ahí, dando tiempos de 4-10s no comparables con el baseline del audit (server principal, caché caliente). La validación de los fixes se hizo por **conteo de llamadas de red** (2→1 en ambos casos, confirmado en Network tab), no por ms absolutos. Se recomienda confirmar el número final una vez mergeado a main.

**Validación**: lint ✅ (0 warnings) · build ✅ (client+server bundles, 9 rutas prerenderizadas) · test 2360/2360 ✅ (1 timeout inicial en `eslint-config-guards.spec.ts` confirmado como flake de contención de CPU, no relacionado — pasó aislado en 2105ms).

**Archivos tocados**:
- `src/app/core/services/notifications/notifications.service.ts`
- `src/app/features/intranet/pages/estudiante/services/estudiante-api.service.ts`
