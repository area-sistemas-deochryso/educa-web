---
id: 329
repo: educa-web
branch: feat/attendance-redesign
mode: execute
---

# Attendance redesign F4–F7

Continúa el redesign de `/intranet/asistencia` en branch `feat/attendance-redesign`. F1–F3 están implementadas y commiteadas.

## Features pendientes

### F4 — Justificación inline sin modal
Reemplazar el `<p-dialog>` de justificación por expansión inline de la fila. Al hacer click en una fila justificable, expandir in-place con campo de texto + guardar/cancelar. Componentes afectados: `attendance-day-list`, `attendance-persona-day-list`. Ambos tienen la lógica de diálogo (`dialogVisible`, `selectedEstudiante/Persona`, `observacionText`, `guardarJustificacion`, `quitarJustificacion`).

### F5 — Timeline heatmap mensual
Reemplazar la grilla semanal (`attendance-table`) por timeline horizontal con puntos coloreados por día, rachas, hover detalle. FE puro — los datos ya vienen del BE. Componente actual: `attendance-table.component`.

### F6 — Sidebar Director con conteos en vivo
Reemplazar el selectButton de roles (tabs horizontales: Estudiantes/Profesores/etc.) por panel lateral con conteos por grupo + alertas. Necesita endpoint BE de conteos por rol. Componente actual: `attendance-director.component` con su `@switch` sobre sub-componentes.

### F7 — Banner de cierre pendiente
Banner prominente si la hora de cierre pasó y no se cerró asistencia del día. FE + dato existente de cierres (`attendances-cierres.facade`).

## Contexto técnico

- Branch: `feat/attendance-redesign` (3 commits adelante de main)
- Layout actual: Dashboard → Tabs por rol → Legend-stats (clickeable, filtra tabla) → Filters bar (search + grado/sección + día + PDF + temporal nav) → Tabla directa
- `attendance-status-filter` component existe pero ya no se usa en day-list/persona-day-list (fue reemplazado por legend-stats clickeable)
- `activeStatus` signal se propaga desde cada padre director → legend-stats ↔ day-list/persona-day-list
