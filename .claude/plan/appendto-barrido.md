# Plan 48 — Barrido `appendTo="body"` en `p-select`

> ⚠️ **Legacy plan (pre-ADR-0006).** This plan may contain implementation detail (file paths, DTOs, counts) that could be stale. Per [ADR-0006 D5](../../educa-coord/decisions/0006-plan-authoring-contract-not-blueprint.md), extract intent + decisions only — ignore concrete paths, signatures, and counts. Investigate current code before executing.

> **Repo**: `educa-web` (FE) · **Tipo**: chore(ui) · **Riesgo**: bajo
> **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.

## Contexto

La regla `primeng.md` exige que todos los `p-select`, `p-multiselect`, `p-dropdown` y `p-calendar` lleven `appendTo="body"` para evitar problemas de z-index y overflow cuando viven dentro de diálogos o contenedores con `overflow: hidden`.

El audit del Plan 46 F2 (chat 156, 2026-05-13) confirmó que el drift bajó de ~30 a **7 instancias** de `p-select` sin `appendTo`. Un barrido oportunístico puede cerrar el último gap.

## Hallazgos

`grep -L 'appendTo' src/**/*.html | xargs grep -l '<p-select'` retornó 7 archivos (re-verificar lista exacta al arrancar — la cifra puede haber cambiado).

## Fases

### F1 — Inventario exacto (~5 min)

Listar los 7 archivos con `Grep`:

```
Grep "<p-select" en src/**/*.html con output_mode=files_with_matches
```

Luego filtrar los que NO incluyen `appendTo`.

### F2 — Aplicar fix (~15 min)

Para cada `<p-select` sin `appendTo`, agregar `appendTo="body"`. Edits triviales.

Si alguno está en contexto donde `appendTo="body"` rompe diseño (raro), documentar la excepción inline con comentario.

### F3 — Verificación (~5 min)

- Re-grep para confirmar 0 instancias restantes.
- Smoke visual en 1-2 dialogs del frontend que usen los archivos tocados.

## Criterio de cierre

- `grep -L 'appendTo' src/**/*.html | xargs grep -l '<p-select'` retorna 0 archivos.
- Lint pasa.

## Prioridad

**Baja**. Hacer oportunísticamente al tocar cualquiera de los 7 archivos por otro motivo, o como sesión dedicada de ~30 min.
