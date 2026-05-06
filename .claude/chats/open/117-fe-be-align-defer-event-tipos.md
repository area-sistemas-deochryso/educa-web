# FE+BE — Alinear `EmailDeferEventTipos` entre frontend y backend (single source of truth)

> **Repo destino**: cross-repo (`Educa.API` master + `educa-web` main) — usar dos chats secuenciales, BE primero.
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-06 · **Modo sugerido**: `/investigate` → `/design` → `/execute` → `/validate`
> **Origen**: chat 113 (BE DeferEventController) — divergencia detectada al implementar.
> **Bloquea a**: ningún chat hoy. UX del filtro `Tipo` en `/intranet/admin/monitoreo/correos/defer-events` queda con dropdown irrelevante hasta resolver.

## CONTEXTO

El chat 113 detectó divergencia entre los tipos válidos que el BE genera y los que el FE declara como filtro:

| Capa | Constante | Valores |
|---|---|---|
| BE | `Educa.API/Constants/Sistema/EmailDeferEventTipos.cs` | `WARNING_DELAYED_24H`, `WARNING_DELAYED_72H`, `DOMAIN_BLOCKED`, `MAILBOX_FULL_TRANSIENT`, `SOFT_BOUNCE_RECURRENT` (5 valores) |
| FE | `educa-web/src/app/data/models/email-defer-event.models.ts` `EMAIL_DEFER_EVENT_TIPOS` | `DEFER_4XX`, `BOUNCE_5XX`, `MAILBOX_FULL`, `DOMAIN_BLOCKED`, `AUTH_FAILURE`, `TLS_FAILURE`, `TIMEOUT`, `OTHER` (8 valores) |

**Solo `DOMAIN_BLOCKED` coincide**. Los otros 7 valores del FE no existen en BD (el BE nunca emitirá esos strings) y los 4 valores reales que sí emite el BE no están en el dropdown del FE.

Consecuencias hoy:
- El dropdown de filtro `Tipo` en la UI muestra 8 opciones, 7 de las cuales nunca matchean nada.
- Los registros reales (`WARNING_DELAYED_24H`, `MAILBOX_FULL_TRANSIENT`, `SOFT_BOUNCE_RECURRENT`) caen al "OTHER" visual o se renderizan crudo.
- El filtro `tipo=BOUNCE_5XX` no devuelve nada nunca.

## OBJETIVO

Establecer **una sola fuente de verdad** para los tipos. La verdad operacional es lo que el BE emite — el `DeferEventDetector` (Plan 37 Chat 1) decide qué tipo asignar según el patrón del NDR.

## ALCANCE

### Decisiones de diseño previas (modo `/investigate` + `/design`)

1. **¿Quién es la fuente de verdad?** Default: el BE. Razón: los tipos los inserta el `DeferEventDetector` y nadie más puede agregarlos. El FE solo lee.
2. **¿Cómo se sincroniza?**
   - Opción A — **Endpoint de catálogo**: `GET /api/sistema/email-outbox/defer-events/tipos` → `string[]` con `EmailDeferEventTipos.Validos` (constante BE). El FE consume una vez al cargar la página y popla el dropdown dinámico.
   - Opción B — **Hardcode espejado**: el FE replica los 5 valores del BE en `EMAIL_DEFER_EVENT_TIPOS` y queda como deuda mantener sincronizado en cada cambio del BE.
   - **Recomendado**: Opción A. Cero riesgo de drift; cambios futuros en BE (agregar `WARNING_DELAYED_48H` por ejemplo) se reflejan en el FE sin redeploy.
3. **¿Hay valores que el BE deba renombrar?** Evaluar si `MAILBOX_FULL_TRANSIENT` (BE) debería simplificarse a `MAILBOX_FULL` (FE) para legibilidad. Si sí, hacer migración de datos con `UPDATE EmailDeferEvent SET EDE_TipoEvento = ...`. Documentar en el plan.

### IN (BE — chat A, primero)

1. Endpoint nuevo `GET /api/sistema/email-outbox/defer-events/tipos` en `DeferEventController`:
   - Retorna `ApiResponse<string[]>` con todos los valores de `EmailDeferEventTipos` (filtrar solo los `EDE_TipoEvento` válidos, NO incluir `DetectadoParserImap`/`DetectadoSyncSmtp` que son origen, ni `DefaultDomainBlocked` que es valor default).
   - Considerar exponer constante `EmailDeferEventTipos.Validos` (array) si no existe.
   - Mismo `[Authorize(Roles = Roles.Administrativos)]` y bulkhead `concurrency:notif`.
2. Tests: shape de respuesta, contenido coincide con la constante.

### IN (FE — chat B, después)

1. Reemplazar `EMAIL_DEFER_EVENT_TIPOS` const por un signal/observable poblado desde el endpoint nuevo.
2. Refactor del componente filtro para consumir la lista dinámica (probablemente `defer-events-tab.component.ts` y/o servicios relacionados).
3. Eliminar el type literal `DeferEventTipo` derivado o reescribirlo como `string` (el BE puede agregar valores nuevos y el FE no debería bloquear el render).
4. Smoke manual: dropdown muestra los 5 valores reales; filtros funcionan.

### OUT

- **Renombrar valores BE existentes**: si se decide hacerlo, brief separado con migración SQL formal. Este chat NO migra datos.
- **Borrar la constante FE**: dejarla como deprecated con un comentario apuntando al endpoint, hasta que todos los consumidores migren.

## ENTREGABLES

- BE chat A: 1 endpoint nuevo + 2-3 tests, baseline +3.
- FE chat B: refactor filtro + 0-1 spec actualizado.
- UX result: el filtro del timeline funciona realmente.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| El endpoint de catálogo agrega una request extra al cargar la página | Cachear con `IMemoryCache` (TTL 1h) — los tipos cambian rara vez. |
| Otros consumidores FE de `EMAIL_DEFER_EVENT_TIPOS` se rompen al cambiarlo | Grep cross-FE antes de borrar el const. Si hay consumidores, marcar deprecated y migrar gradualmente. |
| El usuario admin filtra con el dropdown viejo entre el deploy BE y FE | El `tipo` del query param es string libre — funciona igual mientras tanto, solo el dropdown UI queda visualmente atrasado. |

## REFERENCIAS

- Origen: chat 113 cierre, decisión 3 mid-flow.
- Constante BE: `Educa.API/Constants/Sistema/EmailDeferEventTipos.cs`.
- Constante FE: `educa-web/src/app/data/models/email-defer-event.models.ts`.
- Pattern existente de catálogo dinámico: `Educa.API/Controllers/Sistema/RateLimitEventsController.cs` expone tipos similares (verificar si vale como referencia).
- Componente FE: `educa-web/src/app/features/intranet/pages/admin/email-outbox/components/defer-events-tab/`.
