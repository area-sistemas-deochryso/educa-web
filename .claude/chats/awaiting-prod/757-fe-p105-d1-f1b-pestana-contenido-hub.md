# 757 — FE: P105 D1 F1b — Pestaña Contenido del hub (profesor y estudiante)

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Validación prod**: ⏳ pendiente desde 2026-10-02 (verificación en vivo: pares 24/34 y 14/25, deep link, cambio rápido de franja, estudiante multi-franja)
> **Plan**: 105 · **Chat**: D1-F1b · **Creado**: 2026-10-02 · **Estado**: ✅ implementado y validado local (lint · build · 2922 tests)
> **Origen**: brief 756 (F1a, commit `b73faded`) · diseño en briefs 753 y 755
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso"
> **depends_on**: 756 (F1a integrado en `main`)
> **MODO SUGERIDO**: `/investigate` corto → `/execute` → `/validate`
> **exclusive**: `false`
> **isolation**: `worktree`
> **touches**: `educa-web` — `intranet.routes.ts` (rutas hijas), `pages/{profesor,estudiante}/cursos/curso-hub/**` (pestaña y alojamiento de diálogos), barra de pestañas del hub. **No toca los modales de curso.**

## OBJETIVO

Llenar el shell de F1a con su primera pestaña real: **Contenido**, para profesor (edita) y estudiante (consulta y entrega), como ruta hija con URL propia. El modal actual **queda intacto** hasta F6.

## DECISIONES VALIDADAS (no re-preguntar)

| Tema | Resultado |
|---|---|
| Relación con el modal | **El hub tiene su propia implementación; el modal no se modifica en F1b.** Se prefiere una duplicación temporal pequeña (hasta F6) a tocar el modal que 752 acaba de estabilizar; si el hub falla, revertir es borrar archivos nuevos. El componente nuevo se escribe como el definitivo. |
| Pestañas | Rutas hijas con URL propia; navegan con reemplazo de URL y **conservan el query de franja** al cambiar de pestaña. |
| Etiquetas | Contenido de la franja elegida (la franja la resuelve el shell de F1a). Curso y Salón ya viven en el encabezado. |
| Roles | Misma estructura; el profesor edita contenido y administra, el estudiante consulta y entrega. |
| Resto de decisiones | Ver el plan P105 D1 (ruta, preselección, avisos). No se reabren. |

## PRE-WORK (verificado el 2026-10-02; re-verificar, el código puede haber cambiado)

- **Shell de F1a**: `CursoHubShellBase` (`shared/components/curso-hub-shell`) ya renderiza encabezado + `<router-outlet />`; resuelve par y franja (`slot()`) y expone la franja elegida. Verificar cómo las hijas leen la franja resuelta (hoy no hay un contrato para eso: decidirlo aquí, p. ej. un servicio o input de ruta).
- **Stores/facades root compartidos con el modal**: `CursoContenidoStore`, `CursoContenidoDataFacade`, `CursoContenidoUiFacade`, `CursoContenidoCrudFacade` (profesor) y `EstudianteCursosFacade`/store (estudiante). El hub y el modal usan el mismo estado: el hub debe **limpiar el store al salir** (`reset`) para no dejar contenido de otra franja.
- **`loadContenido` no sirve tal cual para el hub**: carga **y abre** el modal (`openContentDialog` / `openBuilderDialog`) y se corta con `if (store.loading()) return`, lo que ignoraría un cambio rápido de franja. `switchCourse` no abre el modal de contenido pero sí el builder si no hay contenido. Definir un camino de carga **sin efectos de modal** (nuevo método o equivalente) sin alterar el comportamiento de los existentes.
- **Diálogos de la pestaña Contenido (profesor)**: `semana-edit`, `tarea` y `student-task-submissions` están alojados en `curso-content-dialog.component`, junto con todos sus handlers (`onSaveSemana`, `onCreateTarea`, `onUpdateTarea`, …). El `semanas-accordion` solo emite eventos. El hub debe alojar esos diálogos y reproducir los handlers (sin importar el componente del modal).
- **Franja sin contenido (profesor)**: el `curso-builder-dialog` está alojado en `profesor-cursos.component`, no en el modal. El hub necesita su propio camino para crear el contenido (p. ej. el par 14/25 de TEST no tiene contenido). Estudiante: estado vacío informativo.
- **Estudiante**: `curso-content-readonly-dialog` (ts 263 + html 439) mezcla las pestañas y sus diálogos; identificar la parte de Contenido y su entrega de tareas. `EstudianteCursosFacade.loadContenido` también abre el modal (`openContentDialog`).
- **Sincronización con otros dispositivos**: `CursoContenidoDataFacade` se suscribe a refetch cross-tab por tipo de recurso; el hub debe seguir recibiendo esas actualizaciones.
- Reglas de UI: `.claude/reference/dialogs-sync.md` (diálogos nunca dentro de `@if`), `.claude/reference/a11y.md` (iconos sin texto), `.claude/reference/design-system.md` (página intranet nueva).

