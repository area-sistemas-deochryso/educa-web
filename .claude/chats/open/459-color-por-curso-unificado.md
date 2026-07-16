# 459 — Unificar color por curso entre grilla admin y tarjetas Mis Cursos

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-16 · **Modo sugerido**: `/execute` directo (alcance ya cerrado en diseño, sin decisiones de producto pendientes)
> **Plan**: `../educa-coord/plans/xrepo-89-propuestas-rediseno-ux-horarios-cursos.md` § propuesta 3
> **Prioridad**: 🔴 alta — mejor relación impacto/costo de las 5 propuestas de rediseño priorizadas en brief 446 (P89)
> **exclusive**: `false`
> **isolation**: `worktree`
> **touches**:
>   - `src/app/features/intranet/pages/admin/schedules/helpers/horario-time.utils.ts`
>   - `src/app/features/intranet/shared/config/curso-colors.ts` (lectura, no debería requerir cambios)

## Problema

Existen **dos mecanismos de coloreado por curso completamente separados y no coordinados**:

1. `curso-colors.ts` (`buildCursoColorMap`) — usado por `profesor-cursos.component.ts` y `estudiante-cursos.component.ts` (tarjetas "Mis Cursos").
2. `horario-time.utils.ts` — tiene su **propio** `cursoColorMap` local, construido con su propio orden de iteración, independiente del util de arriba. Lo usa la grilla semanal de Gestión de Horarios (admin).

Cada uno asigna colores según el orden en que aparecen los horarios en su propio array — no hay garantía de que un mismo `cursoId` reciba el mismo color en la grilla del admin que en las tarjetas del profesor/estudiante. Un admin y un profesor mirando el mismo curso ven colores distintos, lo que rompe el reconocimiento visual cross-rol.

## Scope

- Reemplazar el cálculo local de color en `horario-time.utils.ts` por `buildCursoColorMap` (mismo util que ya usan `profesor-cursos`/`estudiante-cursos`), o extraer una función determinística por `cursoId` (no por orden de aparición) si `buildCursoColorMap` no es directamente reusable en el contexto de la grilla admin (revisar su firma antes de decidir).
- El color debe depender únicamente de `cursoId` — no del orden en que los horarios están cargados en cada vista, para que sea estable sin importar qué esté cargado en pantalla.
- Verificar si el calendario del profesor (si existe una tercera superficie con horarios de curso) usa alguno de estos dos mecanismos o uno propio — de ser un tercero, unificarlo también; si no aplica, no tocarlo.

## Out of scope

- Cambiar la paleta de colores en sí (`CURSO_COLORS`) — solo unificar qué color le toca a cada curso, no qué colores existen.
- Cualquier otra de las propuestas de P89 (#1, #4, #5, #8) — briefs separados.

## Criterio de cierre

- [ ] Un mismo `cursoId` recibe el mismo color en la grilla semanal de Gestión de Horarios (admin) y en las tarjetas "Mis Cursos" (profesor y estudiante).
- [ ] El color no cambia si se recarga la página con un subconjunto distinto de horarios visibles (determinístico por `cursoId`, no por orden de aparición).
- [ ] Build + lint + tests OK.
- [ ] Verificado en vivo: mismo curso, mismo color, en las 3 vistas (admin/profesor/estudiante) contra TEST DB.

## Tiempo estimado

~30-45 min (unificación de un util ya existente, sin cambio de backend, sin decisiones de producto pendientes).
