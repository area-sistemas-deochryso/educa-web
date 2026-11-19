# F11 — Motion expresivo (animaciones y transiciones de otro tipo)

> **Creado**: 2026-11-19 · **Scope**: solo FE (`educa-web`). Sin cambios de BE ni contratos.
> **Relación con F10**: F10 ([motion-system.md](motion-system.md)) dejó el vocabulario base (fade, subida de 8 px, escala 0.96, todo ≤ 200 ms). F11 **no repite** ninguna de esas animaciones: agrega movimientos de otro tipo y solo donde F10 no animaba, o donde el efecto nuevo es distinto al existente. Origen: tras probar F10 el usuario no notó suficiente movimiento.
> **Decisiones del usuario**: selección hecha sobre un muestrario interactivo (M2, M3, P1, F1-F5, S2, S3, S4); intensidad **intermedia**; M1, P2, P3 y S1 quedan fuera.

## Problema

El motion existente es una sola receta repetida: aparecer con fade, subir pocos píxeles, escalar levemente. Los componentes compartidos de `edu-ui` no comunican el resultado de una acción (el botón no tiene estado de éxito, el campo inválido no reacciona, el toast no tiene salida), el acordeón y las filas de tabla entran y salen del DOM de golpe, y el cambio de página no distingue avanzar de retroceder.

## Decisiones

| Decision | Choice | Why |
|---|---|---|
| Dónde se aplica | Dentro de los componentes compartidos de `edu-ui` (botón, tabla, toast, acordeón, dialog), no pantalla por pantalla | Cientos de usos los heredan; la copia vendored es la fuente de verdad desde el brief 942 |
| Mecanismo de modales | M3 y M2 sobre `edu-dialog` (atributo de apertura + CSS), sin migrar a `<dialog>` nativo | Ya hay entrada, salida y crecimiento desde el botón; una primitive nueva duplicaría el sistema. Confirmado por el usuario |
| Intensidad | Intermedia: 250-460 ms, desplazamientos de ~16-30 px, rebote solo donde el efecto lo pide | Elegida por el usuario |
| Duraciones | Ampliar los tokens: los efectos nuevos superan el tope actual de 320 ms | Evita valores hardcoded |
| Rebote | Token de easing tipo resorte con respaldo para navegadores sin soporte | Un único lugar para ajustarlo |
| Estados | Todo estado comunicado por movimiento se comunica también por texto o atributo accesible | El movimiento solo no basta; reduced-motion debe dejar la UI legible |
| Reduced-motion | Obligatorio para todo efecto nuevo | Política vigente del repo |
| Piloto | Las páginas `/intranet/admin/cursos` y `/intranet/asistencia`, con los modales que abren | Elegido por el usuario; todo efecto se valida ahí antes de propagarse |
| Qué NO se hace | No se reanima lo que F10 ya anima con el mismo efecto | Condición central del usuario |

## Observaciones (trampas no obvias)

- Los paneles de acordeón, las filas de tabla y los mensajes de toast salen del DOM en el mismo instante en que cambia el estado. Para animar la salida el nodo debe permanecer hasta que termine la animación; eso toca el render de cada uno de esos componentes.
- F10 documentó que la salida del toast quedaba pendiente porque `educa-libs` usaba Angular 19, sin las APIs de entrada/salida de nodos. Con la copia vendored dentro de una app Angular 22 esa restricción podría ya no aplicar; no está verificado y es lo primero a confirmar en la fase del toast.
- `edu-button` ya tiene estado `loading` con atributo de ocupado; el estado de éxito se suma a eso, no lo reemplaza.
- El slide direccional convive con el wrapper de View Transitions que omite navegaciones de solo query params y con los elementos compartidos de F10 F6; reemplazar el crossfade de la raíz no debe romper la tarjeta que viaja.
- El fondo borroso del modal (M3) tiene costo en móviles modestos; debe medirse en el piloto antes de propagar.
- La hoja inferior (M2) en móvil no se puede cerrar arrastrando solo con CSS; el cierre por arrastre requiere JS y queda como decisión de la fase si se incluye.
- Estado de verificación: acordeón, tabla, botón y toast fueron inspeccionados; los KPI tiles existen en varias páginas pero no se verificó si ya animan.

## Fases funcionales

Ordenadas por la prioridad del usuario: feedback, modales, cambio de página. Fases con el mismo `depends_on` son hermanas y pueden correr en worktrees concurrentes.

### F1 — Fundaciones
`depends_on: []`

Tokens de duración enfática y de easing tipo resorte con respaldo; utilidades compartidas de sacudida, destello y onda; reglas de reduced-motion para todo lo nuevo. Va primero porque todas las demás fases consumen estos valores.

### F2 — Botón: éxito y onda
`depends_on: [F1]`

