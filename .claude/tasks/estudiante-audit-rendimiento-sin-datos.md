<!-- created: 2026-08-11 -->

# estudiante-audit-rendimiento-sin-datos ✅ Resuelto

> **Origen**: F1 audit funcional del plan [`audit-estudiante-navegacion-2026-08.md`](../plan/audit-estudiante-navegacion-2026-08.md).
> **Severidad**: 🔴 (inconsistencia de datos entre dos pantallas — erosiona confianza en la plataforma).
> **Diagnóstico (2026-08-12)**: confirmado bug de **backend**, no de FE. `ObtenerRendimientoPropioAsync` (`Educa.API/Services/Academico/Calificaciones/ReporteRendimientoService.cs:202-224`) arma `Periodos` iterando `contenido.Periodos` (tabla `PeriodoCalificacion`). El curso de prueba `QA E2E Curso Prueba` (`CC_CodID = 9`) tenía la nota registrada correctamente (`CAL_CodID 4`, 18.0, verificado vía SQL contra BBDD de prueba) pero **cero filas en `PeriodoCalificacion`** para ese `CC_CodID` — por eso `Periodos: []`. "Mis Calificaciones" no depende de `PeriodoCalificacion`, por eso sí mostraba la nota.
> **Resuelto (2026-08-12)**: fix de código en dos repos, decisión tomada en `/design` fue distinguir la causa (no backfill de datos, que no previene recurrencia).
> - `Educa.API` chat [`498`](../../Educa.API/.claude/chats/closed/498-be-rendimiento-propio-sin-periodos-configurados.md), commit `bf23829` → merge a main `712dd92`. Agrega `RendimientoPropioCursoDto.SinPeriodosConfigurados` (`sinPeriodosConfigurados` en wire), `true` solo cuando el curso tiene evaluaciones activas pero no tiene períodos configurados — distingue ese caso de "sin evaluaciones".
> - `educa-web` chat [`551`](../chats/closed/551-fe-mi-rendimiento-mensaje-especifico-sin-periodos.md), commit `eefaa301`. Consume el flag y renderiza "Este curso aún no tiene los períodos de evaluación configurados" en vez del genérico "Sin datos para este período".
> - Verificado en vivo (dev server FE `:4201` + BE `:5139`, login real como ALCALA SANDOVAL DANIELA, curso `QA E2E Curso Prueba`) — mensaje específico confirmado en pantalla.

## Reproducción

1. Loguear como estudiante con al menos una tarea calificada (usado: ALCALA SANDOVAL DANIELA, curso `QA E2E Curso Prueba`, tarea "Actividad QA E2E - Tarea 1" calificada con **18.0**, peso 20%).
2. Ir a "Mi Seguimiento" → "Mis Calificaciones" (`/intranet/estudiante/notas`). Confirmar que muestra "PROMEDIO GENERAL 3.6" y el detalle de la tarea con nota 18.0.
3. Ir a "Mi Seguimiento" → "Mi Rendimiento" (`/intranet/estudiante/rendimiento`).

**Actual**: "Mi Rendimiento" muestra "Sin datos para este período" para el mismo curso que en "Mis Calificaciones" sí tiene una nota registrada.

**Esperado**: si hay al menos 1 evaluación calificada, "Mi Rendimiento" debería reflejarla (aunque sea con una gráfica de un solo punto), no un estado vacío. Si el estado vacío es intencional por debajo de un mínimo de evaluaciones (ej. "se necesitan ≥2 para mostrar tendencia"), el mensaje debería decir eso explícitamente en vez de "sin datos" genérico — mismo patrón ya usado correctamente en "Historial de Asistencia" ("Este alumno aún no usa asistencia biométrica... la asistencia se sigue manejando con el cuaderno del salón").

## Componente probable

~~Endpoint/servicio de "rendimiento" (probablemente distinto al de "notas"...)~~ — **Confirmado**: son endpoints distintos (`GET /api/reportesrendimiento/mi-rendimiento` vs. el endpoint de `estudiante/notas`). El FE de "Mi Rendimiento" (`estudiante-rendimiento.facade.ts`, `estudiante-rendimiento.store.ts`) no tiene ningún filtro de período — pasa directo lo que devuelve el backend. El bug está 100% en `ReporteRendimientoService.ObtenerRendimientoPropioAsync`, que depende de `PeriodoCalificacion` sin fallback cuando esa tabla está vacía para un `CursoContenido`.

## Perspectiva de rol

Un estudiante de secundaria a quien se le pide "revisa tu rendimiento" antes de un examen, si ve "sin datos" en una pantalla y una nota real en otra, no sabe cuál creer — mina el objetivo de fomentar auto-seguimiento responsable, que es justamente para lo que existe esta sección en esa edad.

## Criterio de cierre

- [x] Confirmar si es bug de FE (filtro de período mal aplicado) o BE (cálculo de rendimiento no incluye evaluaciones recientes/únicas). → **BE**, ver diagnóstico arriba.
- [x] Con los mismos datos de prueba de esta sesión, "Mi Rendimiento" muestra al menos el punto de la tarea calificada, o explica por qué no puede (mensaje específico, no genérico). → mensaje específico shipped y verificado en vivo (brief 551).

## Out-of-scope

- Diseño de la visualización de tendencia en sí (gráfico de línea, etc.) si ya existe y solo falta poblarse con datos.
