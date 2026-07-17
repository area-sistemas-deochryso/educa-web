# 01 — Responsive mobile fixes (brief 461)

## Problema

Auditoría en vivo (iframe 375px) + análisis estático confirmó 5 grupos de rotura responsive en `admin` y `cross-role`. El patrón repetido más extendido (`overflow-x: hidden !important` sobre `p-datatable`) bloquea el scroll horizontal nativo de PrimeNG en al menos 6 archivos, y `admin/campus` no tiene soporte táctil ni `@media` en absoluto — es un módulo distinto en tamaño al resto.

## Opciones

**Para el patrón de tablas (grupos 1, 2, 4-tablas, 5):**

- **A — Fix por archivo, sin abstracción nueva**: cambiar `overflow-x: hidden !important` → `auto` (o agregar `[scrollable]="true"`) directamente en cada `.scss`/`.component.ts` afectado.
  - Pro: cero riesgo de romper otras páginas, cada archivo se verifica y cierra independiente.
  - Contra: el mismo patrón se repite 6+ veces; si aparece un 7mo caso mañana, no hay wrapper reutilizable.
- **B — Clase utilitaria global** (`.table-scroll-x` o similar en `styles.scss`) que los componentes adopten.
  - Pro: un solo punto de verdad, sigue la "regla de oro" del design-system (overrides globales en `styles.scss`).
  - Contra: agregar una abstracción nueva para 6 archivos es sobre-ingeniería si no hay evidencia de que el patrón siga creciendo; además cada `_table-section.scss`/`shared-section.scss` ya tiene su propio contrato de borde/radio (`overflow: hidden` a nivel contenedor, no del `p-datatable`), mezclar ambos conceptos en una sola clase es confuso.

**Para `admin/campus` (grupo 3):**

- **A — Rework completo ahora**: soporte touch (Pointer Events unificados) + `@media` de apilado sidebar/editor en este mismo chat.
  - Pro: cierra el módulo entero de una vez.
  - Contra: excede el tamaño del resto del brief (los otros 4 grupos son fixes de 1-2 líneas de CSS; esto es reescribir handlers de un canvas SVG). Mezclar tamaños de cambio en el mismo chat diluye el criterio de cierre.
- **B — Brief propio, spin-off de este chat**: documentar el hallazgo con el detalle ya reunido (handlers de mouse sin touch, `width:260px` fijo, `display:flex` sin `@media`) y crear `chats/open/462-campus-editor-touch-support.md`, dejándolo fuera del alcance de 461.
  - Pro: cada chat cierra con un criterio de tamaño homogéneo; el rework de canvas puede necesitar su propio `/design` (decidir Pointer Events vs mapeo touch→mouse, gestos de pinch-zoom vs wheel).
  - Contra: ninguno relevante — el brief 461 ya anticipaba esta salida ("puede ameritar su propio brief").

## Recomendación

**A para tablas** (fix directo, sin abstracción) — 6 archivos no justifican una clase utilitaria nueva, y el "patrón repetido" ya vive parcialmente centralizado en `_table-section.scss` (que cubre 5 de los 6 casos); el 6to (`attendance-gap-tile`) se corrige igual sin wrapper.

**B para campus** (spin-off a brief propio) — coherente con lo que el brief 461 ya señalaba como riesgo de tamaño, y evita mezclar un fix de CSS con un rework de interacción táctil en el mismo criterio de cierre.

## Decisiones

| Decision | Choice | Why |
|---|---|---|
| Grupo 3 (`campus`) | Spin-off a brief nuevo, fuera de 461 | Tamaño y naturaleza del cambio (rework de interacción, no fix de CSS) distintos al resto |
| Patrón de tablas | Fix directo por archivo, sin clase utilitaria nueva | 6 archivos no amortizan una abstracción; el contenedor (`_table-section.scss`/`shared-section.scss`) ya es el punto de verdad para el borde, no para el scroll interno de la tabla |
| Verificación previa a cada fix (grupos 2, 4-tablas, 5) | Confirmar en vivo con iframe 375px **antes** de tocar cada archivo | La auditoría ya mostró un falso positivo (estudiante) donde el análisis estático decía "roto" y en vivo estaba bien — no asumir |

