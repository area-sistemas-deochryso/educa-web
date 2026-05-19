# Plan — Intranet FE Polish · Semana 21 (2026-05-18 → 2026-05-24)

> **Creado**: 2026-05-18 — sub-plan FE de la brújula semanal cross-repo.
> **Foco**: pulir UX de la intranet académica con énfasis en uso profesor↔alumno sobre 5 módulos.
> **Tipo**: plan-paraguas semanal FE-only. Forma parte de la brújula cross-repo [`brujula-W21-intranet-polish.md`](../../../educa-coord/plans/brujula-W21-intranet-polish.md).
> **Contraparte BE**: [`intranet-be-tests-W21.md`](../../../Educa.API/.claude/plan/intranet-be-tests-W21.md) — mismos 5 módulos, lente "tests" (BE) vs "flujos + experiencia" (FE).

---

## Scope

Pulido UX en los 5 módulos compartidos con BE, vistos desde la perspectiva del usuario diario (profesor + alumno):

1. **Cursos** — `profesor/cursos`, `estudiante/cursos`. Navegación, archivos embebidos, semanas/tareas.
2. **Salones** — `profesor/classrooms`, `profesor/final-classrooms`, `estudiante/classrooms`. Tutoría, vista de salón, asignaciones.
3. **Horarios** — `profesor/schedules`, `estudiante/schedules`. Vista semanal, lista, navegación entre días.
4. **Archivos** — embebidos en `cursos` y `classrooms` (no tienen page propia). Subir, listar, descargar, paridad profesor↔alumno.
5. **Evaluaciones** — `profesor/grades` (monolítico, 1 `.ts`), `estudiante/notas` (ya partido sano). Edición, visualización, promedios.

**Lente FE**: ¿el flujo cotidiano fluye?, ¿hay fricción visual?, ¿el design-system está aplicado consistente?, ¿faltan estados de loading/empty/error?, ¿la asimetría profesor↔alumno tiene justificación?

---

## Out-of-scope

- **No es feature work**. Sin pantallas nuevas, sin endpoints nuevos, sin cambios de modelo.
- **No incluye tests E2E del flujo** — eso es Plan 18 (xrepo), separado.
- **No incluye refactor arquitectónico** salvo el mínimo para hacer una página testeable o pulible (ej. partir `profesor/grades` siguiendo el patrón de `estudiante/notas`).
- **No incluye módulos fuera de los 5** (asistencia, foro, mensajería, videoconferencias, admin) — siguen sus propios planes y briefs.
- **No incluye bugs descubiertos durante el polish** — se loguean como tasks/briefs aparte y se priorizan fuera de la brújula.

---

## Inventario inicial (mapeo de pages)

| Dominio | Profesor | Estudiante | Admin (config, fuera de scope) |
|---|---|---|---|
| Cursos | `profesor/cursos/` con `components/` + `services/` | `estudiante/cursos/` con `components/` + archivos lazy por semana | `admin/cursos/` |
| Salones | `profesor/classrooms/` (split sano) + `final-classrooms/` | `estudiante/classrooms/` | `admin/classrooms/` |
| Horarios | `profesor/schedules/` | `estudiante/schedules/` | `admin/schedules/` |
| Evaluaciones | `profesor/grades/profesor-calificaciones.component.ts` (monolito) | `estudiante/notas/` (split sano) | — |
| Archivos | embebido en cursos/classrooms | embebido en cursos (lazy semana+tarea) | — |

**Observaciones de barrido inicial**:

- `profesor/grades` es el outlier estructural: 1 solo `.ts`, sin sub-components/services. Candidato a refactor siguiendo patrón de `estudiante/notas`.
- `estudiante/cursos` carga archivos lazy por semana — patrón ya validado. Verificar paridad con `profesor/cursos`.
- Sin `TODO`/`FIXME`/`HACK` en código de estas pages — la deuda no está flagueada en código, va a salir de pasada visual + Cowork/Playwright.
- Design-system (rules/design-system.md) ya cubre admin completo. No verificado sistemáticamente en pages profesor/estudiante.

---

## Fases

### F1 — Investigate · Audit visual de las 10 pages (read-only)

**Objetivo**: producir inventario de hallazgos UX por página, sin cambiar código.

**Pasos**:

