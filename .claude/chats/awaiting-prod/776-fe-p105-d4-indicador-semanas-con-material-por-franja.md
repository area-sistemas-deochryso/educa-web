# 776 — FE: P105 D4 — indicador «semanas con material» por franja en las tarjetas de Mis Cursos

> **Origen**: Educa.API chat 775 · commit `b02f9694` · 2026-10-06 (continuación de brief 774, P105 D4)
> **Repo afectado**: `educa-web` (solo FE). El BE ya está commiteado en `Educa.API`; **falta desplegarlo** antes de verificar contra prod.
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § D (D4) y `xrepo-89-propuestas-rediseno-ux-horarios-cursos.md` § 5.
> **Created**: 2026-10-06
> **MODO SUGERIDO**: `/execute` (el contrato está cerrado; el diseño visual del chip ya se decidió en 774: indicador **por franja**, un `n/N` por chip)
> **Validación prod**: ⏳ pendiente desde 2026-10-06 (requiere deploy del BE `b02f9694` + `/verify-prod`)
> **exclusive**: `false`
> **modules**: `academic`
> **touches** (a re-verificar): modelo `HorarioProfesorDto`, `groupHorariosByPair`, `CursoPairCardComponent`, `cache-versions.config.ts` (`horarios`), tests, specs de a11y.

## CONTEXTO DEL CAMBIO (BE, ya hecho)

`GET /api/estudiantecurso/mis-horarios` y `GET /api/horario/profesor/{profesorId}` devuelven, por cada horario (franja), un campo opcional:

```json
"contenidoResumen": { "numeroSemanas": 16, "semanasConMaterial": 4 }
```

- **«Semana con material»** = al menos 1 archivo **o** 1 tarea (título/descripción/mensajeDocente no cuentan).
- **Ausente** (el `null` no viaja: config global `NullValueHandling.Ignore`) = el horario no tiene `CursoContenido` activo → pintar «sin contenido», **no** «0/0». `semanasConMaterial = 0` con `numeroSemanas = N` sí es «0/N».
- Solo estas dos listas lo calculan. `GET /api/horario`, `/salon/{id}` y `/dia/{n}` no lo traen (aunque el tipo compartido lo declare opcional).
- Es **por franja**: el contenido cuelga del horario, no del par curso+salón. D1: nunca agregar entre franjas.
- «Ver como» ya queda resuelto por el BE (misma identidad que `mis-horarios`).
- Contrato documentado en `educa-coord/contracts/api-catalog.md` (cambio sin commitear en coord al cierre de 775).

## IMPACTO EN ESTE REPO

1. Modelo: agregar `contenidoResumen?: { numeroSemanas: number; semanasConMaterial: number }` al DTO de horario (`HorarioProfesorDto` y el del estudiante).
2. `groupHorariosByPair` debe conservar el resumen **por franja** (no sumarlo por par).
3. `CursoPairCardComponent`: en cada chip de franja, un `n/N` con barra, `role="progressbar"` + `aria-valuenow/min/max` y etiqueta accesible; estado vacío para ausente.
4. **SW cache**: el contrato cacheado de `horarios` cambia de forma aditiva. Con caché viejo el campo viene ausente y se vería «sin contenido» hasta que expire → evaluar bump de `horarios` en `cache-versions.config.ts` (y verificar que no pise otros consumidores).
5. Tests del componente (ausente, 0/N, n/N, n=N) y a11y.

## Pre-work

- `educa-web/.claude/rules/` y `invariants` de contratos (`INV-CONTRACT01`, camelCase).
- Brief 774 (decisión de diseño del indicador por franja).
- Verificación contra prod: levantar el BE local contra BBDD de prod (`/verify-prod`), nunca contra la API pública con mutaciones; aquí solo hay lecturas.

## RESULTADO (2026-10-06)

- `ContenidoResumenDto` + `contenidoResumen?` en `HorarioProfesorDto` (`profesor.models.ts`; el estudiante reutiliza el mismo DTO).
- `groupHorariosByPair` no se tocó: las franjas ya viajan como DTOs completos, el resumen queda por franja.
- `CursoPairCardComponent`: por chip, barra `role="progressbar"` + `n/N` (aria-valuenow/min/max, valuetext, label); ausente → «Sin contenido»; `0/N` se distingue de ausente.
- **Sin bump de `horarios`**: `/api/horario` no cubre `/api/estudiantecurso/mis-horarios`, el campo es aditivo y el SWR revalida en background.
- Tests: 5 nuevos en `curso-pair-card.component.spec.ts`. Lint 0 errores · build OK · 3186 tests verdes.
- Pendiente: verificación visual contra prod tras desplegar el BE.
