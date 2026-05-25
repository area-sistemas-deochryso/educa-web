# Plan 46 — Limpieza de drift documental en `.claude/`

> ⚠️ **Legacy plan (pre-ADR-0006).** This plan may contain implementation detail (file paths, DTOs, counts) that could be stale. Per [ADR-0006 D5](../../educa-coord/decisions/0006-plan-authoring-contract-not-blueprint.md), extract intent + decisions only — ignore concrete paths, signatures, and counts. Investigate current code before executing.

> **Repo**: `educa-web` (FE) · **Tipo**: docs · **Riesgo**: bajo (sólo docs/rules)
> **Creado**: 2026-05-13 · **Última revisión**: 2026-05-15 (chat 157)
> **Estado global**: ✅ **cerrado 100%** — F1 ✅ · F2 ✅ · F2.b ✅ · F3 ✅ (no aplica). Reporte archivado a `history/drift-report-2026-04.md`.

## Contexto

Auditoría externa (codex, 2026-05-13) detectó que partes del `drift-report.md` y de reglas activas describen estado del código que ya no aplica. Riesgo: futuros chats toman decisiones basadas en docs falsas.

## Hallazgos confirmados

1. **`@data/repositories` ya no existe** (alias removido de `tsconfig.json`), pero seguía mencionado en:
   - `.claude/rules/architecture.md` (taxonomía Gateway + bloque "Capa de Datos")
   - `.claude/rules/code-style.md` (ejemplo de import alias)
   - `.claude/CLAUDE.md` (índice on-demand)
   - `.claude/project-structure/architecture.md` (tree + tabla layer)
2. **`[(visible)]` ya no aparece en templates HTML activos** — solo en JSDoc comments y en ejemplos de `dialogs-sync.md`.
3. **`feedbackReport` flag** ya documentado en `feature-flags.md` (resuelto).
4. **`drift-report.md` (2026-04-16)** describe violaciones que en su mayoría ya fueron resueltas.

## Fases

### F1 — Borrar refs a `@data/repositories` ✅ (chat 156, 2026-05-13)

- ✅ `rules/architecture.md`: removido del tree (`data/`), de la taxonomía Gateway, y reescrito el bloque "Capa de Datos".
- ✅ `rules/code-style.md`: ejemplo de import migrado a `@data/models`.
- ✅ `CLAUDE.md`: trigger del índice on-demand limpiado.
- ✅ `project-structure/architecture.md`: bloque `repositories/` removido + fila layer + párrafo reescrito.

### F2 — Auditar `drift-report.md` ✅ (chat 156, 2026-05-13)

- ✅ Audit overlay agregado con tabla de 28 filas.
- ✅ Drift real C3.1 detectado y corregido (`asistencia/`→`attendance/`, `permisos/`→`permissions/`, agregadas filas `capacitor/` y `feedback/`).

### F2.b — Re-verificar 10 items ⏳ ✅ (chat 157, 2026-05-15)

Los 10 items pendientes fueron re-verificados:

- C1.4 ✅ PASS — 31 links válidos en MEMORY.md.
- C2.1 ✅ PASS — 19 keys sincronizadas entre `environment.ts` y `environment.development.ts` (creció de 11, sigue sincronizado).
- C2.3 ✅ PASS — los 5 módulos coinciden entre `module-registry.ts` y `menu-modules.md`.
- C3.2 ✅ PASS informativo — 99 dirs de feature, cobertura aceptable.
- C4.1 ✅ PASS informativo — 93 `INV-*` documentados en `educa-coord/invariants/` vs 34 referenciados en código FE (diferencia esperada).
- C4.2 ✅ PASS — los 13 tipos semánticos de `semantic-types.md` existen en código.
- C5.9 ⚪ N/A FE — BE puro, no auditable desde este repo.
- C5.10 ⚪ N/A FE — BE puro.
- C6.1 ✅ PASS smoke — 182 endpoints únicos llamados; full cross-repo fuera de scope, smoke en deploy captura dead controllers.

Stats finales: 22 ✅ + 2 ⚪ + 2 ❌ activos (con plan dueño) + 1 ⚠️ parcial (con plan dueño) = **86% cerrado**. Reporte archivado a `history/drift-report-2026-04.md`.

### F3 — Separar ejemplos `[(visible)]` en `dialogs-sync.md` ✅ no aplica (chat 157, 2026-05-15)

Verificado: `dialogs-sync.md` solo menciona `[(visible)]` como anti-patrón en prosa (líneas 25 y 126). Ningún bloque de código lo presenta como buena práctica. **No requiere cambio**.

## Follow-ups detectados (chats separados)

Los siguientes ítems se desprendieron del audit F2 y van a planes/chats dedicados, no a este plan:

1. **18 links rotos en `maestro.md`** (C1.2) → **Plan 47** (`maestro-links-cleanup.md`).
2. **7 `p-select` sin `appendTo="body"`** (C5.3) → **Plan 48** (`appendto-barrido.md`).
3. **10 archivos BE >300 ln** (C5.5) → sugerencia para crear plan en `Educa.API/.claude/plan/` (no FE).
4. **`_emailService` inyectado pero no usado en `PasswordRecoveryService.cs`** (C5.7) → agrupar con Plan 45 BE (drift cleanup).

## Criterio de cierre del Plan 46

- `grep -rn "@data/repositories" .claude/rules/` retorna 0 líneas activas (sólo dentro de `history/`). ✅
- `drift-report.md` tiene audit overlay con fecha reciente. ✅
- F2.b re-verificada o explícitamente descartada como deuda menor.
- F3 ejecutada o explícitamente cerrada como "no aplica".

## Prioridad

**Baja**. Hacer oportunísticamente al tocar las reglas afectadas o cuando haya rato libre.