1. Levantar dev server (`npm run start`, `:4201`).
2. Loguear como profesor → recorrer `cursos`, `classrooms`, `final-classrooms`, `schedules`, `grades`. Capturar screenshot + console errors por cada una.
3. Loguear como alumno → recorrer `cursos`, `classrooms`, `schedules`, `notas`. Capturar lo mismo.
4. Para cada página, evaluar contra checklist:
   - ¿Aplica design-system B1-B11? (container con border, page header, stat card, tabla, row actions, filter bar, dialogs, drawers, alert banners)
   - ¿Tokens de color (sin hex literal)?
   - ¿`appendTo="body"` en selects/multiselects/calendars?
   - ¿Skeletons en cada sección con datos de API?
   - ¿`aria-label` vía `pt` en botones icon-only?
   - ¿`p-dialog`/`p-drawer` fuera de `@if`?
   - ¿Estados loading/empty/error visibles y consistentes?
   - ¿Flujo cotidiano sin pasos redundantes (clicks extra, scrolls innecesarios, dialogs anidados)?
5. Producir matriz `página × categoría × severidad (🔴/🟡/🟢)` en este archivo (sección F1.Resultados).
6. Loguear bugs reales encontrados como tasks separadas en `.claude/tasks/pending/` con prefijo `polish-W21-`.

**Done cuando**: matriz F1.Resultados completa + tasks de bugs creadas + screenshots/console-logs adjuntos a la matriz (paths a evidencia local OK, no commitear binarios).

### F2 — Design · Priorizar hallazgos y agrupar en briefs

**Objetivo**: convertir la matriz F1 en briefs concretos accionables, agrupando hallazgos por afinidad.

**Pasos**:

1. Releer matriz F1.
2. Agrupar hallazgos similares (ej. "todos los selects sin `appendTo`" → 1 brief; "design-system no aplicado en X+Y" → 1 brief por página o agrupado si patrón compartido).
3. Estimar tamaño (chico ≤2h, medio ≤1 día, grande >1 día).
4. Definir orden: chicos y compartidos primero (victorias rápidas), luego específicos por página.
5. Materializar briefs en `chats/open/` siguiendo plantilla `next-chat.md`. Cada brief apunta a este plan W21 + a la sección de la matriz F1 que lo motiva.

**Done cuando**: ≥3 briefs en `chats/open/` listos para `/start-chat`.

### F3 — Execute · Refactor `profesor/grades` (default candidato N° 1)

**Objetivo**: partir el monolito `profesor-calificaciones.component.ts` siguiendo patrón de `estudiante/notas/`.

**Pasos**:

1. Leer `profesor-calificaciones.component.ts` completo.
2. Leer `estudiante/notas/` para tomar el patrón (html + scss + `components/` + `services/`).
3. Decidir partición de sub-components (tabla de notas, header con filtros, dialog de edición de nota, etc.).
4. Crear sub-components y migrar lógica + template.
5. Aplicar design-system B4 (tabla) + B5 (row actions) + B6 (filter bar) según corresponda.
6. Verificar `appendTo="body"` en selects, `aria-label` en icon-only.
7. Validar: `npm run lint`, `npm run build`, smoke manual del flujo (profesor edita nota, alumno la ve).

**Done cuando**: archivo monolítico partido, lint+build verdes, flujo manual smoke OK.

### F4 — Execute · Otros briefs según F2 ✅ 2026-05-19

**Objetivo**: ejecutar los briefs priorizados de F2 en orden, uno por chat dedicado.

Cada brief sigue su propio ciclo `/start-chat → /execute → /validate → /end`. Esta fase es el agregador — se considera "✅" cuando ≥50% de los briefs F2 cerraron como `awaiting-prod/` o `closed/`.

**Cierre**: 6/6 briefs F2 cerrados (188, 189, 190, 191, 192, 193) = 100% — supera el gate del 50%.

### F5 — Cierre · Consolidación semanal ✅ 2026-05-19 (brief 194)

**Objetivo**: cerrar la semana sin deuda silenciosa.

**Pasos**:

1. Revisar matriz F1 — marcar hallazgos resueltos (vía brief F4) vs pendientes.
2. Hallazgos pendientes → mover a `.claude/tasks/pending/` con prefijo `polish-post-W21-` para retomar en W22 o priorizar como brief independiente.
3. Actualizar maestro local FE (`maestro.md`) con deuda residual.
4. Actualizar brújula coord para reflejar cierre de FE-side.
5. Si el dev-log del proyecto tiene movimiento, correr `/dev-log` para fotografiar el estado final.

