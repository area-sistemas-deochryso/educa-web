# ESLint `max-lines` — Archivos > 300 líneas

> **Estado**: ✅ COMPLETADO (2026-04-11)
> **Origen**: Regla `max-lines` agregada 2026-04-11 (límite 300 líneas, skip blanks + comments)
> **Violaciones iniciales**: 31 archivos (plan original mencionó 32 — uno ya estaba bajo el límite al verificar)
> **Violaciones finales**: 0
> **Escape hatches añadidos**: 0 — todos refactors estructurales reales
> **Prioridad**: Media — acumulaba deuda estructural

---

## Regla

```javascript
'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }]
```

**Excepciones configuradas**: `*.spec.ts` (tests exentos).

---

## Resultado — 31/31 refactorizados

Todos los archivos bajo 300 líneas efectivas. Ningún escape hatch `/* eslint-disable max-lines */` fue necesario. El detalle del proceso vive en [.claude/plan/eslint-unblock-frontend.md](../plan/eslint-unblock-frontend.md) (sección Fase 2).

### Tier 1 — >450 líneas (3 archivos)

| Archivo | Líneas → | Técnica |
|---|---:|---|
| `notifications.config.ts` | 536 → ~140 | Dividido en 3 catálogos: `notifications-festividad.catalog.ts`, `notifications-evento.catalog.ts`, main con re-exports |
| `horarios-import-dialog.component.ts` | 529 → ~200 | Template + styles inline → `.html` + `.scss` externos |
| `campus-3d-view.component.ts` | 502 → ~290 | Template + styles inline → externos + extracción de `createCampus3dSetup` helper |

### Tier 2 — 350-449 líneas (13 archivos)

| Archivo | Técnica |
|---|---|
| `error-reporter.service.ts` | Extracción a `error-reporter-outbox.helper.ts` (IDB) + `error-reporter.helpers.ts` (parsers/classifiers) |
| `attendance-view.service.ts` | Extracción de `setupSignalR`, `isToday`, unificación de `reloadEstudianteIngresos/Salidas` en `reloadEstudianteTable(kind)`, compactación PDF delegates |
| `ctest-k6.constants.ts` | `PRESET_ENDPOINTS` (270 líneas) movido a `ctest-k6.preset-endpoints.ts` |
| `k6-script-builder.utils.ts` | Dividido en `k6-script-sections.internal.ts` + `k6-auth-setup.internal.ts` |
| `campus-scene-builder.service.ts` | `buildStairGroup` → `campus-stair-builder.ts`, `makeLabelSprite` → `campus-label.helper.ts` |
| `curso-contenido.store.ts` | Mutaciones quirúrgicas del dominio extraídas a `curso-contenido.mutations.ts` con patrón `ContenidoMutation` |
| `usuarios.component.ts` | `validarUsuarios` + regex + módulo 11 DNI → `usuarios-validation.helpers.ts` |
| `campus-map.component.ts` | Template + styles inline → externos |
| `horarios.store.ts` | Compactación masiva de setters triviales (14 métodos de 3 líneas → 1 línea) |
| `campus-editor.component.ts` | `NODE_COLORS`, `NODE_TYPE_LABELS`, `clientToSvg`, `svgToScreen` → `campus-editor.helpers.ts` + split de `onMouseMove` via `computeDragDelta` |
| `attendance-director.component.ts` | `TIPO_REPORTE_OPTIONS`, `getTodosSalonesObservable`, `getConsolidadoFileName`, `getInicioSemana` → `consolidated-pdf.helper.ts` + consolidación de `verPdfConsolidado`/`descargarPdfConsolidado` en `runConsolidadoPdf` |
| `campus-admin.facade.ts` | Compactación de UI setters + compactación de `onSuccess: { ... }` multilinea en calls `executeCrud` |
| `estudiante-cursos.facade.ts` | Extracción de `uploadAndRegister` helper privado (consolidó 2 métodos upload de 35 líneas c/u) |

### Tier 3 — 300-349 líneas (15 archivos)

