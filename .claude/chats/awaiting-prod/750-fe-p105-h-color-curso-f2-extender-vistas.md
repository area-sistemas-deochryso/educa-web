# 750 — FE: P105 H F2 — extender el color por curso a Salones, Notas, Tareas, Asistencias, Foro/Mensajería y Rendimiento

> **Origen**: brief 745 (P105 H F1) · 2026-10-01
> **Repo afectado**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § Diseños → H
> **Created**: 2026-10-01
> **depends_on**: 745 (F1) — el helper `cursoColorFor(cursoId, dark)` debe estar integrado en `main`
> **MODO SUGERIDO**: `/investigate` (qué vistas listan cursos y cuántos a la vez) → `/design` → `/execute` → `/validate`
> **exclusive**: `false`
> **modules**: `academic`, `schedules`, `grades`, `attendance`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/shared/config/curso-colors.ts` (solo si el diseño cambia el helper), y las vistas que se decidan al investigar

## Contexto

F1 (brief 745) dejó **un único helper** `cursoColorFor(cursoId, dark)` en OKLCH: luminosidad y chroma fijos por tema, solo varía el tono (ángulo áureo sobre un arco que excluye los tonos semánticos de rojo y verde). Salida siempre hex. Garantías medidas por test (`curso-colors.spec.ts`, 1000 ids, ambos temas): contraste mínimo contra texto blanco 5.22:1 (light) y 5.68:1 (dark); distancia mínima a un tono semántico 16.7°.

**Decisión del usuario (2026-10-01)**: el mismo curso tiene el mismo color para todos los roles; se acepta colisión ocasional dentro de un estudiante porque el nombre del curso siempre acompaña al color. Elegida H3 (cliente, sin BE).

## Dato que condiciona F2: presión de paleta real

Medido en BBDD TEST (solo lectura, 2026-10-01): 48 cursos totales. Cursos distintos por estudiante: vía horarios del salón máx 2; vía **cursos del grado** 9-20 (prom 16.5, n=243). F1 solo toca vistas basadas en horarios (≤2 cursos a la vez), así que **no ejercita el caso exigente**. F2 sí: Notas, Tareas y Salones listan cursos del grado.

**Punto abierto principal**: entre 20 cursos consecutivos el par de tonos más cercano está a **7.8°** con luminosidad y chroma fijos — se parecen mucho. Opciones a evaluar en `/design`, con la cifra delante:
- 2-3 bandas de luminosidad alternadas por `cursoId` (más espacio distinguible sin acercar tonos; cuesta algo de coherencia visual).
- Cambiar el paso áureo por una asignación que maximice la separación para los cursos que el usuario ve a la vez (requiere conocer el conjunto, no solo el id).
- Aceptar el 7.8° si en vivo, con el nombre visible, no molesta.

## Pre-work

- `/investigate`: listar vistas candidatas (Salones, Notas, Tareas, Asistencias, Foro/Mensajería, Rendimiento) y, por cada una, si hoy muestra el curso, cuántos a la vez y sobre qué fondo (relleno con texto blanco, borde, chip).
- Rendimiento: el rojo y el verde semánticos de estado ya están excluidos de la paleta; verificar que no se mezclan con series/leyendas de curso en los gráficos.
- Leer `curso-colors.ts` y su spec antes de tocar el helper.
- Recordar que el helper recibe `dark` por parámetro: cada consumidor lee `ThemeService.isDarkMode()` dentro de un `computed` para reaccionar al toggle sin recargar.

## Cubre además

- P89 #3 y D3 (según el plan P105).

## Out of scope

- Acento de rol sobre el avatar: brief 746 (C). Regla compartida: rol = borde/ícono, curso = relleno.
- Elegir color por curso desde una pantalla admin (solo si se retoma H2, y como fase aparte).
- Deduplicar el `buildBlocks` propio de `estudiante-horarios.component.ts` (copia del compartido, solo difiere en `cantidadEstudiantes`): deuda detectada en F1, barrido aparte.

## Criterio de cierre

- [ ] Vistas de F2 migradas al helper, cada una leyendo el tema reactivamente.
- [ ] Decisión sobre el 7.8° registrada con la cifra y el motivo.
- [ ] Verificación en vivo (local, BBDD de prueba, desde worktree) en al menos una vista con ≥9 cursos a la vez, ambos temas.
- [ ] Lint + build + tests OK.

## Cierre (2026-10-02)

> **Validación prod**: ⏳ pendiente desde 2026-10-02 — verificación en vivo (local, BBDD de prueba, ≥9 cursos a la vez, ambos temas) sin hacer; sugerida en Salones estudiante.
> **Commit**: `d7985738` en la branch `chat/750-fe-p105-h-color-curso-f2` (worktree `EducaWeb/WT/educa-web/750-fe-p105-h-color-curso-f2`), **sin mergear** → `/wt-merge`.

**Decisión sobre el 7.8°**: 3 bandas de luminosidad (0.40/0.47/0.54, por `cursoId % 3`). Peor ΔE OKLab entre 20 cursos consecutivos: 0.024 → 0.045 (test nuevo en `curso-colors.spec.ts`). Contraste mínimo vs blanco 4.81:1 en ambos temas. La banda clara no puede pasar de 0.54: a 0.55 baja a 4.61 y a 0.57 a 4.23. Una primera cifra de 0.074 era sin recorte de gamut ni contraste; no vale.

**Migrado**: `app-curso-chip` (nuevo, shared); Salones estudiante y profesor; chip de curso único en foro-tab (estudiante y profesor); `picker-grid` con `cursoId` opcional → franja lateral, usado en Calificaciones y Asistencia de profesor. `SalonCursoInfo` ahora trae `cursoId`.

**No migrado (→ brief 754)**: plazos-widget y estudiante-attendance-widget (el DTO solo trae `horarioId` y el widget no carga horarios; el informe de investigación se equivocó en esto), Notas y Rendimiento (solo `cursoContenidoId`, no `cursoId`).

**Validación**: lint 0 errores (4 warnings preexistentes en archivos no tocados) · build OK · tests 2824/2825 (el fallo, timeout de 15 s en `eslint-config-guards.spec.ts` bajo carga, pasa solo en 2 s).
