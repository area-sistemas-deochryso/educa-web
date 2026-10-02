# 753 — FE: P105 D1 — Hub por curso unificado (identidad curso+salón, selector de franja): diseño detallado

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1 · **Fase**: D1 (diseño) · **Creado**: 2026-10-01 · **Estado**: ⏳ pendiente arrancar
> **Origen**: brief 748 (investigación D, coord) · decisiones validadas por el usuario el 2026-10-01
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § Diseños → D → "D — Investigación y diseño (brief 748)"
> **depends_on**: 752 (fix de pestañas de los diálogos de curso) — **debe estar integrado en `main` antes de arrancar**. Idealmente también 751 (G F2) para no pisar `pages/profesor/cursos/`.
> **MODO SUGERIDO**: `/design` (sin `/execute` en este chat; sale un plan por fases con un brief por fase)
> **exclusive**: `false`
> **isolation**: `worktree`
> **modules**: `academic`, `schedules`, `attendance`
> **touches**:
>   - `educa-web`: lectura de `pages/{profesor,estudiante}/{cursos,classrooms,schedules,attendance}/**` y `pages/cross-role/attendance-component/**`; ruteo en `intranet.routes.ts`

## OBJETIVO

Diseñar una **página de curso** (hub) por rol, con el **mismo patrón para profesor y estudiante**, que reemplace al modal como punto único para: Contenido, Calificaciones, Asistencia, Salón e Información de un curso. Resuelve el dolor declarado por el usuario: **navegar** (hoy no hay camino directo entre Cursos, Horarios, Salones y Asistencia, y no existe URL de curso).

## DECISIONES YA TOMADAS (no re-preguntar)

| # | Decisión | Fuente |
|---|---|---|
| 1 | El dolor es **navegar**, no densidad, lentitud ni móvil. | Usuario, 2026-10-01 |
| 2 | **Hub por curso unificado** (no solo mejores enlaces). | Usuario |
| 3 | **Identidad por curso**, no por `horarioId`: la clave del hub es el par **(curso, salón)**. | Usuario (opción A3) |
| 4 | **Solo FE (A3-a)**: se agrupan en el cliente los horarios del mismo (curso, salón). **Sin cambios de BE.** | Usuario, tras medición |
| 5 | **A3-b descartada** (unificar contenido en BE): la regla de negocio no obliga ni prohíbe que cada franja tenga contenido distinto, así que unificar impondría una restricción inexistente. | Usuario |
| 6 | **Mismo patrón para ambos roles**; el rol solo cambia pestañas y acciones disponibles. | Usuario |
| 7 | Nada de Cursos/Salones sobra: no se quita contenido, se reubica. | Usuario |

## HECHOS DE LA INVESTIGACIÓN (brief 748; el código manda, re-verificar)

- **Modelo (BE, solo lectura):** contenido, calificaciones, periodos y asistencia por curso cuelgan del **horario**. Un mismo (curso, salón) puede tener varias franjas (lunes y miércoles); **cada franja tiene su propio contenido**, sin compartir. En TEST: 12 pares, 2 con varias franjas (17%); el par curso 14/salón 25 tiene 3 franjas **sin contenido**; el par curso 24/salón 34 tiene 2 franjas con contenidos 8 y 11 **distintos**. Producción no medida.
- `HorarioResponseDto` (mis-horarios, horarios del profesor/salón/día) **ya trae `cursoId` y `salonId`**: se puede agrupar en el cliente. `CursoContenidoDetalleDto` y `MiAsistenciaCursoResumenDto` no los traen.
- Endpoints de contenido, asistencia por curso, foro y grupos reciben **solo `horarioId`**. `GET EstudianteCurso/mi-asistencia` ya agrupa por (curso, salón) pero resuelve a `horarios[0]`; `Calificacion/salon/{salonId}/curso/{cursoId}` es el único por (salón, curso) y **mezcla evaluaciones de varios contenidos sin reconciliar periodos**.
- **Co-docencia**: el contenido del profesor se filtra por profesor del horario; cada profesor solo ve el de su franja.
- **Navegación actual**: rutas planas sin `:id`; solo viaja `horarioId`; los `queryParams` se limpian (sin deep link). Asistencia no tiene salidas hacia Curso/Salón/Horario. Horarios del estudiante no llega a Asistencia. El estudiante tiene "Mi Asistencia" (por curso) e "Historial de Asistencia" (por salón/día) como entradas separadas.
- El profesor ya tiene `app-course-switcher` en el diálogo de curso; el estudiante tiene `refreshMiAsistencia()`/`miAsistencia` en facade/store de Cursos **sin uso**, y la pestaña Asistencia embebida en el diálogo de salón.

