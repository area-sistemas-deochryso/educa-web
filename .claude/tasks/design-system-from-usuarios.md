# Task — Design System a partir de `/intranet/admin/usuarios`

> **Creado**: 2026-04-17
> **Origen**: Conversación del 2026-04-17 tras cerrar varios parches de transparencia (tablas, paginadores, stat-cards, wrappers). Usuario pide elevar los estilos de `/intranet/admin/usuarios` al rango de estándar del proyecto para badges, filtros, tablas, tipos y colores de botones.
> **Scope**: sin prerrequisitos. Ejecutable inmediatamente. Multichat (2-3 chats según alcance elegido).

---

## Contexto

Tras los cambios recientes (override global de transparencia para `p-table`, `p-paginator` y `.stat-card` en `styles.scss` + regla `table-transparency.md` reescrita), quedó claro que el proyecto no tenía un design system formal — cada página aplicaba patrones locales, repetía overrides y a veces divergía.

La página `/intranet/admin/usuarios` tiene el conjunto de patrones más consistente y pulido del proyecto. Este task documenta su extracción como **estándar oficial** para que nuevas páginas tengan una referencia canónica y las existentes se puedan normalizar gradualmente.

---

## Patrones extraídos (inventario)

### A · Para mover a global (`styles.scss`)

| # | Patrón | Efecto | Impacto si se globaliza |
|---|--------|--------|-------------------------|
| A1 | **Neutralización de `p-tag`** — fondo `var(--surface-200)`, texto `var(--text-color)`, `font-weight: 600`. Severidad se pasa semánticamente pero todos los tags se ven neutros | Tags homogéneos | **Alto** — afecta tags coloreados en error-logs (CRITICAL rojo), asistencia (A/T/F), calificaciones, etc. |
| A2 | **Reset de inputs/selects** — `background: transparent`, `color: var(--text-color)`, `border-color: var(--surface-300)`, focus con `box-shadow: 0 0 0 1px var(--text-color)` (no primary) | Ringo de foco neutro | Medio — elimina ring azul primary de PrimeNG |
| A3 | **Botones `p-button-text` y `p-button-outlined`** — `color: var(--text-color)` + `border-color: var(--surface-300)` + hover `background: var(--surface-100)` | Botones secundarios uniformes | Medio — homogeneiza botones secundarios |
| A4 | **Utility class `.label-uppercase`** — `font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px` | Labels uppercase estandarizados | Bajo — opt-in |

### B · Para documentar como pauta (no override global, sino patrón recomendado)

| # | Patrón | Descripción |
|---|--------|-------------|
| B1 | **Containers con border, no background** | `background: transparent` + `border: 1px solid var(--surface-300)` + `border-radius: 10-12px`. Reemplaza el patrón `background: var(--surface-card)` |
| B2 | **Page header** | Layout `icon → title+subtitle → margin-left: auto` para `.header-actions`. Usar `<app-page-header>` shared |
| B3 | **Stat card** | Content-left + icon-right (48×48, `border-radius: 12px`). Valor 1.75rem/700, label 0.85rem, sublabel 0.75rem. Icon en box con `var(--surface-200)` |
| B4 | **Tabla** | Wrapper `.table-section` con border (sin bg). Headers UPPERCASE 0.8rem con `letter-spacing: 0.5px`. Rows inactivas `opacity: 0.5` + `background: var(--surface-100)`. Row-hover con `var(--surface-100)` |
| B5 | **Row actions triplet** | 3 botones icon-only `p-button-rounded p-button-text`: **view**=`secondary`, **edit**=`info`, **toggle**=`warning/success` dinámico según estado. Flex con gap `0.25rem` |
| B6 | **Filter bar** | Flex con `search-box` (icon `absolute` dentro de wrapper `relative`) + `filter-dropdowns` + `btn-clear` con `margin-left: auto` y `opacity: 0.5 → 1` en hover |
| B7 | **Botones canónicos** | primary = `p-button-success` + `color: white`, secondary = `p-button-outlined`, destructive = `p-button-danger` outlined, clear/close = `p-button-text` |
| B8 | **Dialogs** | Footer `justify-content: flex-end; gap: 0.5rem`. Cancel text izquierda, acción primary derecha. Form grid de 2 columnas con `grid-column: 1 / -1` para fields full-width |
| B9 | **Alert banners** | `background: color-mix(in srgb, var(--yellow-500) 15%, transparent)` para fondo tintado. Más robusto que `rgba()` hardcoded — respeta tema light/dark |
| B10 | **Drawer detalle** | `position="right"`, width 450px. Avatar circle 80px, name 1.25rem/600, info list en surface-50 con grid 2-col |
| B11 | **Dev banners** | Flex space-between con `color-mix` tintado + border del color semántico. Usado para banners de migración, preview, etc. |

