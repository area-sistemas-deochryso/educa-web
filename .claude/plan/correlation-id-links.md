> **Plan**: 32 · Fecha creación: 2026-04-24 · Estado: /design ✅ cerrado, Chat 2 BE listo para ejecutar
> **Repo principal**: `Educa.API` (master) para Chats 2-3 · `educa-web` (main) para Chat 4
> **Prioridad**: media — la cola activa (Plan 31 Chat 2, Plan 30 FE, Plan 24 Chat 4) no bloquea a Plan 32, pero tampoco lo bloquea este a ellos. Posición en la cola la define el usuario al iniciar el primer chat /execute.

# Plan 32 — Centralización de errores vía Correlation ID

## Objetivo

Hacer que el GUID `CorrelationId` deje de ser texto inerte en los dashboards
admin y se convierta en un hipervínculo navegable que cruza **4 fuentes**:
`ErrorLog`, `RateLimitEvent`, `ReporteUsuario` y (nuevo) `EmailOutbox`. Un
admin que vea un id en cualquier dashboard debe poder saltar al hub central
y ver los 4 tipos de eventos asociados a esa request en una sola vista.

Frase del usuario que motivó el plan:
> *"un id correlational que no se puede usar no sirve de nada"*

## Decisiones del /design (2026-04-24)

| # | Decisión | Detalle |
|---|----------|---------|
| 1 | Hub central | **Híbrido (C)**: pantalla dedicada `/intranet/admin/correlation/:id` + bloque "Eventos relacionados" enriqueciendo el drawer de `error-logs`. La pantalla cubre deep-linking; el bloque cubre el flujo diario |
| 2 | Modelo de navegación | **Hub-and-spoke**. Cada dashboard linkea al hub; el hub linkea de vuelta a cada dashboard filtrado con `?correlationId=` |
| 3 | Renderización del id | **Pill clickeable reusable** `<app-correlation-id-pill>` con `styleClass="tag-neutral"` (design-system A1 Opción C) + `aria-label` descriptivo (`rules/a11y.md`) |
| 4 | Empty state | **Inline** "No hay eventos asociados en {sección}". Las 4 secciones del hub siempre visibles con su contador. No esconder bloques ni banner |
| 5 | Endpoint BE | **Unificado** `GET /api/sistema/correlation/{id}` devolviendo `{errorLogs[], rateLimitEvents[], reportesUsuario[], emailOutbox[], generatedAt}` en `ApiResponse<T>` (INV-D08). Fail-safe INV-S07: si una tabla falla, retornar las otras tres |
| 6 | Filtrado | Query param `?correlationId={id}` en los 4 dashboards. URL portable + back button del browser funcional |
| 7 | Índices BD | 4 índices filtrados sobre columnas `*_CorrelationId`. Chat 3 BE arranca con SELECT previo sobre `sys.indexes` para saber cuáles ya existen (estado a confirmar) y solo crea los faltantes |
| 8 | Botón "Buscar en ErrorLog" existente | **Se consolida**: el handler `onBuscarEnErrorLog` (rate-limit-events) apunta al hub en vez de a `/trazabilidad-errores?correlationId=xxx`. Misma UX para los 4 dashboards |
| 9 | Reportes anónimos (INV-RU05) | Sin cambios. Test case específico para `REU_UsuarioReg = "Anónimo"` linkeable igual |
| 10 | Dirección inversa | Cubierta gratuitamente por el hub — muestra los 4 tipos en una vista |
| **11** | **EmailOutbox como 4ª fuente (scope extendido)** | **Agregar columna `EO_CorrelationId` a `EmailOutbox`** + hook en `EmailOutboxService.EnqueueAsync` que la setea desde `HttpContext.Items["CorrelationId"]` (ya lo provee `CorrelationIdMiddleware`). Registros históricos quedan `NULL` (no hay backfill posible). Chat 2 BE dedicado a esto. Cierra la deuda latente de falta de trazabilidad request → correo |

## Desglose de 4 chats

### Chat 1 `/design` ✅ cerrado 2026-04-24

Este mismo. Brief en `.claude/chats/042-plan-32-chat-1-design-correlation-id-links.md`
(movido a `closed/` al cerrar).

### Chat 2 BE — EmailOutbox gana `EO_CorrelationId` ✅ cerrado 2026-04-25

