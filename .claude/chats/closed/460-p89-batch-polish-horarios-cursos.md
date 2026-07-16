# 460 — Batch paralelo: pendientes de P89 (grilla admin, filtros, progreso, peso inline)

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-16 · **Modo sugerido**: orquestación en un solo chat con agentes en paralelo (worktrees), siguiendo el mismo patrón usado en el batch 449-457.
> **Plan**: `../educa-coord/plans/xrepo-89-propuestas-rediseno-ux-horarios-cursos.md`
> **Prioridad**: 🟡 media/baja (ver por punto) — no bloquea nada, son las 4 propuestas de P89 que quedaron sin brief tras el 459.

## Contexto

Brief 446 (design) priorizó 5 propuestas de rediseño UX. La #3 (color por curso) ya tiene su propio brief de ejecución (**459**, listo para arrancar por separado — no se toca acá). Este brief cubre las **4 restantes**, todas independientes entre sí (sin overlap de archivos confirmado por lectura de estructura de carpetas), pensadas para resolverse en un solo chat que lance un agente por punto en worktrees paralelos.

## Punto 1 — Grilla semanal con espacio muerto (admin)

**Prioridad**: Media. **Costo**: Mediano.

**Componente**: `src/app/features/intranet/pages/admin/schedules/components/schedule-weekly-grid/` (usa `HORAS_DIA` de `models/horario.interface.ts`, fijo 07:00-17:00, sin compresión ni modo alternativo).

**Decisión de alcance a tomar por el agente ejecutor** (no bloqueante, pero elegir una antes de codear): toggle "Comprimir horas sin clases" que colapse franjas vacías grandes en una fila delgada, vs. modo lista/agenda alternativo. **Recomendación**: el toggle es más barato y menos invasivo — usarlo salvo que el agente encuentre evidencia de que el modo lista ya tiene soporte parcial en el código.

**Persistencia de la preferencia**: usar `localStorage`, NO el store compartido `horarios-filter.store.ts` (para evitar overlap de archivo con el Punto 4 de este mismo brief, que si toca ese store).

**Out of scope**: cambiar `HORAS_DIA` en sí (el rango 07:00-17:00 ya fue validado por brief 455, no tocar esa constante).

**Criterio de cierre**:
- [x] Toggle visible y funcional que reduce el espacio muerto en salones con pocas clases.
- [x] Preferencia persiste entre sesiones (localStorage).
- [x] No rompe la vista para salones con horario denso (grilla completa sigue disponible/toggle-able de vuelta).
- [x] Build + lint + tests OK. Verificado en vivo contra un salón con pocas clases en TEST DB.

**Resultado**: ✅ Implementado y verificado en vivo.

## Punto 4 — Dropdowns de filtro sin conteo (admin, Gestión de Horarios)

**Prioridad**: Baja. **Costo**: Chico.

**Componente**: `src/app/features/intranet/pages/admin/schedules/components/horarios-filters/horarios-filters.component.{ts,html}` + `services/horarios-filter.store.ts`.

**Scope**: agregar un computed por filtro (ej. `salonesOptionsConCount()`) que calcule cantidad de horarios activos por opción sobre los datos ya cargados en el store, e interpolar el conteo en el label (ej. "Sin profesor (7)"). Sin cambios de backend — el dato ya está en memoria (son las mismas métricas que ya se muestran en las tarjetas de resumen de arriba).

**Out of scope**: cambiar el comportamiento de filtrado en sí, solo el label mostrado.

**Criterio de cierre**:
- [x] Los 3 dropdowns (Salón, Día, Estado) muestran el conteo junto a cada opción.
- [x] El conteo coincide con las tarjetas de métricas de arriba (Total/Activos/Sin profesor/Sin estudiantes) — mismo cálculo/fuente confirmado por lectura de código.
- [x] Build + lint + tests OK.
- [ ] ~~Verificado en vivo~~ — **no aplica**: `SchedulesFiltersComponent` no está referenciado en ningún lado del app hoy (código huérfano). La página real "Gestión de Horarios" solo tiene dropdowns Estado/Completitud inline, sin Salón/Día. Confirmado en vivo que la página real no tiene estos selectores.