## Fases funcionales

### F1 — Grupo 1: patrón `overflow-x:hidden` en tablas ya confirmadas rotas
`depends_on: []`

Corrige el contenedor compartido (`_table-section.scss`, usado por ≥5 tablas de `email-outbox-diagnostico`/`dashboard-dia`) y el caso aislado (`attendance-gap-tile`), habilitando scroll horizontal nativo de `p-datatable`. Cierra apenas se confirma en vivo (iframe 375px) que el scroll aparece en las tablas que consumen el shared file.

### F2 — Grupo 2 y 5: tablas sueltas sin `[scrollable]`, verificación caso por caso
`depends_on: []`

Recorre `admin/users`, `admin/vistas`, `admin/recipient-view`, `admin/rate-limit-events`, `admin/health-permissions`, `admin/auditoria-correos-table`, `admin/classrooms/salon-estudiantes-tab`. Cada archivo se verifica en vivo primero (iframe 375px); solo se toca el que realmente rompe. La auditoría en vivo de estudiante ya mostró que varias `p-table` sin wrapper explícito funcionan bien por defecto — no aplicar el fix a ciegas.

### F3 — Grupo 4: `cross-role` (videoconferencia, campus-3d-view, attendance-reports)
`depends_on: []`

Requiere sesión activa de videoconferencia/mapa para verificar en vivo — se resuelve el `@media`/`flex-wrap` de `videoconferencia-sala` y el HUD de `campus-3d-view` (reposicionamiento de overlays fijos), y se aplica el mismo criterio de F2 a las 4 tablas de `attendance-reports`.

### F4 — Spin-off: brief `campus` editor touch support
`depends_on: []`

No es una fase de ejecución de este brief — es la entrega de un brief nuevo (`/next-chat` o creación manual) con el detalle ya reunido: canvas SVG sin `touchstart/touchmove/touchend`, `campus-pisos-panel` con `width:260px` fijo, `campus.component.scss` sin `@media`. Ese brief necesita su propio `/design` (decidir soporte táctil: Pointer Events unificados vs mapeo touch→mouse, y comportamiento de pinch-zoom).

F1-F3 no dependen entre sí — son paralelizables en worktrees distintos si se decide dividir el chat, aunque dado el tamaño (horas, no días) probablemente se ejecuten secuenciales dentro del mismo chat 461.

## Done-when

- Las tablas de `email-outbox-diagnostico`/`dashboard-dia` scrollean horizontalmente en 375px (verificado con iframe, breakpoint real disparado).
- Cada tabla de grupo 2/5 quedó verificada individualmente — las que no rompían no se tocaron.
- `videoconferencia-sala` y `campus-3d-view` no solapan contenido crítico en 375px.
- Brief spin-off de `campus` creado y encolado (no ejecutado en este chat).
- Build + lint OK.

## Dependencias

Ninguna cross-módulo — cada grupo toca su propia feature de `admin`/`cross-role` sin compartir estado ni servicios entre sí (solo comparten el patrón CSS del contenedor de tabla).

## Fuera de alcance

- Rework de `admin/campus` (va al brief spin-off).
- Diálogos/drawers con `width` fijo — ya confirmado que PrimeNG los adapta bien.
- `admin/final-classrooms`, `admin/error-groups` kanban, `admin/student-gap-profile`, `admin/defer-events-tab`, `public/privacy`, `public/terms`, `profesor/*` — fuera del brief original.

## Reglas/invariantes aplicables

- `.claude/reference/design-system.md` — cualquier hex literal nuevo pasa por tokens (sección 7); no debería hacer falta ninguno acá (son fixes de `overflow`/`@media`, no de color).
- `.claude/reference/a11y.md` — si algún fix de `campus-3d-view`/`videoconferencia-sala` toca controles interactivos, aplica.
- `.claude/reference/pagination.md` — no aplica (no se agregan tablas nuevas, solo se corrige scroll).
- `code-style.md` — SCSS/HTML en inglés (código), textos visibles en español (ya existentes, no se tocan).

