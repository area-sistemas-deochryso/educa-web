> **Origen**: Educa.API chat 300 · commit cb3652c1 · 2026-06-03
> **Plan**: —
> **Creado**: 2026-06-03 · **Chat**: 1 · **Estado**: ⏳ pendiente arrancar.

---

# Heatmap: consumir nuevo endpoint calendar + endDate

## CONTEXTO DEL CAMBIO

Educa.API ahora expone dos endpoints de heatmap:

1. `GET heatmap` — grilla semanal 7×24 (existente), ahora con `endDate` opcional.
2. `GET heatmap/calendar` — **nuevo**: una fila por día real. Response: `List<{ date, count, avgDurationMs }>`.

Ambos aceptan `days` (1-90, default 30), `endpoint` (filtro), `endDate` (default=hoy Perú).

## IMPACTO EN ESTE REPO

- Crear componente de calendar heatmap (grilla mensual: columnas=dow, filas=semanas del mes).
- Consumir `heatmap/calendar` para la vista mensual.
- Pasar `endDate` en ambas vistas (semanal y mensual) para navegación temporal.

## MODO SUGERIDO

`/design` — definir layout del calendar heatmap y cómo integra con la vista semanal existente.