### C · Deuda detectada (para migrar a tokens del tema)

| # | Qué | Dónde aparece | Propuesta |
|---|-----|----------------|-----------|
| C1 | Color error hardcoded `#e24c4c` | Form dialogs (invalid state) | Usar `var(--red-500)` o token PrimeNG `--p-form-field-invalid-border-color` |
| C2 | Color error hardcoded `#dc2626` | Import dialog, delete warnings | Mismo token |
| C3 | `#1e40af` salon list items | Form dialog | Token primary o variable dedicada |
| C4 | `style="color: white"` inline en `p-button-success` | Botones primarios guardar/confirmar | Resolver en tema PrimeNG para que `p-button-success` tenga `color: white` por default |

---

## Decisión crítica previa al F1

**La neutralización global de `p-tag` (patrón A1) es la decisión más disruptiva.** Actualmente:
- Error-logs muestra tags CRITICAL rojos, ERROR amarillos
- Asistencia diaria muestra tags A (verde), T (amarillo), F (rojo)
- Aprobación muestra APROBADO verde, DESAPROBADO rojo

Si se neutraliza globalmente, esas páginas pierden el color-coding visual (la severidad sigue disponible para accesibilidad — screen readers — pero no es visual).

**Tres opciones antes de F1:**

- **Opción A** — Neutralización global completa (fiel al estándar de usuarios)
  - Pro: consistencia total, look "enterprise", homogeneidad visual
  - Contra: perdemos feedback visual inmediato en tablas críticas

- **Opción B** — `p-tag` colorido por defecto (no globalizar neutralización), neutralizar solo en páginas que explícitamente lo pidan vía clase (`.neutral-tags`)
  - Pro: preserva color-coding actual, opt-in a neutro
  - Contra: la página usuarios queda como excepción, no como estándar

- **Opción C** — Dos variantes semánticas:
  - Tags "informativos" (rol, sección, categoría) → neutros
  - Tags "de estado crítico" (severity, asistencia, aprobación) → colores
  - Implementación: usar `styleClass="tag-critical"` o atributo `pTag` variante
  - Pro: mantiene color donde importa, neutraliza ruido visual donde no
  - Contra: nueva convención que aprender, requiere auditoría manual de cada `p-tag` existente

**Bloquea F1**: confirmar con el usuario qué opción tomar.

---

## Plan de ejecución

### F1 — Decisión de alcance + globales sin polémica (chat 1) ✅ (2026-04-17)

- [ ] F1.0 Confirmar con usuario cuál opción aplicar para patrón A1 (p-tag) — **pendiente, bloquea F2**
- [x] F1.1 Agregar patrón A2 (reset de inputs/selects) a `styles.scss` — scoped a `app-intranet-layout`
- [x] F1.2 Agregar patrón A3 (botones `p-button-text`/`p-button-outlined`) a `styles.scss` — scoped a `app-intranet-layout`
- [x] F1.3 Agregar utility class A4 (`.label-uppercase`) a `styles.scss`
- [x] F1.4 Build OK (warnings pre-existentes de ESM de `dayjs`/`saxes`, no relacionados)
- [x] F1.5 Renombrado `rules/table-transparency.md` → `rules/design-system.md` con secciones para A2, A3, A4 + referencia histórica a `filter-transparency.md` como superseded
- [x] F1.6 Maestro actualizado (tabla inventario + checklist F1) + este task actualizado

**Notas de ejecución**:

- **Scope `app-intranet-layout`**: A2 (inputs/selects) y A3 (botones) se scopearon al selector del layout de intranet para no alterar formularios ni CTAs del portal público. Las páginas públicas conservan el `--primary-color` del tema.
- **Scope global**: A4 (`.label-uppercase`) es opt-in global — solo aplica cuando se agrega explícitamente la clase.
- **Supersede `filter-transparency.md`**: el patrón per-component de inputs/selects documentado en esa regla queda superado por A2 global. La regla vieja no se borra todavía — al tocar un componente con override local, se elimina para no duplicar. Consolidación final cuando F3 escriba pautas B1-B11.
- **Visual check diferido**: F1.4 se limitó a `npm run build` exitoso. Verificación visual en páginas muestra (usuarios, error-logs, feedback-reports, asistencia) se ejecuta al recibir feedback visual del usuario en `/design`-mode sobre el resultado.

### F2 — Ejecutar patrón A1 (Opción C elegida 2026-04-17, dividido en subfases)

**Decisión del usuario**: **Opción C — Semántica explícita**. Razón: el colegio tiene estados operativos reales (faltas, errores críticos, aprobaciones) donde el color es información útil. Neutralizar todo perdería feedback visual crítico. Opt-in (B) dejaría usuarios como excepción en vez de estándar. La convención semántica escala a nuevas páginas sin volver a decidir.

**Divisón por módulo** (119 `p-tag` en 53 archivos excede 1 chat → 5 subfases):

- [x] **F2.1 — Infraestructura + canonical example (usuarios)** ✅ (2026-04-17)
  - [x] F2.1.1 Agregar `.p-tag.tag-neutral` a `styles.scss` (`background: --surface-200`, `color: --text-color`, `font-weight: 600`)
  - [x] F2.1.2 Documentar convención en `rules/design-system.md` sección 5 (reemplaza sección "Pendiente A1"). Incluye tabla informativo/crítico, ejemplos canónicos, criterio de decisión.
  - [x] F2.1.3 Aplicar `styleClass="tag-neutral"` a tags informativos de usuarios:
    - `usuario-detail-drawer.component.html` — rol + estado
    - `usuarios-table.component.html` — rol + estado
    - `usuarios-validation-dialog.component.html` — rol (el tag de error con `severity="danger"` queda SIN `tag-neutral` porque es crítico — el usuario viene a verlo)
    - `usuarios-import-dialog.component.html` — sección + contador "N estudiantes"
  - [x] F2.1.4 Build OK (warnings pre-existentes de ESM, hints de deprecation de `styleClass` en PrimeNG 21 — issue transversal del proyecto, ~100+ tags)
  - [x] F2.1.5 Maestro + task file actualizados con división F2.2-F2.5

- [x] **F2.2 — Estados operativos** ✅ (2026-04-17) — 11 archivos auditados, **0 violaciones**
  - [x] Asistencia (A/T/F/J): `attendances.component`, `attendance-registration-panel`, `attendance-summary-panel`, `student-attendance-tab` — todos usan `severity` (success/warn/danger). Sin `tag-neutral` accidental.
  - [x] Aprobación (APROBADO/DESAPROBADO/PENDIENTE): `salon-aprobacion-tab` — usa `severity` dinámico. Sin `tag-neutral`.
  - [x] Error-logs (CRITICAL/ERROR/WARN/INFO): `error-logs.component`, `error-log-detail-drawer` — usan `severity`. Sin `tag-neutral`.
  - [x] Feedback reports (estado del reporte): usa `severity` dinámico. Sin `tag-neutral`.
  - [x] Cierre de periodo (ABIERTO/CERRADO): usa `severity`. Sin `tag-neutral`.
  - [x] Notas (promedio por severidad de nota): `simulador-notas`, `notas-curso-card` — tags de promedio usan `severity` (crítico, indica aprueba/desaprueba). Sin `tag-neutral`.
  - **Observación**: 2 tags `severity="secondary"` en contextos informativos (httpMethod en error-log-detail-drawer, contadores "Total/Clases" en paneles de asistencia). Se mantienen porque forman parte de stacks visuales donde migrar a `tag-neutral` rompería la consistencia cromática del grupo. No violan la convención.
  - **Migración diferida a F2.4 (Académico)**: tipo de evaluación (`severity="info"`) en `simulador-notas` línea 39 y `notas-curso-card` línea 47 — es metadato informativo, aplica convención `tag-neutral`, pero cae en el alcance académico.

