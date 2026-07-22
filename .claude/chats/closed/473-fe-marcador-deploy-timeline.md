# 473 — FE: marcador de deploy en timeline/Pareto de errores

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-22 · **Modo sugerido**: `/execute`
> **Plan**: `../educa-coord/plans/xrepo-68-monitoreo-subpages-redesign.md` § F11
> **Origen**: sesión de rediseño del hub de Monitoreo (Cowork, 2026-07-22)
> **Depende de**: `Educa.API` brief 474 (F11 BE) — no puede arrancar hasta que el endpoint de arranques exista
> **exclusive**: `false`
> **isolation**: `worktree`
> **touches**:
>   - `error-occurrence-timeline` (Chart.js scatter, shipped F8.4)
>   - `ErrorParetoChartComponent` si se decide sumar también ahí

## Contexto

Una vez que BE (brief 474) expone los timestamps de arranque de proceso (proxy de deploy), este brief los renderiza como líneas verticales / marcadores sobre el timeline de ocurrencias existente (`error-occurrence-timeline`, Chart.js scatter, shipped en F8.4). Confirmar en `/execute` si también aplica al Pareto o solo al timeline (el Pareto es un bar chart sin eje temporal continuo, probablemente no aplica ahí).

## Alcance

### IN

1. Consumir el endpoint de arranques de BE 474 para el rango de fechas visible.
2. Renderizar marcador vertical (línea + tooltip con la fecha) en `error-occurrence-timeline` por cada arranque dentro del rango.
3. Evaluar si aporta valor sumarlo también al gráfico apilado por severidad de F10 (brief 472) si ese brief ya shipeó — decidir en `/execute`, no bloquear este brief por eso.

### OUT

- Cualquier cambio al endpoint BE más allá de consumirlo.
- Distinguir tipos de eventos (deploy real vs reinicio manual) — el dato de BE ya viene como proxy único, sin esa distinción.

## Criterio de cierre

- [ ] Marcadores de arranque visibles en el timeline de ocurrencias, verificado contra al menos un arranque real en `TEST DB` (reiniciar el proceso localmente y confirmar que aparece).
- [ ] Build + lint + tests OK. Verificado en vivo en navegador.

## Tiempo estimado

~1.5-2h.

## Referencias

- Plan: `../educa-coord/plans/xrepo-68-monitoreo-subpages-redesign.md` § F11
- Brief BE del que depende: `Educa.API/.claude/chats/open/474-be-marcador-deploy-timeline.md`

## Cierre (2026-07-22)

- [x] Marcadores de arranque visibles en el timeline de ocurrencias — verificado en vivo con un arranque real del proceso local (línea vertical + tooltip).
- [x] Wireado solo en el diálogo de trend expandido, no en los sparklines mini (24-28px, ilegibles a esa escala) — decisión documentada.
- [x] No se sumó al chart apilado de F10 (brief 472) — evaluado y descartado, no bloqueó el cierre.
- [x] Build + lint + tests OK (2360/2361 en el worktree, único fallo confirmado flaky preexistente; verificado también en `main` ya integrado).
- [x] Verificado en vivo en navegador contra `TEST DB`.

Implementado por agente en worktree (`chat/473-fe-marcador-deploy-timeline`), sin git. Commit `0e7abb3e`, merge a `main` en `979b98bd`.