**Resultado**: ⚠️ Bloqueado — implementación correcta pero sobre componente sin UI viva. Decisión del usuario: cerrar como bloqueado/gap, no wirear (sería scope creep) ni descartar el cambio.

## Punto 5 — Indicador de progreso en tarjetas "Mis Cursos"

**Prioridad**: Media. **Costo**: Mediano — **confirmar disponibilidad de dato antes de codear** (puede subir a "grande" si requiere BE).

**Componente**: `src/app/features/intranet/pages/profesor/cursos/profesor-cursos.component.ts` (y análogo `estudiante-cursos.component.ts` si aplica el mismo patrón). La parte de affordance de click **ya está resuelta** (brief 454) — no tocar esa lógica, solo agregar el indicador.

**Scope**:
1. Primero: el agente debe confirmar si el DTO que alimenta la tarjeta (`horario.ts` / lo que devuelva `ProfesorFacade`/`CursoContenidoDataFacade`) ya trae un agregado de progreso (ej. `semanasConContenido`/`totalSemanas`) a nivel de lista, sin necesidad de abrir el modal de contenido.
2. Si el dato ya existe (aunque sea calculable client-side combinando llamadas ya hechas): mostrar "X/Y semanas con material" en la tarjeta.
3. Si el dato NO existe y requiere un endpoint nuevo o un campo nuevo en un DTO existente de BE: **no implementar el cambio de backend en este brief** — documentar el gap exacto (qué campo faltaría, en qué endpoint) y dejar el punto marcado como bloqueado en su brief, en vez de inventar un endpoint nuevo sin validación de contrato.

**Out of scope**: cualquier cambio a la lógica de click/affordance ya resuelta por 454.

**Criterio de cierre**:
- [ ] ~~Si el dato está disponible client-side: indicador de progreso visible en la tarjeta~~ — no aplica, dato no disponible.
- [x] Dato NO disponible: brief cerrado como "bloqueado, requiere cambio de contrato BE" con el gap documentado, sin implementación parcial a medias.
- [x] Build + lint + tests OK — no aplica, sin cambio de código.

**Gap documentado**: `GET /api/Horario/profesor/{profesorId}` (`HorarioProfesorDto`) no trae agregado de progreso (`semanasConContenido`/`totalSemanas`). El dato solo existe on-demand vía `GET /api/CursoContenido/horario/{horarioId}`, que traerlo en la lista requeriría N+1 requests nuevos. No existe análogo `estudiante-cursos` en el FE.

**Resultado**: ⚠️ Bloqueado — gap de contrato BE documentado, sin código tocado.

## Punto 8 — Peso de evaluación inline en Notas del Salón

**Prioridad**: Baja. **Costo**: Chico.

**Componente**: `src/app/features/intranet/pages/admin/classrooms/components/salon-notas-tab/salon-notas-tab.component.html` (y su análogo en `profesor/classrooms/components/salon-notas-tab/` si comparte template o requiere el mismo cambio — confirmar si son el mismo componente o dos independientes antes de tocar solo uno).

El tooltip con el peso **ya existe** (preexistente, no tocar esa parte). Falta mostrar el `%` **inline**, junto al nombre de la evaluación en el header de columna, no solo al pasar el mouse.

**Scope**: agregar el `%` visible en el `eval-header` junto al título, usando el mismo dato que ya alimenta el tooltip (`eval.peso`). Sin cambios de datos.

**Out of scope**: cambiar el tooltip existente o el cálculo de "General".

**Criterio de cierre**:
- [x] Peso visible inline en el header de cada columna de evaluación, en ambas variantes del componente (admin y profesor son independientes, mismo selector pero código separado).
- [x] Tooltip existente sin cambios.
- [x] Build + lint + tests OK. Verificado en vivo (variante admin, navegador; variante profesor code-reviewed, no verificada por navegador en esta sesión).