**Repo**: `Educa.API master`

**Scope**:

- Script SQL `ALTER TABLE EmailOutbox ADD EO_CorrelationId NVARCHAR(36) NULL;` mostrado al usuario antes de ejecutar (`rules/backend.md` § Migraciones)
- Modelo `Models/Sistema/EmailOutbox.cs`: agregar propiedad `EO_CorrelationId`
- Hook en `EmailOutboxService.EnqueueAsync` (o partial `.Enqueue.cs`): resolver el id desde `IHttpContextAccessor.HttpContext?.Items["CorrelationId"]`; dejar `null` si no hay request en curso (ej: background job, EmailOutboxWorker retry)
- DTOs de listado admin del outbox (`EmailOutboxRowDto` o equivalente): agregar `correlationId`
- Tests: enqueue con HttpContext setado, enqueue sin HttpContext (background), verificación de persistencia

**Criterios de cierre**:

- Tests BE verdes sin regresiones (baseline actual ~1373 verdes)
- Columna creada en BD del usuario (script ejecutado manual)
- Ninguno de los paths de enqueue existentes se rompe — se validan paths: asistencia regular (`ASISTENCIA`), corrección (`ASISTENCIA_CORRECCION`), reportes usuario (`REPORTE_USUARIO`), notificaciones admin si aplica

**Archivos previstos** (~4-5):

- `Models/Sistema/EmailOutbox.cs`
- `Services/Notifications/EmailOutboxService.cs` o `.Enqueue.cs` partial
- `DTOs/Sistema/EmailOutbox*Dto.cs`
- Scripts SQL en `scripts/` o comentario en el plan
- Tests: `Services/Notifications/EmailOutboxServiceEnqueueCorrelationTests.cs`

#### Resultado real (2026-04-25)

| Hallazgo | Detalle |
|---|---|
| Key del middleware | **No existía** en `HttpContext.Items`. El middleware solo inyectaba el id en el `BeginScope` del logger y en el header de RESPONSE `X-Correlation-Id`. Se agregó `public const string CorrelationIdItemKey = "CorrelationId"` al `CorrelationIdMiddleware` + `context.Items[CorrelationIdItemKey] = correlationId;` antes del `OnStarting`. El hook del service consume esta constante (no string mágico) |
| Listado admin del outbox | **Ya existía** (`EmailOutboxListaDto` consumido por `EmailOutboxService.ListarAsync`). Se extendió con `string? CorrelationId` y la proyección de `ListarAsync` lo hidrata. Chat 4 FE puede pintar la pill en la columna correspondiente sin crear endpoint nuevo |
| Archivos tocados | 6: `Middleware/CorrelationIdMiddleware.cs` (+key + Items), `Models/Sistema/EmailOutbox.cs` (+propiedad), `Services/Notifications/EmailOutboxService.cs` (+`IHttpContextAccessor?` en ctor + proyección DTO), `Services/Notifications/EmailOutboxService.Enqueue.cs` (+helper `ResolveCorrelationId` + asignación), `DTOs/Sistema/EmailOutboxListaDto.cs` (+`CorrelationId`), `Educa.API.Tests/Services/Notifications/EmailOutboxServiceEnqueueCorrelationTests.cs` (nuevo, 6 tests) |
| Tests | 6 nuevos + 1373 baseline = **1379 verdes**, 0 fallidos. Build sin warnings nuevos |
| Cap 300 | Respetado en todos los archivos: `EmailOutboxService.cs` queda ≈215 líneas; `Enqueue.cs` queda ≈140 |
| Deuda detectada | `EmailFailureLogger.ExtractCorrelationId` sigue leyendo el header `X-Correlation-Id` del **request** (no del response que el middleware escribe), lo que en producción puede devolver null si el cliente no manda ese header. **No se tocó** (fuera del scope) — registrar como deuda chica para Chat 3 BE o un chat aparte |
| Verificación post-deploy | Pendiente del usuario: ejecutar una request admin (login, submit reporte usuario) y correr `SELECT TOP 5 EO_CodID, EO_Destinatario, EO_CorrelationId, EO_FechaReg FROM EmailOutbox ORDER BY EO_CodID DESC;` para confirmar que las filas nuevas traen el id |

### Chat 3 BE — Endpoint `/correlation/{id}` + índices BD

**Repo**: `Educa.API master`

