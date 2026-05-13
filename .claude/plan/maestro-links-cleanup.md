# Plan 47 — Limpieza de links rotos en `maestro.md`

> **Repo**: `educa-web` (FE) · **Tipo**: chore(.claude) · **Riesgo**: bajo (solo docs)
> **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.

## Contexto

El audit del Plan 46 F2 (chat 156) confirmó que `.claude/plan/maestro.md` tiene **18 links rotos** apuntando a planes/tasks que nunca existieron o ya fueron eliminados. Esto rompe la navegación y confunde la cola priorizada del proyecto.

Muchos refs fueron originalmente "stubs aspiracionales" (plan a crear) que nunca se materializaron. Hoy contaminan el documento que es la fuente de verdad para `/next-chat`, `/start-chat`, `/triage`.

## Hallazgos confirmados (2026-05-13)

Links rotos en `maestro.md`:

| Link | Tipo | Acción sugerida |
|------|------|----------------|
| `../tasks/enforcement-reglas.md` (×2) | Task inexistente | Quitar ref o marcar inline |
| `../../../Educa.API/.claude/plan/asistencia-correos-endurecimiento.md` | Plan BE inexistente | Verificar si migró a history o nunca existió |
| `../../../Educa.API/.claude/plan/arquitectura-backend-opciones.md` | Plan BE inexistente | Verificar / marcar `(pendiente crear)` |
| `../../../Educa.API/.claude/plan/domain-layer.md` | Plan BE inexistente | Verificar / marcar |
| `../../../Educa.API/.claude/plan/asignacion-profesor-salon-curso.md` | Plan BE inexistente | Plan 6 ya archivado — debe apuntar a history |
| `../../../Educa.API/.claude/plan/error-trace-backend.md` | Plan BE inexistente | Verificar / marcar |
| `consolidacion-backend.md` | Plan inexistente | Marcar `(pendiente crear)` o quitar |
| `consolidacion-frontend.md` | Plan inexistente | Marcar `(pendiente crear)` o quitar |
| `flujos-alternos.md` | Plan inexistente | Verificar (sí existe en `plan/`?) |
| `eslint-config-refactor.md` | Plan inexistente | Plan 11 archivado — apuntar a history |
| `test-backend-gaps.md` | Plan inexistente | Verificar (sí existe en `plan/`?) |
| `test-frontend-gaps.md` | Plan inexistente | Verificar |
| `contratos-fe-be.md` | Plan inexistente | Verificar |
| `release-operations.md` | Plan inexistente | Verificar |
| `security-audit.md` | Plan inexistente | Verificar |
| `../tasks/design-patterns-backend.md` (×1) | Task inexistente | Quitar o marcar |
| `../tasks/design-patterns-frontend.md` (×1) | Task inexistente | Quitar o marcar |
| `../tasks/wal-cache-audit-fixes.md` | Task inexistente | Quitar |
| `../tasks/wal-sync-engine-split.md` | Task inexistente | Quitar |

**Nota**: algunos de los "plan inexistentes" en realidad SÍ existen en `.claude/plan/` (`flujos-alternos.md`, `test-backend-gaps.md`, etc.) — eran falsos positivos del regex original. La auditoría manual debe distinguir.

## Fases

### F1 — Inventario y verificación (~10 min)

Para cada uno de los 18 refs, hacer `ls` del path target y clasificar:

- **Existe** → falso positivo, dejar como está.
- **Archivado en `history/planes-cerrados.md`** → cambiar ref al ancla `#plan-NN`.
- **Nunca creado, todavía válido** → mantener con sufijo `(pendiente crear)`.
- **Obsoleto** → eliminar la línea/sección.

### F2 — Aplicar cambios al maestro (~20 min)

Edits puntuales con `Edit`. No tocar narrativa del plan, solo los links.

## Criterio de cierre

- `grep -E '\]\([^)]+\.md' .claude/plan/maestro.md` solo retorna refs a archivos existentes.
- Anclas `#plan-NN` válidas contra `history/planes-cerrados.md`.

## Prioridad

**Media-baja**. No bloquea features pero degrada el tooling de planificación.
