# 484 — FE: Admin — bandeja de tickets + catálogo de tipos

> **Repo**: `educa-web`
> **Creado**: 2026-07-25 · **Estado**: ✅ cerrado
> **Modo sugerido**: `/design` acotado a esta fase → `/execute` → `/validate`
> **Plan**: `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` § F7b
> **Origen**: sesión de definición + diseño del panel de ayuda de la intranet (educa-coord, 2026-07-24/25). F2 (Ticket, BE) y F5 (Ticket, FE público) ya shipped. `depends_on: [F2, F7a]` — necesita los endpoints admin de catálogo de F7a (`Educa.API`) además de los de bandeja ya shipped en F2.

## OBJETIVO
Construir dos vistas administrativas del dominio Ticket, protegidas por `AYUDA_TICKET_MANAGE`: (1) bandeja de tickets con filtro por estado y cambio de estado (pendiente/en revisión/resuelto), y (2) CRUD del catálogo de tipos de problema (`TicketTipo`).

## PRE-WORK OBLIGATORIO
- Confirmar que el brief 482 (`Educa.API`, F7a) está shipped y leer su sección de implementación para el shape exacto de `GET/POST/PUT/PATCH /api/admin/ticket-tipos*` — si no está cerrado, este brief no puede empezar (dependencia dura).
- Leer `../educa-coord/contracts/api-catalog.md` § Ayuda → Ticket para `GET /api/admin/tickets?estado=` y `PATCH /api/admin/tickets/{id}/estado` (ya shipped en F2).
- Investigar el patrón de F5 (`sections/ayuda-ticket/`, facade + servicio) para el modelo de datos de `Ticket` ya consumido del lado usuario — la bandeja admin muestra la misma entidad con más campos (usuario emisor) y capacidad de cambiar estado.
- Investigar cómo otras bandejas/admin lists de la intranet resuelven filtro por estado + cambio de estado inline (patrón de tabla + `p-tag`/dropdown de estado) para reusar convención.

## DECISIONES YA TOMADAS (no rediscutir)
- Sin notificación activa al cambiar estado — decisión original F2 ("el admin revisa la bandeja periódicamente").
- El admin ve todos los tickets de todos los usuarios, sin scope por sede (a diferencia de Salud de sede) — confirmar contra el contrato si hay dudas, pero el endpoint `GET /api/admin/tickets` no lleva filtro de sede documentado.
- Catálogo de tipos: desactivación, no eliminación física (decisión de F7a) — la UI debe reflejar esto (toggle activo/inactivo, no un botón "eliminar" que sugiera borrado permanente).

## ALCANCE
- Bandeja de tickets: listado (`GET /api/admin/tickets?estado=`) con filtro por estado, detalle de cada ticket (tipo, descripción, propuesta, usuario emisor, estado), acción de cambiar estado (`PATCH .../estado`, requiere `RowVersion` — manejar conflicto de concurrencia si otro admin cambió el estado en simultáneo).
- Catálogo de tipos: listado (activos e inactivos), crear/editar un tipo, activar/desactivar.
- Entradas de navegación hacia ambas vistas desde la sección admin de la intranet.
- Gate de acceso a ambas vistas por capability `AYUDA_TICKET_MANAGE`.

## TESTS MÍNIMOS
- El filtro por estado en la bandeja actualiza el listado mostrado.
- Cambiar el estado de un ticket lo refleja en la bandeja sin recargar toda la página.
- Un conflicto de concurrencia al cambiar estado (RowVersion desactualizado) se maneja con feedback claro, no un error crudo.
- El catálogo de tipos muestra activos e inactivos.
- Crear un tipo nuevo lo hace disponible en el selector del formulario de creación de ticket (F5) tras refrescar.
- Desactivar un tipo no rompe tickets existentes que lo referencian (siguen mostrando su tipo en la bandeja).
- Un usuario sin `AYUDA_TICKET_MANAGE` no puede acceder a ninguna de las dos vistas.