Estado de éxito de `edu-button` a continuación de `loading` (el botón se encoge, vuelve a su ancho y dibuja el check, con ancho fijo para que nada salte) y onda desde el punto de presión en botones principales. Un solo componente, por eso ambos efectos van juntos.

### F3 — Campos inválidos
`depends_on: [F1]`

Sacudida horizontal en campos de formulario compartidos cuando pasan a inválidos, acompañada siempre de mensaje de texto y atributo de invalidez.

### F4 — Filas
`depends_on: [F1]`

Destello del fondo y rebote del valor cuando una fila cambia; salida deslizante seguida de pliegue del hueco cuando una fila se quita de `edu-table`.

### F5 — Toast completo
`depends_on: [F1]`

Salida deslizante, barra de cuenta regresiva del tiempo restante y pausa al pasar el cursor. Primero confirmar si la restricción de versión de F10 sigue vigente.

### F6 — Acordeón y contadores
`depends_on: [F1]`

Altura animada en `edu-accordion` sin quitar el panel del DOM de golpe, y contadores numéricos que suben en los KPI tiles que correspondan tras verificar cuáles no animan ya.

### F7 — Modal piloto
`depends_on: [F1]`

Fondo que se desenfoca con contenido interno escalonado (M3) en `edu-dialog`, y variante de hoja inferior en móvil (M2). Se valida en los modales de las páginas piloto. Incluye medir el costo del desenfoque en un móvil modesto antes de aprobar F8.

### F8 — Propagación de modales
`depends_on: [F7]`

Resto de los modales que usan `edu-dialog`, y decisión sobre el modal hecho a mano que todavía existe (si migra a `edu-dialog` o queda aparte).

### F9 — Slide direccional entre páginas
`depends_on: [F1]`

Avance y retroceso se distinguen por dirección, derivada de la jerarquía de rutas: la página nueva entra desde el lado y la anterior se desplaza menos y se oscurece. Respetar el wrapper de query params y los elementos compartidos existentes; sin View Transitions, el respaldo actual de F10 sigue aplicando.

## Done-when

- Un guardado exitoso muestra cargando y luego éxito sin acción adicional del usuario.
- Un campo inválido reacciona con movimiento y con mensaje de texto.
- Quitar una fila de una tabla compartida se anima y el resto de la lista no salta.
- El toast tiene salida y la cuenta regresiva se pausa al pasar el cursor.
- Abrir y cerrar un acordeón no corta la altura del contenido.
- Un modal de las páginas piloto entra con fondo borroso y contenido escalonado; en móvil sube como hoja.
- Avanzar y retroceder entre páginas se distinguen visualmente.
- Con reduced-motion activo, ninguna de estas animaciones se mueve y el estado sigue legible.
- `/intranet/admin/cursos` y `/intranet/asistencia` exhiben los efectos aplicables, verificados en vivo.

## Dependencias

F10 (tokens, reduced-motion, View Transitions, elementos compartidos) ya cerrada en `awaiting-prod/`; copia vendored de `edu-ui` como única fuente de verdad (brief 942).

## Fuera de alcance

- Los efectos descartados en el muestrario: overshoot elástico del modal (M1), revelado circular entre páginas (P2), barra de progreso de navegación (P3) e indicador deslizante en tabs (S1).
- Librerías externas de motion y cambios de backend.
- Reanimar lo que F10 ya anima con el mismo efecto.

## Reglas / invariantes aplicables

- Reduced-motion global y tokens de motion de F10.
- Solo `transform` y `opacity` salvo las excepciones justificadas por cada fase (altura del acordeón, plegado de fila).
- Código en inglés, UI en español; cap de 300 líneas por archivo; reglas de estilo y comentarios del repo.
- Los cambios van en la copia vendored de `edu-ui`; `educa-libs` está congelada.

## Worktree strategy

- **Isolation**: worktree (toca FE de producto).
- **Exclusive**: false. F2-F7 y F9 son hermanas; F2 y F6 comparten estilos globales y F7/F8 comparten el dialog, así que conviene mergear en secuencia.
- **Touches**: componentes compartidos de `edu-ui` (botón, tabla, toast, acordeón, dialog), estilos globales, configuración del router.
- **Parallel risk**: no se revisó `chats/running/` al diseñar.

## Contract checklist

- [ ] Los tokens de duración enfática y de easing tipo resorte existen y toda animación de F11 los usa, sin valores hardcoded.
- [ ] Toda animación de F11 tiene regla bajo reduced-motion.
- [ ] `edu-button` expone un estado de éxito además de `loading`.
- [ ] `edu-toast` anima la salida de los mensajes.
- [ ] `edu-accordion` anima la altura del panel sin quitarlo del DOM de golpe.
- [ ] `edu-table` anima la salida de una fila quitada.
- [ ] `edu-dialog` soporta fondo borroso con contenido escalonado y variante de hoja inferior en móvil.
- [ ] La transición de página distingue avance y retroceso.
