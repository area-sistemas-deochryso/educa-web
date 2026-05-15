# Drift Check Report

**Fecha snapshot**: 2026-04-16
**Última auditoría**: 2026-05-15 (Plan 46 F2.b + F3 — chat 157)
**Scope**: ambos (educa-web + Educa.API)
**Autor**: Claude (automated)

> **🗄️ Archivado 2026-05-15**: Plan 46 cerrado al 100%. Este reporte queda como histórico — re-generar con `/drift-check` si se necesita auditoría fresca.

## Estado de auditoría (2026-05-15, Plan 46 F2.b + F3 — chat 157)

| Sección | Estado | Nota |
|---------|--------|------|
| C1.1 @-refs en CLAUDE.md | ✅ PASS | Re-verificado: 0 refs missing. CLAUDE.md fue re-estructurado en bloque always-on/on-demand pero las refs siguen válidas. |
| C1.2 18 links rotos en maestro.md | ❌ DRIFT activo | Re-verificado: hay drift real. Confirmados rotos: `../../Educa.API/.claude/plan/asistencia-correos-endurecimiento.md`, anclas `#plan-NN` a `../history/planes-cerrados.md` (varias). Algunos falsos positivos en el reporte original (backticks atrapados por regex). Cleanup pendiente. |
| C1.3 `@data/repositories` en architecture.md | ✅ resuelto | Plan 46 F1 (hoy). Eliminado de `rules/architecture.md` y `project-structure/architecture.md`. |
| C1.4 Links en MEMORY.md | ✅ PASS confirmado (F2.b) | 31 links a `.md` en `~/.claude/projects/.../memory/MEMORY.md`, todos los archivos existen. |
| C2.1 Feature flags sync envs | ✅ PASS confirmado (F2.b) | Las 19 keys (creció de 11) están idénticas en `environment.ts` y `environment.development.ts`. Sigue sincronizado. |
| C2.2 `feedbackReport` no documentada | ✅ resuelto parcial | `feedbackReport` ahora aparece 2× en `feature-flags.md`. `quickAccess/notifications/voiceRecognition` siguen siendo flags de template (no rutas) — no es drift real, es taxonomía. |
| C2.3 Module registry | ✅ PASS confirmado (F2.b) | Los 5 módulos (`inicio`, `academico`, `seguimiento`, `comunicacion`, `sistema`) en `module-registry.ts` coinciden con `menu-modules.md`. |
| C2.5 Aliases tsconfig | ✅ resuelto | El alias `@data/*` está bien (apunta a folder existente); el problema era doc, no config. |
| C3.1 core/services/ vs architecture.md | ✅ resuelto | Plan 46 F2 (hoy). Renombrado en `architecture.md`: `asistencia/`→`attendance/`, `permisos/`→`permissions/`. Agregadas filas faltantes: `capacitor/`, `feedback/`. También fix path: `reportes-asistencia/`→`attendance-reports/`. |
| C3.2 Features sin doc | ✅ PASS informativo (F2.b) | 99 dirs de feature page detectados (creció de 48). Cobertura por mención en `.claude/` se mantiene aceptable; sin ausencias estructurales obvias. |
| C3.3 INV-ET02 sin definición | ✅ resuelto | Documentado en `business-rules.md` §15.12. |
| C3.4 Controllers BE sin api-endpoints.md | ✅ resuelto | Ya marcado corregido. |
| C4.1 `INV-*` fantasma | ✅ PASS informativo (F2.b) | 93 `INV-*` documentados en `educa-coord/invariants/` (15 archivos) vs 34 referenciados en código FE. Diferencia esperada: muchos `INV-*` son convenciones de dominio/BE o se verifican por code review, no por runtime FE. |
| C4.2 Tipos semánticos | ✅ PASS confirmado (F2.b) | Los 13 tipos listados en `semantic-types.md` (`AppUserRoleValue`, `AprobacionEstado`, `AttendanceStatus`, `DiaSemana`, `EstadoAsistenciaCurso`, `HorarioVistaType`, `NivelEducativo`, `NotificacionPrioridad`, `NotificacionTipo`, `PeriodoCierreEstado`, `TipoCalificacion`, `TipoEntradaCalendario`, `TipoEventoCalendario`) tienen su definición `export type/const` en el código. |
| C4.3 `@data/repositories` alias fantasma | ✅ resuelto | Limpiado en F1. |
| C5.1 Separadores `=====` | ✅ PASS confirmado | Re-grep: 0 matches de `// ====` en `src/app/**/*.ts`. |
| C5.2 `[(visible)]` two-way | ✅ resuelto | Único matches restantes son comentarios JSDoc en `course-details-modal.component.ts:69` y `attachments-modal.component.ts:30`. Ningún binding activo en `.html`. |
| C5.3 `appendTo="body"` faltante | ⚠️ drift parcial | Re-grep: solo **7 archivos** con `<p-select` sin `appendTo` (de 30+ reportados). Mayor reducción. Deuda menor pendiente. |
| C5.4 Overlays en `@if` | ✅ PASS confirmado | Re-grep: 0 matches de `p-dialog/p-drawer/p-confirmDialog` dentro de `@if`. |
| C5.5 Archivos BE > 300 líneas | ❌ DRIFT activo | Re-conteo: 10 archivos siguen >300 ln. Top: `ConsultaAsistenciaController.cs` (912!!), `ConsultaAsistenciaRepository.cs` (771), `UsuariosRepository.cs` (473), `AsistenciaService.cs` (456). Algunos del reporte original (`HorarioRepository`, `CampusController`) bajaron del umbral, pero hay nuevos arriba (`ServiceExtensions.cs` 390, `EmailMonitoreoService.cs` 415). El drift no se redujo. |
| C5.6 `DateTime.Now` en BoletaNotasPdfService | ✅ resuelto | Grep en archivo actual: 0 matches de `DateTime.Now`. |
| C5.7 `IEmailService` directo en PasswordRecoveryService | ✅ resuelto efectivo | Re-grep: `_emailService` está inyectado en línea 27 pero **no se usa en ninguna llamada del archivo** — el flujo ya migró completamente a `_outboxService.EnqueueAsync` (línea 295). Pendiente: limpiar la inyección muerta. Deuda menor cosmética. |
| C5.8 String interpolation en logger BE | ✅ resuelto | Re-grep `LogError(ex, $"` / `LogWarning(ex, $"` / `LogInformation($"` en todo `Educa.API/`: 0 matches. Los 4 reportados fueron migrados. |
| C5.9 AsNoTracking ratio | ⚪ N/A FE (F2.b) | BE puro — vive en repo `Educa.API/`. No re-verificable desde chat FE. Pasa a deuda BE (Plan 45 si se quiere ampliar). |
| C5.10 Filtro `_Estado` soft-delete | ⚪ N/A FE (F2.b) | BE puro — vive en repo `Educa.API/`. Misma nota que C5.9. |
| C6.1 Endpoints FE vs Controllers BE | ✅ PASS smoke (F2.b) | 182 endpoints únicos llamados desde FE (`/api/*`). Verificación full cross-repo fuera de scope; smoke en deploy + tests integration capturan dead controllers. Marcado deuda permanente: re-correr al cambiar contratos BE. |
| C6.2 api-endpoints.md vs controllers reales | ✅ resuelto | Ya marcado corregido. |

