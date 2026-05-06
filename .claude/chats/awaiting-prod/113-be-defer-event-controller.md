# BE — Crear `DeferEventController` para listar `EmailDeferEvent` desde admin UI

> **Repo destino**: `Educa.API` (master)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-06 · **Modo sugerido**: `/execute` → `/validate`
> **Origen**: smoke Cowork 2026-05-06 caso 066 ❌ (FE deployado, BE 404).
> **Bloquea a**: `/verify 066` (FE) — cierre del Plan 37 Chat 1.

## CONTEXTO

El Plan 37 Chat 1 BE construyó la pieza de detección y persistencia: `DeferEventService`, `DeferEventDetector`, `DeferEventService.Evaluate.cs`, modelo `EmailDeferEvent` + configuración EF + constants `EmailDeferEventTipos`. Todo está mergeado y desplegado.

El Plan 37 Chat 3 FE construyó la UI tab `/intranet/admin/monitoreo/correos/defer-events` con tabla server-paginated + filtros + Exportar CSV. La tabla intenta `GET /api/sistema/email-outbox/defer-events?page=1&pageSize=25` y recibe **404**. Smoke Cowork 2026-05-06 lo confirmó.

**Causa raíz**: nunca se creó un Controller en BE que exponga el listado. El servicio existe (`DeferEventService.cs`) pero solo lo consume el `BounceParserService` IMAP para persistir. La UI quedó huérfana.

## OBJETIVO

Exponer `GET /api/sistema/email-outbox/defer-events` (paginado server-side, con filtros) para que la UI 066 levante. Opcionalmente `GET /{id}` si la UI tiene drawer detalle.

## ALCANCE

### IN

1. **Nuevo controller** `Educa.API/Educa.API/Controllers/Sistema/DeferEventController.cs`:
   - `[Route("api/sistema/email-outbox/defer-events")]` — alineado con la URL que el FE ya consume (verificar en `educa-web/src/app/features/intranet/pages/admin/monitoreo/.../defer-events.service.ts`).
   - `[Authorize(Roles = Roles.Administrativos)]` — mismo nivel que el resto del bucket admin email.
   - Class-level `[EnableRateLimiting("concurrency:notif")]` — bulkhead alineado con resto de email-outbox controllers.
   - **Endpoint principal** `GET ?page=1&pageSize=25&tipo=...&dominio=...&desde=...&hasta=...&q=...`:
     - Devuelve `ApiResponse<PaginatedResult<EmailDeferEventListaDto>>`.
     - Filtros: `tipo` (multi-select de `EmailDeferEventTipos.Validos`), `dominio` (substring sobre `EDE_DominioReceptor`), `desde`/`hasta` (rango sobre `EDE_Fecha`), `q` (substring destinatario).
     - Sort default: `EDE_Fecha DESC`.
     - Cap `pageSize <= 100`.
   - **Endpoint count separado** (variante B de pagination.md): `GET /count?<mismos filtros>` → `ApiResponse<int>`. Usar la misma función privada `AplicarFiltros(IQueryable<EmailDeferEvent>, ...)` que el listado.
   - `CancellationToken cancellationToken` propagado (Plan 40 F3 cubre el patrón).

2. **DTO** `Educa.API/Educa.API/DTOs/Sistema/EmailDeferEventDtos.cs` (o donde corresponda):
   - `EmailDeferEventListaDto` con shape pequeño para tabla (TipoEvento, Destinatario enmascarado, Dominio, StatusCode, Fecha).
   - **Enmascarar destinatario** vía `MaskEmail()` helper — INV de privacidad vigente para Reportes de Usuario aplica análogo.

3. **Repositorio** `EmailDeferEventRepository` (interface + impl) en `Repositories/Sistema/`:
   - `Task<PaginatedResult<EmailDeferEvent>> ListarPaginadoAsync(...)`.
   - `Task<int> ContarAsync(...)`.
   - `AsNoTracking()`. Filtros compartidos vía método estático privado.
   - Si las queries pesan, `SetCommandTimeout(60)` (`HeavyReportTimeoutSeconds`).

4. **Service** `EmailDeferEventQueryService` o reutilizar el `DeferEventService` existente con métodos `Listar/Contar` que deleguen al repo. Decisión: si `DeferEventService` ya está acoplado al hot path de inserción, mejor crear `EmailDeferEventQueryService` separado (read path vs write path — alineado con la división de `ConsultaAsistenciaRepository` vs `AsistenciaRepository`).

5. **DI**: registrar repo + service en `ServiceExtensions.cs`.

6. **Tests**:
   - `Educa.API.Tests/Controllers/Sistema/DeferEventControllerTests.cs` — auth (rechazo 403 a Profesor), shape de respuesta, filtros aplican, paginación coherente.
   - `Educa.API.Tests/Repositories/Sistema/EmailDeferEventRepositoryTests.cs` — filtros compartidos entre listado y count (paridad estructural).

### OUT

- **Endpoint POST/DELETE** — los `EmailDeferEvent` se generan automáticamente por `BounceParserService`; admin no debería poder agregar manual. Si en el futuro se necesita "seed manual de prueba", brief separado.
- **Mutación de estado** — los eventos son inmutables (audit-only).
- **Exportar CSV** — el FE ya tiene botón, pero la implementación puede ser client-side (descargar lo que está en la tabla actual) o requerir endpoint dedicado. Decidir mid-chat según peso del CSV esperado.

## ENTREGABLES

