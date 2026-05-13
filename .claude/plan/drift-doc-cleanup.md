# Plan 46 — Limpieza de drift documental en `.claude/`

> **Repo**: `educa-web` (FE) · **Tipo**: docs · **Riesgo**: bajo (sólo docs/rules)
> **Creado**: 2026-05-13 · **Última revisión**: 2026-05-13 (chat 156)
> **Estado global**: 🟡 en progreso — F1 ✅ · F2 parcial · F3 ⏳.

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

### F2 — Auditar `drift-report.md` 🟡 parcial (chat 156, 2026-05-13)

**Estado**: 15/28 ✅ resueltos · 2 ❌ drift activo · 1 ⚠️ parcial · 10 ⏳ no re-verificados.

- ✅ Audit overlay agregado al inicio del reporte con tabla de 28 filas + decisión "no archivar" (54% < 70%).
- ✅ Drift real C3.1 detectado y corregido en el mismo chat (`asistencia/`→`attendance/`, `permisos/`→`permissions/`, agregadas filas `capacitor/` y `feedback/`).
- ⏳ **Pendiente F2.b**: re-verificar los 10 items `⏳ no re-verificado` (todos eran PASS originalmente — baja probabilidad de regresión, pero el ejercicio es honesto).
   - C1.4 Links en MEMORY.md
   - C2.1 Feature flags sync entre envs
   - C2.3 Module registry
   - C3.2 Features sin doc
   - C4.1 INV-* fantasma
   - C4.2 Tipos semánticos
   - C5.9 AsNoTracking ratio
   - C5.10 Filtro `_Estado` soft-delete
   - C6.1 Endpoints FE vs Controllers BE

### F3 — Separar ejemplos `[(visible)]` en `dialogs-sync.md` ⏳

- Verificar que los ejemplos de "incorrecto" muestren `[(visible)]` solo como contraste, no mezclados con código presentado como bueno.
- Opcional. Scope FE chico (~15 min).

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
