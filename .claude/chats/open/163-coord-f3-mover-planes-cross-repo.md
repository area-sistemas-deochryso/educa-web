# 163 — Coord F3: mover planes cross-repo a `educa-coord/plans/`

> **Repos afectados**: `educa-coord/` (escribe) + `educa-web/` (borra) + `Educa.API/` (borra).
> **Plan**: [migracion-arquitectura-claude.md §F3](../../plan/migracion-arquitectura-claude.md)
> **Depende de**: chat 160 cerrado.
> **Creado**: 2026-05-14 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/investigate` primero (inventario), luego `/execute`.

## Scope

1. **Inventariar** todos los planes en `educa-web/.claude/plan/` y `Educa.API/.claude/plan/` cuyo brief mencione FE+BE, "Educa.API y educa-web", o tenga sub-chats en ambos repos.
2. Aplicar criterio: cualquier plan cross-repo se mueve a `educa-coord/plans/`.
3. Numeración: prefijo `xrepo-NNN` preservando número original (decisión §4 del plan). Si ya hay conflictos de número entre FE y BE, prefijar con repo origen (`xrepo-fe-40` vs `xrepo-be-40`).
4. Actualizar referencias en `maestro.md` de cada repo: el plan ahora vive en coord, dejar puntero con `→ educa-coord/plans/xrepo-NN-<slug>.md`.
5. Crear `educa-coord/plans/README.md` con índice + estado de cada plan movido.
6. Planes solo-FE quedan en `educa-web/.claude/plan/`. Planes solo-BE quedan en `Educa.API/.claude/plan/`.

### Candidatos preliminares (a verificar al ejecutar)

| Plan | Origen | Status |
|---|---|---|
| Plan 14 — Contratos FE-BE | `educa-web/.claude/plan/contratos-fe-be.md` | cross-repo |
| Plan 40 — Bulkheads/timeouts | BE + ecos en FE | cross-repo |
| Plan 28/29/38 cadena de correos | BE + widget FE | cross-repo |
| Plan 21/23/27 polimorfismo asistencia | mezclado | cross-repo |
| Plan 43 — Correlation hub | mezclado | a verificar |
| Plan 22 — Throttle email | BE + FE widget | a verificar |
| Plan 32 — Correlation hub observability | mezclado | a verificar |

## Out of scope

- Mover ADRs → quedan en `decisions/` (chat aparte si se identifican cross-repo).
- Mover chats abiertos → F6.
- Renumerar planes solo-FE o solo-BE.

## Criterio de cierre

- `ls educa-coord/plans/*.md` contiene todos los planes cross-repo.
- `educa-coord/plans/README.md` lista cada uno con estado.
- `maestro.md` de FE y BE no contiene rutas internas a planes movidos (solo punteros).
- 3 commits independientes (uno por repo).

## Tiempo estimado

~45-60 min.
