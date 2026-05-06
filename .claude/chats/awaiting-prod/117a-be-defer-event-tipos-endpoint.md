# BE — Endpoint catálogo de tipos de `EmailDeferEvent` (`GET /defer-events/tipos`)

> **Repo destino**: `Educa.API` master.
> **Estado**: ✅ cerrado local 2026-05-06 — `awaiting-prod/` esperando deploy Azure
> **Creado**: 2026-05-06 · **Modo sugerido**: `/investigate` → `/design` → `/execute` → `/validate`
> **Origen**: chat 113 cierre, decisión 3 mid-flow. Split de brief 117 cross-repo (Opción 2 — BE primero).
> **Bloquea a**: `117b-fe-defer-event-tipos-consume.md` (espera deploy Azure de este endpoint).

## CONTEXTO

El chat 113 detectó divergencia entre los tipos válidos que el BE genera y los que el FE declara como filtro:

| Capa | Constante | Valores |
|---|---|---|
| BE | `Educa.API/Constants/Sistema/EmailDeferEventTipos.cs` | `WARNING_DELAYED_24H`, `WARNING_DELAYED_72H`, `DOMAIN_BLOCKED`, `MAILBOX_FULL_TRANSIENT`, `SOFT_BOUNCE_RECURRENT` (5 valores) |
| FE | `educa-web/src/app/data/models/email-defer-event.models.ts` `EMAIL_DEFER_EVENT_TIPOS` | 8 valores que casi nunca matchean nada real |

La verdad operacional la inserta `DeferEventDetector` (Plan 37 Chat 1). Decisión: **el BE es la fuente de verdad** y el FE consume catálogo dinámico — cero drift, cambios futuros (`WARNING_DELAYED_48H`) no requieren redeploy FE.

## OBJETIVO

Exponer endpoint `GET /api/sistema/email-outbox/defer-events/tipos` con la lista canónica de valores `EDE_TipoEvento` que el BE realmente emite.

## ALCANCE

### IN

1. Constante `EmailDeferEventTipos.Validos` (array `string[]`) si no existe — debe contener solo los 5 tipos que el `DeferEventDetector` asigna como `EDE_TipoEvento`. **Excluir**:
   - `DetectadoParserImap` / `DetectadoSyncSmtp` (son `EDE_Origen`, no `EDE_TipoEvento`).
   - `DefaultDomainBlocked` u otros valores de fallback que no se persisten.
2. Endpoint nuevo `GET /api/sistema/email-outbox/defer-events/tipos` en `DeferEventController`:
   - Retorna `ApiResponse<string[]>` con `EmailDeferEventTipos.Validos`.
   - `[Authorize(Roles = Roles.Administrativos)]` + bulkhead `concurrency:notif` (alineado con el resto de `email-outbox`).
   - Cachear con `IMemoryCache` (TTL 1h) — tipos cambian rara vez, evita pegada repetida.
3. Tests:
   - 1 test auth (rechaza Profesor/Apoderado/Estudiante).
   - 1 test shape (200 + array no vacío + valores coinciden con la constante).
   - Si aplica, 1 test cache hit (segunda llamada no recompone).

### OUT

- Renombrar valores BE existentes (`MAILBOX_FULL_TRANSIENT` → `MAILBOX_FULL`). Si se decide después, brief separado con migración SQL.
- Cambios al FE — todo eso vive en `117b`.
- Tocar el endpoint de listado `GET /defer-events` (chat 113 ya lo dejó verde).

## ENTREGABLES

- 1 endpoint nuevo + 2-3 tests.
- Baseline +2 a +3 tests.
- `dotnet build` limpio. Suite verde salvo las 8 fallas pre-existentes documentadas en chat 113.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Otros endpoints BE consumen `EmailDeferEventTipos.Validos` y rompen al filtrar | Grep antes de filtrar, mantener compat si hace falta. |
| TTL 1h muy alto si se agrega tipo nuevo y queda invisible | 1h es aceptable — el deploy reinicia el cache de cualquier forma. Si urge invalidación, agregar endpoint admin de purge en otro brief. |

## VERIFICACIÓN POST-DEPLOY (para `/verify`)

- [ ] `GET /api/sistema/email-outbox/defer-events/tipos` con cookie de Director devuelve 200 + array de 5 strings.
- [ ] Mismo endpoint sin auth → 401/403.
- [ ] Los 5 valores coinciden con `EmailDeferEventTipos.Validos`.

## REFERENCIAS

- Constante BE: `Educa.API/Constants/Sistema/EmailDeferEventTipos.cs`.
- Pattern endpoint catálogo: revisar `RateLimitEventsController` si expone tipos similares.
- Origen split: brief 117 (cross-repo, dividido per Opción 2).
- Continúa en: `117b-fe-defer-event-tipos-consume.md` (FE) — esperar deploy Azure de este BE.
