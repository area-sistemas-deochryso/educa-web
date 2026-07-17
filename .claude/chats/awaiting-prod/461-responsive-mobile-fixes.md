# 461 — Fixes de responsive mobile (hallazgos confirmados en vivo)

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-17 · **Modo sugerido**: `/design` primero (toca 3+ archivos y hay un patrón compartido a decidir), luego `/execute`
> **exclusive**: `false`
> **isolation**: `worktree`
> **touches**:
>   - `src/app/features/intranet/pages/admin/email-outbox-diagnostico/**` (`_table-section.scss` compartido)
>   - `src/app/features/intranet/pages/admin/campus/**`
>   - `src/app/features/intranet/pages/admin/correlation/**`
>   - `src/app/features/intranet/pages/admin/email-outbox-dashboard-dia/**`
>   - `src/app/features/intranet/pages/admin/{users,vistas,recipient-view,rate-limit-events,health-permissions}/**`
>   - `src/app/features/intranet/pages/cross-role/videoconferencias/components/videoconferencia-sala/**`
>   - `src/app/features/intranet/pages/cross-role/campus-navigation/components/campus-3d-view/**`

## Contexto

Auditoría de responsive mobile sobre educa-web completa: 8 agentes en paralelo (uno por feature) hicieron análisis estático de código, y luego se verificaron en vivo (navegador real, sesiones Estudiante/Director, BE en TestEnv) los hallazgos marcados como "crítico" o "dudoso" en las páginas con más tráfico mobile esperado (estudiante, cross-role).

Prioridad acordada con el usuario: **estudiante y cross-role primero** (alto tráfico mobile real), **admin al final** (el usuario solo entra desde celular ocasionalmente, no le duele).

### Método de verificación usado (importante para futuras auditorías de responsive)

Dos intentos fallidos antes de encontrar el correcto:

1. **`resize_window` (Chrome extension tool)** — no funcionó en este entorno; `window.innerWidth` seguía en ~1309-1568px sin importar el tamaño pedido. Ventana gestionada por el OS, no redimensionable vía la extensión.
2. **Forzar `width` por CSS** (`document.body.style.width = '375px'`) — **método inválido, produce falsos positivos**. Un `<p-dialog>` de PrimeNG (CDK overlay) se ve roto/desbordado con este truco porque el overlay calcula su posición contra el `window.innerWidth` *real*, no contra el ancho que le impusimos al `<body>`. Además, ningún `@media (max-width: ...)` se dispara, porque las media queries evalúan el viewport real del navegador, no el tamaño de una caja. Con este método se reportó como "crítico" un diálogo de asistencia que en realidad funciona bien — hallazgo retirado tras la verificación correcta.

3. **✅ Método correcto: iframe con su propio browsing context.**
   Un `<iframe>` es un contexto de navegación independiente: su `window.innerWidth` interno es el tamaño real del iframe (no el de la ventana padre), así que tanto `@media` queries como el cálculo de overlays de PrimeNG (CDK) responden correctamente al ancho angosto. Al ser mismo origen (`localhost:4201`), cookies y `sessionStorage` (compartido por top-level browsing context, no por frame) viajan automáticamente — no hace falta re-loguear dentro del iframe.

   ```js
   // Inyectar en la página ya logueada (misma pestaña, misma sesión):
   const wrap = document.createElement('div');
   wrap.id = 'mobile-frame-wrap';
   wrap.style.cssText = 'position:fixed; top:0; left:0; z-index:999999; background:white;';
   const iframe = document.createElement('iframe');
   iframe.id = 'mobile-frame';
   iframe.style.cssText = 'width:375px; height:812px; border:3px solid red; display:block;';
   iframe.src = location.href; // o cualquier ruta de la SPA
   wrap.appendChild(iframe);
   document.body.appendChild(wrap);
   ```

   Verificación de que el breakpoint real se disparó: `document.getElementById('mobile-frame').contentWindow.matchMedia('(max-width:767px)').matches // true`.

   Interacción dentro del iframe: los clicks del `computer` tool funcionan con las coordenadas de pantalla normales (el iframe es parte del DOM visible), no hace falta ninguna API especial — solo calcular la posición dentro del rectángulo del iframe en el screenshot.

   Limpieza al terminar: `document.getElementById('mobile-frame-wrap')?.remove()`.

   **Esto reemplaza cualquier intento futuro de simular mobile por CSS. Si `resize_window` no funciona en el entorno, usar iframe — nunca el truco de `width` forzado.**

### Confirmado responsive (no tocar, sirven de referencia de patrón correcto)

- `estudiante` — "Mi Horario" (vista de chips por día + card de clase, sin grid fijo).
- `estudiante` — "Mi Asistencia" y tabla de asistencia por salón (`p-table` genera su propio scroll horizontal nativo sin wrapper explícito).
- `estudiante/salones` — diálogo (`p-dialog`) de detalle de salón con tabs Grupos/Notas/Asistencia/Ubicación — se adapta bien, tabs con scroll horizontal propio.
- `cross-role/mensajeria` — panel dual colapsa a chat fullscreen con botón "volver" en `@media (max-width:767px)`.
- `admin/monitoreo` (hub) — grid `auto-fit/minmax` colapsa a 1 columna en `@media (max-width:640px)`.

## Scope

Fixes agrupados por severidad confirmada (estático, no todos verificados en vivo — ver nota de cada grupo):

### 1. Patrón repetido: `overflow-x:hidden !important` bloqueando scroll de tablas (admin, confirmado por lectura de código, no verificado en vivo)