| Archivo | Técnica |
|---|---|
| `notifications.service.ts` | `loadDailyIdSet` + `saveDailyIdSet` → `notifications-persistence.helper.ts` |
| `ctest-k6.store.ts` | `parseDurationToSeconds`, `formatSecondsLabel`, `estimateRequests` → `test-profile.helpers.ts` |
| `permisos-usuarios.facade.ts` | Compactación de setters + remoción de import unused |
| `usuarios-crud.facade.ts` | `buildCrearUsuarioPayload`, `buildActualizarUsuarioPayload` → `usuarios-payload.builder.ts` |
| `base-crud.facade.ts` | Types → `base-crud.facade.types.ts` |
| `profesor-horarios.component.ts` | `HorarioBlock`, `CountdownInfo`, `buildBlocks`, `buildCountdownMap`, `darkenColor`, `getUrgency`, `formatCountdown`, `getNextOccurrence` → `profesor-horarios.helpers.ts` (~130 líneas fuera) |
| `calificar-dialog.component.ts` | `buildNotaRows`, `buildGrupoNotaRows`, `calcIndividualStats`, `calcGrupoStats` → `calificar-dialog.helpers.ts` |
| `calificaciones.facade.ts` | Compactación de UI dialog delegates |
| `campus-admin.store.ts` | Compactación masiva de setters triviales |
| `wal-sync-engine.service.ts` | `sendRequest` + `sendHttp` → `wal-http.helper.ts` con `sendWalEntryRequest(http, entry)` |
| `profesor-attendance-widget.component.ts` | Template + styles inline (~250 líneas) → externos |
| `salon-estudiantes-dialog.component.ts` | Template + styles inline → externos |
| `grupos.facade.ts` | `dropEstudiante` body dividido en `buildDropRequest` + `applyDropOptimistic` + compactación de apply/rollback one-liners |
| `usuarios.store.ts` | Compactación masiva de setters triviales |
| `salones-admin.facade.ts` | `loadDetailSection<T>` helper genérico para 3 métodos `loadXxxSalon` + compactación de UI setters |

---

## Archivos creados (18)

### Helpers puros (funciones extraídas)

- `notifications-persistence.helper.ts`
- `test-profile.helpers.ts`
- `usuarios-payload.builder.ts`
- `profesor-horarios.helpers.ts`
- `calificar-dialog.helpers.ts`
- `wal-http.helper.ts`
- `campus-editor.helpers.ts`
- `consolidated-pdf.helper.ts`
- `curso-contenido.mutations.ts`
- `campus-stair-builder.ts`
- `campus-label.helper.ts`
- `usuarios-validation.helpers.ts`
- `error-reporter-outbox.helper.ts`
- `error-reporter.helpers.ts`
- `campus-3d-setup.helper.ts`

### Types / catalogs

- `base-crud.facade.types.ts`
- `k6-script-sections.internal.ts` + `k6-auth-setup.internal.ts`
- `ctest-k6.preset-endpoints.ts`
- `notifications-festividad.catalog.ts` + `notifications-evento.catalog.ts`

### Templates / styles externos (componentes migrados)

- `profesor-attendance-widget.component.{html,scss}`
- `salon-estudiantes-dialog.component.{html,scss}`
- `campus-map.component.{html,scss}`
- `campus-3d-view.component.{html,scss}`
- `horarios-import-dialog.component.{html,scss}`

---

## Regresiones potenciales a validar manualmente

Los refactors tocaron áreas críticas. Probar antes de mergear:

- **Asistencia cross-role** (4 roles): cambio de mes, descarga PDF consolidado, SignalR en vivo
- **Campus 3D**: escaleras, minimap, navegación entre pisos
- **WAL sync**: CRUD de usuarios/cursos/salones/horarios con rollback en error
- **Upload de archivos estudiante**: semanal + tarea, subir + eliminar
- **k6 tool**: generar scripts estándar y con scenarios
- **Notificaciones estacionales**: festividades/eventos según fecha
- **Validación admin de usuarios**: detección de DNI inválido

---

## Observaciones arquitectónicas (no bloquean, son follow-ups)

1. **`calificaciones.facade.ts`** tiene varios `wal.execute` con `optimistic: { apply: () => {}, rollback: () => {} }` vacíos — pesimismo disfrazado que viola [rules/optimistic-ui.md](../rules/optimistic-ui.md).
2. **`salones-admin.facade.ts`** tiene `eslint-disable wal/no-direct-mutation-subscribe` global justificado en JSDoc. Correcto por ahora pero requiere revisión si se agregan operaciones no-críticas.
3. Múltiples stores/facades tienen muchos re-exports individuales del store — un `readonly vm = this.store.vm` sería más compacto pero cambia la API de los templates.