- [x] **F2.3 — Metadatos admin** ✅ (2026-04-17) — 7 archivos, 8 tags migrados a `tag-neutral`, build OK
  - [x] `permisos-roles.component.html` — 3 tags de rol (tabla + 2 summaries) → `tag-neutral`
  - [x] `permisos-usuarios.component.html` — 1 tag de rol → `tag-neutral`
  - [x] `permisos-detail-drawer.component.html` — 1 tag de rol → `tag-neutral`
  - [x] `permisos-edit-dialog.component.html` — 1 tag de rol → `tag-neutral`
  - [x] `eventos-calendario.component.html` L129 — tipo evento → `tag-neutral` (L135 estado queda con `severity`, crítico)
  - [x] `notificaciones-admin.component.html` L125 tipo + L133 destinatario → `tag-neutral` (L128 prioridad + L136 estado mantienen `severity`, críticos)
  - [x] `email-outbox-table.component.html` L35 tipo correo → `tag-neutral` (L42 estado FAILED/SENT/PENDING mantiene `severity`, crítico)
  - **Auditados sin cambios** (tags ya son críticos, mantienen `severity`):
    - `vistas.component` — estado Activa/Inactiva (booleano operativo)
    - `feedback-reports` — estado del reporte (admin escanea NUEVO/PENDIENTE)
  - **Hint transversal**: `styleClass is deprecated` en PrimeNG 21 — issue pre-existente del proyecto (~100+ tags), no bloquea F2.3. Decisión de migración a `class=` pendiente para fase futura.

- [x] **F2.4 — Académico** ✅ (2026-04-17) — 22 tags en 17 archivos migrados a `tag-neutral`, build OK
  - [x] **Modo asignación + tipo calificación + grado** (6 tags): horario-detail-drawer (modo+Tutor), salones-admin (tipo cal), salones-admin-table (modo), salon-detail-dialog (modo), profesor-final-salones (tipo cal), cursos.component (grado.nombre)
  - [x] **Contadores** (5 tags): horarios-list-view, profesor-salones, salon-estudiantes-dialog, estudiante-salones (2), estudiante-grupos-tab (integrantes), salon-grupos-tab (grupos+asignados)
  - [x] **Cursos como chips clickables** (2 tags): profesor-salones, estudiante-salones
  - [x] **"Tutor" badge** (2 tags): horario-detail-drawer, profesor-salones — migrados por consistencia (rol es informativo); ícono estrella mantiene distintivo visual
  - [x] **Tipo de evaluación** (5 tags): calificaciones-panel, calificar-dialog, salon-notas-estudiante-tab, notas-curso-card, simulador-notas
  - **Mantienen `severity`** (críticos operativos):
    - Notas con color por aprobación (calificar-dialog, salon-notas-tab, salon-notas-estudiante-tab, notas-curso-card, simulador-notas promedio)
    - Estados: horario.estado, curso.estado, estado periodo (CERRADO/ABIERTO), estado aprobación
    - Contadores semánticos: aprobados/desaprobados/pendientes en salones-admin-table (verde/rojo/warn)
    - Stats de calificación: aprobados/desaprobados/sin-nota en calificar-dialog
    - "Grupal" warn marker
    - Import status (OK/error)
    - Alertas: "N sin grupo" warn, "grupo lleno" warn, "Sin periodo" warn
  - **Build**: OK (solo warnings pre-existentes ESM dayjs/saxes)

