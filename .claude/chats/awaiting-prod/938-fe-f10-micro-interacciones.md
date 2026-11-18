---
exclusive: false
isolation: worktree
touches:
  - src/styles.scss
  - src/app/features/intranet/pages/profesor/cursos/components/attendance-registration-panel/
  - src/app/features/intranet/pages/profesor/grades/
  - src/app/features/intranet/shared/components/login/login-button/
hot-paths: []
---

> **Repos afectados**: `educa-web` (solo FE).
> **Plan**: [`plan/motion-system.md`](../../plan/motion-system.md) (F10) · fase F4.
> **Created**: 2026-11-18 · **Estado**: ✅ F4 cerrada localmente (commit en `chat/938-fe-f10-micro-interacciones`).
> **Validación prod**: ⏳ pendiente desde 2026-11-18
> **MODO SUGERIDO**: `/design` corto → `/execute` → `/validate`.
> **modules**: `ui` (motion).

## OBJETIVO

Utilidades compartidas de hover/press, fade skeleton→contenido, stagger en listas cortas y feedback de guardado; aplicar primero a login, asistencia y calificaciones. Depende de F1 y F3 (briefs 935, 937).

## RESULTADO

Utilidades globales en `src/styles.scss` (sin tocar `edu-ui`), solo opacity/transform, tokens de F1 más `--motion-stagger: 30ms`:

| Clase | Efecto | Aplicada en |
|---|---|---|
| `.motion-press` | `scale(.97)` al presionar, 120 ms | botón de login; botones P/T/F de asistencia |
| `.motion-fade-in` | fade 200 ms del contenido que reemplaza al skeleton | panel de calificaciones; lista de asistencia |
| `.motion-stagger-item` | sube 8 px + fade, 30 ms por ítem, tope 8 (`--i`) | filas de estudiantes de asistencia |
| `.motion-saved` | entrada del indicador de guardado | tag «Guardado a las…» de asistencia |

Decisiones no obvias: fill-mode `backwards` (no `both`: dejaría un `transform` final que crea containing block); `animation-delay: 0s` agregado al reduced-motion global (si no, las filas con delay quedan invisibles); `.motion-press` usa `:not(:disabled)` para superar la especificidad de `.edu-button[_ngcontent]`, que pisaba el `transition`, y repite sus propiedades de color.

**Medido en vivo** (profesor de prueba, local, `UseTestEnv=true`): `page-enter` 200 ms en calificaciones y lista de asistencia; `transition: transform 0.12s, background/border-color/color 0.2s` en edu-button; delay del stagger 0.15 s con `--i`=5 y 0.24 s de tope con `--i`=20. **No verificado**: `:active` real, stagger visual (el curso de prueba tiene 1 alumno), `motion-saved` en movimiento, botón de login, ms de frame (Chrome automatizado con frames lentos).

## MÓDULOS PENDIENTES (siguientes lotes)

- Skeleton→contenido (`.motion-fade-in`): 25 usos de `app-skeleton-loader`, p. ej. `attendance-dashboard`, `attendance-table-skeleton`, widgets de asistencia del home (`attendance-summary-widget`, `estudiante-attendance-widget`, `profesor-attendance-widget`).
- Press: el resto de `edu-button` y los `login-*` (opciones, selector de rol).
- Stagger: listas cortas de otros módulos (usar `[style.--i]="$index"`; no en listas largas).
- Feedback de guardado: calificaciones y demás formularios con toast de éxito.
- Medir ms reales (Performance API) en un Chrome normal.

## PRE-WORK OBLIGATORIO

- Leer `plan/motion-system.md` (decisiones: ≤200 ms, solo `transform`/`opacity`, reduced-motion obligatorio).
- Worktree en `EducaWeb/WT/educa-web/938-...` con junction de `node_modules`; no tocar `main`.
- Verificación en vivo en local con `UseTestEnv=true` (nunca en prod), dentro del worktree.

## CRITERIO DE CIERRE

- Utilidades documentadas y aplicadas en los 3 módulos iniciales.
- Solo `transform`/`opacity`; tiempos medidos en ms reales (Performance API), no por screenshot.
- Lista de módulos pendientes para siguientes lotes.