**Scope**:

- SELECT previo sobre `sys.indexes` para confirmar qué índices existen sobre `*_CorrelationId` en las 4 tablas
- Scripts SQL: crear los índices filtrados que falten (hasta 4)
- Nuevo `Controllers/Sistema/CorrelationController.cs` con `GET /api/sistema/correlation/{id}` · `[Authorize(Roles = Roles.Administrativos)]` · rate limit heredado del global
- Nuevo `Services/Sistema/ICorrelationService.cs` + `CorrelationService.cs`: 4 queries secuenciales `AsNoTracking()` envueltas cada una en try/catch independiente (INV-S07)
- Nuevo `DTOs/Sistema/CorrelationSnapshotDto.cs` + sub-DTOs por sección (`CorrelationErrorLogDto`, `CorrelationRateLimitEventDto`, `CorrelationReporteUsuarioDto`, `CorrelationEmailOutboxDto`)
- Nuevo `Services/Sistema/CorrelationSnapshotFactory.cs` con `BuildEmpty` (patrón Plan 30 `EmailDiagnosticoSnapshotFactory`)
- Métodos `ListarPorCorrelationIdAsync` en los 4 repositories donde no exista
- Tests: service con `TestDbContextFactory` (universo vacío, mix 4 fuentes, fail-safe cuando una tabla lanza excepción); controller authz por reflection

**Criterios de cierre**:

- Todos los tests verdes, suite BE sin regresiones
- Scripts SQL ejecutados en BD de prueba por el usuario
- Cap 300 líneas respetado. Si `CorrelationService` crece, extraer `CorrelationCorrelator` a clase separada (patrón Plan 30 `DiagnosticoCorreosDiaCorrelator`)

**Archivos previstos** (~8-10):

- `Controllers/Sistema/CorrelationController.cs`
- `Services/Sistema/ICorrelationService.cs` + impl
- `Services/Sistema/CorrelationSnapshotFactory.cs`
- `DTOs/Sistema/CorrelationSnapshotDto.cs` + 4 sub-DTOs
- 1-4 métodos nuevos en repositories existentes
- Scripts SQL
- Tests: `Services/Sistema/CorrelationServiceTests.cs`, `Controllers/Sistema/CorrelationControllerAuthorizationTests.cs`

### Chat 4 FE — Pantalla hub + pill + wiring en 4 dashboards

**Repo**: `educa-web main`

**Scope**:

- Nuevo feature `features/intranet/pages/admin/correlation/`:
  - `correlation.component.ts/html/scss` (page smart)
  - `services/correlation.service.ts`, `correlation.facade.ts`, `correlation.store.ts`, `correlation.models.ts`
  - `components/correlation-errors-section/`, `correlation-rate-limit-section/`, `correlation-reports-section/`, `correlation-email-outbox-section/` (presentacionales)
- Nuevo `shared/components/correlation-id-pill/` reusable: standalone, OnPush, inputs `id: string` + `compact: boolean`, click navega a `/intranet/admin/correlation/:id`, aria-label dinámico
- `features/intranet/pages/admin/error-logs/`:
  - `services/error-logs.store.ts`: leer `ActivatedRoute.queryParamMap.get('correlationId')` en init y setear filtro
  - `components/error-log-detail-drawer/`: reemplazar span mono por la pill + agregar bloque "Eventos relacionados" que linkea al hub
- `features/intranet/pages/admin/rate-limit-events/`:
  - `services/rate-limit-events.service.ts`: agregar filtro `correlationId` en GET
  - `services/rate-limit-events.store.ts`: leer query param en init
  - `components/rate-limit-table/`: pill en vez de span truncado + tooltip
  - `components/rate-limit-detail-drawer/`: pill; `onBuscarEnErrorLog` redirige al hub
- `features/intranet/pages/admin/feedback-reports/`:
  - Leer query param en init
  - Reemplazar el botón icono del drawer por la pill; el flujo "drawer reutilizado de error-logs" se mantiene como atajo secundario o se elimina (decidir en el chat)
- `features/intranet/pages/admin/email-outbox/` (o la ruta real de la bandeja):
  - Pill en la tabla (nueva columna si no existe)
  - Leer query param en init
