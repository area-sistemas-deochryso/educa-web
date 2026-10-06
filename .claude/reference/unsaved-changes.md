# Avisar antes de perder cambios sin guardar

Patrón reutilizable (brief 769, P105 D1) para formularios que el usuario edita y puede abandonar sin guardar. Primer uso: asistencia del hub de curso del profesor.

## Qué cubre cada mecanismo

No es un solo mecanismo. Cada camino de pérdida necesita el suyo:

| Camino de pérdida | Mecanismo | Quién pregunta |
|---|---|---|
| Salir de la ruta (menú, atrás, otra ruta, cambio de path-param) | `canDeactivate: [pendingChangesGuard]` | `component.confirmLeave()` |
| Cerrar o recargar la pestaña del navegador | `@HostListener('window:beforeunload')` | El navegador (texto genérico, no personalizable) |
| Estado interno que reemplaza lo editado (selector de franja, datepicker) | Llamar al prompt desde el handler | `UnsavedChangesPromptService.confirmProceed()` |
| Un valor **derivado** que cambia solo (franja resuelta por reloj o por sondeo de contenido, sin `?horarioId=`) | Fijarlo en la URL al primer cambio sucio (`CursoHubShellBase`, `navigateToSlot`) | Nadie: ya no hay cambio que avisar |

`canDeactivate` **no corre** con un cambio solo de query-params ni cuando una ruta hija reemplaza a otra. Por eso el guard va en la ruta que **es dueña de las ediciones**, nunca en las pestañas, y los cambios de query (p. ej. `?horarioId=`) se cubren aparte en el handler que los dispara. `runGuardsAndResolvers: 'paramsOrQueryParamsChange'` no es una salida: re-corre también los `canActivate`/resolvers del padre.

Cambiar de pestaña **no pierde** ediciones si el estado vive en un store `root` y el shell es quien resetea al destruirse. Verificar eso antes de poner un guard en las pestañas.

## Piezas

| Pieza | Dónde | Rol |
|---|---|---|
| `HasPendingChanges` | `@core/guards` (`core/guards/pending-changes/`) | Capacidad: `hasPendingChanges()` + `confirmLeave(): Promise<boolean>`. Sin dependencias de UI. |
| `pendingChangesGuard` | `@core/guards` | `CanDeactivateFn<HasPendingChanges>`; solo delega en el componente. |
| `UnsavedChangesPromptService` | `@intranet-shared/services` | `confirmProceed({ message, canSave, save }): Promise<boolean>` sobre `EduConfirmationService`. |
| Tercera acción y `dismiss` en `EduConfirmation` | `@edu-ui` | Ver `reference/eduui.md`. |

El guard **no inyecta el diálogo**: el `EduConfirmationService` suele estar provisto en el componente que hospeda `<edu-confirm-dialog />`, y un guard corre en el injector de rutas. Por eso el componente implementa `HasPendingChanges` y es dueño del aviso.

## Cómo adoptarlo en otro formulario

1. El componente de la ruta implementa `HasPendingChanges`:
   - `hasPendingChanges()` lee el estado «dirty» (idealmente un `computed` del store que compara contra la línea base cargada/guardada, como `AttendanceCourseStore.registroDirty`).
   - `confirmLeave()` llama a `confirmProceed(...)`.
2. Proveer `EduConfirmationService` y `UnsavedChangesPromptService` en el mismo componente que tiene `<edu-confirm-dialog />` (no dentro de `@if`, ver `reference/dialogs-sync.md`).
3. En la ruta: `canDeactivate: [pendingChangesGuard]`.
4. Si hay `beforeunload` que cubrir: `@HostListener('window:beforeunload', ['$event'])` con `event.preventDefault()` solo cuando hay cambios.
5. Handlers de estado interno que descartan lo editado: pasar por `confirmProceed` antes de reemplazar; si el usuario se queda, revertir el control de UI (ver `selectionResetKey` del shell del hub y `fechaResetKey` del panel de asistencia).

Referencia viva: `CursoHubShellBase` (`@intranet-shared/components`) + `ProfesorCursoHubComponent`.

## Reglas de diseño

- **`canSave` decide si se ofrece «Guardar y salir».** Con `canSave: false` solo hay «Salir sin guardar» / «Quedarme». Guardar desde fuera del formulario **no puede saltarse validaciones o confirmaciones que viven dentro de él** (ejemplo: la confirmación de fecha atípica de asistencia es estado local del panel, así que `AttendanceCourseFacade.canSaveOutsidePanel` devuelve `false` en fecha atípica).
- **`save` debe resolver `true` solo si el servidor confirmó.** Un guardado fallido deja al usuario donde está. `registrar()` resuelve `Promise<boolean>` por eso.
- **X / ESC cuentan como «Quedarme»** (`dismiss`). Sin eso la promesa del guard queda colgada.
- Interfaces por capacidad, no un mirror del componente: `HasPendingChanges` no sabe de asistencia.

## Límites conocidos

- El texto de `beforeunload` lo pone el navegador.
- **Cambio de franja por URL: no es un hueco** (brief 770). Dentro del hub solo el selector cambia `?horarioId=` en el mismo par y ya pregunta; el botón atrás no recorre franjas (`replaceUrl`), las entradas «Mi Horario»/Salones/tarjetas vienen de fuera del hub, y el enlace a otro curso del salón cambia `:cursoId` (path param → `canDeactivate` corre). Las `actionUrl` de notificaciones no apuntan al hub.
- **El hueco real era la franja flotante**: sin `?horarioId=` la franja se resuelve por reloj (`WalClockService.adjustedNow` es un `computed` que se invalida con cada `Date` de respuesta HTTP) y por sondeo de contenido, y cambiaba sin navegación; `loadForSlot` descartaba lo editado y `hasUnsavedChanges()` dejaba de coincidir. Se cierra fijando la franja en la URL al primer cambio sucio (spec `profesor-curso-hub.floating-slot.spec.ts`). Regla general: **si un valor derivado puede cambiar bajo una edición, no basta con avisar en los handlers; hay que anclarlo**.
- **Confirmación de fecha atípica = «para qué fecha», no un booleano** (brief 771). El panel guarda `confirmedFor` (`yyyy-mm-dd`) y `puedeGuardar()` compara contra `selectedDate`: tras «Quedarme» el datepicker vuelve a la fecha confirmada y la confirmación reaparece sola; otra fecha no la hereda. `puedeGuardar` es método, no `computed`: `selectedDate` no es signal y un `computed` quedaba cacheado al pasar de fecha válida a atípica (dejaba guardar sin confirmar).
- Sin ediciones la franja sigue flotando a propósito (un hub abierto sigue «la clase en curso»). Un mock plano de `WalClockService` (`adjustedNow: () => x`) oculta esto en los tests; usar el servicio real con `Date` falseado.