**Done cuando**: cola FE consistente, brújula coord actualizada, tasks `polish-post-W21-*` creadas si hace falta.

---

## Criterios de éxito (cierre de W21)

- [ ] F1 matriz completa con las 10 pages auditadas.
- [ ] F2 ≥3 briefs materializados en `chats/open/`.
- [ ] F3 `profesor/grades` refactorizado y validado (si la auditoría F1 confirma que es prioritario).
- [ ] F4 ≥50% de briefs F2 cerrados (awaiting-prod o closed).
- [ ] F5 deuda residual capturada como tasks o entradas en maestro.
- [ ] Bugs descubiertos durante polish → tasks `polish-W21-*` (no se arreglan dentro del plan, se priorizan aparte).

---

## Notas operativas

- Esta brújula **no entra a la cola xrepo numerada** ni a la cola FE-only del maestro local. Vive como sub-plan de la brújula coord W21.
- Si la semana termina sin cerrar F4-F5, se prorroga como W22 con scope reducido — sin acumular deuda silenciosa.
- Cada sub-chat ejecutable (F3, F4) cierra contra este plan local, no contra la brújula coord directamente.
- Si un hallazgo F1 toca BE (endpoint roto, contrato drift, etc.), reportarlo en el sub-plan BE de W21 o como brief xrepo nuevo, no resolverlo acá.

---

## Referencias

- Brújula coord: [`brujula-W21-intranet-polish.md`](../../../educa-coord/plans/brujula-W21-intranet-polish.md).
- Sub-plan BE hermano: [`intranet-be-tests-W21.md`](../../../Educa.API/.claude/plan/intranet-be-tests-W21.md).
- Reglas FE de design: `.claude/rules/design-system.md`, `.claude/rules/a11y.md`, `.claude/rules/primeng.md`, `.claude/rules/dialogs-sync.md`, `.claude/rules/skeletons.md`.
- Maestro local FE: `.claude/plan/maestro.md`.

---

## F1.Resultados — matriz de auditoría

> **Ejecutada**: 2026-05-18 (chat 187, audit estático del código fuente — sin browser, Playwright MCP no disponible). Cada agente Explore leyó component.ts + html + scss + sub-components/services de su par asignado.

| Página | Rol | Design-system | Tokens | appendTo | Skeletons | Aria/pt | Dialogs sync | Loading/empty/error | Flujo cotidiano | Severidad global |
|---|---|---|---|---|---|---|---|---|---|---|
| `profesor/cursos` | P | 🟢 | 🟢 | 🟡 | 🟡 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| `profesor/classrooms` | P | 🟢 | 🟡 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| `profesor/final-classrooms` | P | 🟢 | 🟢 | — | — | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| `profesor/schedules` | P | 🟢 | 🟡 | — | — | — | 🟢 | 🟢 | 🟢 | 🟡 |
| `profesor/grades` | P | 🟡 | 🟢 | 🟢 | 🔴 | 🔴 | 🟢 | 🟡 | 🟢 | 🟡 |
| `estudiante/cursos` | E | 🟢 | 🟡 | 🟢 | 🟡 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| `estudiante/classrooms` | E | 🟢 | 🔴 | 🟢 | — | 🟢 | 🟢 | 🟢 | 🟢 | 🟡 |
| `estudiante/schedules` | E | 🟢 | 🔴 | — | 🔴 | 🔴 | — | 🟢 | 🟢 | 🟡 |
| `estudiante/notas` | E | 🟡 | 🟢 | 🟢 | 🔴 | 🔴 | 🟢 | 🟢 | 🟢 | 🟡 |
| `cross-role/home-component` (touchpoint) | P+E | 🟢 | 🟡 | — | 🟢 | 🟢 | — | 🟢 | 🟢 | 🟢 |

Convención: 🟢 OK · 🟡 menor · 🔴 mayor · — no aplica.

### Categorías evaluadas