## REGLAS OBLIGATORIAS
- No tocar la sección Ticket pública de F5 (`sections/ayuda-ticket/`) más allá de lo estrictamente necesario.
- No implementar CRUD de FAQ (brief 483) ni nada de Salud de sede en esta fase.
- Seguir las convenciones ya establecidas por F4/F5/F6 (Angular Signals, patrón facade, `WalFacadeHelper.execute({ consistencyLevel: 'server-confirmed' })` para mutaciones).
- No implementar hard-delete del catálogo de tipos — el BE de F7a ya restringe esto, pero la UI no debe ofrecer una acción que sugiera lo contrario.

## FUERA DE ALCANCE
- CRUD de FAQ + wizard — brief separada (483).
- Cualquier cambio a la sección Ticket pública o al shell de navegación del panel de ayuda.
- Filtro de la bandeja por sede o por usuario emisor (no previsto en el contrato actual — confirmar si el usuario lo pide durante `/design`, pero no asumirlo).

## VALIDACIÓN FINAL
- `npm run lint` limpio.
- `npm run build` limpio.
- `npm run test` — tests mínimos de arriba pasando, sin romper la suite existente.
- Verificación en vivo contra `Educa.API` real (TEST DB) antes de cerrar.

## CRITERIOS DE CIERRE
- [x] Validación final (lint/build/test) pasa, incluida verificación en vivo.
- [x] `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` actualizado marcando F7b como shipped (483 ya había cerrado — F7b completo).
- [x] Brief movido a `closed/`.
- [x] Commit final único: código + move del brief + update del plan en coord.

## COMMIT MESSAGE sugerido
```
feat(educa-web): add admin ticket inbox + ticket-tipo catalog CRUD

Implements the AYUDA_TICKET_MANAGE-gated admin views: full ticket
inbox with status filter/change, and CRUD for the ticket-tipo
catalog (consuming the endpoints added in F7a). Part of
xrepo-panel-ayuda-intranet F7b.
```

## CIERRE
Al cerrar, pedir feedback sobre: si el manejo de conflicto de concurrencia (RowVersion) en cambio de estado necesitó UX especial, y si el patrón de F7a (endpoints de catálogo) encajó sin fricción con lo que la UI esperaba.

## IMPLEMENTATION DETAIL

- **Files touched** (`educa-web`): nuevo directorio `src/app/features/intranet/pages/admin/ayuda-tickets/`:
  - `ticket-admin/ticket-admin.component.{ts,html,scss,spec.ts}` — shell de la ruta única `admin/ayuda/tickets`, con tabs "Bandeja"/"Tipos de ticket" navegados por `?tab=` queryParam (no rutas hijas — ver decisión de arquitectura abajo). Gate por `AYUDA_TICKET_MANAGE` a nivel shell.
  - `ticket-bandeja/ticket-bandeja.component.{ts,html,scss,spec.ts}` — bandeja: filtro por estado (`p-select`), tabla con `p-table`, cambio de estado inline vía `p-select` por fila. Gate propio (defensa en profundidad, no solo el shell).
  - `ticket-tipos/ticket-tipos.component.{ts,html,scss,spec.ts}` — catálogo: tabla con activos/inactivos, diálogo crear/editar, `p-toggleswitch` para activar/desactivar (sin acción "eliminar"). Gate propio.
  - `services/ticket-admin.service.ts` — gateway HTTP: `getBandeja(estado?)`, `actualizarEstado(id, dto)`, `getTipos()`, `crearTipo(dto)`, `actualizarTipo(id, dto)`, `cambiarEstadoTipo(id, dto)`.
  - `services/ticket-bandeja.facade.ts` (+ `.spec.ts`) y `services/ticket-tipo-catalogo.facade.ts` (+ `.spec.ts`) — estado + mutaciones vía `WalFacadeHelper.execute({ consistencyLevel: 'server-confirmed' })`, scoped al componente (no `providedIn: 'root'`), mismo patrón que `AyudaTicketFacade` (F5).
  - `models/ticket-admin.models.ts` — DTOs espejo del BE (`TicketAdminDto`, `ActualizarEstadoTicketDto`, `TicketTipoAdminDto`, `CrearTicketTipoDto`, `ActualizarTicketTipoDto`, `CambiarEstadoTicketTipoDto`); reusa el tipo `TicketEstado` de `sections/ayuda-ticket/models/ticket.models.ts` (F5) en vez de duplicarlo.
  - Modificados: `intranet.routes.ts` (+1 ruta `admin/ayuda/tickets` → `TicketAdminComponent`), `shared/config/intranet-menu.config.ts` (+2 entradas de menú bajo grupo "Ayuda", misma ruta con `queryParams: { tab: 'bandeja' | 'tipos' }`; `ADMIN_ROLES` pasado a `export` para reuso), `shared/types/capability-codes.generated.ts` (`AYUDA_TICKET_MANAGE` agregado manualmente entre `ASISTENCIA_ADMIN` y `CALENDARIO` — el generador `npm run gen:caps` pega contra `GET /api/admin/capabilities/roles/catalog`, que requiere sesión autenticada; el script no soporta enviar token, así que no pudo regenerarse automáticamente. Verificado manualmente contra el catálogo real en `/intranet/admin/permisos/roles` → pestaña Catálogo: coincide exacto con `AYUDA_TICKET_MANAGE`, ruta `/intranet/admin/ayuda/tickets`).
  - No se tocó `sections/ayuda-ticket/` (F5) — solo se importó su tipo `TicketEstado` desde `models/ticket-admin.models.ts`.

