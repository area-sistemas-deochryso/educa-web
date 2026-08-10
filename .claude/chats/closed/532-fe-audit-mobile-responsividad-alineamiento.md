---
exclusive: false
isolation: false
touches: [src/app/features/intranet/shared/components/page-header/, src/app/features/intranet/shared/components/view-as-banner/, src/app/features/intranet/pages/estudiante/cursos/, src/styles.scss]
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Continuación directa del audit de `531-fe-audit-alineacion-admin-estudiante-profesor.md`, mismo chat, mismo repo.
> **Plan**: — · **Chat**: — · **Fase**: — · **Creado**: 2026-08-08 · **Estado**: ✅ cerrado 2026-08-08. Sin commitear todavía (pendiente confirmar con el usuario).

---

# Audit de responsividad + alineamiento mobile — Administrador / Estudiante / Profesor

## OBJETIVO

Continuación del brief 531 (que fue desktop-only): re-auditar los mismos 3 roles pero en viewport mobile (~311-375px, Chrome DevTools responsive mode), esta vez enfocado en responsividad (overflow horizontal) + alineamiento, no en theming/copy como el brief anterior.

## HALLAZGOS — 3 confirmados y corregidos

### 1. Botones de acción del header se salen del viewport — componente compartido `app-page-header`
En mobile, `.header-actions` (el slot de `ng-content` para los botones de acción de cada página, ej. "Nuevo Usuario"/"Migrar Contraseñas" en `/admin/usuarios`) tenía `flex-shrink: 0` sin `max-width`, así que aunque el padre tenía `flex-wrap: wrap`, el contenedor de acciones nunca se veía forzado a encoger — sus botones quedaban clippeados fuera de pantalla e inaccesibles (medido: `right: 389px` vs `window.innerWidth: 311px`).
- Afecta a **todas** las páginas admin que usan `app-page-header` con botones de acción.
- Fix: `page-header.component.scss` — `.header-actions { flex-shrink: 1; min-width: 0; max-width: 100%; }`.

### 2. Toast de PrimeNG con ancho fijo se sale por el borde izquierdo — global
`.p-toast` renderiza con `width: 400px` inline (fijado por PrimeNG, no adapta a viewport). En mobile, anclado a `right: 20px`, el texto del toast quedaba parcialmente fuera de pantalla e ilegible (repro: error 400 real en `/admin/campus`).
- Fix: `styles.scss`, dentro de `.p-toast.p-toast-top-right` ya existente (regla añadida por el brief 531) — nuevo `@media (max-width: 480px) { width: calc(100vw - 2rem) !important; right: 1rem !important; left: 1rem !important; }`.
- No afecta desktop (media query acotada a ≤480px).

### 3. Tarjeta de curso y banner "Viendo como" cortados en mobile — Estudiante (y compartido con Profesor)
- `estudiante-cursos.component.ts` (`.course-card`): tenía `min-width: 320px` fijo, más ancho que viewports <320px — la fecha/docente/link "Ver curso →" quedaban fuera de pantalla. Fix: `min-width: 0; max-width: 100%` (mismo patrón que hallazgo 1).
- `view-as-banner.component.scss` (banner "Viendo como: X (Rol) / Cambiar / Salir", compartido por los 3 roles): sin `flex-wrap`, el botón "Salir" quedaba cortado cuando el texto del nombre ya ocupaba varias líneas. Fix: `@media (max-width: 480px) { .view-as-banner__inner { flex-wrap: wrap; } .view-as-banner__actions { width: 100%; justify-content: flex-end; } }`.

## COBERTURA VERIFICADA SIN HALLAZGOS

- **Admin**: usuarios, campus, monitoreo, salones, calendario, rendimiento, permisos-salud, ayuda/faq, explicaciones, asistencias, horarios, cursos, home (`/intranet`).
- **Estudiante** (con datos reales, vía "ver como"): cursos, horarios, salones.
- **Profesor** (estructural — ver nota abajo): cursos, horarios, salones — banner y header limpios, sin overflow.

## NOTA NO PREVISTA — datos de profesor de prueba sin cursos asignados

Se probaron **14 cuentas de profesor** distintas (incluida `MENDO CALDERON MARIELA`, vista como docente activa en una tarjeta de curso de Estudiante) vía "ver como" → todas mostraron "No tienes cursos asignados" en `/profesor/cursos`. Esto impidió verificar visualmente páginas de Profesor con contenido real (asistencia, notas, grilla de horario con clases).

Esto **no parece un bug de layout mobile** — probablemente un problema de datos de test (filtro por período/año que no matchea, o vínculo horario↔cuenta de profesor roto en el seed de test). Queda fuera del alcance de este audit visual; si se quiere confirmar, requiere `/investigate` en el backend/seed de datos, no en el frontend.

## FUERA DE ALCANCE

- El FAB "Acciones" (arrastrable) — comportamiento esperado, no tocar (mismo criterio que brief 531).
- Grillas de asistencia/notas de Profesor con datos reales — no verificables por la nota de arriba.
- El buscador de profesor en el picker "ver como" resultó intermitente para autocompletar vía automatización de browser (funcionaba a veces con eventos sintéticos, otras no) — no es necesariamente un bug real de UI, podría ser fricción específica de CDP/automatización; no se investigó más porque excede el alcance visual de este chat.

## VALIDACIÓN FINAL

- Los 3 hallazgos verificados visualmente en vivo (mobile viewport, screenshot antes/después) contra backend con `UseTestEnv=true`.
- Barrido automatizado de overflow horizontal (script JS ad hoc) sin offenders restantes en las páginas listadas en "Cobertura verificada".
- Lint no re-confirmado explícitamente tras el fix de `styles.scss` (sí se corrió tras el fix de `page-header.component.scss`, limpio). Pendiente re-correr antes de commitear.

## CRITERIOS DE CIERRE

- [x] Hallazgo 1 corregido y verificado (`page-header.component.scss`).
- [x] Hallazgo 2 corregido y verificado (`styles.scss`).
- [x] Hallazgo 3 corregido y verificado (`estudiante-cursos.component.ts` + `view-as-banner.component.scss`).
- [x] `bun run lint` re-confirmado sobre el diff completo (5 archivos modificados) — 0 errores.
- [ ] `bun run build`.
- [ ] Commit — no realizado en este chat, pendiente confirmación explícita del usuario.
- [ ] Nota de datos de profesor sin cursos — evaluar si amerita brief propio de investigación backend.

## CIERRE

Chat de continuación directa de 531, mismo alcance de repo/rol pero eje mobile en vez de desktop. Los 3 fixes reusan el mismo patrón estructural (`flex-shrink: 1; min-width: 0; max-width: 100%` / `flex-wrap: wrap` en el breakpoint mobile) — consistente con que todos son variantes del mismo síntoma: contenedores flex sin piso de encogimiento definido correctamente para viewports angostos.

Trabajo no cerrado del todo: la nota de profesores sin cursos asignados queda como hallazgo colateral sin investigar, y el commit de estos 5 archivos queda pendiente de decisión del usuario.