### Decisión de archivado (actualizada 2026-05-15)

Resultado de la auditoría completa F2 + F2.b (2026-05-15):

| Estado | Count | % |
|--------|------:|---|
| ✅ resuelto / PASS confirmado | 22 | 79% |
| ⚪ N/A FE (BE puro, no auditable desde este repo) | 2 (C5.9, C5.10) | 7% |
| ❌ DRIFT activo confirmado | 2 (C1.2 maestro links → Plan 47; C5.5 archivos BE >300 ln → Plan 45 BE) | 7% |
| ⚠️ drift parcial | 1 (C5.3 appendTo → Plan 48) | 4% |
| ⏳ no re-verificado | 0 | 0% |

**Archivar ✅**: 79% ✅ + 7% N/A = 86% cerrado contra este repo. Los 2 drifts activos y el parcial tienen plan dueño asignado (47 maestro links, 48 appendTo, 45 BE drift). El reporte ya no es checklist accionable — los items vivos están en sus planes.

**Acciones (asignadas a planes con dueño)**:
1. **Plan 47** — limpiar links rotos en `maestro.md` (✅ shipped, brief 158 closed).
2. **Plan 48** — barrido `appendTo="body"` (✅ shipped, brief 159 closed).
3. **Plan 45 BE** — drift cleanup BE incl. archivos >300 ln + `IEmailService` inyectado huérfano.
4. **F3 dialogs-sync.md** — ✅ verificado 2026-05-15: el archivo solo menciona `[(visible)]` como anti-patrón en prosa (líneas 25, 126). Ningún ejemplo lo presenta como bueno. **No requiere cambio**.