## Plan file

Este archivo: `.claude/plans/responsive-mobile/01-responsive-mobile-fixes.md`.

### Worktree strategy
- **Isolation**: worktree (ya activo — `chat/461-responsive-mobile-fixes`)
- **Exclusive**: false
- **Touches**: los 7 globs listados en el frontmatter del brief 461
- **Parallel risk**: ninguno — sin overlap con `chat/402-verify-pattern` (worktree-only) ni con `chat/444-menu-reorganizacion...` (module-registry/intranet-menu/intranet-layout, entrada stale en manifest ya que 444 cerró el 2026-07-17 pero el worktree/branch siguen vivos — no bloquea, no hay overlap de paths)

---

## TL;DR
- **Problema**: 5 grupos de rotura responsive confirmados en `admin`/`cross-role`; uno de ellos (`campus`) es un rework de interacción, no un fix de CSS.
- **Recomiendo**: fix directo por archivo (sin clase utilitaria nueva) para los grupos de tablas, y spin-off a brief propio para `campus` · porque el tamaño y la naturaleza del cambio de `campus` no encajan en el mismo criterio de cierre que los demás.
- **Pendiente**: nada — confirmá si arrancamos ejecución por F1 (el más mecánico) o preferís que primero redacte el brief spin-off de `campus`.

| Opción | Esfuerzo | Riesgo | Toca | Veredicto |
| --- | --- | --- | --- | --- |
| A — Fix directo, sin abstracción | ~1-2h (F1-F3) | bajo | `admin/*`, `cross-role/*` (SCSS/template) | ✅ recomendada |
| B — Clase utilitaria global para scroll de tabla | ~2-3h | medio (mezcla con contrato existente de `_table-section.scss`) | igual + `styles.scss` | descartada (sobre-ingeniería para 6 archivos) |

**Alcance** (si vas con la recomendada):
- toca: `admin/email-outbox-diagnostico`, `admin/email-outbox-dashboard-dia`, `admin/correlation`, `admin/{users,vistas,recipient-view,rate-limit-events,health-permissions}`, `admin/classrooms` (tab estudiantes), `cross-role/videoconferencias`, `cross-role/campus-navigation` (3d-view), `cross-role/attendance-reports` (tablas)
- fuera: `admin/campus` (spin-off), diálogos/drawers, módulos ya listados como out-of-scope en el brief original

**Reglas que aplican**: `design-system.md` (tokens si aparece hex nuevo), `a11y.md` (si se tocan controles interactivos en campus-3d-view/videoconferencia), `pagination.md` (no aplica), `code-style.md` (idioma código/UI)

**Siguiente paso**: `/execute` empezando por F1 (Grupo 1, el más mecánico y ya 100% confirmado por lectura de código).

## Contract checklist

- [ ] `_table-section.scss` cambia `overflow-x: hidden !important` → `overflow-x: auto` (o equivalente) en el/los selectores de `p-datatable`
- [ ] `attendance-gap-tile.component.scss` recibe el mismo fix de forma aislada
- [ ] Verificado en vivo (iframe 375px) que el scroll horizontal aparece en al menos una tabla que consume `_table-section.scss`
- [ ] Cada tabla de grupo 2/5 (`users`, `vistas`, `recipient-view`, `rate-limit-events`, `health-permissions`, `auditoria-correos-table`, `salon-estudiantes-tab`) tiene un veredicto individual (rota/OK) documentado antes de tocarla
- [ ] Solo se modifican las tablas de grupo 2/5 con veredicto "rota"
- [ ] `videoconferencia-sala.component.scss` tiene `@media`/`flex-wrap` para evitar solape de header en ≤767px
- [ ] `campus-3d-view.component.scss` reposiciona overlays fijos (HUD/joystick/minimap) para no solaparse en ≤767px
- [ ] Brief spin-off para `admin/campus` (touch support + `@media`) creado en `chats/open/`
- [ ] Build + lint pasan sin errores nuevos