- **A** design-system B1-B11 (rules/design-system.md): page-header, table-section, stat cards, filter bar, botones canónicos.
- **B** tokens de color (rules/design-system.md §7-8): cero hex literales en `.scss`/`.ts` salvo excepciones documentadas.
- **C** `appendTo="body"` en `p-select`/`p-multiselect`/`p-calendar`/`p-dropdown`.
- **D** skeletons shared (`app-skeleton-loader`, `app-table-skeleton`, `app-stats-skeleton`) vs spinners genéricos.
- **E** `aria-label` vía `[pt]` en botones icon-only (rules/a11y.md).
- **F** dialogs sync (rules/dialogs-sync.md): `p-dialog`/`p-drawer`/`p-confirmDialog` NUNCA dentro de `@if`.
- **G** estados loading / empty / error consistentes y visibles.
- **H** flujo cotidiano: clicks redundantes, overlays anidados, info evitable en hover.

### Lecturas globales

- **Áreas fuertes (🟢 global)**: `profesor/cursos`, `profesor/classrooms`, `profesor/final-classrooms`, `estudiante/cursos`, `cross-role/home-component`. Patrón estándar aplicado, sin deuda visible.
- **Áreas a pulir (🟡 global)**: `profesor/schedules`, `profesor/grades`, `estudiante/classrooms`, `estudiante/schedules`, `estudiante/notas` — drift consistente en **tokens de color** y **skeletons/aria-labels** del lado estudiante.
- **Sin 🔴 global**. Ninguna página requiere intervención bloqueante.
- **Patrón claro estudiante↔profesor**: las páginas del rol estudiante (3/4 con 🟡) y los componentes propios de notas/schedules sufren más drift que las del profesor, posiblemente por haberse construido más tarde con menos pasadas por el design-system. Confirma la sospecha del scope original ("paridad profesor↔alumno con justificación").
- **F3 confirmado**: `profesor/grades` (290 ln monolito sin sub-components) es candidato real a partir. Skeleton + aria-label faltan dentro del mismo archivo. Sub-components sugeridos: tabla de notas, header filtros, dialog edición.

### Tasks creadas (`polish-W21-*`)

Bugs/hallazgos agrupados por afinidad para alimentar F2 (priorización):

| Task | Scope | Severidad | Páginas afectadas |
|---|---|---|---|
| `polish-W21-tokens-colors.md` | Reemplazar hex literales por tokens del design-system | 🔴 | estudiante/classrooms, estudiante/schedules, cross-role/home, profesor/schedules (debug panel) |
| `polish-W21-aria-labels-estudiante.md` | Agregar `[pt]` con `aria-label` en botones icon-only | 🔴 | estudiante/schedules, estudiante/notas, profesor/grades |
| `polish-W21-skeletons-shared.md` | Migrar spinners genéricos a `app-skeleton-loader`/`app-table-skeleton` | 🔴 | estudiante/schedules, estudiante/notas, profesor/grades, profesor/cursos (parcial), estudiante/cursos (parcial) |
| `polish-W21-appendto-calendars.md` | `appendTo="body"` en `p-calendar` de attendance-summary-panel | 🟡 | profesor/cursos |
| `polish-W21-schedules-debug-panel.md` | Quitar/ocultar panel debug con hex literales (gate por env flag) | 🟡 | profesor/schedules |

> `profesor/grades` refactor (F3 del plan W21) **no** se loguea como task — ya es fase explícita del plan paraguas. Los hallazgos D+E de `profesor/grades` se absorben en el refactor F3.

### Cierre de tasks F2 → briefs F4 (F5, 2026-05-19)

| Task F2 | Brief F4 | Estado |
|---|---|---|
| `polish-W21-appendto-calendars.md` | 188 | ✅ closed (no-op: `appendTo="body"` ya estaba presente) |
| `polish-W21-tokens-colors.md` | 189 | ✅ closed (19 hex → tokens Aura en 4 archivos) |
| `polish-W21-schedules-debug-panel.md` | 190 | ✅ closed (gate visual via `environment.debug.horarioSync` + tokens + SCSS vars) |
| `polish-W21-aria-labels-estudiante.md` | 191 | ✅ closed (`pt` aria-label en day selector + p-inputNumber) |
| `polish-W21-skeletons-shared.md` | 192 | ✅ closed (4 pages + 3 sub-components migrados a shared) |
| `profesor/grades` F3 | 193 | ✅ closed (split monolito + dialogs-sync parcial) |

**Deuda residual capturada**: `tasks/polish-post-W21-grades-dialogs-sync.md` — 3 custom dialogs de `profesor/grades` requieren aceptar `null` en inputs para salir del `@if (contenido())`. No se priorizó porque el costo del cambio es arquitectural (3 sub-components con guards internos).
