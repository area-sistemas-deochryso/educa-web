# WAL + Cache — Hallazgos de Auditoría

> **Fecha**: 2026-04-16
> **Origen**: Code review + auditoría contra reglas del proyecto
> **Archivos auditados**: 17 (WAL) + 9 (Cache) = 26 archivos, ~4,200 líneas

---

## Hallazgos

### H1 — Bug: Interceptor no invalida endpoints PascalCase (CRÍTICO) ✅ Resuelto 2026-05-04

**Archivo**: `src/app/core/interceptors/sw-cache-invalidation/sw-cache-invalidation.interceptor.ts:77`

**Problema**: `extractResourcePattern()` hace `break` cuando un segmento empieza con mayúscula. Controllers PascalCase (`ConsultaAsistencia`, `CursoContenido`, `AsistenciaCurso`, `Calificacion`, `GrupoContenido`) producen `resourceSegments = ['api']` → `return null` → no se invalida caché.

**Impacto**: Después de POST/PUT/DELETE a estos endpoints, el siguiente GET sirve datos stale del SW cache. El WAL compensa parcialmente vía `WAL_CACHE_MAP`, pero mutaciones sin WAL (server-confirmed, directas) no se invalidan.

**Fix aplicado**: regla posicional en el loop. PascalCase en `i === 1` (justo después de `api`) se trata como nombre de controller → empuja y corta (pattern `/api/<Controller>`). PascalCase en `i > 1` sigue siendo discriminador → corta sin empujar (pattern queda `/api/<...>/<...>`). Cubre los 5 controllers PascalCase del proyecto sin romper los discriminadores `Estudiante`/`Profesor` en `/api/sistema/usuarios/...`.

---

### H2 — Bug menor: Region duplicado en facade helper ✅ Resuelto 2026-05-07

**Archivo**: `src/app/core/services/wal/wal-facade-helper.service.ts:120-122`

**Fix aplicado**: Eliminado el `#endregion` duplicado en línea 122.

---

### H3 — `console.table()` directo ✅ Resuelto 2026-05-07

**Archivo**: `src/app/core/services/cache/cache-version-manager.service.ts:157`

**Fix aplicado**: Reemplazado por `logger.log('[CacheVersionManager] Version status', { current, stored })`.

---

### H4 — Separadores `============` en lugar de `#region` ✅ Resuelto 2026-05-07

**Archivos**:

- `src/app/core/services/cache/cache-invalidation.service.ts`
- `src/app/core/services/cache/cache-version-manager.service.ts`

**Fix aplicado**: Removidos los bloques `============` del JSDoc header de ambos archivos. Reescritos como JSDoc breve de 2 líneas. Las `// #region` existentes se preservan.

---

### H5 — `.subscribe()` sin `takeUntilDestroyed` ✅ Resuelto 2026-05-07 (chat 122)

**Archivos**:
- `src/app/core/services/wal/wal-facade-helper.service.ts:167` (`executeServerConfirmed`)
- `src/app/core/services/wal/wal-facade-helper.service.ts:184` (`executeFallback`)

**Regla violada**: `code-style.md` ("Siempre usar takeUntilDestroyed para subscripciones").

**Decisión (Opción C)**: refactor a `firstValueFrom` para no introducir excepción en la regla universal. Aplicado a 5 callsites: los 2 del WAL helper + `auth.service.ts:235` (`api.warmup`) + `notifications.service.ts:114` (`api.getActivas`) + `horarios-crud.facade.ts:263` (`api.importarHorarios`) — los 5 viven en services/facades `providedIn: 'root'` sin `DestroyRef` natural. Patrón documentado en `rules/code-style.md` §"HTTP one-shots en services providedIn: 'root'" + nota agregada en `rules/crud-patterns.md` anti-patrón #10. La regla "siempre `takeUntilDestroyed`" queda sin excepción — los services root usan `firstValueFrom + .then/.catch`.

---

### H6 — Comentarios excesivamente verbosos ✅ Resuelto 2026-05-07

**Archivo**: `src/app/core/services/cache/cache-invalidation.service.ts`

**Fix aplicado**: Reducidos los 9 JSDoc de los métodos `invalidate*` a una línea o eliminados (los métodos por módulo no llevan JSDoc — el nombre ya lo dice). Eliminados los bloques de ejemplo de uso (`CUÁNDO USAR` / `EFECTO` / `EJEMPLO`).

---

### H7 — `WAL_CACHE_MAP` mezcla convenciones de naming

**Archivo**: `src/app/core/services/wal/models/wal.models.ts:182-198`

**Problema**: `resourceType` usa camelCase (`usuarios`), kebab-case (`permisos-rol`) y PascalCase (`Curso`, `CursoContenido`) sin convención definida.