- `features/intranet/intranet.routes.ts`: ruta `correlation/:id` con `permissionsGuard` heredando permiso de error-logs
- **Sin entrada de menú** — el hub es deep-link, no destino de navegación
- Tests: component tests del hub (render 4 secciones + 4 empty states); service test (carga snapshot); facade test (navegación por query param); pill test (aria-label dinámico + click navega)

**Criterios de cierre**:

- Tests FE verdes
- Lint + build OK
- Probar en browser (el agente no puede hacer esto, el usuario verifica):
  - Navegar rate-limit → hub desde drawer; back button vuelve a rate-limit con el filtro intacto
  - Navegar error-logs → hub desde drawer enriquecido
  - Navegar feedback-reports → hub
  - Navegar email-outbox → hub
  - Deep-link directo a `/correlation/xxx` fuera de contexto carga la vista
  - Con un CorrelationId ficticio que no existe en BD → los 4 empty states renderizan correctamente

**Archivos previstos** (~18-22):

Feature nuevo `correlation/` (~12 archivos), pill nuevo (~4 archivos), toques en 4 features existentes (~8-10 archivos), 1 fila en routes, ~5-6 archivos de test.

## Invariantes aplicables

| INV | Dónde se enforcea |
|-----|-------------------|
| `INV-RU03` | FE (feedback-report.facade existente): el submit del reporte usa el `correlationId` de la última request ANTES (no el POST del propio reporte). El hub lee el id tal cual lo persiste `ReporteUsuario` — no necesita tocar esta lógica, pero tests del hub deben cubrir el caso |
| `INV-RU05` | BE/tests: reportes anónimos (`REU_UsuarioReg = "Anónimo"`) linkeables igual con DNI null. Test case específico |
| `INV-ET01`, `INV-ET02` | BE: ya cubiertos por `GlobalExceptionMiddleware` y el endpoint `POST /api/sistema/errors` existentes. El endpoint de correlation solo lee |
| `INV-S07` | BE: `CorrelationService` envuelve cada una de las 4 queries en try/catch independiente + fallback a lista vacía con LogWarning. Test específico simulando excepción por tabla |
| `INV-D08` | BE: respuesta `ApiResponse<CorrelationSnapshotDto>` |
| `INV-D09` | BE: filtros `_Estado = true` donde la tabla tenga soft-delete (`EmailOutbox` no tiene, `ReporteUsuario` tampoco, `ErrorLog` y `RateLimitEvent` tampoco — confirmar en el chat) |
| Cap 300 líneas BE | Si `CorrelationService` crece, extraer correlator a clase separada |
| `rules/a11y.md` | FE: pill con `[pt]="{ root: { 'aria-label': 'Ver eventos del correlation id ' + id } }"` |
| `rules/design-system.md` A1 Opción C | FE: pill usa `styleClass="tag-neutral"` (informativo, no crítico) |
| `rules/dialogs-sync.md` | FE: si en revisión de diseño aparece algún drawer, NUNCA dentro de `@if` |
| `rules/code-language.md` | Nombres en inglés (`correlation-id-pill`, `CorrelationController`), URLs/UI en español (`/correlaciones/:id` queda en inglés también por ser deep-link admin, no visible al usuario final — aceptable) |

## Scripts SQL previstos

### Chat 2 BE

```sql
-- Nueva columna (sin backfill)
ALTER TABLE EmailOutbox ADD EO_CorrelationId NVARCHAR(36) NULL;
```

Registros históricos quedan `NULL`. Registros futuros traen el id desde el
middleware `CorrelationIdMiddleware` vía `IHttpContextAccessor`. El
`EmailOutboxWorker` al reenviar un correo existente NO sobrescribe el id
(conserva el de la request original).

### Chat 3 BE — mostrar SELECT primero, crear solo los faltantes