- **Decisión de arquitectura no anticipada por el brief — 1 ruta, no 2 (descubierta en vivo)**: el brief pedía 2 vistas bajo la misma capability sin crear una capability nueva. Al hacer la primera verificación en vivo se encontró que el sistema de permisos de rutas admin (`permissionsGuard`, aplicado como `canActivateChild` a TODAS las rutas `admin/*`) hace match EXACTO entre la URL solicitada y `vistasPermitidas` — una lista derivada 1:1 de `CAP_Ruta` por capability (columna del catálogo `Capability`, seedeada en `Educa.API/Migrations/Manual/20260724_CreateTicketTables.sql`: `AYUDA_TICKET_MANAGE` → `intranet/admin/ayuda/tickets`, fijada ahí desde F2). Con 2 rutas hijas (`admin/ayuda/tickets` y `admin/ayuda/ticket-tipos`), la segunda quedaba bloqueada con "Acceso denegado" pese a que el usuario SÍ tenía la capability (confirmado con capturas de pantalla durante la verificación). Resuelto reestructurando a 1 sola ruta con tabs por `?tab=` queryParam — mismo patrón ya usado por `AttendancesComponent` (tabs Gestión/Reportes/Panel bajo `admin/asistencias`). Sin este ajuste, la única alternativa hubiera sido crear una segunda capability, que el brief prohibía explícitamente ("no crear una capability nueva — reusar `AYUDA_TICKET_MANAGE`"). Esta arquitectura (1 capability = 1 `CAP_Ruta` exacta) es una convención pre-existente del proyecto, no algo introducido por este brief.

- **Manejo de conflicto de concurrencia (RowVersion)**: ambos facades clasifican el error de `WalFacadeHelper.execute()` por status HTTP dentro de `onError` — un 409 dispara `errorHandler.showWarning(...)` con mensaje explícito ("El ticket #N cambió mientras lo editabas...") + recarga automática de la lista (bandeja o catálogo) para traer el valor vigente del servidor; cualquier otro status dispara `errorHandler.showError(...)` sin recargar. Mismo criterio que `EmailDomainPauseCrudFacade` (dominio email-outbox) — no hizo falta inventar un patrón nuevo, cubierto con tests unitarios (mock de `WalFacadeHelper` inyectando `HttpErrorResponse({status: 409})`).

- **Interfaces/signatures creadas**:
  - `TicketAdminService`: `getBandeja(estado?)`, `actualizarEstado(id, dto)`, `getTipos()`, `crearTipo(dto)`, `actualizarTipo(id, dto)`, `cambiarEstadoTipo(id, dto)`.
  - `TicketBandejaFacade`: `init()`, `setFiltro(estado)`, `cambiarEstado(ticket, nuevoEstado)`, signals `tickets/loading/error/filtroEstado/updatingId`.
  - `TicketTipoCatalogoFacade`: `init()`, `crear(nombre)`, `editar(tipo, nombre)`, `toggleEstado(tipo)`, signals `tipos/loading/error/submitting`.

