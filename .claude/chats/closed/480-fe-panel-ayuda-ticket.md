# 480 — FE: sección Ticket del panel de ayuda

> **Repo**: `educa-web`
> **Creado**: 2026-07-25 · **Estado**: ⏳ pendiente arrancar
> **Modo sugerido**: `/design` acotado a esta fase → `/execute` → `/validate`
> **Plan**: `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` § F5
> **Origen**: sesión de definición + diseño del panel de ayuda de la intranet (educa-coord, 2026-07-24/25). F4 (shell + QA) ya shipped en `main` — ver `educa-web/.claude/chats/awaiting-prod/479-fe-panel-ayuda-qa-shell.md`. F2 (Ticket, BE) ya shipped en `Educa.API` — ver `contracts/api-catalog.md` § Ayuda en `educa-coord`.

## OBJETIVO
Implementar la sección "Generar ticket" del panel de ayuda: formulario de creación (tipo de problema, descripción 20-2000 caracteres, propuesta de mejora opcional) y vista de historial/estado de los tickets propios del usuario. El shell de navegación de 3 secciones ya existe (F4) — esta fase solo reemplaza el placeholder de la ruta `ticket` con el contenido real, sin tocar el shell ni la sección QA.

## PRE-WORK OBLIGATORIO
- Leer `../educa-coord/contracts/api-catalog.md` § Ayuda para el shape real de `GET /api/tickets/tipos`, `POST /api/tickets`, `GET /api/tickets/mios` (query params, request/response DTOs).
- Investigar el código de F4 (`src/app/features/intranet/pages/cross-role/ayuda/`) para entender el patrón ya establecido (facade con signals, servicio HTTP, componentes de sección) — replicar el mismo patrón para Ticket, no inventar uno nuevo. Mirar en particular `ayuda-ticket-placeholder.component.ts` (el placeholder a reemplazar) y `ayuda.routes.ts` (dónde se registra el `loadComponent`).
- Verificar el DTO real contra el código de `Educa.API` si el catálogo no alcanza en detalle (mismo patrón que F4 tuvo que hacer con `GET /api/faq`).

## DECISIONES YA TOMADAS (no rediscutir)
- El ticket es independiente del sistema de "Reportar" existente — no reusar esos componentes/formularios.
- Sin notificación activa al crear — no hace falta ningún feedback más allá de la confirmación de creación exitosa.
- El usuario ve solo sus propios tickets en el historial — no hay vista de bandeja admin en esta fase (eso es F7).
- Descripción: 20-2000 caracteres, validar en el formulario (no solo confiar en la validación del BE).
- Propuesta de mejora: opcional.

## ALCANCE
- Formulario de creación: selector de tipo de problema (poblado desde `GET /api/tickets/tipos`), textarea de descripción con validación de longitud y contador de caracteres, textarea opcional de propuesta de mejora, submit contra `POST /api/tickets`.
- Vista de historial: listado de los tickets propios del usuario (`GET /api/tickets/mios`) con su estado (pendiente/en revisión/resuelto) visible.
- Reemplazar el placeholder de la ruta `ticket` en `ayuda.routes.ts` con el componente real.
- Feedback de éxito/error al crear un ticket (patrón ya usado en otras partes de la intranet — toast/mensaje, no inventar uno nuevo).

## TESTS MÍNIMOS
- El formulario rechaza descripciones de menos de 20 o más de 2000 caracteres antes de hacer submit.
- Crear un ticket sin propuesta de mejora funciona (campo opcional).
- Después de crear un ticket exitosamente, aparece en el historial del usuario.
- El listado de tipos de problema se puebla desde el endpoint real, no hardcodeado en el FE.
- El historial muestra el estado de cada ticket.

## REGLAS OBLIGATORIAS
- No tocar el shell de navegación ni la sección QA (F4) más allá de reemplazar el placeholder de la ruta `ticket`.
- No implementar la sección Salud de sede (F6 — brief separada).
- No implementar vista de administración/bandeja (F7 — depende de F1+F2, no de esta fase).
- Seguir las convenciones ya establecidas por F4 (Angular Signals, patrón facade, estructura de carpetas por sección).

