# 472 — FE: heatmap por severidad — area/line chart apilado

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-22 · **Modo sugerido**: `/execute`
> **Plan**: `../educa-coord/plans/xrepo-68-monitoreo-subpages-redesign.md` § F10
> **Origen**: sesión de rediseño del hub de Monitoreo (Cowork, 2026-07-22)
> **Depende de**: `Educa.API` brief 473 (F10 BE) — no puede arrancar hasta que el DTO exponga el desglose por severidad
> **exclusive**: `false`
> **isolation**: `worktree`
> **touches**:
>   - `ErrorHeatmapComponent` (o componente nuevo, a decidir en `/execute`)
>   - `ErrorGroupsViewMode` / toggle de vistas de la feature de errores

## Contexto

El heatmap-calendario actual muestra densidad por día sin distinguir severidad. Chart.js (ya usado en el proyecto, patrón `resource-stats-chart.component.ts`) soporta area/line apilado sin librería nueva. Una vez que BE (brief 473) expone el desglose por severidad por día, este brief cambia la visualización.

## Alcance

### IN

1. Confirmar en `/execute`, con el usuario, si el area/line apilado **reemplaza** el heatmap-calendario o se suma como vista alternativa dentro del mismo toggle (`Kanban | Tabla | Eventos | Heatmap | Priorización`). El heatmap-calendario tiene drill-down (click en celda → filtra tabla, shipped F8.2) — si se reemplaza, ese drill-down debe preservarse de alguna forma equivalente (ej. click en un punto del timeline).
2. Nuevo componente Chart.js (o extensión del existente) renderizando series apiladas por severidad (CRITICAL/ERROR/WARNING) a lo largo del tiempo.
3. Mantener el filtro de rango de fechas ya existente del heatmap.

### OUT

- Cambios al drill-down existente más allá de preservar su función equivalente.
- Cross-filter con el Pareto (eso es brief 471, F9, ya en curso/pendiente independiente).

## Criterio de cierre

- [ ] El chart apilado por severidad renderiza correctamente contra datos reales de `TEST DB`.
- [ ] Drill-down (o equivalente) sigue funcionando si se reemplazó el heatmap-calendario.
- [ ] Build + lint + tests OK. Verificado en vivo en navegador.

## Tiempo estimado

~1.5-2h.

## Referencias

- Plan: `../educa-coord/plans/xrepo-68-monitoreo-subpages-redesign.md` § F10
- Brief BE del que depende: `Educa.API/.claude/chats/open/473-be-heatmap-agregacion-severidad.md`

## Cierre (2026-07-22)

- [x] Chart apilado por severidad (Chart.js, CRITICAL/ERROR/WARNING) reemplaza el modo "Calendario" (30 días); el modo "Semanal" queda intacto (BE 473 solo agregó el desglose al DTO de calendario).
- [x] Drill-down preservado de forma equivalente (click en punto del chart en vez de celda de calendario), cero cambios en el wiring del padre.
- [x] Filtro de rango de fechas existente se mantiene.
- [x] Build + lint + tests OK (2367/2367 en el worktree; verificado también en `main` ya integrado).
- [x] Verificado en vivo en navegador contra `TEST DB`: chart apilado renderiza datos reales.

Implementado por agente en worktree (`chat/472-fe-heatmap-severidad-apilado`), sin git. Commit `1081cb8d`, merge a `main` en `360164e8`.
