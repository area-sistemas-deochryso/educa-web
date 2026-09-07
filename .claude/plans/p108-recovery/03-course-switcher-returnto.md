# P108 F3 — Course switcher + returnTo navigation (recovery)

> Brief: `634-fe-p108-f3-course-switcher-returnto-recovery` · Plan padre: `educa-coord/plans/xrepo/100-119/xrepo-108-recuperar-trabajo-huerfano-pre-release.md` (Fase F3)

## 1. Problema

El commit de rescate `a3483d93` (rama `recover/P61-workflow-continuity`) implementa dos features perdidas del 2026-06-13: un selector de curso en el header del diálogo de contenido del profesor, y navegación `returnTo` que vuelve a la página de origen (horarios/salones) al cerrar ese diálogo.

Un cherry-pick en seco contra el `main` actual confirma lo que el plan padre ya anticipaba: **6 de 7 archivos tocados por el commit original entran en conflicto**. El único que aplica limpio es el handler de salones (un query param nuevo). Los tres archivos del diálogo de contenido (`.ts`/`.html`/`.scss`) y el facade de datos divergieron a fondo — migración PrimeNG→edu-ui (P79) reescribió template y estilos, y el facade sumó WAL + cross-tab refetch que no existían en junio. Aplicar el diff original a la fuerza dejaría código PrimeNG muerto mezclado con edu-ui.

Además, la navegación de origen desde horarios cambió de forma: en junio, "ver asistencia" navegaba a `/cursos` con un tab index en el query param (de ahí el fix "3→2" que trae el commit original); hoy esa acción navega directo a una página `/asistencia` separada. El único punto de entrada actual desde horarios hacia el diálogo de contenido es un popover (`irAContenido`) sin tab param. El fix de tab index del commit original ya no tiene destino — quedó obsoleto por ese cambio de arquitectura, no por este plan.

## 2. Opciones

- **A — Cherry-pick + resolución de conflictos.** Aplicar `a3483d93` y resolver los 6 conflictos a mano. Descartada: el diff en sí mismo referencia imports de PrimeNG (`primeng/select`, `primeng/dialog`) que ya no existen en el árbol de imports del componente actual — resolver el conflicto exige reescribir esas secciones igual que una reimplementación, pero además arrastra el riesgo de dejar residuos del merge (markers mal resueltos, imports muertos) en un componente con harness grande (7 sub-diálogos hijos).
- **B — Reimplementar sobre la arquitectura actual, usando el commit de rescate solo como referencia funcional.** Portar el *comportamiento* (no el diff): agregar el selector de curso con `EduSelect` (equivalente edu-ui de `primeng/select`), y la navegación `returnTo` reusando el mecanismo de query params que el componente padre ya tiene funcionando para `horarioId`/`tab`.

## 3. Recomendación

**B.** La lógica de negocio detrás de ambas features es simple y portable — el facade actual (`CursoContenidoDataFacade`) expone exactamente los mismos métodos de store (`setSelectedHorarioId`, `setSalonId`, `setContenido`, `setLoading`, `clearError`) que el `switchCourse` original usaba, y `ProfesorFacade` sigue exponiendo `horarios` con la misma forma (`cursoId`, `cursoNombre`, `salonDescripcion`) que alimentaba el dropdown. No hace falta un endpoint nuevo ni un cambio de contrato — es wiring FE puro sobre piezas que ya existen.

## 4. Decisiones

| Decisión | Elección | Por qué |
|---|---|---|
| Mecanismo de recuperación | Reimplementación dirigida por el comportamiento del commit de rescate, no cherry-pick | Confirmado con cherry-pick en seco: 6/7 archivos conflictúan; el diálogo de contenido y su facade divergieron por P79 (edu-ui) y por el refactor WAL/cross-tab-refetch |
| Control de UI para el switcher | `EduSelect` (edu-ui) | Reemplazo directo del `primeng/select` original — consistente con la migración P79, ya completada en el resto del componente |
| Origen de las opciones del switcher | `ProfesorFacade.vm().horarios` (ya cargado por la página contenedora) | Misma fuente de datos que usaba el commit original; evita una llamada de red nueva |
| Fix de tab index (`3`→`2` en `verAsistencia`) | No se recupera | La navegación que ese fix corregía ya no existe — "ver asistencia" navega hoy a una página separada, no al diálogo con tab param. Documentar como descartado, no aplicar a ciegas |
| Validación del query param `returnTo` | Whitelist explícita (`horarios` \| `salones`), igual que el original | Evita que un valor arbitrario en la URL dispare una navegación no prevista al cerrar el diálogo |
| Acoplamiento diálogo↔facade de horarios | Aceptado, igual que el original | El diálogo de contenido de curso ya vive dentro del feature `profesor`; inyectar `ProfesorFacade` ahí es el mismo patrón que ya usa para `Router` y para navegar a salones/asistencia |

## 5. Fases funcionales

**F3.1 — Navegación `returnTo`**
`depends_on: []`
Los dos puntos de entrada que abren el diálogo de contenido desde otra página (la acción "ver curso" en salones, y la acción "ir a contenido" del popover de horarios) pasan a anotar de dónde vino la navegación. El componente de la página de cursos guarda ese origen al leer el query param, y al cerrarse el diálogo — solo por acción real del usuario, no por un cambio interno de curso — navega de vuelta a la página de origen si el valor es uno de los dos válidos. Toca: los dos handlers de navegación de entrada, el componente contenedor de la página de cursos (lectura del query param + reacción al cierre), y agregar una señal de salida en el diálogo de contenido para que su contenedor se entere del cierre real.

