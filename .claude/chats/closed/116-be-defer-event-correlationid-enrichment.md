# BE — Enriquecer `EmailDeferEventListaDto.CorrelationId` con join a `EmailOutbox`

> **Validación prod**: ✅ verificada 2026-05-06 — smoke Cowork ronda 2.
> **Repo destino**: `Educa.API` (master)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-06 · **Modo sugerido**: `/design` → `/execute` → `/validate`
> **Origen**: chat 113 (BE DeferEventController) — decisión mid-flow shippeada con `CorrelationId = null` placeholder.
> **Bloquea a**: ningún chat (UX nice-to-have del timeline; cross-link entre defer-events y `/intranet/admin/correlation/{id}`).

## CONTEXTO

El chat 113 expuso `GET /api/sistema/email-outbox/defer-events` mapeando 8 de 9 campos del DTO que el FE espera. El campo `CorrelationId` (tipo `string | null` en el FE) se devolvió **siempre null** porque el modelo `EmailDeferEvent` no lleva la columna directamente — la relación pasa por `EDE_EmailOutboxId` → `EmailOutbox.EO_CorrelationId`.

El FE renderiza `null` graceful (no rompe la tabla) pero la columna queda muerta. Idealmente el admin que ve un evento defer puede saltar al hub de correlación (`GET /api/sistema/correlation/{id}`) — esa fue la intención del Plan 32 al cross-linkear `ErrorLog` + `RateLimitEvent` + `ReporteUsuario` + `EmailOutbox`.

## OBJETIVO

Enriquecer la query de `EmailDeferEventRepository.ListarPaginadoAsync` con un `Join` (o `Include` selectivo) a `EmailOutbox` para que cuando `EDE_EmailOutboxId` no sea null, el DTO devuelva el `EO_CorrelationId` correspondiente.

## ALCANCE

### IN

1. **Repo update** `Educa.API/Repositories/Sistema/EmailDeferEventRepository.cs`:
   - Cambiar el método para devolver una proyección que incluya `CorrelationId` desde `EmailOutbox`.
   - Decisión de diseño: ¿proyectar a tupla `(EmailDeferEvent, string?)` o crear un DTO interno `EmailDeferEventRow` con los campos del modelo + correlationId? Preferir lo segundo si simplifica el mapper del service.
   - Verificar que `EmailOutbox` tiene índice sobre `EO_CodID` (PK, sí) — el join queda barato.
   - Si `EDE_EmailOutboxId` es null → `CorrelationId = null`.

2. **Service update** `Educa.API/Services/Sistema/EmailDeferEventQueryService.cs`:
   - Adaptar `MapLista` para tomar el `correlationId` desde la nueva proyección.

3. **Tests update** `Educa.API.Tests/Repositories/Sistema/EmailDeferEventRepositoryTests.cs`:
   - Test nuevo: defer-event con `EDE_EmailOutboxId` apuntando a una fila `EmailOutbox` existente devuelve su `EO_CorrelationId`.
   - Test nuevo: defer-event con `EDE_EmailOutboxId = null` devuelve `correlationId = null`.
   - Test nuevo: defer-event con `EDE_EmailOutboxId` apuntando a un id inexistente (legacy) devuelve `correlationId = null` sin romper la query (left join semantics).

### OUT

- **Cambios al modelo `EmailDeferEvent`**: NO agregar columna física `EDE_CorrelationId`. La verdad del CorrelationId vive en `EmailOutbox` (Plan 32 ya lo definió ahí). Duplicar la columna invita a divergencia.
- **Cambio al FE**: el FE ya consume `correlationId` con tipo `string | null`. No hay que tocarlo — pasará de mostrar siempre null a mostrar el valor real cuando exista.
- **Endpoint nuevo** `/correlation/{id}`: ya existe (`CorrelationController` Plan 32). No es alcance de este chat.

## ENTREGABLES

- 1 repo modificado + 1 service modificado + 3 tests nuevos.
- Suite verde (objetivo: +3 tests sobre baseline post-chat 113).
- Smoke: defer-event con FK válida en `EDE_EmailOutboxId` debe devolver `correlationId` no-null en el listado.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Performance del join si la tabla `EmailOutbox` crece | `EDE_EmailOutboxId` es FK con índice; el join es por PK de la otra punta. EF lo resuelve con SARGable lookup. |
| `EmailOutbox` puede ser purgado antes que `EmailDeferEvent` | El service ya devuelve null en ese caso (left-join semantics) — no rompe la UI. |
| El FE espera `correlationId` con formato específico | Verificar que `EO_CorrelationId` tiene el mismo shape que el FE asume (UUID-like string). Plan 32 ya lo estandarizó. |

## REFERENCIAS

- Origen del placeholder: chat 113 cierre, decisión 2 mid-flow.
- Modelo: `Educa.API/Models/Sistema/EmailDeferEvent.cs:65` (campo `EDE_EmailOutboxId`).
- `EmailOutbox.EO_CorrelationId`: definido en Plan 31 Chat 1.
- `CorrelationController`: Plan 32 hub.
- Service consumer FE (read-only): `educa-web/src/app/features/intranet/pages/admin/email-outbox/services/email-defer-events.service.ts`.

---

## CIERRE — 2026-05-06

**Estado**: ✅ shipped local · `awaiting-prod` esperando deploy BE.
**Commit BE**: `Educa.API master 34274b3` (`feat(email-defer-events): resolve CorrelationId via left-join on EmailOutbox`).

### Implementación

- Nuevo `Models/Sistema/EmailDeferEventRow.cs` (proyección row con `Event` + `CorrelationId`).
- `IEmailDeferEventRepository.ListarPaginadoAsync` ahora retorna `IReadOnlyList<EmailDeferEventRow>`.
- `EmailDeferEventRepository`: `GroupJoin` + `SelectMany(DefaultIfEmpty)` contra `EmailOutbox` por `EDE_EmailOutboxId == EO_CodID`. Left-join semantics preservan filas con FK null o FK purgada.
- `EmailDeferEventQueryService.MapLista(EmailDeferEventRow)` extrae `CorrelationId` de la fila proyectada (antes hardcoded a null).

### Tests

- 5 tests existentes adaptados (`items[0].EDE_*` → `items[0].Event.EDE_*`).
- 3 tests nuevos:
  - `Listar_ConEmailOutboxIdValido_ResuelveCorrelationId` — FK válida → CorrelationId del outbox.
  - `Listar_ConEmailOutboxIdNull_DevuelveCorrelationIdNull` — FK null → null sin crash.
  - `Listar_ConEmailOutboxIdInexistente_DevuelveCorrelationIdNullSinRomper` — FK stale (outbox purgado) → null, no filtra la fila.
- Suite repo: 8/8 verde · suite email completa: 317/317 verde.

### Verify post-deploy

1. Ir a `/intranet/admin/monitoreo/correos/defer-events`.
2. Confirmar que algunas filas (las que tengan FK a outbox vivo) muestran `correlationId` no-null.
3. Click en `correlationId` debería deep-linkear al hub `/intranet/admin/correlation/{id}` (Plan 32).

### Aprendizaje transferible

- EF Core InMemory provider tolera `GroupJoin + DefaultIfEmpty` con proyección a sealed class no-tracked sin issues. No requiere navigation property en el modelo.
- Mantener la verdad de `CorrelationId` en `EmailOutbox` (sin duplicar columna en `EmailDeferEvent`) preserva la semántica del Plan 32: el hub es la única fuente; los satélites linkean por id.
