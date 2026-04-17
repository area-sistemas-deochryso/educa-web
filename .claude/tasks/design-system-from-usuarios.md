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

- [ ] **F2.2 — Estados operativos** (chat separado, ~8 archivos)
  - [ ] Auditar `asistencia` (A/T/F/J diario + por curso): confirmar que NO tengan `tag-neutral` — `severity` de cada estado es información crítica
  - [ ] Auditar `aprobación` (APROBADO/DESAPROBADO/PENDIENTE): sin `tag-neutral`
  - [ ] Auditar `error-logs` (CRITICAL/ERROR/WARN/INFO): sin `tag-neutral` — severidad es lo que escanea el admin
  - [ ] Archivos candidatos: `attendance-registration-panel`, `attendance-summary-panel`, `attendances.component`, `error-logs.component`, `error-log-detail-drawer`, `salon-aprobacion-tab`, `simulador-notas` (si tiene estados)

- [ ] **F2.3 — Metadatos admin** (chat separado, ~12 archivos)
  - [ ] Aplicar `tag-neutral` a tags de categoría/tipo/metadato en:
    - `vistas.component` — tipo de vista (menu/secundaria)
    - `permisos-roles`, `permisos-usuarios`, `permisos-detail-drawer`, `permisos-edit-dialog` — módulos y scopes
    - `eventos-calendario` — tipo y categoría de evento
    - `notificaciones-admin` — tipo y prioridad
    - `email-outbox-table` — tipo de correo y estado (estado puede ser crítico: FAILED en rojo — ojo)
    - `feedback-reports` — categoría/tipo del reporte

- [ ] **F2.4 — Académico** (chat separado, ~15 archivos)
  - [ ] Audit por tag — mezcla informativo/crítico:
    - `horarios-list-view`, `horario-detail-drawer`, `horarios-import-dialog` — salón, curso, profesor (informativos)
    - `salones-admin-table`, `salon-detail-dialog`, `cerrar-periodo-dialog` — estado de periodo (puede ser crítico si ABIERTO/CERRADO importa visualmente)
    - `cursos.component` — nivel, tipo de calificación
    - `calificar-dialog`, `calificaciones-panel`, `notas-curso-card`, `salon-notas-tab`, `salon-notas-estudiante-tab`, `estudiante-grupos-tab`, `salon-grupos-tab` — grupo, tipo de evaluación (informativos); puntajes con severidad (pueden ser críticos)
    - `profesor-salones`, `profesor-final-salones`, `estudiante-salones`, `estudiante-cursos`, `profesor-cursos` — estado del salón/curso

- [ ] **F2.5 — Misc y cross-role** (chat separado, ~10 archivos)
  - [ ] `videoconferencias` — estado de sesión (ACTIVA/FINALIZADA — puede ser crítico)
  - [ ] `mensajeria-tab`, `foro-tab` — categoría del mensaje
  - [ ] `ctest-k6`, `credentials-dialog` — metadatos de prueba
  - [ ] `campus` — tipo de edificio/zona
  - [ ] `user-info-dialog` — rol del usuario (informativo)
  - [ ] `health-justification-dialog` — tipo de justificación
  - [ ] `salon-estudiantes-dialog`, `salon-health-permissions-tab` — estado

### F3 — Documentar pautas (B1-B11) como design-system.md (chat 3)

- [ ] F3.1 Crear `rules/design-system.md` con todas las pautas B1-B11:
  - Estructura recomendada por componente (copy-paste-able)
  - Ejemplos canónicos tomados literal de usuarios
  - Anti-patrones comunes a evitar
- [ ] F3.2 Agregar referencia al design-system en CLAUDE.md project
- [ ] F3.3 Actualizar `rules/primeng.md` para cross-referenciar design-system en secciones relevantes
- [ ] F3.4 Actualizar maestro + este task

### F4 — (Opcional, diferible) Migración de tokens hardcoded C1-C4

- [ ] F4.1 Reemplazar `#e24c4c`, `#dc2626` por `var(--red-500)` en archivos que los usan (grep project-wide)
- [ ] F4.2 Resolver `color: white` inline en `p-button-success` configurando tema PrimeNG (o dejando como convención documentada si no vale la pena)
- [ ] F4.3 Reemplazar `#1e40af` por token primary/custom
- [ ] F4.4 Actualizar maestro + este task

### F5 — (Opcional, diferible) Migración de páginas existentes al estándar

- [ ] F5.1 Auditar páginas admin que NO siguen el estándar (identificar con grep de patrones divergentes)
- [ ] F5.2 Priorizar por visibilidad (error-logs, feedback-reports, attendances primero)
- [ ] F5.3 Migrar 1 página por chat

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

- [ ] F1 cerrado: patrones A2-A4 en global, decisión A1 tomada, regla existente actualizada
- [ ] F2 cerrado: patrón A1 aplicado según opción elegida, verificación visual en 3-4 páginas
- [ ] F3 cerrado: `rules/design-system.md` creado con pautas B1-B11 y cross-refs en CLAUDE.md/primeng.md
- [ ] Build OK sin warnings nuevos
- [ ] Overrides locales redundantes identificados (no necesariamente removidos) vía grep
- [ ] Plan maestro actualizado
