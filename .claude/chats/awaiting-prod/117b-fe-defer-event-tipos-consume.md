# FE — Consumir catálogo dinámico de tipos de `EmailDeferEvent`

> **Repo destino**: `educa-web` main.
> **Estado**: ✅ cerrado local 2026-05-06 — `awaiting-prod/` esperando deploy de `117a` BE a Azure + deploy FE.
> **Creado**: 2026-05-06 · **Modo sugerido**: `/execute` → `/validate`
> **Origen**: chat 113 cierre, decisión 3 mid-flow. Split de brief 117 cross-repo (Opción 2 — FE después).
> **Depende de**: `117a-be-defer-event-tipos-endpoint.md` desplegado a producción y verificado.

## CONTEXTO

El BE chat A (`117a`) expone `GET /api/sistema/email-outbox/defer-events/tipos` con la lista canónica de `EDE_TipoEvento` que el `DeferEventDetector` realmente emite (5 valores). El FE hoy declara 8 valores hardcodeados en `EMAIL_DEFER_EVENT_TIPOS` que casi nunca matchean nada real.

## OBJETIVO

Reemplazar `EMAIL_DEFER_EVENT_TIPOS` const por consumo dinámico del endpoint catálogo. Dropdown de filtro `Tipo` muestra los 5 valores reales y filtros funcionan.

## ALCANCE

### IN

1. Service / facade para `GET /defer-events/tipos`:
   - Tipo de respuesta: `string[]`.
   - Cache local in-memory (signal o `shareReplay` con TTL razonable, ej 1h o "una vez por sesión") — no pegar el endpoint en cada apertura del filtro.
2. Refactor componente filtro (`defer-events-tab.component.ts` y/o servicio relacionado):
   - Reemplazar el const por el signal/observable poblado desde el endpoint.
   - Loading state mientras carga el catálogo (skeleton o disabled del dropdown).
3. Eliminar/relajar el type literal `DeferEventTipo`:
   - Si se usa en muchos lugares: tipar como `string` directo (el BE puede agregar valores y el FE no debe bloquear render).
   - Si se usa en pocos: borrar y dejar que TypeScript infiera del array dinámico.
4. Marcar `EMAIL_DEFER_EVENT_TIPOS` como deprecated con comentario apuntando al endpoint, hasta confirmar que no quedan consumidores. Borrar en commit posterior si grep limpio.
5. Smoke manual: dropdown muestra los 5 valores reales, filtros aplican correctamente.

### OUT

- Cambios al BE — vive en `117a`.
- Renombrar valores (`MAILBOX_FULL_TRANSIENT` → `MAILBOX_FULL`). Brief separado.

## ENTREGABLES

- 1 service/facade (o método nuevo en uno existente) + signal/observable de catálogo.
- Refactor componente filtro.
- Quizás 1 spec actualizado.
- UX result: filtro funciona realmente.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Otros consumidores FE de `EMAIL_DEFER_EVENT_TIPOS` se rompen | Grep cross-FE antes de borrar, marcar deprecated y migrar gradual. |
| Endpoint catálogo falla → dropdown vacío | Fallback a array vacío + log; el filtro `tipo` query param es string libre, sigue funcionando manual. |

## VERIFICACIÓN POST-DEPLOY

- [ ] `/intranet/admin/monitoreo/correos/defer-events` → dropdown `Tipo` muestra los 5 valores reales.
- [ ] Filtrar por cualquiera de los 5 valores → tabla responde con datos coherentes.
- [ ] No quedan consumidores de la constante FE deprecated (grep `EMAIL_DEFER_EVENT_TIPOS` limpio o solo el archivo que la define con comentario deprecated).

## REFERENCIAS

- BE chat A: `chats/awaiting-prod/117a-be-defer-event-tipos-endpoint.md` (cuando se cierre BE).
- Constante FE actual: `educa-web/src/app/data/models/email-defer-event.models.ts`.
- Componente FE: `educa-web/src/app/features/intranet/pages/admin/email-outbox/components/defer-events-tab/`.
