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
- [ ] Toggle visible y funcional que reduce el espacio muerto en salones con pocas clases.
- [ ] Preferencia persiste entre sesiones (localStorage).
- [ ] No rompe la vista para salones con horario denso (grilla completa sigue disponible/toggle-able de vuelta).
- [ ] Build + lint + tests OK. Verificado en vivo contra un salón con pocas clases en TEST DB.

## Punto 4 — Dropdowns de filtro sin conteo (admin, Gestión de Horarios)

**Prioridad**: Baja. **Costo**: Chico.

**Componente**: `src/app/features/intranet/pages/admin/schedules/components/horarios-filters/horarios-filters.component.{ts,html}` + `services/horarios-filter.store.ts`.

**Scope**: agregar un computed por filtro (ej. `salonesOptionsConCount()`) que calcule cantidad de horarios activos por opción sobre los datos ya cargados en el store, e interpolar el conteo en el label (ej. "Sin profesor (7)"). Sin cambios de backend — el dato ya está en memoria (son las mismas métricas que ya se muestran en las tarjetas de resumen de arriba).

**Out of scope**: cambiar el comportamiento de filtrado en sí, solo el label mostrado.

**Criterio de cierre**:
- [ ] Los 3 dropdowns (Salón, Día, Estado) muestran el conteo junto a cada opción.
- [ ] El conteo coincide con las tarjetas de métricas de arriba (Total/Activos/Sin profesor/Sin estudiantes).
- [ ] Build + lint + tests OK. Verificado en vivo.

## Punto 5 — Indicador de progreso en tarjetas "Mis Cursos"

**Prioridad**: Media. **Costo**: Mediano — **confirmar disponibilidad de dato antes de codear** (puede subir a "grande" si requiere BE).

**Componente**: `src/app/features/intranet/pages/profesor/cursos/profesor-cursos.component.ts` (y análogo `estudiante-cursos.component.ts` si aplica el mismo patrón). La parte de affordance de click **ya está resuelta** (brief 454) — no tocar esa lógica, solo agregar el indicador.

**Scope**:
1. Primero: el agente debe confirmar si el DTO que alimenta la tarjeta (`horario.ts` / lo que devuelva `ProfesorFacade`/`CursoContenidoDataFacade`) ya trae un agregado de progreso (ej. `semanasConContenido`/`totalSemanas`) a nivel de lista, sin necesidad de abrir el modal de contenido.
2. Si el dato ya existe (aunque sea calculable client-side combinando llamadas ya hechas): mostrar "X/Y semanas con material" en la tarjeta.
3. Si el dato NO existe y requiere un endpoint nuevo o un campo nuevo en un DTO existente de BE: **no implementar el cambio de backend en este brief** — documentar el gap exacto (qué campo faltaría, en qué endpoint) y dejar el punto marcado como bloqueado en su brief, en vez de inventar un endpoint nuevo sin validación de contrato.

**Out of scope**: cualquier cambio a la lógica de click/affordance ya resuelta por 454.

**Criterio de cierre**:
- [ ] Si el dato está disponible client-side: indicador de progreso visible en la tarjeta, verificado en vivo.
- [ ] Si el dato NO está disponible: brief cerrado como "bloqueado, requiere cambio de contrato BE" con el gap documentado, sin implementación parcial a medias.
- [ ] Build + lint + tests OK (aplica solo si hubo cambio de código).

## Punto 8 — Peso de evaluación inline en Notas del Salón

**Prioridad**: Baja. **Costo**: Chico.

**Componente**: `src/app/features/intranet/pages/admin/classrooms/components/salon-notas-tab/salon-notas-tab.component.html` (y su análogo en `profesor/classrooms/components/salon-notas-tab/` si comparte template o requiere el mismo cambio — confirmar si son el mismo componente o dos independientes antes de tocar solo uno).

El tooltip con el peso **ya existe** (preexistente, no tocar esa parte). Falta mostrar el `%` **inline**, junto al nombre de la evaluación en el header de columna, no solo al pasar el mouse.

**Scope**: agregar el `%` visible en el `eval-header` junto al título, usando el mismo dato que ya alimenta el tooltip (`eval.peso`). Sin cambios de datos.

**Out of scope**: cambiar el tooltip existente o el cálculo de "General".

**Criterio de cierre**:
- [ ] Peso visible inline en el header de cada columna de evaluación, en ambas variantes del componente si son independientes (admin y profesor).
- [ ] Tooltip existente sin cambios.
- [ ] Build + lint + tests OK. Verificado en vivo.

## Orquestación sugerida (un solo chat, agentes en paralelo)

1. Confirmar que no hay overlap real de archivos entre los 4 puntos (ya verificado por estructura de carpetas al crear este brief — cada uno vive en un directorio de componente distinto; el único riesgo señalado es `horarios-filter.store.ts` entre puntos 1 y 4, mitigado arriba con `localStorage` para el punto 1).
2. Crear 4 worktrees (`chat/460-p1-grilla-compresion`, `chat/460-p4-filtros-conteo`, `chat/460-p5-progreso-tarjetas`, `chat/460-p8-peso-inline`), uno por punto, cada uno con copia de este brief o un extracto de su sección correspondiente.
3. Lanzar un agente por worktree en paralelo, con el scope de su punto únicamente.
4. Integrar cada branch a `main` vía rama de integración (`/wt-merge` o equivalente), validar build+lint+tests, verificar en vivo contra TEST DB antes de cerrar cada uno.
5. El punto 5 puede cerrar "bloqueado" en vez de "resuelto" si el dato de progreso no está disponible sin backend nuevo — no fuerces ese punto a medias.

## Out of scope (todo el brief)

- Propuesta #3 (color por curso) — ya tiene brief propio (**459**), no se toca acá.
- Propuesta #10 del listado original de la auditoría (QA viewport móvil) — separada, brief propio de `/audit`, no de diseño/ejecución.
- Cualquier cambio de backend no confirmado como necesario (ver punto 5).

## Tiempo estimado

~2-3 h en paralelo (4 agentes simultáneos, cada punto individualmente ~30-60 min) + tiempo de integración/verificación.