**Recomendación a futuro**: regenerar con `/drift-check` en lugar de mantenerlo manualmente. Este reporte queda como histórico.

---

## Resumen

| Categoría | Checks | Pasaron | Drift | Críticos | Moderados | Info |
|-----------|--------|---------|-------|----------|-----------|------|
| C1 Refs   | 5      | 3       | 2     | 0        | 2         | 0    |
| C2 Config | 4      | 2       | 2     | 1        | 1         | 0    |
| C3 Docs   | 4      | 2       | 2     | 0        | 2         | 0    |
| C4 Fantasma | 3    | 2       | 1     | 0        | 1         | 0    |
| C5 Conv   | 10     | 5       | 5     | 2        | 3         | 0    |
| C6 Cross  | 2      | 1       | 1     | 0        | 1         | 0    |
| **Total** | **28** | **15**  | **13**| **3**    | **10**    | **0**|

---

## Detalle

### C1 — Integridad de Referencias

#### C1.1 @-refs en CLAUDE.md — PASS
> Severidad: crítico

Todas las 45 @-refs verificadas. Cada archivo referenciado existe en disco.

#### C1.2 Links en maestro.md — DRIFT
> Severidad: moderado

**18 links rotos** en `.claude/plan/maestro.md`:

| Link roto | Tipo |
|-----------|------|
| `../tasks/enforcement-reglas.md` (x2) | Task inexistente |
| `../../../Educa.API/.claude/plan/arquitectura-backend-opciones.md` | Plan BE inexistente |
| `../../../Educa.API/.claude/plan/domain-layer.md` | Plan BE inexistente |
| `consolidacion-backend.md` | Plan inexistente |
| `consolidacion-frontend.md` | Plan inexistente |
| `../../../Educa.API/.claude/plan/asignacion-profesor-salon-curso.md` | Plan BE inexistente |
| `../../../Educa.API/.claude/plan/error-trace-backend.md` | Plan BE inexistente |
| `../tasks/design-patterns-backend.md` | Task inexistente |
| `../tasks/design-patterns-frontend.md` | Task inexistente |
| `flujos-alternos.md` | Plan inexistente |
| `eslint-config-refactor.md` | Plan inexistente |
| `test-backend-gaps.md` | Plan inexistente |
| `test-frontend-gaps.md` | Plan inexistente |
| `contratos-fe-be.md` | Plan inexistente |
| `release-operations.md` | Plan inexistente |
| `security-audit.md` | Plan inexistente |
| `../tasks/wal-cache-audit-fixes.md` | Task inexistente |
| `../tasks/wal-sync-engine-split.md` | Task inexistente |

**Causa probable**: Planes y tasks referenciados en maestro.md que nunca se crearon o se eliminaron.

#### C1.3 Carpetas en architecture.md — DRIFT
> Severidad: moderado

- `src/app/data/repositories/` — **NO EXISTE**. Documentado en architecture.md como parte de la capa de datos. El propio documento ya menciona que no tiene consumidores activos, pero la carpeta fue eliminada del disco sin actualizar la documentación.

#### C1.4 Links en MEMORY.md — PASS
> Severidad: moderado

Todos los links a archivos `.md` en MEMORY.md son válidos.

#### C1.5 Paths en planes — N/A
> Cubierto por C1.2.

---

### C2 — Sincronización de Configuración

#### C2.1 Feature flags: environment.ts vs environment.development.ts — PASS
> Severidad: crítico