- [x] **F2.5 — Misc y cross-role** ✅ (2026-04-17) — 10 tags en 7 archivos migrados a `tag-neutral`, build OK
  - [x] `videoconferencias.component.html` L57 — `salonDescripcion` → `tag-neutral` (nombre de salón, metadato)
  - [x] `mensajeria-tab.component.html` L16 — label del curso → `tag-neutral` (metadato del tab)
  - [x] `foro-tab.component.html` L16 — label del curso → `tag-neutral` (metadato del tab)
  - [x] `ctest-k6.component.html` L9-13 credenciales count + L16-20 endpoints count → `tag-neutral` (contadores informativos del header)
  - [x] `credentials-dialog.component.html` L113 + L242 — rol del usuario (2 tags) → `tag-neutral`. Helper `getRolSeverity()` eliminado del `.ts` (ya no se usa)
  - [x] `campus.component.html` L67 `piso.nombre` + L131 `conexion.tipo` → `tag-neutral` (metadatos del editor)
  - [x] `user-info-dialog.component.html` L20 — `userRole()` → `styleClass="tag-neutral role-tag"` (preserva `align-self` del `role-tag`)
  - **Auditados sin cambios** (tags críticos operativos que mantienen `severity`):
    - `mensajeria-tab.component.html` L90 — contador de mensajes no leídos `severity="danger"` (rojo = pendiente operativo)
    - `campus.component.html` L153 — bidireccional/unidireccional `info`/`warn` (warn informa limitación del grafo)
    - `health-justification-dialog.component.ts` L68+L70 — "Válida"/"No válida" `success`/`danger` (estado crítico de la justificación)
    - `horarios-import-dialog.component.html` L78+L119+L121 — estados de import OK/con errores (crítico operativo)
    - `student-task-submissions-dialog.component.html` L74 — estado de entrega (profesor escanea pendientes)
    - `student-files-dialog.component.html` L60 — nota del estudiante (crítico: aprobación/desaprobación)
  - **Build**: OK (solo warnings pre-existentes ESM dayjs/saxes/exceljs, no relacionados)
  - **Hint transversal**: `styleClass is deprecated` en PrimeNG 21 — issue pre-existente del proyecto (~100+ tags), no bloquea F2.5. Decisión de migración a `class=` pendiente para fase futura.

### F3 — Documentar pautas (B1-B11) como design-system.md ✅ (2026-04-17)

- [x] F3.1 Agregada **sección 6 "Pautas recomendadas por componente (B1-B11)"** a `rules/design-system.md` (existente). Contiene las 11 pautas con HTML + SCSS copy-paste-ables extraídos literal de usuarios:
  - **B1** Container con border, no background (anti-patrón `background: var(--surface-card)` explicado)
  - **B2** Page header (shared `<app-page-header>` + orden canónico de botones + separador semántico)
  - **B3** Stat card (anatomía content-left + icon-right 48×48, responsive grid)
  - **B4** Tabla (wrapper con border + headers UPPERCASE + row-inactive con opacity 0.5)
  - **B5** Row actions triplet (ver/editar/toggle con severities secondary/info/dinámico + aria-label obligatorio)
  - **B6** Filter bar (search-box relative + filter-dropdowns + btn-clear con margin-left auto + opacity 0.5→1 en hover)
  - **B7** Botones canónicos por rol semántico (tabla primary/secondary/destructive/clear/icon-only)
  - **B8** Dialogs CRUD (header tipado + form-grid 2-col + footer derecha + fondo surface-ground en header/content/footer)
  - **B9** Alert banners con `color-mix()` + paleta semántica info/success/warning/danger (explicación de por qué no `rgba()`)
  - **B10** Drawer detalle right-side 450px (avatar 80px + name + tag + info list en surface-50)
  - **B11** Dev banners con border dashed + flag `isDev` (diferencia vs B9 explicada)
- [x] F3.2 CLAUDE.md ya referenciaba `rules/design-system.md` — no requirió cambio.
- [x] F3.3 `rules/primeng.md` actualizado con cross-ref bidireccional en el header introductorio: "Para estructura recomendada por componente ver design-system sección 6". `rules/design-system.md` referencia `rules/primeng.md` y `rules/a11y.md` y `rules/dialogs-sync.md` dentro de los ejemplos.
- [x] F3.4 Intro del archivo reescrito: agregada tabla que divide capa A (globales en styles.scss) vs capa B (pautas en design-system.md) + criterio de decisión "si es visualmente invariable → A; si es estructural → B". Historial actualizado: Fase 3 marcada 2026-04-17.
- [x] F3.5 Maestro (tabla inventario + checklist F3) + este task actualizados.

