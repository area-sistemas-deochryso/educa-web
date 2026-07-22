# 471 — FE: triage inteligente en Errores (negocio/usuarios/regresión + cross-filter Heatmap↔Pareto + vista condicional)

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-22 · **Modo sugerido**: `/execute` (diseño ya cerrado en `educa-coord`)
> **Plan**: `../educa-coord/plans/xrepo-68-monitoreo-subpages-redesign.md` § F9
> **Origen**: sesión de rediseño del hub de Monitoreo (Cowork, 2026-07-22)
> **Depende de**: `Educa.API` brief 472 (F9 BE) — SOLO para las partes 1-3 de este scope (negocio/usuarios/regresión). Las partes 4-5 (cross-filter, vista condicional) son FE-only y pueden arrancar sin esperar al brief BE.
> **exclusive**: `false`
> **isolation**: `worktree`
> **touches**:
>   - componente(s) de `ErrorGroupsViewToggleComponent` (vista condicional)
>   - `ErrorGroupsStore` / facade de la feature de errores (nuevos campos + filtro)
>   - componente de tabla/kanban de grupos de error (columna usuarios únicos, badge negocio, badge regresión)
>   - `ErrorParetoChartComponent` (Chart.js) — agregar `onClick`

## Contexto

Ver brief BE 472 para el detalle completo de los tres gaps de datos (negocio vs bug real, usuarios únicos, regresión ya calculada pero no expuesta). Este brief cubre el lado FE: consumir esos campos nuevos una vez que el BE los expone, más dos piezas que no dependen del backend en absoluto.

Investigación de código previa (fork de solo lectura, 2026-07-22) confirmó lo siguiente sobre el terreno FE:

- El patrón de cross-filter **ya existe y funciona** para Heatmap→Tabla: `ErrorHeatmapComponent` emite `cellClick(dateIso)` → `ErrorGroupsComponent.onHeatmapCellClick()` setea un filtro en el `ErrorGroupsStore` compartido → cambia a vista Tabla → refetch server-side (patrón shipped en F8.2). Heatmap y Pareto ya comparten el mismo store singleton.
- `ErrorParetoChartComponent` usa Chart.js directo (no wrapper `p-chart`), que soporta `options.onClick(event, elements)` nativo — no hace falta ninguna librería nueva.
- `ErrorGroupsViewToggleComponent` hoy usa un default fijo `'kanban'` vía `storage.getErrorGroupsViewMode()`. `totalCount()` ya se carga junto con `loadData()`, así que el punto de entrada para la vista condicional es un `effect()` nuevo sobre esa señal (solo aplica cuando no hay preferencia persistida por el usuario).
- El store (`ErrorGroupsStore`, ~525 líneas, ya con `eslint-disable max-lines` documentado por el equipo) espeja 1:1 los DTOs del backend — agregar campos nuevos es mecánico una vez que el DTO los trae.

## Alcance

### IN

1. **Toggle "Ocultar errores de negocio"** (checkbox junto al ya existente "Ocultar ruido de infra"), que escribe el filtro `excluirNegocio` al store y dispara refetch. *(depende de BE 472)*
2. **Columna/indicador "usuarios únicos"** en Tabla y Kanban, y en el drawer de detalle (tab General o Group). *(depende de BE 472)*
3. **Badge de regresión** ("Reabierto" o similar) en Kanban/Tabla/drawer cuando `contadorPostResolucion > 0`. *(depende de BE 472)*
4. **Cross-filter Heatmap↔Pareto**: agregar `onClick` al `ErrorParetoChartComponent` — al clickear una barra, filtrar la lista de abajo por el grupo/fingerprint correspondiente, mismo patrón que `onHeatmapCellClick()`. Confirmar en `/execute` qué campo de filtro usa el store (hoy no existe filtro por `fingerprint`/`grupoId` — puede que haga falta agregarlo al store, evaluar si eso mueve este ítem a "depende de BE" si el filtro no puede resolverse solo client-side). *(FE-only si el filtro se resuelve client-side sobre los grupos ya cargados; si no, evaluar necesidad de query param nuevo)*
5. **Vista condicional por defecto**: `effect()` en `ErrorGroupsViewToggleComponent` (o donde corresponda tras revisar el componente) — si no hay preferencia persistida, usar `totalCount()` para decidir Kanban (manejable) vs Tabla (volumen alto). Umbral propuesto ~30-50 grupos activos, a confirmar/ajustar en `/execute`. *(FE-only)*

### OUT

- Heatmap-calendario → area/line apilado por severidad (requiere nuevo contrato BE, candidato a F10 si se prioriza — brief aparte).
- Marcador de deploy en el timeline — brief aparte.
- Clustering de causa raíz entre fingerprints — brief aparte, cambio de identidad de agrupación.
- Cualquier refactor del store/facade hacia subdominios más chicos (fuera de alcance, mencionado como deuda conocida pero no parte de F9).

## Criterio de cierre

- [ ] Toggle de negocio oculta/muestra grupos 4xx correctamente, verificado contra `TEST DB` con al menos un grupo real de cada tipo.
- [ ] Usuarios únicos visible en tabla/kanban/drawer, coincide con lo calculado por BE.
- [ ] Badge de regresión visible solo en grupos con `contadorPostResolucion > 0`.
- [ ] Click en barra del Pareto filtra la lista de abajo (Kanban/Tabla) al grupo correspondiente.
- [ ] Vista por defecto cambia de Kanban a Tabla cuando el volumen supera el umbral acordado, y respeta la preferencia persistida del usuario si existe.
- [ ] Build + lint + tests OK. Verificado en vivo en navegador (`TEST DB`, rol Administrador).

## Tiempo estimado

~3-4.5h (depende de si el cross-filter Pareto necesita filtro nuevo en store/BE o se resuelve client-side).

## Referencias

- Plan: `../educa-coord/plans/xrepo-68-monitoreo-subpages-redesign.md` § F9
- Brief BE del que depende parcialmente: `Educa.API/.claude/chats/open/472-be-error-groups-triage-inteligente.md`

## Cierre (2026-07-22)

- [x] Toggle "Ocultar errores de negocio" — verificado en vivo, `excluirNegocio=true` confirmado en la request de red.
- [x] Usuarios únicos visible en tabla/kanban/drawer con datos reales de `TEST DB`.
- [x] Badge "Reabierto" cuando `contadorPostResolucion > 0`.
- [x] Cross-filter Pareto→lista resuelto 100% client-side (reutiliza el filtro `q` existente, mismo patrón que el drill-down de Heatmap).
- [x] Vista condicional: umbral 40 grupos activos, respeta preferencia persistida.
- [x] Build + lint + tests OK (124/124 en el worktree; 15/15 archivos, 143/143 tests en `main` ya integrado con 472/473).
- [x] Verificado en vivo en navegador contra `TEST DB`, rol Administrador.

Implementado por agente en worktree (`chat/471-fe-error-groups-triage-inteligente`), sin git. Commit `acd719f5`, merge a `main` en `b8adb9fd`.
