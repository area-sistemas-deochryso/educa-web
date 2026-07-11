---
exclusive: false
isolation: worktree
touches: [src/app/features/intranet/pages/admin/schedules/]
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: — · **Chat**: — · **Fase**: — · **Creado**: 2026-07-10 · **Estado**: ⏳ pendiente.

---

# Consumir `validationStatus` del backend + arreglar card "Conflictos" hardcodeada

## OBJETIVO

El backend (`Educa.API`) ya calcula un campo `validationStatus` por horario (`"valid"` / `"incomplete"` / `"conflict"` / `"conflict_incomplete"`), incluyendo detección real de cruces de horario. El frontend lo ignora completamente y la stat card "Conflictos" en `/intranet/admin/horarios` muestra un `0` literal hardcodeado en vez de datos reales.

## MODO SUGERIDO

Arrancar con `/investigate`. Flujo: `/investigate` → `/design` → `/execute` → `/validate` → cierre. Razón: hay que confirmar alcance exacto de `validationStatus` antes de decidir cómo se integra — no está claro todavía si conviene consumirlo tal cual o mantener el cálculo cliente-side actual (`horariosSinProfesor`/`horariosSinEstudiantes`, agregado en el chat 2026-07-10) y sumar el campo de conflictos aparte.

## PRE-WORK OBLIGATORIO

- Leer `Educa.API/Educa.API/Services/Academico/Horarios/HorarioService.Queries.cs` — método `ComputeValidationStatus` (líneas ~89-98 al momento de este brief) y `GetHorariosConCruceAsync` en el repository, para entender exactamente qué cuenta como "conflict".
- Leer el estado actual post-chat-2026-07-10 de `src/app/features/intranet/pages/admin/schedules/`: ya existen `horariosSinProfesor`/`horariosSinEstudiantes` calculados client-side en `horarios-data.facade.ts` (`calculateEstadisticas`) y un filtro de completitud en `horarios-filter.store.ts`. Cualquier diseño nuevo debe convivir con eso, no duplicarlo.

## ALCANCE

- `src/app/data/models/schedule.models.ts` — agregar `validationStatus` a `HorarioResponseDto` (el backend ya lo envía; el tipo frontend no lo declara).
- `src/app/features/intranet/pages/admin/schedules/horarios.component.html` / `.ts` — reemplazar el `0` hardcodeado de la card "Conflictos" por un valor real.
- `src/app/features/intranet/pages/admin/schedules/services/horarios-data.facade.ts` — decidir si el conteo de conflictos se deriva de `validationStatus` o si hace falta un cálculo propio (a definir en `/design`).
- Posible: `schedule-weekly-grid.component.ts/html` — indicador visual de conflicto en el bloque, mirror del patrón ya usado para "sin profesor"/"sin estudiantes" (líneas de warning en el cuerpo del bloque + tooltip).

## TESTS MÍNIMOS

- Con datos de prueba que generen un cruce real de horario (mismo salón, mismo día, rango horario solapado), la card "Conflictos" debe mostrar un número > 0.
- Sin cruces, debe mostrar 0 (comportamiento actual, pero ahora derivado de datos reales, no hardcodeado).

## REGLAS OBLIGATORIAS

- FE: Standalone components + OnPush, `inject()`, signals, alias `@app/@core/@data/@config/...`.
- No duplicar lógica de completitud ya existente (`horariosSinProfesor`/`horariosSinEstudiantes`/filtro de completitud) — este brief es sobre el eje "conflictos", no sobre "incompletos".

## IMPLEMENTATION DETAIL (ADR-0006)

- **Hallazgo, no implementación**: este brief nace de una investigación exploratoria del 2026-07-10 sobre `/intranet/admin/horarios`, no de un plan formal. No hay fases previas ni interfaces ya creadas para este eje específico.
- **Contexto adyacente ya resuelto en esa misma sesión** (commits `e3d322e3` en educa-web, `c4855c0a` en Educa.API): fix de paginación silenciosa (cap de 10 horarios), fix de scroll/layout de la grilla semanal, agregado de stat/filtro "Sin estudiantes", fix de un bug de serialización backend (`profesorId`/`profesorNombreCompleto` no viajaban como `null` explícito por `NullValueHandling.Ignore` global en Newtonsoft — ver `Educa.API/DTOs/Horario/HorarioResponseDto.cs`, ahora con `[JsonProperty(NullValueHandling.Include)]` en esos dos campos).
- **Dato concreto**: el endpoint `GET /api/horario` (sin paginar, vía `getAll()`) ya devuelve `validationStatus` en cada objeto — se puede inspeccionar la shape real desde la consola del navegador con `fetch('/api/horario', {credentials:'include'}).then(r=>r.json())`.

## APRENDIZAJES TRANSFERIBLES (del chat actual)

- La card "Conflictos" en `horarios.component.html` es un placeholder desde siempre (`<span class="stat-value">0</span>` literal) — no es una regresión reciente, es deuda preexistente.
- El backend ya resuelve el trabajo pesado de detección de cruces (`GetHorariosConCruceAsync`) — este brief es de **consumo**, no de implementar detección de conflictos desde cero.
- Cuidado con el modelo de datos: `HorarioResponseDto` en frontend vive en `src/app/data/models/schedule.models.ts`, no en `src/app/features/intranet/pages/admin/schedules/models/horario.interface.ts` (ese archivo solo re-exporta tipos vía `export type { ... } from '@data/models'`). Agregar el campo nuevo en el lugar correcto.

## FUERA DE ALCANCE

- No tocar el eje "sin profesor"/"sin estudiantes" (ya resuelto).
- No rediseñar la grilla semanal más allá de lo necesario para mostrar conflictos.
- No es este brief el que decide si vale la pena usar `validationStatus` para MÁS que conflictos (ej. reemplazar el cálculo client-side de "incompleto") — evaluarlo en `/design`, pero no expandir el alcance sin volver a alinear con el usuario.

## VALIDACIÓN FINAL

- `bun run lint` — 0 errores.
- `bun run build` — sin errores.
- `bun run test` — sin nuevas fallas (nota: al cierre de este brief había 1 falla preexistente no relacionada en `email-outbox-diagnostico.component.spec.ts`, un timeout — no confundir con regresión de este trabajo).
- Manual: crear un cruce de horario real en `/intranet/admin/horarios` y confirmar que la card "Conflictos" refleja el número correcto.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado si corresponde (este brief no viene de la cola, evaluar si vale la pena agregarlo).
- [ ] Brief movido `running/` → `closed/`.
- [ ] Commit final único que incluye código + move del brief + update del maestro en el mismo commit.

## COMMIT MESSAGE sugerido

```
fix(schedules): wire real conflict count into "Conflictos" stat card

The card showed a hardcoded 0. The backend already computes real
schedule-overlap conflicts via validationStatus/GetHorariosConCruceAsync —
consume it instead of the placeholder.
```

## CIERRE

Al cerrar, preguntar si el usuario quiere que `validationStatus` termine reemplazando el cálculo client-side de "incompleto" en un chat futuro, o si prefiere mantenerlos separados (backend = conflictos, frontend = completitud) permanentemente.
