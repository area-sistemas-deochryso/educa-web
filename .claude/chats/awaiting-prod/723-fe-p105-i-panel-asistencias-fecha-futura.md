# 723 — P105-I — Aviso de fecha aún no alcanzada en panel de asistencias

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` (idea I)
> **Created**: 2026-09-29 · **Estado**: ✅ implementado, validación prod pendiente.
> **MODO SUGERIDO**: `/design` (el plan P105 exige diseño antes de ejecutar; luego `/execute`)
> **exclusive**: `false`
> **modules**: `attendance`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/attendances/**` (tab `panel`)

## Scope

### educa-web
- Al filtrar el panel (`/intranet/admin/asistencias?tab=panel`) por rango mes/semana que incluye fechas futuras, mostrar un indicador de que esa parte del rango aún no ocurrió (faltan datos por tiempo, no por error).
- `/design`: decidir forma (banner, nota bajo el filtro, marca en las celdas) y regla exacta (rango parcialmente futuro vs. totalmente futuro).

## Pre-work

- Leer invariantes de asistencia relevantes en `educa-coord/invariants/` solo si el aviso depende de reglas de cierre/periodo.

## Out of scope

- Cambios de datos o BE. Otros tabs de asistencias.

## Criterio de cierre

- [ ] `/design` resuelto y decisiones registradas en el brief antes de escribir código.
- [ ] FE: lint + build + tests OK, comportamiento verificado en vivo (local + BBDD de prueba).
- [ ] `plans/maestro.md` y fila de la idea I en el plan P105 actualizados.

## Tiempo estimado

~45 min.

## Decisiones de /design (2026-09-29)

- **Forma**: nota informativa (`role="status"`) bajo la fila de filtros, justo antes de los KPIs; no se marcan celdas (los charts ya muestran vacío).
- **Regla** (solo Semana/Mes; Día queda fuera del brief):
  - Fin de periodo = viernes de la semana de `fecha` (Semana, Lun-Vie) o último día del mes (Mes).
  - `hoy` dentro del periodo y antes del fin → **parcial**: "Los datos llegan hasta hoy (dd/mm); el resto del periodo aún no ocurrió."
  - Inicio de periodo posterior a `hoy` → **total**: "Este periodo aún no comienza; no hay datos que mostrar."
  - Periodo ya terminado → sin aviso.
- **Implementación**: función pura `getFutureNotice(rango, fecha, hoy)` en `utils/future-period.util.ts` (testeable sin TestBed) + `computed` en el componente. Sin cambios en facade/BE.

## Cierre

> **Validación prod**: ⏳ pendiente desde 2026-09-29

- Lint, 8 tests nuevos (`future-period.util.spec.ts`) y `ng build`: OK.
- Pendiente: verificar en `/intranet/admin/asistencias/panel` (Semana/Mes, periodo actual y futuro) que la nota aparece y el texto es correcto.
- Supuesto a confirmar: la semana del panel es Lun-Vie (por comentario en `attendance-panel.service.ts`); si el BE usa Lun-Dom, el aviso de sábado/domingo sería incorrecto.
