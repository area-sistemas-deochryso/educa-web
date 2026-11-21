# Rediseño módulo Calendario — alternativa B (agenda-first)

> Origen: maqueta comparativa A/B/C (artifact `KesCMjxq9BJbbgvjpfhsb1`). Elegida B en las tres páginas.
> Contrato ADR-0006: sin rutas de archivo, firmas ni pseudocódigo.

## Problema

- Calendario: los 12 meses pesan igual y un evento solo cambia el color del número y un triángulo de 12 px. El nombre del evento no se ve sin abrir un modal. El color es el único canal (falla WCAG 1.4.1).
- Eventos y Notificaciones: tablas de 7–8 columnas casi idénticas, tres botones de ícono por fila, diálogo plano de 12 campos, filtros declarados dos veces y años fijos a tres valores.
- Notificaciones: la "vista previa" es solo un ícono; el destinatario son tres selects sueltos.

## Decisiones

| Decisión | Elección | Por qué |
|---|---|---|
| Vista de año del calendario | Se retira la grilla de 12 tarjetas; pasa a minimapa de 12 pastillas con densidad | Es lo que B reemplaza; mantener ambas duplica mantenimiento |
| Detalle de día/evento | Se reutiliza el modal de detalle existente | Ya tiene foco, Esc y hoja móvil resueltos |
| Edición en Eventos y Notificaciones | Panel lateral (drawer) en vez de diálogo central | Mantiene la lista visible al editar |
| Paginación y orden por columna | Se eliminan en ambas listas | El volumen anual es de decenas de registros; se agrupa por mes y se filtra |
| Marcador de tipo | Forma + color, nunca solo color | Cumple 1.4.1 y se reutiliza en las tres páginas |
| Destinatario de notificación | Selector único que se mapea a los mismos campos de hoy | Evita cambio de contrato con BE |
| Años disponibles | Ventana derivada del año actual | Los 3 valores fijos se rompen en 2028 |

## Fases funcionales

- **F1 — Piezas compartidas** · `depends_on: []`
  Marcador de tipo (forma+color), insignia de fecha, chip de estado temporal (Próximo / En curso / Finalizado) y agrupación por mes. Van primero porque las tres páginas las consumen.
- **F2 — Calendario** · `depends_on: [F1]`
  Vista mensual con chips de título, agenda del mes, navegación por pastillas/minimapa y flechas de año. En móvil la agenda pasa a ser la vista principal.
- **F3 — Eventos** · `depends_on: [F1]`
  Lista agrupada por mes, filtros unificados en una sola barra, edición en panel lateral, rango de fechas y hora con selector.
- **F4 — Notificaciones** · `depends_on: [F1]`
  Tarjetas que imitan la notificación real, selector único de destinatario y vista previa viva en el panel de edición.
- **F5 — Retiro y documentación** · `depends_on: [F2, F3, F4]`
  Se eliminan las piezas del calendario anual antiguo que queden sin uso y se actualizan los docs que describen el módulo.

F2, F3 y F4 son hermanas paralelas: tocan áreas disjuntas una vez cerrada F1.

## Done-when

- Un evento de varios días se ve con su nombre en la vista mensual sin abrir nada.
- Ningún estado se distingue solo por color en las tres páginas.
- Eventos y Notificaciones no tienen tablas ni filtros duplicados.
- El selector de año no tiene valores fijos.
- La vista previa de notificación es la notificación completa.
- Funciona a 400 px de ancho sin scroll horizontal de página.

## Dependencias

- Módulo de calendario compartido, módulo admin de eventos, módulo admin de notificaciones, `edu-ui` (drawer, dialog, toggle) y barra de filtros sticky.
- Sin cambios de BE: stores, facades y DTOs se mantienen.

## Fuera de alcance

- Cambios de BE o de contrato HTTP.
- Línea de tiempo (alternativa C) y tablas pulidas (alternativa A).
- Vista semanal o diaria.
- Rediseño del modal de detalle de día.

## Riesgos

- Se pierde la vista de año completo salvo el minimapa.
- Si el BE valida combinaciones de rol/grado/sección, el selector unificado debe respetarlas; hay que confirmarlo antes de F4.
- Reglas de overlays: `edu-drawer`/`edu-dialog` no van dentro de `@if` (ver `reference/dialogs-sync.md`).
- Cualquier SCSS bajo `features/intranet/**` o `shared/components/**` exige leer `reference/design-system.md` y usar tokens, sin hex literales.

## Estado

- **F1** ✅ piezas compartidas (marcador de tipo, insignia de fecha, chip de estado temporal, agrupación por mes, años de selector, fechas texto ⇄ `Date`, sección de formulario, selector de ícono).
- **F2** ✅ Calendario (mes grande + agenda + pastillas de mes). Sigue abriendo `/intranet/calendario#today`.
- **F3** ✅ Eventos (lista por mes + panel lateral).
- **F4** ✅ Notificaciones (tarjetas + vista previa + destinatario Todos/Segmentar).
- **F5** ✅ Se borró la grilla de 12 tarjetas; docs actualizados (`reference/design-system.md` B15, `reference/eduui.md`).
- Aparte: `edu-datepicker.writeValue` endurecido (acepta strings), porque abrir el calendario dentro de un panel fallaba con valor `''`.

### Correcciones al diseño original

- Las barras de filtros duplicadas no eran un defecto: la barra «sticky» solo aparece cuando la normal sale de pantalla. Se mantuvieron.
- La hora del evento sigue siendo texto libre («8:00 AM»); cambiarla afectaría el formato que muestra el modal del calendario.
- El destinatario de la notificación conserva los tres campos libres e independientes (rol, grado, sección); no se asumió ninguna regla del BE.