Archivos: `admin/email-outbox-diagnostico/_table-section.scss` (compartido por ≥8 tablas), y el mismo patrón repetido en `admin/correlation/**`, `admin/email-outbox-dashboard-dia/components/dashboard-fallos-table/**`, `dashboard-fallos-por-sender-table/**`.

Fix: cambiar `overflow-x: hidden !important` → `overflow-x: auto`, o agregar `[scrollable]="true"` al `p-table` si no lo tiene.

### 2. Tablas PrimeNG sin `[scrollable]` ni wrapper de scroll (estático, no verificado en vivo salvo estudiante)

- `admin/users` (tabla principal, `overflow:hidden` explícito — mismo bug que #1)
- `admin/vistas`, `admin/recipient-view`, `admin/rate-limit-events`
- `admin/auditoria-correos-table`, `admin/classrooms/salon-estudiantes-tab`

Nota: en estudiante, el mismo tipo de tabla (`p-table` sin wrapper explícito) resultó **estar bien** al verificar en vivo — PrimeNG parece generar su propio scroll en varios casos. **Antes de tocar cada archivo de este grupo, verificar en vivo con el método de iframe** si realmente rompe — no asumir por el análisis estático solo.

### 3. `admin/campus` — módulo con el problema más grave, confirmado por lectura de código

- `campus.component.scss`: `display:flex` fijo (sidebar+editor lado a lado), 0 `@media`.
- `campus-editor`: canvas SVG de plantas con handlers solo de mouse (`wheel`, `mousedown`, `mousemove`, `mouseup`) — sin `touchstart/touchmove/touchend`. Inutilizable en tablet/celular táctil.
- `campus-pisos-panel`: `width:260px` fijo.

Fix: agregar soporte táctil al editor (mapeo touch→mouse equivalente o Pointer Events unificados), y `@media` para apilar sidebar+editor en mobile. Este ítem es más grande que el resto — puede ameritar su propio brief si al diseñar se ve que el rework del editor es significativo.

### 4. `cross-role` — alto tráfico, no verificado en vivo (requiere sesión de videoconferencia/mapa activa)

- `videoconferencia-sala.component.scss`: header flex-row fijo sin `@media` ni `flex-wrap` (título + participantes + acciones puede solaparse).
- `campus-3d-view.component.scss`: overlay (HUD, joystick, minimap, controles) con posiciones fijas, 0 `@media`.
- `attendance-reports` (`reports-result`, 4 tablas): sin `[scrollable]` — pero el formulario de filtros que las alimenta sí se vio bien en el chequeo en vivo (Prioridad 2, admin/asistencia?tab=reportes).

### 5. `admin/health-permissions`, `admin/rate-limit-events` (tabla 11 columnas)

Sin `@media`, sin scroll wrapper.

## Out of scope

- Cualquier fix en diálogos/drawers (`p-dialog`/`p-drawer`) con `width` fijo — el análisis en vivo mostró que PrimeNG los adapta bien al viewport real por defecto. No hay evidencia de que rompan; no tocar sin verificar primero.
- `admin/final-classrooms`, `admin/error-groups` kanban, `admin/student-gap-profile`, `admin/defer-events-tab`, `public/privacy`, `public/terms` — quedaron en "dudoso, bajo riesgo" y no son prioritarios (admin de bajo uso mobile / público con contenido simple).
- `profesor/*` — mayormente confirmado responsive en el análisis estático (schedules, mensajeria, foro, attendance, cursos todos con `@media` explícitos), no requiere intervención salvo lo que arrastra de `final-classrooms` (compartido con admin).

## Criterio de cierre

- [x] Grupo 1 (patrón `overflow-x:hidden`) corregido en 6 archivos (`_table-section.scss` shared + 4 de `dashboard-dia` + `attendance-gap-tile`), verificado en vivo con iframe a 375px (`dashboard-dia` y `diagnostico`) que el scroll horizontal aparece (`overflow-x:auto`, `scrollWidth > clientWidth`).
- [x] Grupo 2: verificado en vivo `admin/usuarios` y `rate-limit-events` (11 columnas) — ambas ya scrolleaban bien con el default de PrimeNG, no requirieron fix. Resto del grupo (`vistas`, `recipient-view`, `salon-health-permissions-tab`, `auditoria-correos-table`, `salon-estudiantes-tab`) verificado por código (mismo patrón sin override bloqueante) pero no en vivo uno por uno.
- [x] Grupo 3 (`campus`): decisión tomada en `/design` — spin-off a brief propio `462-campus-editor-touch-support.md`, fuera de este chat.
- [x] Grupo 4 (`videoconferencia-sala`, `campus-3d-view`): `@media`/`flex-wrap`/reposicionamiento aplicados. **Grupo 5** (`health-permissions`, `rate-limit-events`) cubierto en grupo 2.
- [x] Build + lint OK.

> **Validación prod**: ⏳ pendiente desde 2026-07-17 — falta verificar en vivo `videoconferencia-sala` y `campus-3d-view` (grupo 4) con una sesión real activa (videollamada / navegación 3D en curso). No se pudo reproducir con datos de prueba locales. Capturas antes/después no se tomaron (no bloqueante, criterio nice-to-have del brief original).

## Tiempo estimado

Grupo 1: ~30-45 min. Grupo 2: ~15 min por tabla verificada + fix. Grupo 3 (`campus`): estimar aparte en `/design`, probablemente >2h. Grupos 4-5: ~20 min cada uno tras verificación en vivo.