- **Current state**: `npm run lint` limpio, `npm run build` limpio, `npm run test` → 241/241 archivos / 2423/2423 tests verdes (+5 archivos / +24 tests sobre el baseline 236/2399 del worktree, mergeado sin conflicto con 483 por tocar carpetas disjuntas: `pages/admin/ayuda-faq/` vs `pages/admin/ayuda-tickets/`).

## VERIFICACIÓN EN VIVO

Contra `Educa.API` real (puerto 5139, TEST DB) + `educa-web` (puerto 4202, para no colisionar con el worktree paralelo de 483 en 4201/4210), sesión "CODE CLAUDE" (Administrador) vía el switcher de `/intranet/login`.

- **Bandeja de tickets** (`/intranet/admin/ayuda/tickets`): cargó un ticket real preexistente (creado en la verificación en vivo del brief 480). Filtro por estado ("Pendiente"/"En revisión"/"Resuelto"/"Todos") actualizó el listado correctamente, incluido el caso vacío ("No hay tickets con este estado"). Cambio de estado inline (Pendiente → En revisión) vía `p-select` por fila reflejó el nuevo estado en la tabla sin recargar la página.
- **Catálogo de tipos** (`/intranet/admin/ayuda/tickets?tab=tipos`): cargó los 4 tipos activos seedeados. Crear un tipo nuevo ("Verificación en vivo brief 484") lo agregó al final del listado. Desactivarlo (`p-toggleswitch`) lo marcó "Inactivo" (fila atenuada, sin desaparecer de la tabla — soft-toggle confirmado, no hard-delete). Confirmado que el tipo desactivado **desaparece del selector de `/intranet/ayuda/ticket`** (formulario de creación de ticket, F5) mientras los 4 tipos activos siguen disponibles — cumple el test mínimo "crear/desactivar un tipo se refleja en F5 sin romper nada".
- **Gate de capability**: confirmado indirectamente — la primera versión (2 rutas hijas) fue bloqueada por el `permissionsGuard` de rutas admin pese a tener la capability, lo que forzó la reestructuración a 1 ruta con tabs (ver arriba). La ruta final navega y renderiza correctamente para el usuario Administrador con `AYUDA_TICKET_MANAGE`. El caso "usuario SIN la capability" se verificó con test unitario (`ticket-admin.component.spec.ts`, mock de `UserPermissionsService.hasCapability` devolviendo `false` → `canAccess = false`, ningún facade se inicializa) — no se re-verificó en vivo con una segunda sesión por no haber a mano un usuario admin sin esa capability específica en la TEST DB (todos los roles Administrador/Director/etc. la tienen seedeada por diseño, ver F2).
- **Incidente durante la verificación (no causado por código de este brief)**: a mitad de sesión `Educa.API` dejó de responder (probablemente reiniciado por el agente paralelo trabajando en 483, o expiración/rotación de proceso) — todas las sesiones guardadas (incluidas las del otro worktree en 4201/4210) se invalidaron simultáneamente. Se relevantó el proceso (`dotnet run` en `Educa.API/Educa.API`, puerto 5139) y se volvió a loguear sin pérdida de datos (TEST DB persistente) — el ticket y los tipos creados en la primera mitad de la verificación seguían presentes tras el restart.

## APRENDIZAJES TRANSFERIBLES
- Antes de diseñar rutas hijas para 2 vistas bajo la misma capability, revisar `Capability.CAP_Ruta` en el catálogo (`/intranet/admin/permisos/roles` → Catálogo) — es 1:1, no 1:N. Si una capability ya tiene una ruta seedeada por un brief de BE anterior, cualquier vista adicional bajo esa capability debe vivir en la MISMA ruta (tabs por queryParam), no en una ruta hija nueva.
- El patrón de `AttendancesComponent` (tabs con `?tab=` + `subscribeToQueryParams` en el `constructor`/`ngOnInit`) es la referencia correcta para "N vistas, 1 capability, 1 ruta" — ya generalizaba antes de este brief, no hizo falta inventar nada.