Ambos archivos tienen las mismas 11 keys: `horarios`, `calendario`, `quickAccess`, `notifications`, `voiceRecognition`, `profesor`, `estudiante`, `ctestK6`, `videoconferencias`, `campusNavigation`, `feedbackReport`. Sincronizados correctamente.

#### C2.2 Feature flags vs rutas — DRIFT
> Severidad: crítico

Flags declaradas en `environment.features` pero **NO referenciadas en rutas/menú**:

| Flag | En environment | En rutas |
|------|---------------|----------|
| `quickAccess` | ✅ | ❌ (solo en template home, no en routes) |
| `notifications` | ✅ | ❌ (solo en layout, no en routes) |
| `voiceRecognition` | ✅ | ❌ (solo en layout, no en routes) |
| `feedbackReport` | ✅ | ❌ (no referenciada en intranet.routes.ts) |

**Nota**: `quickAccess`, `notifications`, `voiceRecognition` y `feedbackReport` controlan componentes en templates, no rutas. La documentación en `feature-flags.md` no menciona `feedbackReport` — es una flag nueva no documentada.

#### C2.3 Module registry vs menu-modules.md — PASS
> Severidad: informativo

Los 5 módulos (`inicio`, `academico`, `seguimiento`, `comunicacion`, `sistema`) coinciden entre `module-registry.ts` y `menu-modules.md`.

#### C2.5 Aliases tsconfig vs targets — PASS
> Severidad: informativo

Todos los aliases (`@app`, `@core`, `@shared`, `@features`, `@config`, `@env`, `@data`, `@test`, `@intranet-shared`) apuntan a carpetas existentes.

---

### C3 — Cobertura de Documentación

#### C3.1 Carpetas core/services/ sin mención en architecture.md — DRIFT
> Severidad: moderado

Carpetas existentes en `core/services/` pero **no listadas** en la tabla de architecture.md:

| Carpeta | Existe en disco | En architecture.md |
|---------|----------------|--------------------|
| `attendance/` | ✅ | ❌ |
| `capacitor/` | ✅ | ❌ (mencionada en capacitor.md pero no en la tabla de services) |
| `feedback/` | ✅ | ❌ |
| `permissions/` | ✅ | ❌ (architecture.md dice `permisos/`, disco dice `permissions/`) |

**Nota**: architecture.md lista `permisos/` pero la carpeta real es `permissions/` (renombrada a inglés según code-language.md). También lista `asistencia/` pero la carpeta real es `attendance/`.

#### C3.2 Features sin documentación — PASS
> Severidad: informativo

Las 48 feature pages detectadas tienen al menos mención en algún documento de `.claude/`.

#### C3.3 INV-* en código sin business-rules.md — DRIFT
> Severidad: moderado

INV-IDs encontrados en código pero **no definidos** en `business-rules.md`:

| INV-ID | Archivo | Nota |
|--------|---------|------|
| `INV-ET02` | `ErrorLogController.cs`, `ReportesUsuarioController.cs` | No existe sección 15.x para INV-ET* |

Todos los demás INV-* referenciados en código (INV-C01..C08, INV-S03, INV-S04, INV-T01..T04, INV-U01..U06, INV-V01..V03, INV-AD01..AD05, INV-AS01..AS02, INV-M01, INV-RU03..RU04) están documentados.

#### C3.4 Controllers BE sin api-endpoints.md — PASS (parcial)
> Severidad: moderado

42 controllers detectados. `api-endpoints.md` documenta ~70 endpoints. Nuevos controllers no documentados:

| Controller | En api-endpoints.md |
|-----------|---------------------|
| `PermisoSaludController.cs` | ❌ |
| `ClientErrorsController.cs` | ❌ |
| `EmailOutboxController.cs` | ❌ |
| `ErrorLogController.cs` | ❌ |
| `ReportesUsuarioController.cs` | ❌ |
| `BoletaNotasController.cs` | ❌ |
| `GrupoContenidoController.cs` | ❌ |
| `ProfesorCursoController.cs` | ❌ |
| `EstudianteCursoController.cs` | ❌ |
| `ConfiguracionCalificacionController.cs` | ❌ (parcial, solo GET/PUT documentados) |

---

### C4 — Documentación Fantasma

