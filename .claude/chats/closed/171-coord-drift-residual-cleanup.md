# 169 — Limpieza de drift residual post-migración coord

> **Repos afectados**: FE + BE (no toca coord).
> **Plan**: follow-up de [`migracion-arquitectura-claude.md`](../../plan/migracion-arquitectura-claude.md) (cerrado en F7, brief 167).
> **Depende de**: ADR-0001 (`educa-coord/decisions/0001-arquitectura-coord-folder.md`).
> **Creado**: 2026-05-15 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute` (cambios mecánicos por path, sin decisiones).

## Scope

La auditoría F7 dejó identificados artefactos vivos que aún referencian `business-rules.md` o `../Educa.API/.claude/rules/...` (archivos que ya no existen físicamente o ya no son fuente de verdad). No bloquearon el cierre de la migración, pero conviene limpiarlos antes de que un `/drift-check` los confunda con drift real del código.

### Cambios concretos

**FE — `educa-web/.claude/`**

1. `config/drift-map.md` líneas 24, 42, 43, 85 — reemplazar `rules/business-rules.md (sección X)` por el archivo equivalente en `../../educa-coord/invariants/`:
   - L24 (`core/services/feedback/` → sección 16) → `../../educa-coord/invariants/feedback.md`.
   - L42 (`attendance*/` → sección 1) → `../../educa-coord/invariants/asistencia.md`.
   - L43 (`reportes-asistencia/` → sección 1) → `../../educa-coord/invariants/asistencia.md`.
   - L85 (fila "rules/business-rules.md → Código BE") → eliminar la fila o reemplazarla por "educa-coord/invariants/ → Código BE+FE".
2. `commands/drift-check.md` — retargeting completo:
   - Sustituir `../Educa.API/Educa.API/` por la convención cross-repo (`../Educa.API/Controllers/`, `../Educa.API/Services/`, etc. — el path real sin el doble `Educa.API/Educa.API/`).
   - Sustituir `business-rules.md` por `../../educa-coord/invariants/README.md` cuando se hable del catálogo de invariantes.
   - Verificar que C3.3 ("INV-* en código sin business-rules.md") siga compilando con la nueva referencia a coord.

**BE — `Educa.API/.claude/`**

3. `plan/arquitectura-backend-opciones.md` — refs a `business-rules.md §15`, `§14` → `../../educa-coord/invariants/<dominio>.md` (o el README si la sección era índice).
4. `plan/domain-layer.md` línea 9 + 280 — mismo cambio.
5. `plan/error-trace-backend.md` línea 230 — actualizar el texto "candidatas a agregar en business-rules.md" por "candidatas a agregar en `educa-coord/invariants/`".
6. `plan/test-backend-gaps.md` línea 273 — la entrada de log que menciona "Doc fix coordinado en `educa-web/.claude/rules/business-rules.md`" es histórica (commit del chat 006). **No tocar** — log inmutable.

### NO tocar

- `chats/awaiting-prod/*.md`, `chats/closed/*.md`, `chats/waiting/*.md` — briefs históricos, memoria institucional.
- `decisions/*.md` BE (0001, 0002, 0005, 0007) — ADRs son snapshot inmutable por convención.
- `tasks/design-patterns-backend.md`, `tasks/enforcement-reglas.md` — son tasks de exploración, las refs son aspiracionales.
- Diagrama ASCII en `plan/migracion-arquitectura-claude.md:130-131` (`INV-C01`/`INV-CA01` con prefijos que no matchean los reales `INV-AC*`/`INV-C*/T*`) — el plan está cerrado y el diagrama es ilustrativo.

## Criterio de cierre

- `grep -rn "business-rules\.md" educa-web/.claude/config/ educa-web/.claude/commands/` → vacío (salvo refs a archivos coord vía `invariants/`).
- `grep -rn "business-rules\.md" Educa.API/.claude/plan/` → vacío salvo `test-backend-gaps.md:273` (log histórico).
- `/drift-check` corre sin reportar "archivo inexistente" sobre `business-rules.md`.
- Suite de tests no se toca (los cambios son solo docs).

## Tiempo estimado

~30 min. Cambios mecánicos por search-replace + verificar que los paths nuevos compilen visualmente.

## Out of scope

- Migrar las invariantes huérfanas detectadas en F7 (`INV-FA01..06` de `flujos-alternos.md`) a coord. Ese plan está en 0% y cuando arranque, formalizará sus IDs en `educa-coord/invariants/` si justifica.
- Touch a planes históricos BE que mencionan `business-rules.md` en su prosa narrativa (es contexto, no instrucciones vivas).
