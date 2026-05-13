# 158 — Plan 47: limpiar 18 links rotos en `maestro.md`

> **Repo destino**: `educa-web`
> **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`

## Scope

Ejecutar el Plan 47 ([maestro-links-cleanup.md](../../plan/maestro-links-cleanup.md)):

1. **F1** — inventario: verificar cada uno de los 18 refs documentados en el plan.
2. **F2** — aplicar fixes:
   - Falsos positivos del regex original (refs en backticks dentro de narrativa) → dejar.
   - Refs a planes archivados → cambiar al ancla `#plan-NN` en `history/planes-cerrados.md`.
   - Refs a planes nunca creados pero todavía válidos → mantener con sufijo `(pendiente crear)`.
   - Refs obsoletos → eliminar la línea/sección.

## Out of scope

- Reorganizar la narrativa del maestro (solo los links).
- Crear los planes pendientes que sí son válidos.
- Cualquier otro drift documental → Plan 46.

## Criterio de cierre

- 0 links rotos detectables con `grep -E '\]\([^)]+\.md\)' .claude/plan/maestro.md` + `ls` de cada target.
- Anclas `#plan-NN` válidas contra `history/planes-cerrados.md`.

## Tiempo estimado

~30 min.