#### C4.1 INV-* documentados pero no en código — PASS (informativo)
> Severidad: informativo

La mayoría de INV-* documentados tienen al menos una referencia en código (frontend tests o backend Domain layer). Algunos INV-* de sección 12 (INV-D01..D09) son convenciones verificadas por code review, no por código runtime — aceptable.

#### C4.2 Tipos semánticos documentados vs definidos — PASS
> Severidad: informativo

Todos los tipos listados en `semantic-types.md` existen en el código fuente.

#### C4.3 Aliases tsconfig fantasma + data/repositories — DRIFT
> Severidad: moderado

- `@data/repositories` alias apunta a `src/app/data/repositories/` que **NO EXISTE** en disco. Imports usando `@data/repositories` fallarían en compilación.
- architecture.md documenta `@data/repositories/` con `BaseRepository`, `UserRepository`, `NotificationRepository` — código eliminado.

---

### C5 — Convenciones No-ESLint

#### C5.1 Separadores `=====` — PASS
> Severidad: informativo

No se encontraron separadores `// =====` en el código TypeScript. Migración a `// #region` completada.

#### C5.2 `[(visible)]` two-way binding — DRIFT
> Severidad: crítico

**3 violaciones** en `course-details-modal.component.html:98-102`:

```
[(visible)]="showAttachmentsModal"   — app-attachments-modal
[(visible)]="showTasksModal"         — app-tasks-modal
[(visible)]="showSubmissionsModal"   — app-submissions-modal
```

Regla: Separar `[visible]` y `(visibleChange)` para sincronización correcta con store.

#### C5.3 appendTo faltante en dropdowns — DRIFT
> Severidad: moderado

**30+ instancias** de `<p-select>` sin `appendTo="body"`. Afecta principalmente:

- `attendance-day-list`, `attendance-filter`, `attendance-table`
- `attendances.component` (admin)
- `campus.component` y sub-dialogs
- `classrooms/` sub-componentes
- `cursos.component`
- `email-outbox-filters`
- `error-logs.component`
- `eventos-calendario.component`
- `feedback-reports.component`

#### C5.4 Overlays dentro de @if — PASS
> Severidad: crítico

No se encontraron overlays PrimeNG (`p-dialog`, `p-drawer`, etc.) dentro de bloques `@if`.

#### C5.5 Archivos BE > 300 líneas — DRIFT
> Severidad: moderado

**15+ archivos** superan el límite de 300 líneas (excluyendo Migrations y DbContext):

| Archivo | Líneas |
|---------|--------|
| `UsuariosRepository.cs` | 460 |
| `ReporteFiltradoAsistenciaService.cs` | 441 |
| `ConsultaAsistenciaRepository.cs` | 427 |
| `ReporteFiltradoPdfService.cs` | 425 |
| `CampusRepository.cs` | 421 |
| `CampusService.cs` | 416 |
| `ConsultaAsistenciaController.cs` | 400 |
| `ReporteAsistenciaDataService.cs` | 396 |
| `HorarioService.cs` | 395 |
| `ReporteAsistenciaConsolidadoPdfService.cs` | 389 |
| `HorarioRepository.cs` | 386 |
| `BoletaNotasPdfService.cs` | 381 |
| `AprobacionEstudianteService.cs` | 381 |

#### C5.6 DateTime.Now en BE — DRIFT
> Severidad: crítico

**1 violación** en `BoletaNotasPdfService.cs:283`:
```csharp
text.Span(DateTime.Now.ToString("dd/MM/yyyy HH:mm"))
```
Debe usar `DateTimeHelper.PeruNow()`.

**1 caso justificado** en `HangfireExtensions.cs:46` — usa `TimeZoneInfo.Local` con comentario explícito.

#### C5.7 IEmailService directo en BE — DRIFT
> Severidad: moderado

`PasswordRecoveryService.cs` inyecta `IEmailService` directamente (líneas 27, 45). Según regla, debería usar `IEmailOutboxService.EnqueueAsync()` para trazabilidad y retry.

**Nota**: `EmailNotificationService.cs` también inyecta `IEmailService` pero es un wrapper legítimo que encapsula el envío — no es violación.

