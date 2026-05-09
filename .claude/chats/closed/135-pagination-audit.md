# Chat 135 — Auditoría de paginación de tablas (Plan 33 Chat 1)

> **Creado**: 2026-05-09 · **Cerrado**: 2026-05-09 · **Estado**: ✅ ship (retro-validación, cero código productivo).
> **Plan**: [pagination-audit.md](../../plan/pagination-audit.md) · archivado en [history/planes-cerrados.md#plan-33](../../history/planes-cerrados.md#plan-33--auditoría-de-paginación-de-tablas)
> **Repo**: `educa-web` (FE) · audit puro, sin cross-cut.

## Scope

Auditar las 8 features 🔍 del inventario en [pagination-audit.md](../../plan/pagination-audit.md):

1. `attendances admin` — `/intranet/admin/asistencias`
2. `attendance-reports cross-role` — `/intranet/profesor/reportes-asistencia` y `/director/...`
3. `email-outbox-diagnostico` — `/intranet/admin/email-outbox/diagnostico`
4. `email-outbox-dashboard-dia` — `/intranet/admin/email-outbox/dashboard-dia`
5. `attendance-day-list` (componente embebido)
6. `responsive-table` (componente shared)
7. `student-attendance-tab` — `/intranet/estudiante/...`
8. `attendance-summary-panel` (profesor)

Por cada feature aplicar el **test rápido** del plan (sección "Cómo decidir si una tabla necesita el fix"):

- ¿Tiene `<p-table [paginator]>` o `<p-paginator>` standalone?
- ¿El service envía `pagina` + `pageSize` al BE?
- ¿La response trae `total` o equivalente?

Clasificar cada feature como ✅ ya correcto / ✅ client-side (no aplica) / ❌ requiere fix.

## Plan de trabajo (modo sugerido: /investigate → /execute condicional)

1. **/investigate (audit puro)** — leer `.facade.ts` + `.service.ts` de las 8 features y emitir reporte clasificatorio.
2. **Decisión** — si aparecen ❌, presentar opciones (variante A wrapper vs B `/count`) por feature. Si todas son ✅, cierre como retro-validación.
3. **/execute** condicional — aplicar fixes solo donde sea FE puro (consumir endpoint que ya existe). Si requiere BE nuevo, splittear en sub-chats por repo.
4. **/validate** — lint + build + tests sobre los cambios.

## Criterios de cierre (de [pagination-audit.md](../../plan/pagination-audit.md))

- Cada fila 🔍 del inventario tiene status final ✅ o ❌+propuesta.
- Cada ❌ con fix tiene commit asociado y suite verde.
- Plan al 100% si todo el inventario queda ✅.

## Pre-work obligatorio

- Leer [rules/pagination.md](../../rules/pagination.md) — regla canónica.
- Leer fix de referencia: `Educa.API master 7e9d10b` + `educa-web main 1a13062`.

## No alcance

- Migrar features client-side a server-side por performance.
- Refactor entre variantes A↔B de wrappers existentes.
- Tests nuevos salvo si un fix introduce comportamiento nuevo (ej. `loadCount`).

---

## Resultado del audit (2026-05-09)

Las 8 features 🔍 quedan ✅. **Cero fixes requeridos**. Plan 33 cierra al 100%.

| # | Feature | Clasificación final |
| --- | --- | --- |
| 1 | `attendances admin` | ✅ Client-side (BE devuelve día completo, sin params paginación) |
| 2 | `attendance-reports cross-role` | ✅ Client-side (reporte estático sin paginación) |
| 3 | `email-outbox-diagnostico` (correos-día) | ✅ Client-side (`[paginator]="data().length > 5"`) |
| 4 | `email-outbox-diagnostico` (correo-individual) | ✅ Client-side (`[paginator]="data().length > 10"`) |
| 5 | `email-outbox-dashboard-dia` | ✅ Client-side (Top 50 hardcoded, sin paginador) |
| 6 | `attendance-day-list` | ✅ No aplica (presentacional, paga consumidor) |
| 7 | `responsive-table` | ✅ Client-side (wrapper genérico, slice local sobre `input()`) |
| 8 | `student-attendance-tab` | ✅ No aplica (presentacional) |

### Aprendizajes transferibles

- **El bug del paginador "Página 1 de 2"** solo afecta tablas server-side donde el BE recorta resultados sin exponer el total. Las tablas que reciben el array completo (incluso si lo pagina PrimeNG en cliente) están a salvo.
- **Componentes `responsive-table` y `attendance-day-list`** son shared/embebidos: la decisión de paginación vive en el consumidor, no en el componente. Cuando un consumidor migre a server-side, hay que verificar si pasa total real al wrapper, no asumir que el componente lo maneja.
- **Riesgo latente**: `email-outbox-dashboard-dia` está limitado a "Top 50 hardcoded" en BE. Si la operación crece, el cap silencia datos sin warning visible. Misma deuda en `rate-limit-events` (cap 500 en BE) según inventario del plan original.
- **Decisión de no extender alcance**: el plan explícitamente excluye migrar features client-side a server-side por performance. Cualquier dataset que pase el umbral (>500 filas) entra en plan dedicado, no en éste.

### Métricas de la sesión

- 1 archivo creado (este brief), 0 archivos productivos modificados.
- 3 archivos `.claude/` actualizados: `plan/maestro.md` (Plan 33 → archivado + cola priorizada actualizada), `history/planes-cerrados.md` (entry Plan 33), `plan/pagination-audit.md` queda como referencia histórica (no se mueve).
- Validación técnica: no aplica (cero código productivo). Lint markdown del propio doc: warnings preexistentes en maestro fuera de scope.
