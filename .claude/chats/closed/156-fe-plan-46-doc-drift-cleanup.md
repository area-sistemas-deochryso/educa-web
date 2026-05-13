# Chat 156 — Plan 46: Limpieza de drift documental en `.claude/`

> **Creado**: 2026-05-13 · **Estado**: 🟢 running · **Repo destino**: `educa-web` · **Plan**: 46

## CONTEXTO

Item #9 del maestro. Las reglas `.claude/rules/architecture.md` y `code-style.md` referencian `@data/repositories` que ya no existe en el código (`src/app/data/` solo contiene `adapters/`, `models/`, `index.ts`). El alias `@data/*` sigue mapeado en `tsconfig.json`, pero el subpath `repositories/` fue eliminado en algún refactor previo.

Drift confirmado por inspección directa (no por suposición):
- `tsconfig.json:28-29` define `@data` y `@data/*` → OK
- `src/app/data/` → solo `adapters/`, `models/`, `index.ts` (NO `repositories/`)
- `rules/architecture.md:118` menciona `@data/repositories/` como ubicación de Gateways
- `rules/architecture.md:398` describe `BaseRepository` "sin consumidores activos" — pero el folder ya no existe
- `rules/code-style.md:24` ejemplo de import `from '@data/repositories'` que no compila

## MODO SUGERIDO

`/execute` — el alcance es chico y mecánico. F1 puede cerrarse en una pasada.

## ALCANCE

### F1 (quick, ~30 min) — refs muertas a `@data/repositories`

- `rules/architecture.md:118` → quitar `@data/repositories/` del bullet de Ubicacion (Gateway/IO ahora solo vive en `@core/services/`)
- `rules/architecture.md:398` → reemplazar la sección "Capa de Datos" para reflejar realidad: `BaseRepository` ya no existe, el patrón actual es `*.service.ts` con `HttpClient` directo (esto ya lo dice el propio archivo en líneas 398-403, pero contradice las refs anteriores)
- `rules/code-style.md:24` → cambiar el ejemplo a un import vivo (ej. `@core/services` o `@data/models`)

### F2 (medio) — auditar `.claude/reporte-drift-check/drift-report.md`

- Marcar cada sección como ✅ (vigente), ⏳ (parcialmente vigente) o ❌ (obsoleta)
- Si >70% está obsoleto → archivar (mover a `.claude/reporte-drift-check/closed/` o similar)
- Decisión documentada en commit message

### F3 (opcional) — `dialogs-sync.md` ejemplos `[(visible)]`

Separar ejemplos legacy de `[(visible)]` del patrón canónico actual (`[visible]` + `(visibleChange)`). Solo si hay tiempo.

## SCOPE OUT

- NO tocar código TypeScript (solo `.claude/**/*.md`)
- NO renombrar archivos
- NO promover reglas a `~/.claude/` (cross-project-promotion no aplica — es drift local)

## INVARIANTES A RESPETAR

Ninguno del dominio. Es solo documentación. Convención de commits: `docs(rules): ...` o `chore(.claude): ...`.

## CIERRE

Commit único o por fase. Push opcional (no es FE/BE deploy). `/end` mueve a `closed/` directo (no `awaiting-prod/`).