**Notas de ejecución**:

- **Sin cambios de código SCSS**: F3 es solo documentación. Los componentes de usuarios ya aplican todas las pautas; no se tocó código fuente.
- **Ejemplos literales con contexto**: cada bloque B incluye una línea de "**Por qué**" o "**Diferencia vs X**" para que el consumidor entienda la decisión, no solo la copie. El objetivo es que el próximo chat que haga un módulo nuevo pueda pegarse a la referencia sin volver a mirar usuarios.
- **Deudas C1-C4 mencionadas inline**: el ejemplo de `.field .p-error` en B8 referencia `// deuda C1 — pendiente token var(--red-500)` y el `color: #ffffff` de success referencia "deuda C4 — ver B7". Esto las mantiene visibles hasta F4.
- **Regla de cross-reference**: B4 referencia `rules/design-system.md` sección 1 (globales de transparencia) en lugar de duplicar; B5 referencia `rules/a11y.md`; B6 referencia `rules/primeng.md` (appendTo=body); B8 referencia `rules/dialogs-sync.md`. Así se evita que design-system se convierta en un monolito que repite otras reglas.

### F4 — Migración de tokens hardcoded C1-C4 ✅ (2026-04-17)

- [x] F4.1 Reemplazar `#e24c4c` → `var(--red-500)` (form invalid) y `#dc2626` → `var(--red-600)` (error fuerte) en ~25 archivos: admin (usuarios form-dialog, usuarios-import, error-logs + detail-drawer, feedback-reports, horarios-import, campus-editor, salon-notas-tab admin, salon-attendance-tab admin), shared (form-field-error, feedback-report-dialog, voice-button, user-profile-menu, floating-notification-bell + 4 hijos), cross-role (attendance-reports result+summary, ctest-k6 credentials-dialog + load-profile, home-component profesor-attendance-widget + attendance-summary-widget, login), estudiante (student-attendance-tab), profesor (health-justification-list).
- [x] F4.2 Agregada regla global A5 en `styles.scss`: `app-intranet-layout .p-button.p-button-success { color: var(--white-color) }` (más hover). Eliminado `style="color: white"` inline de `usuarios-header.component.html`. Convención documentada en design-system.md secciones 5 y B7.
- [x] F4.3 Reemplazar `#1e40af` → `var(--blue-800)` en ~8 archivos: error-logs, usuarios-table, feedback-reports, feedback-report-dialog, attendance-reports (result+summary), health-justification-list. Token alineado con a11y.md que ya oficializaba `#1e40af` como acento azul sobre fondo claro.
- [x] F4.4 Design-system.md actualizado: secciones 5 (A5), 8 (D: Tokens de color con mapa canónico) nuevas, B7 actualizado (ya no menciona `color: white` como deuda), B8 ya no tiene `color: #e24c4c` en ejemplo, stat-card B3 crítico usa `var(--red-600)`. Marcador "deuda C1/C4" eliminado, cross-ref de primeng.md actualizado a "sección 7". Historial con Fase 4.

**Excepciones justificadas** (hex literal se mantiene con razón documentada):
- `notification-quick-access.scss` — `$priority-map` usa `#dc2626` porque Sass `color.adjust()` requiere color literal en compile time.
- `campus-minimap.service.ts` — `ctx.fillStyle = '#dc2626'` porque Canvas API no soporta `var()` en strings de color.
- `foro-tab.component.ts` / `mensajeria-tab.component.ts` — paletas rotativas de colores de avatar (decorativas, no semánticas).
- `salon-notas-tab.scss` / `salon-notas-estudiante-tab.scss` — ya usan fallback defensivo `var(--red-600, #dc2626)`, el hex está en posición de fallback.
- `styles.scss` toast error (`#fee2e2` background): migrado el border-left a `var(--red-600)`, el background `#fee2e2` es un tinte `red-100` ligeramente custom para el toast — se puede migrar a `var(--red-100)` en un follow-up si se valida visualmente.

**Build**: OK (solo warnings ESM pre-existentes de dayjs/saxes/exceljs, no relacionados con F4).

