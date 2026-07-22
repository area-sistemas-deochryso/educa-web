# 464 — Fix 500 en `ReportesAsistencia/tendencia?rango=mes` al cruzar meses

> **Repo destino**: `educa-web` (backend real en `Educa.API`, repo hermano)
> **Creado**: 2026-07-21 · **Modo sugerido**: `/investigate` primero (localizar la colisión de clave exacta), luego `/execute`
> **exclusive**: `false`
> **isolation**: `false`
> **touches**:
>   - `Educa.API/Educa.API/Services/Asistencias/ReporteTendenciaAsistenciaService.cs` (o el archivo que agrupe por semana dentro de mes)
>   - posiblemente `educa-web/.../attendance-panel/services/attendance-panel.service.ts` (una vez arreglado el backend, remover el `catchError` de contención)
> **Validación prod**: ⏳ pendiente desde 2026-07-22 — smoke test manual de `GET /api/ReportesAsistencia/tendencia?rango=mes&fecha=2026-06-21&sedeId=1` (y otra fecha que cruce mes), confirmar 200 sin excepción.

## Contexto

Encontrado durante la implementación y validación del Panel de Asistencias (dashboard). El endpoint `GET /api/ReportesAsistencia/tendencia?rango=mes&fecha=YYYY-MM-DD&sedeId=N` devuelve **500** cuando el rango de fechas de referencia cruza el límite de un mes (reproducido con `fecha=2026-06-21`, mensaje de error real):

```
500 — "An item with the same key has already been added. Key: 04/06/2026 12:00:00 a.m."
```

Sospecha (no confirmada): el agrupamiento por "semana lunes-viernes dentro del mes" usa como clave de diccionario una fecha (`04/06/2026`) que se repite entre dos semanas — probablemente un bug de cálculo de `weekOfMonth`/límites de semana cuando la semana cae parcialmente fuera del mes de referencia, generando una clave duplicada en un `Dictionary`/`ToDictionary`/`GroupBy` en el servicio de tendencia.

## Impacto actual

Contenido, no bloqueante: el frontend (`attendance-panel.service.ts`) atrapa el error de esta llamada específica (la de "período anterior" para comparación) con `catchError`, y muestra "Comparación no disponible" en el tile de % Asistencia en vez de romper el panel completo. El resto del panel (gráfico, desglose) funciona con datos reales. Pero cualquier consumidor futuro de este endpoint en modo `mes` con una fecha que cruce el límite de mes se rompe.

## Scope

- Localizar la colisión de clave exacta en el cálculo de agrupación por semana (archivo de servicio de tendencia en `Educa.API`).
- Corregir para que cada punto de la serie tenga una clave única, incluso cuando la semana calendario cruza el límite de mes (revisar el criterio ya usado en `ProcesarSalonRango`/vistas existentes de reportes para ver si hay un criterio de "semana dentro de mes" ya establecido que evite este problema, y alinear con eso).
- Una vez arreglado, remover el `catchError` de contención en `attendance-panel.service.ts` (la comparación vs período anterior debería volver a funcionar en todos los casos, no solo cuando no cruza mes).

## Fuera de alcance

- No tocar el criterio de "semana lunes-viernes" en sí (eso ya fue decidido) — solo la colisión de clave.
- No tocar el modo Semana (no reproducido ahí).

## Criterio de cierre

- [ ] `GET /api/ReportesAsistencia/tendencia?rango=mes&fecha=<fecha que cruce mes>&sedeId=1` responde 200 sin excepción.
- [ ] Verificado con al menos 2 fechas de referencia distintas que crucen límite de mes.
- [ ] `attendance-panel.service.ts`: removido el `catchError` de contención en la llamada de comparación (o confirmado que ya no hace falta).
- [ ] Build backend + lint/build frontend OK.

## Tiempo estimado

Chico — probablemente 1 query/cálculo puntual, no arquitectura nueva.

## Hallazgos y cambios (2026-07-22)

**Causa real** (no era el cálculo de `weekOfMonth`, que ya usaba `SortedDictionary` + `TryGetValue` de forma segura): `IndexarPorDia` en `ReporteTendenciaAsistenciaService.cs` usaba `.ToDictionary(r => r.Fecha.Date, ...)`, que explota con `ArgumentException` ("An item with the same key has already been added") si una persona tiene **dos registros de asistencia con la misma fecha** (dato real — ej. doble marcación), no un bug de cálculo de límites de mes/semana.

El criterio ya establecido en `ProcesarSalonRango` (`ReporteFiltradoAsistenciaService.Estudiantes.cs`) tolera este caso con `foreach` + `TryAdd` en vez de `ToDictionary`. Se alineó `IndexarPorDia` con ese mismo patrón (conserva el primer registro del día, descarta duplicados en vez de tirar excepción).

**Cambios**:
- `Educa.API/Educa.API/Services/Asistencias/ReporteTendenciaAsistenciaService.cs` — `IndexarPorDia` reescrito con `TryAdd`.
- `educa-web/src/app/features/intranet/pages/admin/attendance-panel/services/attendance-panel.service.ts` — removido `catchError` de contención en `getTendenciaActualYPrevio` (ya no hace falta, la causa raíz del 500 está resuelta) + imports sin uso (`catchError`, `of`, `logger`) limpiados.

**Validado**: build `Educa.API` (proyecto principal) sin errores/warnings nuevos. `npm run lint` y `npm run build` de `educa-web` sin errores. Los 3 errores de `Educa.API.Tests` son preexistentes (constructor de otros controllers sin `capabilityService`, no relacionado a este cambio).

**Pendiente para el criterio de cierre**: no se pudo probar el endpoint real `GET /api/ReportesAsistencia/tendencia?rango=mes&fecha=...` en vivo (sin server+DB corriendo en este chat) — recomendado un smoke test manual con `fecha=2026-06-21` antes de dar por cerrado el criterio de cierre "responde 200 sin excepción".