```sql
-- 0. Inspeccionar qué índices existen sobre columnas de correlation
SELECT t.name AS TablaName, i.name AS IndiceName, ic.key_ordinal, c.name AS ColumnaName, i.has_filter
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE t.name IN ('ErrorLog', 'RateLimitEvent', 'ReporteUsuario', 'EmailOutbox')
  AND c.name LIKE '%CorrelationId%'
ORDER BY t.name, i.name, ic.key_ordinal;

-- 1. Crear los que falten (ejemplos — ajustar según resultado del SELECT)
CREATE NONCLUSTERED INDEX IX_ErrorLog_CorrelationId
    ON ErrorLog(ERL_CorrelationId)
    WHERE ERL_CorrelationId IS NOT NULL;

CREATE NONCLUSTERED INDEX IX_RateLimitEvent_CorrelationId
    ON RateLimitEvent(CorrelationId)
    WHERE CorrelationId IS NOT NULL;

CREATE NONCLUSTERED INDEX IX_ReporteUsuario_CorrelationId
    ON ReporteUsuario(REU_CorrelationId)
    WHERE REU_CorrelationId IS NOT NULL;

CREATE NONCLUSTERED INDEX IX_EmailOutbox_CorrelationId
    ON EmailOutbox(EO_CorrelationId)
    WHERE EO_CorrelationId IS NOT NULL;
```

## Criterios de cierre del plan (al 100%)

- [x] Chat 1 `/design` ✅ — plan file creado, decisiones registradas
- [x] Chat 2 BE ✅ 2026-04-25 — `EO_CorrelationId` + hook en `EnqueueAsync` + 6 tests verdes (suite completa 1379/1379, baseline 1373 + 6). Commit `1ca1098` en `Educa.API master`
- [ ] Chat 3 BE — endpoint `/correlation/{id}` + 4 índices BD + tests verdes
- [ ] Chat 4 FE — hub page + pill + wiring en 4 dashboards + query param sync + tests verdes
- [ ] Navegación end-to-end probada en browser post-deploy
- [ ] Al menos 3 correlation IDs reales muestran eventos en los 4 segmentos simultáneamente
- [ ] Entrada en `.claude/history/` al cerrar

## Deudas laterales identificadas (fuera del scope de Plan 32)

- Menú admin no tiene "Correlaciones" — correcto, es deep-link.
- `EmailOutbox.EO_CorrelationId` histórico queda `NULL`. Aceptable — el valor es para correos futuros, y registros pre-deploy ya no son actionables de todos modos.
- `RateLimitEvent` podría tener más campos aprovechables en el hub (DNI enmascarado, rol, endpoint) pero el scope actual del hub muestra lo básico. Enriquecimiento futuro.
- Si en el futuro hay más tablas con `*_CorrelationId` (ej: hipotético log de auditoría de operaciones), sumarlas al hub es trivial: nuevo método de repo + sub-DTO + nueva sección FE. El patrón queda establecido.
- Los correos de `EmailOutboxWorker` retries NO generan nuevas filas — el id original se conserva. Si se quisiera distinguir "envío original" vs "retry" en el hub, sería deuda futura (el dato ya está en `EO_IntentosEnvio`).

## Commit message sugerido (chat de /design)

Solo commit de docs en `educa-web main` — el /design no toca código.

```
docs(plan): Plan 32 — correlation id cross-dashboard links

Plan file created with 11 design decisions + 4-chat breakdown
(1 design + 2 BE + 1 FE) to make CorrelationId navigable across
ErrorLog, RateLimitEvent, ReporteUsuario and EmailOutbox
dashboards. Hub-and-spoke navigation via new page
/intranet/admin/correlation/:id and reusable pill component.

Scope extended beyond the original brief: EmailOutbox gains
EO_CorrelationId column + hook in EnqueueAsync so the 4th source
correlates by GUID rather than via destinatario+fecha heuristic.
No backfill: historical rows stay NULL, new rows carry the id
from CorrelationIdMiddleware via IHttpContextAccessor.

Invariants: INV-RU03 preserved, INV-S07 fail-safe on each of the
4 queries, INV-D08/D09 on responses and reads, cap 300 per file.

Chat 2 BE first (EmailOutbox column) -- precondition of Chat 3
(endpoint cross-table + 4 filtered indexes). Chat 4 FE last,
wiring the UI with the pill component and query param filters.
```

Reglas de commit: inglés, español solo entre `"..."`, **sin `Co-Authored-By`**,
subject ≤ 72 chars.

## Cierre del /design

- [x] 11 decisiones explícitas acordadas con el usuario
- [x] Plan file creado en `.claude/plan/correlation-id-links.md`
- [ ] Plan 32 agregado al inventario del maestro + nota de cierre
- [ ] Posición en cola top 3 del maestro a definir con el usuario al cerrar
- [ ] Brief del chat movido a `.claude/chats/closed/`
- [ ] Commit de docs en `educa-web main`