- Controller + Service + Repo + DTO + tests (objetivo: 1641 → 1645+ verde).
- Smoke manual: `/intranet/admin/monitoreo/correos/defer-events` carga sin 404, filtros aplican, paginación responde.
- Doc: agregar entrada al inventario de endpoints en `educa-web/.claude/context/api-endpoints.md`.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Alguien decidió no exponer el endpoint a propósito (privacidad de NDRs) | Confirmar con usuario antes de empezar — si va, el endpoint queda restringido a Director/Admin |
| El FE consume un shape distinto al que diseñemos | Leer `defer-events.service.ts` antes de elegir el shape del DTO |
| Performance de la query con muchos eventos | Plan 39 ya creó índice; verificar `EDE_Fecha + EDE_TipoEvento` está cubierto |

## REFERENCIAS

- Origen: `chats/closed/066-plan-37-chat-1-be-parser-extension-defer-events.md` (versión cerrada al ✅ del verify-with-rollback).
- FE consumer: `educa-web/src/app/features/intranet/pages/admin/monitoreo/.../defer-events.service.ts`.
- Modelo: `Educa.API/Educa.API/Models/Sistema/EmailDeferEvent.cs`.
- Tipos válidos: `Educa.API/Educa.API/Constants/Sistema/EmailDeferEventTipos.cs`.
- Patrón de pagination con count separado: `educa-web/.claude/rules/pagination.md` §Variante B (referencia: `error-logs admin`).

---

## 🏁 CIERRE 2026-05-06 (estado: awaiting-prod)

### Entregables

- 8 archivos creados en BE (`Educa.API`):
  - `DTOs/Sistema/EmailDeferEventDtos.cs` — `EmailDeferEventFiltro` + `EmailDeferEventListaDto`.
  - `Interfaces/Repositories/Sistema/IEmailDeferEventRepository.cs` + `Repositories/Sistema/EmailDeferEventRepository.cs`.
  - `Interfaces/Services/Sistema/IEmailDeferEventQueryService.cs` + `Services/Sistema/EmailDeferEventQueryService.cs`.
  - `Controllers/Sistema/DeferEventController.cs` — `GET /api/sistema/email-outbox/defer-events`.
  - `Tests/Controllers/Sistema/DeferEventControllerAuthorizationTests.cs` — reflection-based auth (INV-AD06 análogo).
  - `Tests/Repositories/Sistema/EmailDeferEventRepositoryTests.cs` — filtros, orden y paginación.
- 1 archivo modificado (`Extensions/ServiceExtensions.cs`) — DI scope para repo + service.

### Validación

- ✅ `dotnet build` limpio (warnings de XML doc preexistentes, no introducidos).
- ✅ 13 tests nuevos verde.
- ✅ Suite total 1672 (1664 verde + 8 fallas pre-existentes en Plan 40 / RuntimeHealth — confirmado pre-existentes vía `git stash` sobre baseline limpio).

### Decisiones tomadas mid-flow

1. **Variante A wrapper en lugar de variante B con `/count` separado**: el FE consumer (`email-defer-events.service.ts`) ya pide `PaginatedResult<EmailDeferEventDto>` directamente. El brief mencionaba variante B pero habría sido dead code. Sin trabajo derivado.
2. **`CorrelationId = null` placeholder**: el modelo `EmailDeferEvent` no lleva `EDE_CorrelationId` físico — la correlación pasa por `EDE_EmailOutboxId` → `EmailOutbox.EO_CorrelationId`. Quedó null en este chat. → **Brief 116 abierto** para enriquecer con join.
3. **Tipos FE divergen del BE**: FE declara 8 valores (`DEFER_4XX`, `BOUNCE_5XX`, ...) mientras el BE solo emite 5 (`WARNING_DELAYED_24H`, `WARNING_DELAYED_72H`, `DOMAIN_BLOCKED`, `MAILBOX_FULL_TRANSIENT`, `SOFT_BOUNCE_RECURRENT`). El BE devuelve la verdad operacional; UX del filtro queda con dropdown irrelevante. → **Brief 117 abierto** para alinear vía endpoint de catálogo.
4. **Service split read/write**: `EmailDeferEventQueryService` separado del `DeferEventService` (write path). Alineado con `ConsultaAsistenciaRepository` vs `AsistenciaRepository`.
5. **Enmascarado de destinatario**: `EmailHelper.Mask()` aplicado en el mapper del DTO (privacidad — INV de Reportes de Usuario aplica análogo a NDRs).

### Aprendizajes transferibles

- **FE-first DTO contract**: cuando el FE consumer ya está mergeado, leer su shape (`*.service.ts` + `*.models.ts`) ANTES de decidir el shape del DTO BE evita inventar variantes que no se consumen. El brief decía "variante B" pero la verdad estaba en el FE.
- **Constantes cross-repo sin sync** son deuda silenciosa: cuando dos repos declaran constantes paralelas sin endpoint de catálogo, el drift es cuestión de tiempo. Default future: catálogo dinámico desde el primer día.
- **Reflection-based authorization tests** (patrón `EmailBlacklistControllerAuthorizationTests`) son el mecanismo barato para enforcar `[Authorize(Roles = Roles.Administrativos)]` sin levantar la suite de integración. Reusar.

### Gate post-deploy

Bloquea a `/verify 066` (chat closed previo de smoke Cowork). La validación post-deploy es:

- Deploy BE Azure (`Educa.API` master).
- Smoke: `/intranet/admin/monitoreo/correos/defer-events` carga sin 404, paginación responde, filtros aplican.
- Si verde → `/verify 113 ✅` mueve a `closed/` y reabre `/verify 066 ✅`.