## PRE-WORK OBLIGATORIO

- Brief 748 (`educa-coord/chats/closed/` o `running/`): sección "Hallazgos de la investigación" con file:line.
- Brief 752 integrado: confirmar en `main` que los diálogos de curso muestran pestañas.
- `.claude/reference/dialogs-sync.md` y `.claude/reference/design-system.md` (patrones de diálogo y de página).
- `educa-coord/invariants/horarios.md` y `calificaciones.md` (INV de horarios y de cálculo de notas por contenido).

## DECISIONES ABIERTAS (resolver en `/design`, con datos y alternativas)

1. **Forma de la ruta**: identificar con (cursoId, salonId) en el path o en query; qué hacer con los `?horarioId=` entrantes (redirigir al hub y preseleccionar franja). Los `queryParams` ya no deben limpiarse de forma que mate el deep link.
2. **Selector de franja** (cuando hay >1 horario del par): qué franja se preselecciona (la próxima ocurrencia, la que tiene contenido, la que vino en `horarioId`), dónde se ubica, y cómo se ve cuando hay una sola (no debe mostrarse).
3. **Qué pasa con las pestañas cuando hay varias franjas**: Contenido y Calificaciones son por franja; Asistencia también. Decidir si la pestaña muestra la franja elegida o agrega todas (la agregación de notas por salón/curso mezcla periodos: no usarla sin resolver ese problema).
4. **Destino del modal actual**: reemplazo total, o se conserva como vista rápida desde la tarjeta. Tiene que ser coherente con D2 (descomponer diálogos pesados).
5. **Una tarjeta por (curso, salón) o por horario** en la página Cursos: hoy lista horarios; con el hub, la tarjeta natural es el par.
6. **Enlaces entrantes y salientes**: desde Cursos, Horarios (bloque y popover), Salones (tag de curso) hacia el hub con franja y retorno; desde Asistencia de vuelta al hub. El profesor ya tiene `returnTo`: ¿se generaliza?
7. **Diferencias por rol** (mismo patrón): profesor registra asistencia y califica; estudiante consulta. Qué pestañas son de solo lectura.
8. **Las dos entradas de asistencia del menú** ("Mi Asistencia" por curso vs "Historial de Asistencia" por salón/día): ¿se tocan en D1 o quedan como están? Mi recomendación al llegar: dejarlas fuera y documentarlo.

## DATOS PARA VERIFICAR EN VIVO (TEST)

- **Par curso 24 / salón 34**: 2 franjas con contenidos 8 y 11 → caso real para el selector de franja y las pestañas por franja.
- **Par curso 14 / salón 25**: 3 franjas **sin contenido** → caso "hub vacío" y selector con 3 opciones.
- Estudiante guardado: 1 curso (Ciencia, 2DO PRIMARIA A); profesora guardada: 3 cursos. No hay estudiante de prueba con un par multi-franja: confirmar si hay uno matriculado en 24/34 o 14/25 antes de prometer verificación como estudiante.
- Entorno: la ventana de Chrome debe estar visible (con la ventana ocluida `captureScreenshot` se cuelga y las pestañas/menús no pintan; inyectar una animación CSS mínima fuerza frames). No se tipean credenciales: usar el switcher.

## SALIDA ESPERADA DEL CHAT

- Diseño con 2-3 alternativas por cada decisión abierta que lo amerite y una recomendación, escrito en el plan P105 (intención y decisiones, **sin rutas ni líneas**, ADR-0006).
- Partición en fases funcionales con `depends_on`, una por brief (p. ej. ruteo + shell del hub; pestañas por rol; migración de enlaces; retirada del modal).
- Briefs de fase materializados **solo** para lo que el usuario valide.

## FUERA DE ALCANCE

- Unificación de contenido en BE (A3-b, descartada) y cualquier cambio de BE.
- D2 (descomponer diálogos), D3 (color), D4 (progreso en tarjetas), D5 (móvil): se mencionan solo si el diseño los condiciona.
- Implementar nada en este chat.

## REGLAS OBLIGATORIAS

- **Código en inglés, UI en español.**
- Regla de parada: ante contradicción con lo documentado aquí o con el código, detener y consultar.
- Push a `main` de `educa-web` = deploy a prod: este chat no pushea.