**Fix**: Normalizar a camelCase (alineado con frontend). Requiere actualizar todos los facades que pasan `resourceType` + las keys de `WAL_CACHE_MAP`.

---

### H8 — `MODULE_URL_PATTERNS` incompleto vs `WAL_CACHE_MAP` ✅ Resuelto 2026-05-04

**Archivos**:
- `src/app/config/cache-versions.config.ts` — 6 módulos
- `src/app/core/services/wal/models/wal.models.ts` — 15 resource types

**Problema**: Endpoints como `CursoContenido`, `AsistenciaCurso`, `Calificacion`, `GrupoContenido`, `Conversacion` están en WAL pero no en el version manager. Si sus DTOs cambian en un deploy, el cache de usuarios existentes sirve estructura vieja.

**Fix**: Agregar módulos faltantes a `CACHE_VERSIONS` y `MODULE_URL_PATTERNS`.

---

### H9 — Fechas de versión posiblemente desactualizadas ✅ Resuelto 2026-05-04

**Archivo**: `src/app/config/cache-versions.config.ts:40-76`

**Problema**: Todas las versiones son de `2024-01-15` o `2024-02-05`. Con los cambios recientes (Plan 6: ProfesorCurso, DTOs de horarios/salones/usuarios), las versiones podrían no reflejar la estructura actual.

**Fix**: Auditar qué DTOs cambiaron desde enero 2024 e incrementar versiones correspondientes.

---

### H10 — Triple duplicación de patrones de módulo

**Archivos**:
- `CacheInvalidationService` — patrones hardcodeados en métodos
- `MODULE_URL_PATTERNS` — config declarativa
- `WAL_CACHE_MAP` — config del WAL

**Problema**: Si un patrón cambia, hay que actualizarlo en 3 lugares.

**Fix**: `CacheInvalidationService` debería leer de `MODULE_URL_PATTERNS` en lugar de hardcodear. Evaluar si `WAL_CACHE_MAP` puede también derivarse de `MODULE_URL_PATTERNS` donde coincidan.

---

## Priorización

| Prioridad | Hallazgo | Esfuerzo | Chat |
|-----------|----------|----------|------|
| **P0** | H1 (interceptor PascalCase) ✅ | Medio | Resuelto 2026-05-04 |
| **P1** | H8+H9 (módulos incompletos + versiones) ✅ | Bajo | Resuelto 2026-05-04 |
| **P1** | H7 (naming WAL_CACHE_MAP) | Medio-alto (muchos facades) | 1 chat dedicado |
| **P2** | H2+H3+H4+H6 (cosmético + reglas) ✅ | Bajo | Resuelto 2026-05-07 |
| **P2** | H10 (duplicación patrones) | Bajo | 1 chat dedicado |
| **P3** | H5 (subscribe sin takeUntil) ✅ | Decisión de diseño | Resuelto 2026-05-07 |

**Estado**: 7/10 hallazgos cerrados. Quedan **H7** (naming, alto esfuerzo) y **H10** (refactor `CacheInvalidationService` para leer `MODULE_URL_PATTERNS`).

---

## Findings menores 1ra ronda smoke (2026-05-04)

Detectados durante la 1ra ronda del WAL Integration Smoke (`claude-cowork/wal-integration-smoke.md`, commit `478df42`). No bloquean la ronda; son polish UX/diagnóstico que sumarse al backlog de polish del WAL.

- **F-S04 (Caso 4)** — Toast en errores 4xx no extrae el mensaje específico del payload del BE. Cliente muestra "La solicitud contiene datos inválidos" cuando el BE devolvió "El nombre no puede exceder 50 caracteres". `WalFacadeHelper.execute().onError` o el error handler global debería intentar `error.error?.message` antes del fallback genérico.
- **F-S06 (Caso 6)** — Follower cross-tab solo invalida SW cache vía `invalidateForCrossTab`, no dispara refetch automático del store del componente. Resultado: la fila final aparece consistente solo cuando el follower hace GET nuevo (refrescar manual o navegación). Decisión de diseño actual del facade — si se quiere visibilidad inmediata cross-tab, falta cablear `entryCommittedByOtherTab$` a `silentRefreshAfterCrud` en cada CRUD facade que lo necesite.
- **F-S08 (Caso 8)** — `REQUIRES_MIGRATION` se emite correctamente y la entry queda en ese estado en IDB, pero ningún componente top-level consume `walStatus()` con un visual prominente (banner). El usuario no se entera de que tiene migraciones pendientes. Falta wiring de `WalStatusFacade` en `intranet-layout` o equivalente.