#### C5.8 String interpolation en logger BE — DRIFT
> Severidad: moderado

**4 violaciones** de structured logging en `CrossChexApiService.cs` y `NotificacionFaltasService.cs`:

```
LogWarning(ex, $"Error inesperado obteniendo token (intento {attempt}...")
LogError(ex, $"Error obteniendo token CrossChex después de {maxRetries}...")
LogError(ex, $"Error obteniendo registros del {date:yyyy-MM-dd}")
LogError(ex, $"Error enviando notificación a {telefono}")
```

Deben usar placeholders: `LogError(ex, "Error obteniendo registros del {Date}", date)`.

#### C5.9 AsNoTracking en repositories — PASS (informativo)
> Severidad: informativo

136 usos de `AsNoTracking()` en ~200 métodos de lectura. Ratio razonable (~68%).

#### C5.10 Filtro _Estado en tablas de relación — N/A
> Severidad: crítico

Revisión superficial no reveló violaciones obvias nuevas. La mayoría de queries sobre ProfesorSalon/EstudianteSalon/CursoGrado están en repositories con filtros apropiados. Requiere revisión manual más profunda para confirmación.

---

### C6 — Sincronización Cross-Repo

#### C6.1 Endpoints FE vs Controllers BE — PASS
> Severidad: moderado

Los endpoints principales usados en el frontend tienen controllers correspondientes en el backend.

#### C6.2 api-endpoints.md vs controllers reales — DRIFT
> Severidad: moderado

`api-endpoints.md` documenta ~70 endpoints. El backend tiene 42 controllers con ~296 acciones HTTP. Hay **un gap significativo** de endpoints no documentados:

- Controllers nuevos sin documentar: `PermisoSalud`, `ClientErrors`, `EmailOutbox`, `ErrorLog`, `ReportesUsuario`, `BoletaNotas`, `GrupoContenido`, `ProfesorCurso`, `EstudianteCurso`
- Acciones HTTP individuales: muchas más que las 70 documentadas (~4x)

---

## Acciones Sugeridas

### Críticos (3)

1. **[C5.2] Corregir `[(visible)]` en course-details-modal** — 3 modales usan two-way binding que puede causar desincronización de estado. Separar en `[visible]` + `(visibleChange)`.

2. **[C5.6] Reemplazar `DateTime.Now` en BoletaNotasPdfService.cs:283** — Usar `DateTimeHelper.PeruNow()` para consistencia de zona horaria.

3. **[C2.2] Documentar flag `feedbackReport`** — Flag nueva en environments no reflejada en `feature-flags.md`.

### Moderados (10)

4. **[C1.2] Limpiar links rotos en maestro.md** — 18 links a planes/tasks inexistentes. Crear los archivos o eliminar las referencias.

5. **[C1.3 + C4.3] Eliminar `data/repositories/` de architecture.md y tsconfig** — Carpeta eliminada del disco. Alias `@data/repositories` debería removerse de tsconfig.json.

6. **[C3.1] Actualizar tabla core/services/ en architecture.md** — Renombres a inglés (`permisos/` → `permissions/`, `asistencia/` → `attendance/`) y carpetas nuevas (`feedback/`, `capacitor/`).

7. **[C3.3] Documentar INV-ET02** — Usado en código pero sin definición en business-rules.md.

8. **[C5.3] Agregar `appendTo="body"` a 30+ p-select** — Afecta múltiples componentes de admin y attendance.

9. **[C5.5] Refactorizar 15 archivos BE > 300 líneas** — Especialmente `UsuariosRepository` (460), `ConsultaAsistenciaRepository` (427), `CampusRepository` (421).

10. **[C5.7] Migrar PasswordRecoveryService a IEmailOutboxService** — Envío directo sin retry ni trazabilidad.

11. **[C5.8] Corregir structured logging en CrossChexApiService y NotificacionFaltasService** — 4 interpolaciones de string en logger.

12. ~~**[C6.2] Actualizar api-endpoints.md**~~ — ✅ Corregido: 9 controllers documentados con ~40 endpoints nuevos.

13. ~~**[C3.3] Documentar INV-ET02**~~ — ✅ Corregido: INV-ET01/ET02 definidos en business-rules.md § 15.12.
