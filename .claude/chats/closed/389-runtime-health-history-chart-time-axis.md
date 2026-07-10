# 389 — Runtime health: eje X del historial no refleja el margen de tiempo real

> **Repos afectados**: `educa-web`
> **Plan**: n/a (bug puntual, no plan cross-repo)
> **Created**: 2026-07-10 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute` (diseño ya cerrado en chat previo — ver decisiones abajo)
> **exclusive**: `false`
> **modules**: `admin/sistema/runtime-health`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/sistema/runtime-health/components/runtime-health-history/`

## Contexto / causa raíz

Reportado por el usuario en `/intranet/admin/sistema/runtime-health` → tab "Historial": al cambiar entre los botones de período (30 min / 1 hora / 6 horas / 24 horas / 7 días), el backend responde con los datos correctos para el rango pedido, pero el eje X de los 3 gráficos (ThreadPool, Requests, GC) no representa correctamente ese margen de tiempo.

Investigado en vivo con browser automation (Chrome conectado, device `c196e000-756d-44d3-8b95-890c86133358`) + lectura de red + lectura de código en `educa-web` y `Educa.API`:

- **Causa confirmada**: `RuntimeHealthHistoryComponent` (`runtime-health-history.component.ts`) arma el eje X como **category scale** de Chart.js (`baseChartOptions()`, líneas 253-263, sin `type` explícito → default `'category'`). Las labels vienen de `formatTimestamp()` en `history-chart.helpers.ts:48-51`, que devuelve un string plano `"HH:mm"` **sin fecha ni timestamp real**.
  - Un category scale reparte los N puntos que llegan en un eje de índices equiespaciados, **sin importar cuánto tiempo real separa cada punto**. Si el rango pedido son 6 horas pero solo llegaron 167 puntos que cubren 2h45min reales (por un hueco de datos, ver abajo), el gráfico igual estira esos 167 puntos a todo el ancho del canvas — el eje nunca refleja el período seleccionado, solo la cantidad de puntos que volvieron.
  - Confirmado con la request real: click en "6 horas" dispara `GET /api/sistema/runtime-health/history?from=...&to=...&resolution=OneMinute` con `from`/`to` correctos (ventana de 6h), pero la respuesta trae solo 167 filas que cubren 11:41→14:27 UTC (2h45min), y el chart las muestra como si fueran las 6 horas completas.
- **Backend descartado como causa de este bug puntual**: `RuntimeHealthHistoryService.GetHistoryAsync` (`Educa.API/Services/Sistema/RuntimeHealthHistoryService.cs:17-25`) respeta bien `from`/`to`/`resolution`, no trunca ni pagina mal (`totalCount == returnedCount`, sin cap de `pageSize`). El comportamiento es correcto dado los datos que existen.
- **Hallazgo colateral, fuera de alcance de este brief**: hay un hueco real de ~3h15min sin filas en `RuntimeHealthSnapshot` hoy (08:26–11:41 UTC), pese a que el recorder corre cada minuto (`cron */1 * * * *`, confirmado en `RuntimeHealthAlertService.cs:21` y `HangfireExtensions.cs:226`) y el cleanup solo purga a los 7 días (`RuntimeHealthCleanupJob.cs:20`). Probablemente un reinicio/deploy interrumpió el recorder job. **No se investiga ni se arregla en este brief** — anotar para abrir brief aparte en `Educa.API` si se confirma que se repite.

## Decisiones de diseño ya cerradas (discutidas y acordadas con el usuario)

Se evaluaron 3 opciones para el eje X:

- **A — Linear scale con timestamps epoch, sin dependencias nuevas** ✅ ELEGIDA
- B — Time scale nativo de Chart.js (`type:'time'`) — descartada: requiere agregar `chartjs-adapter-date-fns` + `date-fns` (o `luxon`), y hoy no hay ninguna librería de fechas en el proyecto (`package.json` confirmado sin `date-fns`/`luxon`/`moment`/`chartjs-adapter-*`). Se decidió que agregar una librería solo se justifica para aritmética calendario-consciente o multi-timezone repetida en ≥3 features independientes — no es el caso acá, y el único uso de fechas en todo el codebase con eje de tiempo es este componente (confirmado por grep, cero precedentes).
- C — Rellenar huecos client-side manteniendo category scale — descartada: duplicaría en el frontend la lógica de bucketing que ya vive en `RuntimeHealthHistoryService.cs` (switch de `bucketMinutes`), acoplamiento frágil FE/BE.