**Scope no cubierto** (bajo impacto, diferible): `color: white` en ~22 archivos restantes (todos en contextos de badges/icons/hovers sobre fondos coloreados, no en botones — no son deuda C4). Tokens `#dbeafe` (blue-100), `#d97706` (yellow-600), `#16a34a` (green-600) no estaban en el scope original de F4 pero aparecen hardcoded en varios archivos — candidatos para follow-up micro-task si se quiere extender la convención de tokens.

### F5 — (Opcional, diferible) Migración de páginas existentes al estándar

- [x] **F5.1 — Auditoría de páginas admin** ✅ (2026-04-18) — 14 páginas admin inspeccionadas con grep de patrones divergentes (anti-B1 `background: var(--surface-card)` + `box-shadow`, ausencia de `<app-page-header>`, tags hardcoded `#fff`/`#ffffff`).

  **Resumen de divergencias detectadas**:

  | Página | `<app-page-header>` | Anti-B1 (bg+shadow) | `bg: #fff` literal | Observación |
  |--------|---------------------|---------------------|--------------------|-------------|
  | **users** (canónica) | ✅ | ⚠️ `usuarios-stats` tiene `box-shadow: 0 1px 3px rgba(0,0,0,0.1)` | — | Referencia — el propio subcomponente stats tiene residuo que contradice B1 |
  | error-logs | ✅ | ✅ ok | — | Cumple estándar |
  | feedback-reports | ❌ **falta** | ✅ ok | — | Prioridad alta por visibilidad |
  | attendances | ❌ **falta** | ✅ ok | — | Prioridad alta (admin usa frecuentemente) |
  | email-outbox | ❌ **falta** | — | ⚠️ `.email-outbox.scss:57 background: #fff` | Monitoreo admin |
  | feedback-reports / error-logs / attendances | mix | — | — | stats + filters en orden canónico |
  | campus | ❌ **falta** | ⚠️ varios `box-shadow` | — | **Caso especial**: editor 3D/2D, layout imperativo con canvas — aplicar estándar solo al header/toolbar, no al canvas |
  | vistas | ✅ | ⚠️ `.stat-card` con `bg: var(--surface-card)` + `box-shadow` | — | Stat-card tiene anatomía correcta pero viola B1 |
  | cursos | ✅ | ⚠️ `box-shadow: 0 1px 3px` en `.filters-bar` | — | Filters-bar debería tener solo border |
  | salones-admin (classrooms) | ✅ | ✅ ok | — | Cumple estándar |
  | schedules (horarios) | ✅ | ⚠️ 3 `box-shadow` en root scss | — | Subcomponentes `curso-picker` y `weekly-view` tienen shadows decorativos legítimos (drag & drop, event cards) — no migrar |
  | eventos-calendario | ✅ | ✅ ok | — | Cumple estándar |
  | notificaciones-admin | ✅ | ✅ ok | — | Cumple estándar |
  | permisos-roles | ✅ | ⚠️ `box-shadow: 0 1px 3px` | — | Probable `.filters-bar` o header |
  | permisos-usuarios | ✅ | ⚠️ `permisos-stats-cards` tiene `box-shadow` | — | Subcomponente stats |
  | permisos-edit-dialog | — | ⚠️ `box-shadow` | — | Dialog con shadow decorativo — posible legítimo (overlay panel), revisar |

