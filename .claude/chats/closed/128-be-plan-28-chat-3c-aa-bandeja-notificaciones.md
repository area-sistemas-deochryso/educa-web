# 128 · Plan 28 Chat 3c BE — Bandeja outbox AA + notificaciones masivas

> **Creado**: 2026-05-07 · **Estado**: ⏳ pendiente arrancar · **Repo**: `Educa.API` (master)
> **Split**: parte 3 de 3 del Chat 3 (3a reportes ✅ / 3b correos ✅ pre-req / 3c bandeja+notif).
> **Bloqueado por**: Chat 3b (necesita el tag `TipoEntidadOrigen='AsistenciaAsistenteAdmin'` ya en BD para que las queries devuelvan algo).

## Modo sugerido

`/investigate → /execute → /validate`. Antes de tocar código, confirmar qué falta vs qué ya viene gratis del modelo polimórfico de outbox.

## Contexto

3a habilitó visibilidad AA en reportes. 3b habilitó correos de corrección AA. 3c cierra el lado admin: la bandeja `/intranet/admin/email-outbox` debe **filtrar/agrupar** correos AA por separado, y el flujo de notificaciones masivas (envío manual desde admin) debe permitir incluir AA como destinatarios.

## Pre-work obligatorio (puede reducir el alcance)

1. **Investigar bandeja**:
   - Leer `EmailOutboxStatusService` y endpoints relacionados (`Controllers/Sistema/...` o `EmailOutboxController`).
   - **Hipótesis fuerte**: las queries ya son polimórficas por `EO_TipoEntidadOrigen` (string libre). Solo hay que **verificar** que los AA (3b ya emitiendo `'AsistenciaAsistenteAdmin'`) aparecen en bandeja sin código nuevo.
   - Si las queries hacen filtros explícitos `IN ('Asistencia', 'AsistenciaProfesor')`, agregar `'AsistenciaAsistenteAdmin'`.
   - Si hay agrupaciones de UI por `TipoEntidadOrigen`, agregar etiqueta legible "Corrección Asistente Admin" en algún catálogo.

2. **Investigar notificaciones masivas**:
   - Leer `NotificacionesService` (en `Services/Sistema/` o `Services/Notifications/`) y su DTO de destinatarios.
   - Buscar endpoint `POST /api/Notificaciones` o similar y ver si tiene parámetro `audiencias` / `roles` que ya soporte rol "Asistente Administrativo" o si filtra por una whitelist.
   - **Hipótesis débil**: probable que las notificaciones masivas ya admiten enviar a roles arbitrarios via `DIR_UsuarioReg` filtrando. Verificar.

## Alcance estricto de 3c (depende del pre-work)

### Bandeja (probable trabajo bajo)

- Si las queries son polimórficas → agregar tests contract: la bandeja muestra correos con `TipoEntidadOrigen='AsistenciaAsistenteAdmin'` (mock + integration).
- Si hay filtros explícitos → agregar `'AsistenciaAsistenteAdmin'` a los catálogos.
- Si hay UI summary por tipo → agregar etiqueta legible.

### Notificaciones masivas (depende del modelo)

- **Si NotificacionesService ya parametriza por rol/lista de destinatarios**: agregar tests + verificar que rol "Asistente Administrativo" entra al universo de destinatarios.
- **Si hay whitelist hardcoded de roles**: extender whitelist con `Roles.AsistenteAdministrativo` (constante existe en `Constants/Auth/Roles.cs`).
- **Si NO hay flujo de notificaciones masivas a AAs hoy**: documentar como out-of-scope y escalar al Plan 28 Chat 5 (cierre invariantes/docs) — no inventar un flujo nuevo en este chat.

## Lo que NO entra en 3c

- ❌ FE de la bandeja (Chat 4 FE).
- ❌ Autorización condicional INV-AD08 (Chat 5).
- ❌ Crear flujo de notificaciones nuevo si no existe — solo extender lo que hay.

## Riesgo

El alcance "bandeja" y "notificaciones" del brief original era vago. Si el pre-work confirma que **ambas son no-ops** (queries ya polimórficas + notif ya soporta rol), 3c se reduce a **2-3 tests contract** y un commit chico de docs. No forzar trabajo donde no hace falta.

## Validación esperada

- Build BE limpio.
- Suite verde (excepto los 8 Bulkhead preexistentes).
- Tests nuevos (~3-6 dependiendo de qué hace falta): contract bandeja AA visible, contract notif AA elegible si aplica.
- Smoke local: bandeja muestra correo AA emitido en 3b correctamente (mismo ID).

## Salida esperada

- Plan 28 BE 100% en master.
- Chat 4 FE 100% destrabado (admin UI + self-service AA).
- Plan 28 Chat 5 puede arrancar: docs INV-AD08/AD09 + entrada §17 Excel paridad.

## Referencias

- Plan 28 fila en `plan/maestro.md`.
- 3b cerrado: `chats/closed/127-be-plan-28-chat-3b-aa-correos-dispatcher.md` (cuando ocurra).
- INV-AD05/06/08 en `business-rules.md §15.9`.
