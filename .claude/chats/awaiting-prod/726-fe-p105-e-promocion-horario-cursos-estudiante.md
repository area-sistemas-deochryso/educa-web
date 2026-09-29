# 726 — P105-E — Mayor visibilidad del Horario en Cursos (estudiante)

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` (idea E)
> **Created**: 2026-09-29 · **Estado**: ✅ implementado (opción A), esperando verificación en vivo.
> **Validación prod**: ⏳ pendiente desde 2026-09-29 — mirar `/intranet/estudiante/cursos` como estudiante: el botón "Ver horario" se nota y navega a `/intranet/estudiante/horarios`.
> **MODO SUGERIDO**: `/design` (el plan P105 exige diseño antes de ejecutar; luego `/execute`)
> **exclusive**: `false`
> **modules**: `academic`, `schedules`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/**/cursos/**` (vista estudiante)

## Scope

### educa-web
- Hacer descubrible la sección Horario de los cursos del estudiante (hoy poco visible).
- `/design`: elegir mecanismo (acceso directo en la tarjeta, tab destacado, CTA) y confirmar con el usuario qué ve hoy el estudiante en vivo antes de decidir (no inferir del código).

## Decisiones de `/design` (2026-09-29)

- "Sección Horario" = página `/intranet/estudiante/horarios`. Hoy solo se llega por un link `text-sm` en el `app-page-header` de `estudiante-cursos.component.ts`.
- **Elegida: opción A** — reemplazar ese link por un botón destacado (outlined, ícono calendario, "Ver horario") en el header, siempre visible.
- Descartadas: B (enlace en franja "Hoy": no aparece sin clases hoy) y C (fila clicable en la tarjeta: tercer destino por tarjeta, riesgo de clic equivocado).
- Mantener `data-info-anchor="estudiante-cursos-ver-horario"` en el nuevo elemento.

## Pre-work

- Recorrer la vista en local (ver como estudiante) para fijar el punto de partida real.

## Out of scope

- Rediseño general de Cursos/Salones/Asistencias (idea D).

## Criterio de cierre

- [x] `/design` resuelto y decisiones registradas en el brief antes de escribir código.
- [ ] FE: lint + build + tests OK, comportamiento verificado en vivo (local + BBDD de prueba).
- [x] `plans/maestro.md` (sin entrada P105) y fila de la idea E en el plan P105 actualizados.

## Tiempo estimado

~1 h.