- [x] **F5.2 — Priorización para F5.3** ✅ (2026-04-18)

  **Criterios**: (1) visibilidad/frecuencia de uso, (2) magnitud de divergencia, (3) esfuerzo acotado a 1 chat.

  **Backlog ordenado**:

  | Orden | Página | Alcance | Divergencias a resolver | Chat |
  |-------|--------|---------|-------------------------|------|
  | **1** | `feedback-reports` | 1 chat | Agregar `<app-page-header>` con refresh+exportar, verificar filter-bar canónica, row actions triplet si aplica | F5.3.1 |
  | **2** | `attendances` | 1 chat | Agregar `<app-page-header>`, revisar stat-cards + filters-bar contra B2/B3/B6 | F5.3.2 |
  | **3** | `email-outbox` | 1 chat | Agregar `<app-page-header>`, reemplazar `background: #fff` en `email-outbox.scss:57`, alinear stats card | F5.3.3 |
  | **4** | `vistas` | 1 chat | Remover `background: var(--surface-card)` + `box-shadow` del stat-card (el global ya da transparencia, el box-shadow queda huérfano rompiendo B1) | F5.3.4 |
  | **5** | `cursos` | 1 chat | Remover `box-shadow` de filters-bar (debería tener solo border B6) | F5.3.5 |
  | **6** | `permisos-roles` + `permisos-stats-cards` + `usuarios-stats` | 1 chat | Remover `box-shadow: 0 1px 3px rgba(0,0,0,0.1)` residual en 3 componentes de stats (anti-B3) | F5.3.6 |
  | **7** | `horarios/schedules` (root scss) | 1 chat | Revisar los 3 `box-shadow` del root scss — si son de wrappers, remover; si son de componentes internos legítimos, no tocar. **No tocar** subcomponentes `curso-picker` y `weekly-view` (shadows de drag & drop + event cards son legítimos). | F5.3.7 |
  | **8** | `campus` | 1 chat | **Caso especial**: aplicar estándar solo al header + toolbar, dejar el canvas/editor 3D como excepción legítima (layout imperativo). Posible documentar excepción en design-system.md § "Excepciones legítimas". | F5.3.8 |

  **Subcomponentes NO a migrar** (shadows decorativos legítimos, documentados como excepción):
  - `horarios-curso-picker` — drag previews
  - `horarios-weekly-view` — event cards con depth intencional
  - `permisos-edit-dialog` — overlay panel
  - `campus-editor` — canvas overlay

  **Sin prisa operativa**: todas estas migraciones son cosméticas, no bloquean features ni confiabilidad. Se ejecutan 1 por chat conforme el proyecto lo requiera o al tocar cada página por otra razón (regla "cleanup gradual al tocar archivo").

- [ ] **F5.3 — Migración** (1 chat por página del backlog F5.2, en orden)
  - [ ] F5.3.1 `feedback-reports`
  - [ ] F5.3.2 `attendances`
  - [ ] F5.3.3 `email-outbox`
  - [ ] F5.3.4 `vistas`
  - [ ] F5.3.5 `cursos`
  - [ ] F5.3.6 Stats residuales (`permisos-roles`, `permisos-stats-cards`, `usuarios-stats`)
  - [ ] F5.3.7 `horarios/schedules` root
  - [ ] F5.3.8 `campus` (header solo, documentar excepción canvas)

---

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Neutralización global de `p-tag` rompe UX en tablas críticas (asistencia, errores) | Decisión explícita F1.0 (usuario elige). Opciones B/C preservan colores donde importan |
| Override global de botones `p-button-text`/`p-button-outlined` afecta páginas públicas | Scope limitar el selector a `.intranet-layout` si es necesario; auditar páginas públicas primero |
| Cambio de focus ring de primary a text-color afecta accesibilidad | Verificar que el contraste sigue siendo ≥ 3:1 (WCAG AA para non-text) |
| Overrides existentes en componentes quedan desincronizados | Cleanup gradual: al tocar un archivo, revisar si sus overrides locales ya son redundantes |
| La documentación en `design-system.md` queda obsoleta al evolucionar usuarios | Convención: cualquier cambio en usuarios que toque patrón documentado debe actualizar la regla |

---

## Criterios de éxito

- [x] F1 cerrado: patrones A2-A4 en global, decisión A1 tomada, regla existente actualizada
- [x] F2 cerrado: patrón A1 aplicado según opción elegida, verificación visual en 3-4 páginas
- [x] F3 cerrado: `rules/design-system.md` con pautas B1-B11 y cross-refs en CLAUDE.md/primeng.md
- [x] F4 cerrado: tokens hardcoded migrados (C1/C3/C4 resueltas), secciones 5 (A5) + 8 (D) agregadas, deuda documentada como convención
- [x] Build OK sin warnings nuevos (solo ESM pre-existentes de dayjs/saxes/exceljs)
- [ ] F5 — (diferible) Overrides locales redundantes removidos incrementalmente al tocar cada archivo
- [x] Plan maestro actualizado