**F3.2 — Selector de curso**
`depends_on: []`
El header del diálogo de contenido gana un control de selección que lista los cursos/salones del profesor (deduplicados por combinación curso+salón, igual que el original), visible solo cuando hay más de una opción. Elegir una opción distinta a la actual dispara una carga de contenido para ese horario sin cerrar el diálogo: resetea el estado de calificaciones cargadas, mantiene la pestaña activa, y si la pestaña de calificaciones estaba abierta, recarga sus datos para el nuevo curso. Toca: el diálogo de contenido (nuevo control + handler) y el facade de datos (nuevo método de carga equivalente a `switchCourse`, hermano de `loadContenido`).

Las dos fases son independientes entre sí (no comparten código nuevo) y pueden ejecutarse en cualquier orden; F3.1 es la de menor riesgo y conviene hacerla primero para validar el patrón de query params contra el `main` actual antes de tocar el diálogo con el selector.

## 6. Done-when

- Desde salones y desde el popover de horarios, abrir el diálogo de contenido y cerrarlo (sin cambiar de curso) vuelve a la página de origen.
- Abrir el diálogo directamente desde la página de cursos (sin query param de origen) y cerrarlo se queda en cursos — sin regresión del comportamiento actual.
- Con un profesor que tiene ≥2 cursos/salones, el selector aparece en el header y cambiar de curso carga el contenido nuevo sin cerrar el diálogo, respetando la pestaña activa.
- Con un profesor que tiene 1 solo curso, el selector no aparece.
- Build + lint + tests unitarios en verde.

## 7. Dependencias

- `ProfesorFacade` (lista de horarios) y `CursoContenidoDataFacade` (carga de contenido) — ambos ya existen, sin cambios de contrato.
- Ninguna dependencia de backend nueva.

## 8. Fuera de alcance

- El fix de tab index (`verAsistencia` 3→2) — obsoleto, la navegación que corregía ya no existe.
- Cualquier otra fase del plan 108 (F4-F6) — cada una es su propio brief.
- Cambios al componente `EduSelect` en sí (librería `educa-libs`) — si su contrato no cubre el caso de uso, se reporta como hallazgo aparte, no se parchea acá.
- Añadir `returnTo` a otros puntos de entrada al diálogo de contenido más allá de los dos que ya navegaban ahí en el commit original.

## 9. Reglas/invariantes aplicables

- `code-style.md` — servicios con `inject()`, `providedIn: 'root'`, sin `Subject`/`BehaviorSubject` en el facade (el nuevo método de carga sigue el mismo patrón que `loadContenido`/`refreshContenido`, con `signal` + trigger).
- `code-language.md` — nombres de método/clase en inglés (`switchCourse`, `onCourseSwitch`), labels visibles en español.
- `reference/eduui.md` — confirmar contrato de `EduSelect` (binding de opciones, evento de cambio) antes de wirearlo; no asumir paridad 1:1 con `primeng/select`.
- `reference/state-management.md` — el nuevo método del facade debe seguir el mismo patrón signal-based que ya usa `CursoContenidoDataFacade`.

## Worktree strategy

- **Isolation**: worktree (ya activo — `EducaWeb/WT/educa-web/634-fe-p108-f3-course-switcher-returnto-recovery`)
- **Exclusive**: false — no hay otro chat activo tocando `features/intranet/pages/profesor/{cursos,classrooms,schedules}`
- **Touches**: `src/app/features/intranet/pages/profesor/{cursos/**, classrooms/profesor-salones.component.ts, schedules/profesor-horarios.component.ts}`
- **Parallel risk**: ninguno detectado

---

## TL;DR
- **Problema**: el commit de rescate del course switcher + returnTo (P61, `a3483d93`) conflictúa en 6/7 archivos contra el `main` actual (edu-ui + WAL) — no aplica en limpio.
- **Recomiendo**: reimplementar el comportamiento sobre la arquitectura actual (edu-ui, facade actual) en vez de cherry-pick, porque las piezas base (facade, lista de horarios) siguen compatibles y el diff original referencia PrimeNG muerto.
- **Pendiente**: nada — el diseño no requiere una decisión adicional del usuario.

Sin alternativas reales de recuperación distintas a A/B — ambas fueron evaluadas con evidencia (cherry-pick en seco).

**Alcance** (si vas con la recomendada):
- toca: diálogo de contenido de curso del profesor (`cursos`), sus dos puntos de entrada externos (`classrooms`, `schedules`), y el facade de datos de contenido.
- fuera: fix de tab index (obsoleto), otras fases del plan 108, cambios a `EduSelect` como librería.

**Reglas que aplican**: `code-style.md`, `code-language.md`, `reference/eduui.md`, `reference/state-management.md`

**Siguiente paso**: `/execute`

## Contract checklist

- [ ] `onVerCursoContenido` en salones agrega `returnTo: 'salones'` al query param.
- [ ] `irAContenido` en horarios agrega `returnTo: 'horarios'` al query param.
- [ ] El componente de la página de cursos guarda el `returnTo` recibido y lo valida contra la whitelist (`horarios`, `salones`) antes de navegar de vuelta.
- [ ] El diálogo de contenido emite un evento de cierre real que el contenedor usa para decidir la navegación de retorno.
- [ ] Cerrar el diálogo sin `returnTo` previo no dispara ninguna navegación (comportamiento actual preservado).
- [ ] El header del diálogo muestra un selector de curso solo cuando el profesor tiene más de un curso/salón.
- [ ] Cambiar de curso en el selector no cierra el diálogo y respeta la pestaña activa.
- [ ] Cambiar de curso resetea el estado de calificaciones cargadas y recarga si la pestaña activa era calificaciones.
- [ ] El fix de tab index NO se recupera (documentado como obsoleto, no como pendiente).
- [ ] Build + lint + tests unitarios verdes tras el cambio.
