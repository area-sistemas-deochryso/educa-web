> **Repo destino**: `educa-web` (frontend, worktree `p70-angular22-migration`, branch `chat/p70-angular22-migration`).
> **Plan**: `educa-coord/plans/p70-angular22-migration.md` (P70, entre F3 y F4) · **Creado**: 2026-08-27 · **Estado**: ✅ cerrado (commit `3b846017`, merge a `main`).
> **Modo**: `/execute` — merge + resolución de 2 conflictos puntuales, sin scope creep.

---

# 603 — Traer `main` al worktree de P70 y resolver conflictos

## Contexto

El worktree `p70-angular22-migration` (brief 595, F3: upgrade a Angular 22 + TypeScript 6.0) se ramificó de `main` antes de que existieran las 3 rondas de fixes de fidelidad visual de `edu-ui` (589 tras F8; 599+600+601 tras F9). Coord intentó traer `main` al worktree para poder verificar el upgrade de forma limpia (sin arrastrar bugs viejos ya corregidos en otro lado) y encontró **2 conflictos reales de merge**:

- `src/app/shared/edu-ui/lib/table/edu-table.ts`
- `src/app/shared/edu-ui/lib/tag/edu-tag.ts`

Coord abortó el merge sin resolver nada — resolver conflictos de código es trabajo de `/execute`, fuera del rol de coord.

## Verificación que motivó este brief (coord, 2026-08-27)

Corriendo el worktree tal cual (sin mergear main, Node vía `fnm use default` — el Node global v20 no alcanza el mínimo de Angular 22), se confirmó en `/admin/usuarios` que los 4 íconos de la columna "Acciones" son todos del mismo color (teal uniforme) en vez de los colores semánticos (gris/verde/naranja/gris) que trajo brief 600. Esto es exactamente el bug de F9 #3, ya corregido en `main` — el worktree simplemente no lo tiene porque nunca se le mergeó `main` desde antes de esa fix. No es un problema nuevo introducido por el upgrade a Angular 22.

## Qué hacer

1. `git merge main` en el worktree (`chat/p70-angular22-migration`).
2. Resolver los 2 conflictos:
   - `edu-table.ts`: revisar qué cambió en cada lado — probablemente `main` trae el fix de background transparente (F9 #2) y el worktree trae cambios propios del upgrade de Angular 22 (sintaxis de signals/inputs, etc. si aplica). Conservar ambos: el comportamiento del upgrade Y el fix visual.
   - `edu-tag.ts`: mismo criterio — `main` probablemente trae el fix de F8 (`.tag-neutral`/`ViewEncapsulation`) o algo relacionado a severidad; conservar ambos lados.
3. Tras resolver, correr `npm run build` y la suite de tests unitarios — confirmar que el merge no rompió nada de ninguno de los dos lados.
4. Repetir un smoke visual básico (`/admin/usuarios`, íconos de acciones con color semántico correcto) para confirmar que el fix de F9 sobrevivió el merge.

## Qué NO hacer

- No re-litigar el upgrade de Angular 22 en sí (F1-F3 ya están hechos y no son el objetivo de este brief).
- No adoptar APIs nuevas de Angular 22 (Signal Forms, `httpResource`, zoneless) — eso es F4, explícitamente fuera de esta fase según el propio brief 595.
- No tocar nada de `edu-ui` más allá de resolver el conflicto textual — si el conflicto revela una incompatibilidad real de comportamiento (no solo texto), parar y reportar en vez de improvisar.

## Done-when

- [x] `main` mergeado a `chat/p70-angular22-migration`, ambos conflictos resueltos (commit `3b846017`).
- [x] `npm run build` verde.
- [x] Tests unitarios verdes (2529/2529; 1 timeout flake en `eslint-config-guards.spec.ts` bajo carga completa, confirmado no-regresión corriéndolo aislado en 2s).
- [x] Smoke visual: `/intranet/admin/usuarios` con íconos de acciones en color semántico correcto (gris/verde/naranja/gris), confirmando que el fix de F9 sobrevivió.
- [x] `lastHeartbeat` del worktree en `.claude/.locks/worktrees.json` actualizado.

## Plan cross-repo

`educa-coord/plans/p70-angular22-migration.md` — P70, entre F3 (595) y F4.

## Origen

Detectado por coord al intentar levantar el worktree 595 para una verificación visual rápida ("¿el upgrade a Angular 22 no debería tener cambios de UI significativos?") — el merge con `main` reveló que el worktree está desactualizado respecto a 3 rondas de fixes de `edu-ui`, con 2 conflictos reales pendientes de resolver antes de poder verificar el upgrade de forma limpia.