## CRITERIOS DE ACEPTACIÓN

1. Existe la ruta hija de Contenido bajo cada shell (profesor y estudiante), con redirección desde la raíz del hub a Contenido, y heredando autorización y gate de "ver como".
2. Hay una barra de pestañas del hub (por ahora solo Contenido, extensible por F2–F4) que navega con reemplazo de URL y **conserva `horarioId`**. Cambiar de franja con el selector recarga el contenido de la nueva franja, incluso si se cambia rápido.
3. Profesor: ve las semanas, edita semana, crea/edita/borra tareas, sube archivos y ve entregas, con paridad con el modal. Franja sin contenido: puede crearlo desde el hub.
4. Estudiante: ve el contenido, descarga archivos y entrega tareas, con paridad con el modal. Franja sin contenido: estado vacío.
5. Abrir el hub **no** abre ningún modal de curso. Salir del hub limpia el store y no contamina al modal.
6. Cargar la franja con contenido no bloquea el primer pintado del encabezado (heredado de F1a).
7. Los modales y la página de Cursos no cambian de comportamiento ni de archivos (diff de F1b sin modificaciones en `curso-content-dialog`, `curso-content-readonly-dialog`, `profesor-cursos`, `estudiante-cursos`; si hay que tocar facades/stores compartidos, solo añadir, no cambiar contratos).
8. Tests nuevos para la ruta hija, el camino de carga sin modal y los handlers del hub. `lint`, `build` y `test` en verde.

## VERIFICACIÓN EN VIVO

- Par curso 24 / salón 34 (2 franjas, contenidos 8 y 11): cambiar de franja y ver que el contenido cambia. Par 14 / salón 25 (3 franjas, sin contenido): crear contenido desde el hub (profesor).
- Recarga con deep link a la pestaña (`…/contenido?horarioId=`), y cambio rápido de franja.
- **No hay estudiante de prueba confirmado en un par multi-franja**: confirmar antes de prometer verificación como estudiante; si no existe, verificar como profesor y con "ver como".
- Chrome visible (ocluida, `captureScreenshot` se cuelga). Login con el switcher, sin tipear credenciales. En prod solo lectura. Local con BBDD de prueba confirmada (`UseTestEnv: true`) para mutar.

## FUERA DE ALCANCE

- Calificaciones e Información (F2), Asistencia (F3), Salón (F4).
- Tarjeta por par, redirect legacy, migración de consumidores y `returnTo` (F5a/F5b), retirada de modales (F6).
- Extraer o refactorizar el modal para compartir código (decisión: B, duplicación temporal). Cambios de BE.

## REGLAS OBLIGATORIAS

- Código en inglés, UI en español. Standalone + OnPush, `inject()`, `logger`, alias de imports.
- Ante contradicción con lo documentado o con el código, detener y consultar.
- Push a `main` de `educa-web` = deploy a prod: este chat no pushea sin autorización.