## IMPLEMENTATION DETAIL
Implementado en worktree `chat/480-fe-panel-ayuda-ticket`, commit `f6dec518`.
- **Files touched**: `ayuda.routes.ts` (ruta `ticket` apunta al componente real), nuevo `models/ticket.models.ts`, `services/ticket.service.ts`, `sections/ayuda-ticket/` (component + facade + specs), eliminado `sections/ayuda-ticket-placeholder/`.
- **Interfaces/signatures created or modified**: `TicketTipoDto`, `TicketDto`, `CrearTicketDto`, `TicketEstado` (`models/ticket.models.ts`); `TicketService.getTipos()/crear()/getMios()`; `AyudaTicketFacade` (facade con signals, mismo patrón que `AyudaQaFacade`); `AyudaTicketComponent`.
- **Architectural observations**: `AyudaTicketFacade.crear()` usa `WalFacadeHelper.execute({ consistencyLevel: 'server-confirmed' })` en vez de subscribe directo — lint custom rule `wal/no-direct-mutation-subscribe` lo exige para toda mutación (no estaba explícito en el brief, se descubrió al lintear). `server-confirmed` porque no hay estado local que renderizar optimistamente antes de que el BE asigne id/estado.
- **Current state**: lint/build/test verdes (233 test files, 2388 tests). Verificación en vivo diferida a la sesión conjunta F5+F6.

## APRENDIZAJES TRANSFERIBLES
- De F4: el patrón de facade con signals + servicio HTTP separado ya está establecido en `sections/ayuda-qa/` — replicarlo en `sections/ayuda-ticket/` en vez de inventar una estructura distinta.
- De F4: el catálogo `api-catalog.md` a veces no alcanza el nivel de detalle necesario (shape exacto del DTO) — si falta algo, leer el controller/DTO real de `Educa.API` en vez de asumir.
- De F4: hubo que resolver un gate de capability inesperado para que la página fuera accesible a todo usuario (truco `permissionPath: 'intranet'`) — la ruta `ticket` ya hereda ese mismo gate del shell padre, no debería hacer falta repetirlo, pero confirmarlo en `/design`.

## FUERA DE ALCANCE
- Shell de navegación y sección QA (F4 — ya shipped, no tocar).
- Sección Salud de sede (F6 — brief separada).
- Vista de administración/bandeja de tickets (F7 — brief separada).
- Cualquier cambio al sistema de "Reportar" existente.

## VALIDACIÓN FINAL
- `npm run lint` limpio.
- `npm run build` limpio.
- `npm run test` — tests mínimos de arriba pasando, sin romper la suite existente.
- Verificación en vivo diferida: el usuario pidió agrupar la verificación de F4+F5+F6 al final, después de que las 3 fases FE estén implementadas — no hace falta levantar servidores en esta fase, dejar el brief listo para esa verificación conjunta.

## VERIFICACIÓN EN VIVO (post `awaiting-prod`)
Hecha con `Educa.API` + `educa-web` corriendo contra TEST DB (usuario `CODE CLAUDE`, Administrador).
Creación de ticket, contador de caracteres, y aparición en "Mis tickets" con estado "Pendiente" — todo
funcionó, pero solo tras un fix real de backend encontrado en esta pasada: `CrearTicketDto` usaba
`[property: ...]` para las validaciones de `DataAnnotations`, lo cual rompe la validación automática
de ASP.NET Core sobre records (necesita el atributo en el parámetro del constructor, no en la
propiedad) — todo intento de crear un ticket tiraba 500. Corregido en
`Educa.API/DTOs/Ayuda/CrearTicketDto.cs` y `ActualizarEstadoTicketDto.cs` (commit `15801a77` en
`Educa.API`), con el test `TicketServiceTests.ValidateDto` reescrito para reflexionar sobre los
parámetros del constructor en vez de `Validator.TryValidateObject` (que solo ve metadata de
propiedades) — así el test ejercita el mismo camino que ASP.NET Core en runtime.

## CRITERIOS DE CIERRE
- [x] Validación final (lint/build/test) pasa, incluida verificación en vivo (ver arriba).
- [x] `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` actualizado marcando F5 como shipped.
- [x] Brief movido `awaiting-prod/` → `closed/`.
- [x] Commit final único: código + move del brief + update del plan en coord (si el flujo del repo lo permite en un solo commit; si no, dos commits atados por referencia, uno por repo).

## COMMIT MESSAGE sugerido
```
feat(educa-web): add ticket section to the help panel

Implements the "Generar ticket" section: creation form (tipo de
problema, descripción 20-2000 chars, propuesta de mejora opcional)
and own-history view, replacing the F4 placeholder route. Part of
xrepo-panel-ayuda-intranet F5.
```

## CIERRE
Al cerrar, pedir feedback sobre: si el patrón de facade de F4 se replicó sin fricción, y si el gate de capability heredado del shell funcionó sin tener que repetir el truco `permissionPath`.