**Resultado**: ✅ Implementado y verificado en vivo (admin).

## Orquestación sugerida (un solo chat, agentes en paralelo)

1. Confirmar que no hay overlap real de archivos entre los 4 puntos (ya verificado por estructura de carpetas al crear este brief — cada uno vive en un directorio de componente distinto; el único riesgo señalado es `horarios-filter.store.ts` entre puntos 1 y 4, mitigado arriba con `localStorage` para el punto 1).
2. Crear 4 worktrees (`chat/460-p1-grilla-compresion`, `chat/460-p4-filtros-conteo`, `chat/460-p5-progreso-tarjetas`, `chat/460-p8-peso-inline`), uno por punto, cada uno con copia de este brief o un extracto de su sección correspondiente.
3. Lanzar un agente por worktree en paralelo, con el scope de su punto únicamente.
4. Integrar cada branch a `main` vía rama de integración (`/wt-merge` o equivalente), validar build+lint+tests, verificar en vivo contra TEST DB antes de cerrar cada uno.
5. El punto 5 puede cerrar "bloqueado" en vez de "resuelto" si el dato de progreso no está disponible sin backend nuevo — no fuerces ese punto a medias.

## Punto 11 (agregado en chat) — Filtro de profesor por modo TutorPleno sin aplicar

**Prioridad**: Media (bug de correctness, no polish UX). **Costo**: Chico.

**Hallazgo**: en el drawer de asignar/cambiar profesor (`horario-detail-drawer.component.html:206-249`), el selector se alimenta de `SchedulesStore.profesoresParaAsignacionDetalle` (`horarios.store.ts:97-112`), que filtra correctamente en modo `PorCurso` (solo profesores con `ProfesorCurso` activo) pero **no filtra en modo `TutorPleno`** — muestra todos los profesores activos del sistema en vez de restringir al tutor del salón. Esto era una decisión de diseño explícita en el comentario del código, confirmada como bug en este chat.

Existe una segunda implementación correcta y completa (`SchedulesOptionsStore.profesoresParaAsignacion`, `horarios-options.store.ts:105-123`) que sí filtra los 3 modos (`TutorPleno`/`PorCurso`/`Flexible`), pero está **muerta** — nunca conectada a ningún selector de la UI.

**Scope**: adaptar `profesoresParaAsignacionDetalle` (`SchedulesStore`) para reusar/replicar la lógica de filtrado TutorPleno ya escrita en `SchedulesOptionsStore.profesoresParaAsignacion`, y eliminar la duplicación muerta una vez consolidado.

**Criterio de cierre**:
- [x] En un salón modo TutorPleno, el selector de "asignar/cambiar profesor" restringe las opciones al tutor del salón. Verificado en vivo: salón "3RO PRIMARIA A" (TutorPleno), el dropdown solo ofrece "NOTUTORVALIDACION TEST FRICCION" (el tutor).
- [x] Modo `PorCurso` sigue funcionando igual que antes (sin cambio de lógica, misma rama de código reusada vía `profesoresParaSalon`).
- [x] Código muerto consolidado: `profesoresParaAsignacion` (form) y `profesoresParaAsignacionDetalle` (drawer) ahora delegan en un único método `SchedulesOptionsStore.profesoresParaSalon(salonId)` — sin duplicación de la lógica de filtrado por modo.
- [x] Build + lint + tests OK. Verificado en vivo en TEST DB.

**Resultado**: ✅ Implementado y verificado en vivo.

## Out of scope (todo el brief)

- Propuesta #3 (color por curso) — ya tiene brief propio (**459**), no se toca acá.
- Propuesta #10 del listado original de la auditoría (QA viewport móvil) — separada, brief propio de `/audit`, no de diseño/ejecución.
- Cualquier cambio de backend no confirmado como necesario (ver punto 5).

## Tiempo estimado

~2-3 h en paralelo (4 agentes simultáneos, cada punto individualmente ~30-60 min) + tiempo de integración/verificación.
