# 429 — P84 F3: checklist de completitud en Cursos (FE)

> **Repos afectados**: `educa-web`.
> **Plan**: [`educa-coord/plans/xrepo-84-orientacion-flujo-academico.md`](../../../educa-coord/plans/xrepo-84-orientacion-flujo-academico.md) — Fase F3 (`depends_on: [F1]`).
> **Creado**: 2026-07-10 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`.
> **exclusive**: `false` — puede correr en paralelo con 426 (F2, Educa.API) y 428 (F6, navbar, si no toca los mismos archivos). Overlap posible con 427 (F4, glosario/tooltip) si F3 termina reusando ese componente — verificar estado de 427 antes de arrancar si corre en paralelo.
> **touches**: `educa-web`: `src/app/features/intranet/pages/admin/cursos/**` (`cursos.component.ts/html`, `services/cursos.facade.ts`, `services/cursos.store.ts`, `models/cursos.models.ts`), posible servicio HTTP nuevo para consumir el endpoint.

## Scope

Mostrar en `/admin/cursos` el estado de completitud por curso (profesor asignado / horario creado / conflictos) en modo **señalización no bloqueante** — no impide crear ni editar un curso incompleto. Mismo principio ya cerrado en P71 ("permite pero no fuerza secuencia").

- Consumir `GET /api/sistema/cursos/completitud` (`Educa.API@065c659`, en `main` — ver [`contracts/api-catalog.md`](../../../educa-coord/contracts/api-catalog.md)). Response: `List<CursoCompletitudDto>` con `tieneHorario`, `tieneProfesorAsignado`, `cantidadConflictos`, `horarios[]` (cada uno con `modoAsignacion`, `profesorNombre`, `tieneConflicto`).
- Mostrar por curso, en la tabla/grid de `/admin/cursos`, un indicador visual de completitud (ej. badges: "Sin horario" / "Sin profesor" / "N conflictos" / completo).
- **No bloquear** ninguna acción existente (crear, editar, toggle estado) por incompletitud.
- Si F4 (427, glosario/tooltip de dominio compartido) ya cerró cuando arranca este chat, reusar ese componente para los badges de `modoAsignacion`. Si no cerró todavía, implementar el badge inline como hoy se hace en otras pantallas (ver precedente P71 F4.3/F4.4) y dejar la migración al componente compartido como follow-up cuando F4 cierre — **no bloquear F3 esperando a F4**.

## Pre-work

- Leer `educa-coord/plans/xrepo-84-orientacion-flujo-academico.md` — decisión "Cálculo de completitud por curso" y done-when de F3.
- Leer `educa-coord/contracts/api-catalog.md` §Cursos — shape exacto de la respuesta.
- Leer `src/app/features/intranet/pages/admin/cursos/cursos.component.ts` + `services/cursos.facade.ts` + `services/cursos.store.ts` — patrón signals store + facade ya usado en el feature (ver memoria de proyecto `project_educa_fe_arch`).
- Confirmar estado de 427 (F4) antes de decidir si reusar su componente o implementar inline.

## Out of scope

- Wizard/stepper bloqueante — descartado explícitamente en el plan.
- Cambios al endpoint BE (`Educa.API`) — ya cerrado en F1 (425).
- Los contadores "Sin profesor/Sin estudiantes/Conflictos" de `/admin/horarios` — quedan como están, este chat no los toca.
- Mensajes de error accionables (F5) — depende de F2, chat separado.

## Criterio de cierre

- [x] Un curso incompleto (sin profesor, sin horario, o con conflictos) es visible como tal desde `/admin/cursos` sin necesidad de navegar a Horarios. Columna "COMPLETITUD" con badges (`p-tag`) por curso: "Sin horario", "Sin profesor", "N conflicto(s)", o "Completo".
- [x] Crear/editar un curso incompleto sigue permitido — nada bloquea el flujo actual (no se tocó ningún handler de create/edit/toggle).
- [x] FE: lint + build + tests OK (53/53 tests del feature `cursos` pasan; `ng lint` y `ng build` sin errores).
- [ ] Verificado visualmente en browser — NO verificado (no hay tooling de browser/Playwright disponible en esta sesión).

### Nota de implementación

- 427 (F4, glosario/tooltip compartido) no había cerrado al arrancar este chat (sin commits en su branch) — se implementó el badge inline (`p-tag`) siguiendo el precedente de P71 F4.3/F4.4, tal como indica el fallback del brief. Migración al componente compartido queda como follow-up cuando F4 cierre.
- `GET /api/sistema/cursos/completitud` se consume sin `cursoIds` (trae todos los cursos activos) y se carga junto con items/stats/grados en `loadAll()` vía el mismo patrón `getLoadAllSources`/`applyLoadAllResult` ya usado para `grados`. En paginación (`loadPage`/filtros vía `refreshItemsOnly`) la completitud no se re-fetch — mismo comportamiento que `grados` hoy.

## Tiempo estimado

~45-60 min.
