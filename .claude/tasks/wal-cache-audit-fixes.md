# WAL + Cache — Hallazgos de Auditoría

> **Fecha**: 2026-04-16
> **Origen**: Code review + auditoría contra reglas del proyecto
> **Archivos auditados**: 17 (WAL) + 9 (Cache) = 26 archivos, ~4,200 líneas

---

## Hallazgos

### H1 — Bug: Interceptor no invalida endpoints PascalCase (CRÍTICO)

**Archivo**: `src/app/core/interceptors/sw-cache-invalidation/sw-cache-invalidation.interceptor.ts:77`

**Problema**: `extractResourcePattern()` hace `break` cuando un segmento empieza con mayúscula. Controllers PascalCase (`ConsultaAsistencia`, `CursoContenido`, `AsistenciaCurso`, `Calificacion`, `GrupoContenido`) producen `resourceSegments = ['api']` → `return null` → no se invalida caché.

**Impacto**: Después de POST/PUT/DELETE a estos endpoints, el siguiente GET sirve datos stale del SW cache. El WAL compensa parcialmente vía `WAL_CACHE_MAP`, pero mutaciones sin WAL (server-confirmed, directas) no se invalidan.

**Fix**: Cambiar la heurística para distinguir entre discriminadores de rol (`Profesor`, `Estudiante`) y nombres de controller PascalCase. Opción: mantener una allowlist de controllers conocidos, o solo hacer break en PascalCase cuando el segmento anterior ya es un controller válido.

---

### H2 — Bug menor: Region duplicado en facade helper

**Archivo**: `src/app/core/services/wal/wal-facade-helper.service.ts:120-122`

**Problema**: Dos `// #endregion` consecutivos. El segundo no tiene region abierta correspondiente.

**Fix**: Eliminar la línea 122.

---

### H3 — `console.table()` directo

**Archivo**: `src/app/core/services/cache/cache-version-manager.service.ts:157`

**Regla violada**: `code-style.md` ("SIEMPRE usar logger, NUNCA console.log") + ESLint `no-console`.

**Fix**: Reemplazar con `logger.log` o `debug.dbg('CACHE:VersionManager')`.

---

### H4 — Separadores `============` en lugar de `#region`

**Archivos**:
- `src/app/core/services/cache/cache-invalidation.service.ts:7-9`
- `src/app/core/services/cache/cache-version-manager.service.ts:13-15`

**Regla violada**: `regions.md` ("Las regiones reemplazan los separadores `============`. No mezclar ambos estilos.")

**Fix**: Reemplazar bloques `============` por `// #region` / `// #endregion`.

---

### H5 — `.subscribe()` sin `takeUntilDestroyed`

**Archivos**:
- `src/app/core/services/wal/wal-facade-helper.service.ts:167` (`executeServerConfirmed`)
- `src/app/core/services/wal/wal-facade-helper.service.ts:184` (`executeFallback`)

**Regla violada**: `code-style.md` ("Siempre usar takeUntilDestroyed para subscripciones").

**Contexto**: Ambos son HTTP one-shots que se auto-completan (no hay leak real). Decisión: eximir HTTP one-shots explícitamente en la regla, o agregar `take(1)` por consistencia.

---

### H6 — Comentarios excesivamente verbosos

**Archivo**: `src/app/core/services/cache/cache-invalidation.service.ts`

**Regla violada**: `comments.md` ("Comentarios mínimos pero útiles", "NO describir lo obvio").

**Fix**: Reducir JSDoc de métodos wrapper a 1-2 líneas. Eliminar ejemplos de uso que replican lo que el nombre del método ya dice.

---

### H7 — `WAL_CACHE_MAP` mezcla convenciones de naming

**Archivo**: `src/app/core/services/wal/models/wal.models.ts:182-198`

**Problema**: `resourceType` usa camelCase (`usuarios`), kebab-case (`permisos-rol`) y PascalCase (`Curso`, `CursoContenido`) sin convención definida.

**Fix**: Normalizar a camelCase (alineado con frontend). Requiere actualizar todos los facades que pasan `resourceType` + las keys de `WAL_CACHE_MAP`.

---

### H8 — `MODULE_URL_PATTERNS` incompleto vs `WAL_CACHE_MAP`

**Archivos**:
- `src/app/config/cache-versions.config.ts` — 6 módulos
- `src/app/core/services/wal/models/wal.models.ts` — 15 resource types

**Problema**: Endpoints como `CursoContenido`, `AsistenciaCurso`, `Calificacion`, `GrupoContenido`, `Conversacion` están en WAL pero no en el version manager. Si sus DTOs cambian en un deploy, el cache de usuarios existentes sirve estructura vieja.

**Fix**: Agregar módulos faltantes a `CACHE_VERSIONS` y `MODULE_URL_PATTERNS`.

---

### H9 — Fechas de versión posiblemente desactualizadas

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
| **P0** | H1 (interceptor PascalCase) | Medio | 1 chat |
| **P1** | H8+H9 (módulos incompletos + versiones) | Bajo | Mismo chat que H1 |
| **P1** | H7 (naming WAL_CACHE_MAP) | Medio-alto (muchos facades) | 1 chat dedicado |
| **P2** | H2+H3+H4+H6 (cosmético + reglas) | Bajo | 1 chat |
| **P2** | H10 (duplicación patrones) | Bajo | Mismo chat que H2-H6 |
| **P3** | H5 (subscribe sin takeUntil) | Decisión de diseño | Definir en regla |

**Estimado**: 3 chats para cerrar todo. H1 es urgente (afecta producción).
