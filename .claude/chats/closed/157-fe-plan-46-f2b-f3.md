# 157 — Plan 46 F2.b + F3: cerrar drift doc cleanup FE

> **Repo destino**: `educa-web`
> **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`

## Scope

Cerrar el Plan 46 ([drift-doc-cleanup.md](../../plan/drift-doc-cleanup.md)) completo:

1. **F2.b** — re-verificar los **10 items `⏳ no re-verificado`** del audit overlay en `drift-report.md`:
   - C1.4 Links en MEMORY.md
   - C2.1 Feature flags sync entre envs (`environment.ts` vs `environment.development.ts`)
   - C2.3 Module registry
   - C3.2 Features sin doc
   - C4.1 INV-* fantasma
   - C4.2 Tipos semánticos
   - C5.9 AsNoTracking ratio
   - C5.10 Filtro `_Estado` soft-delete (BE — solo nota informativa)
   - C6.1 Endpoints FE vs Controllers BE

2. **F3** — separar ejemplos `[(visible)]` en `dialogs-sync.md`. Verificar que los ejemplos de "incorrecto" estén claramente etiquetados como contraste y no mezclados con el patrón canónico.

3. Actualizar el audit overlay con resultados de F2.b (resueltos / drift confirmado / falsos positivos).

4. Si tras F2.b el % resuelto supera 70%, **archivar** `drift-report.md` a `.claude/history/drift-report-2026-04.md`.

## Out of scope

- Limpiar maestro.md links rotos → Plan 47 (brief 158).
- appendTo barrido → Plan 48 (brief 159).
- BE drift cleanup → Plan 45 (Educa.API).

## Criterio de cierre

- Audit overlay actualizado con los 10 items re-verificados.
- F3 ejecutada o explícitamente descartada.
- Plan 46 cerrado (✅ los 3 fases o follow-ups documentados).

## Tiempo estimado

~1-1.5h.