**Trade-offs de la Opción A, ya aceptados explícitamente por el usuario:**
1. Los ticks no van a caer en números "redondos" (ej. `09:07`, `09:23` en vez de `09:00`, `09:15`) porque el scale `'linear'` no tiene noción de unidades de tiempo para snap. **Aceptado explícitamente — el usuario prefiere valores reales sobre valores redondeados.**
2. Chart.js va a seguir conectando con una línea recta los puntos separados por un hueco de datos (no va a mostrarse como espacio en blanco/quiebre visual), porque eso requeriría sintetizar puntos `null` en las posiciones vacías del grid esperado (parte de la Opción C). **Aceptado explícitamente — el usuario ya sabe leer el gráfico así y no quiere ese trabajo extra ahora.**

## Plan de implementación (cerrado)

### `history-chart.helpers.ts`
1. `buildDataset()` cambia de firma: recibe `points: {x: number; y: number}[]` en vez de `data: number[]`.
2. Reemplazar `formatTimestamp(ts: string): string` por `formatAxisTick(ms: number, range: HistoryTimeRange): string`:
   - `'30m' | '1h' | '6h'` → solo hora: `new Date(ms).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })` (igual que el comportamiento actual).
   - `'24h' | '7d'` → fecha + hora: `new Date(ms).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })` (esto también corrige el síntoma secundario visto en "7 días": labels sin fecha, ambiguas entre días distintos).

### `runtime-health-history.component.ts`
3. Importar `resolveTimeRange` desde `../../models/runtime-health.models` (ya existe y está exportada, usada hoy en `runtime-health.facade.ts:95`).
4. `baseChartOptions()`: calcular `min`/`max` (epoch ms) con `resolveTimeRange(this.timeRange())` y setear:
   ```ts
   x: {
     type: 'linear',
     min: fromMs,
     max: toMs,
     ticks: { color: textColor, maxTicksLimit: 10, callback: (v) => formatAxisTick(Number(v), this.timeRange()) },
     grid: { color: gridColor },
   }
   ```
5. `createCharts()`: reemplazar el array `labels` compartido — cada dataset arma sus propios puntos `{x: new Date(d.timestamp).getTime(), y: <métrica>}` en vez de usar `labels` + arrays paralelos de valores. Quitar `labels` de `data: {...}` en los 3 `new Chart(...)`.
6. `updateCharts()`: mismo cambio de mapeo a `{x,y}` para los 3 grupos de datasets (`dataGroups`). Además, **recalcular `min`/`max`** en cada llamada (vía `resolveTimeRange(this.timeRange())`) y aplicarlos a `chart.options.scales!['x'].min/max` antes de `chart.update('none')` — necesario porque "ahora" avanza con cada refresh/poll; si no se recalcula, el borde derecho del eje queda clavado en el momento de creación del chart.
7. El flujo de click-to-correlate (`onClick` → `elements[0].index` → `this.data()[idx]` en `selectedPointIndex`) **no cambia** — el índice del punto dentro del dataset sigue mapeando 1:1 al índice en `data()`, independiente del tipo de scale.

### Fuera de alcance (explícito)
- No se toca `resolveResolution()` ni `resolveTimeRange()` en `runtime-health.models.ts` (ya calculan bien from/to/resolution).
- No se toca el backend (`Educa.API`).
- No se sintetizan puntos `null` para huecos de datos (Opción C, descartada).
- No se investiga el gap de datos de hoy 08:26–11:41 UTC (hallazgo colateral, brief aparte si aplica).

## Criterio de cierre

- [x] Los 3 gráficos (ThreadPool, Requests, GC) usan `type: 'linear'` en el eje X con `min`/`max` anclados al `from`/`to` real de `resolveTimeRange(timeRange)`.
- [x] Las etiquetas del eje X muestran hora sola para 30m/1h/6h y fecha+hora para 24h/7d.
- [x] Verificación manual en browser (mismo flujo usado en la investigación): click en cada uno de los 5 botones de período y confirmar que el span visible del eje X corresponde al span real devuelto por el backend (comparar contra la request de red), no a "cuántos puntos volvieron estirados a todo el ancho". Verificado 1h/6h/24h/7d contra la request de red — span exacto en todos los casos.
- [x] El click-to-correlate (selección de un punto → panel de correlación) sigue funcionando igual que antes.
- [x] `ng lint` pasa.
- [x] `ng build` pasa.

## Tiempo estimado

~45 min (cambio acotado a 2 archivos, diseño ya cerrado — solo ejecutar).
