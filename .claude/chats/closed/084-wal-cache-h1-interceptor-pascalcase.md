# WAL+Cache Audit — H1, H8, H9

> **Repo destino**: `educa-web` (main)
> **Task source**: `.claude/tasks/wal-cache-audit-fixes.md` (P0 + P1 mismo chat)
> **Creado**: 2026-05-04 · **Modo sugerido**: `/execute` → `/validate`
> <!-- minimal-from-go -->

## Hallazgos cubiertos

### H1 — Interceptor SW cache no invalida endpoints PascalCase (P0)

`extractResourcePattern` en `sw-cache-invalidation.interceptor.ts:77` rompía ante el primer segmento PascalCase. Controllers como `ConsultaAsistencia`, `CursoContenido`, `AsistenciaCurso`, `Calificacion`, `GrupoContenido` quedaban sin invalidación de cache.

Fix: regla posicional. `i === 1` (PascalCase justo después de `api`) = controller → empujar y cortar (pattern queda `/api/<Controller>`). `i > 1` = discriminador (`Estudiante`/`Profesor` en `/api/sistema/usuarios/...`) → cortar sin empujar.

### H8 — `MODULE_URL_PATTERNS` incompleto vs `WAL_CACHE_MAP` (P1)

Se agregaron 6 módulos al config: `horarios`, `cursoContenido`, `asistenciaCurso`, `calificacion`, `grupoContenido`, `conversaciones`. Antes el version manager no podía invalidar estructura stale en esos módulos pese a que el WAL los conocía.

### H9 — Versiones desactualizadas (P1)

Bump de versiones a `2026-05-04` para módulos con cambios estructurales conocidos: `asistencias` (Plan 21/27/28 — polimórfico, umbral grado, TipoPersona='A'), `usuarios` y `salones` (Plan 6 — ProfesorCurso). Módulos sin cambios DTO conocidos quedaron en sus versiones de 2024.

Bonus: corregido `usuarios` (`/api/usuarios` → `/api/sistema/usuarios`), `cursos` (`/api/cursos` → `/api/sistema/cursos`) y `salones` (`/api/salones` → `/api/sistema/salones`) para alinear con las URLs reales del backend (los services del feature ya usan los `/api/sistema/*`; el config viejo apuntaba a paths inexistentes y por eso la invalidación nunca casaba).

## Validación

- `npx eslint` sobre los 3 archivos cambiados → exit 0.
- `npx tsc --noEmit -p tsconfig.json` → exit 0.
- `npx vitest run src/app/core/interceptors` → 31/31 verdes.

## Files

- `src/app/core/interceptors/sw-cache-invalidation/sw-cache-invalidation.interceptor.ts`
- `src/app/config/cache-versions.config.ts` (reescritura corta + 6 módulos nuevos + 3 patterns corregidos)
- `.claude/tasks/wal-cache-audit-fixes.md` (marcar H1+H8+H9 como resueltos)

## Pendiente (no se hizo)

H7 (naming WAL_CACHE_MAP) requiere chat dedicado — toca todos los facades. H2/H3/H4/H6/H10 son P2 cosmético, otro chat. H5 es decisión de regla.
