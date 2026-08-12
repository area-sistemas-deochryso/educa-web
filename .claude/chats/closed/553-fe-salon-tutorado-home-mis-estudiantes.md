# 553 — Consistencia "salón asignado": widget Home + aviso de alcance en "Mis estudiantes"

> **Repo destino**: `educa-web` (frontend, branch `main`)
> **Plan**: `.claude/plan/audit-profesor-navegacion-2026-08.md` (hallazgo [`profesor-audit-salon-asignado-contradiccion.md`](../../tasks/profesor-audit-salon-asignado-contradiccion.md) — diseño ya cerrado ahí, F1/F2)
> **Creado**: 2026-08-12 · **Chat**: 1 · **Estado**: ✅ cerrado, live-verified.
> **MODO SUGERIDO**: `/execute` directo (diseño ya cerrado en el task file, opciones descartadas con razón) → `/validate` → cierre.
> **exclusive**: `false`
> **isolation**: `worktree`
> **touches**:
>   - `src/app/features/intranet/pages/cross-role/home-component/components/profesor-attendance-widget/**`
>   - `src/app/features/intranet/pages/cross-role/attendance-component/attendance-profesor/estudiantes/**`
>   - `src/app/features/intranet/shared/components/attendance-scope-student-notice/**` (solo consumo, sin tocar el componente)

---

## PLAN FILE

Diseño completo en [`.claude/tasks/profesor-audit-salon-asignado-contradiccion.md`](../../tasks/profesor-audit-salon-asignado-contradiccion.md), sección "Diseño (F2/F3)". Ese archivo es la fuente de intención + decisiones (WHAT y WHY) — no repetir el razonamiento acá. Este brief es la fuente de contexto concreto (HOW) para arrancar sin re-investigar.

## OBJETIVO

Un profesor con 2+ salones tutorados hoy recibe 3 respuestas distintas a "¿de qué salones soy tutor?" entre Home, "Mis estudiantes" y Resumen de Salones. Son **dos bugs independientes** (no uno compartido):

1. **Home** asume máximo 1 salón tutorado — toma el primero y descarta el resto en silencio.
2. **"Mis estudiantes"** no distingue "profesor sin salones" de "salones fuera de alcance biométrico" — muestra el mismo mensaje genérico para ambos casos.

## PRE-WORK OBLIGATORIO

- Leer el diseño cerrado en el task file (link arriba) antes de tocar código — ahí están las opciones descartadas y el porqué.
- Reproducir localmente (FE `ng serve` + BE local, ver `AGENTS.md`/`CLAUDE.md` del repo para el patrón de credenciales de test) con la cuenta usada en el audit: **MENDO CALDERON MARIELA**, tutora de "INICIAL 3 AÑOS B" y "1RO PRIMARIA A" (ambos `graOrden < 8`, fuera de alcance biométrico).

## IMPLEMENTATION DETAIL (ADR-0006)

Contexto concreto descubierto en el chat de `/investigate` + `/design` previo — leer esto en vez de re-investigar desde cero.

**Home — bug confirmado**:
- Archivo: `profesor-attendance-widget.component.ts`, línea ~157: `const tutor = salones.find((s) => s.esTutor) ?? null;` — toma el primer salón con `esTutor === true` de la lista que devuelve `AttendanceService.getSalonesProfesor()`. El comentario ahí referencia `INV-AS04` (tutor pleno) como justificación de "preferir salón tutor", pero no contempla el caso de 2+.
- `salon` (signal) alimenta `salonLabel`, `salonFueraAlcance` y la llamada a `getAsistenciaDia` — todo asume 1 solo salón.

**"Mis estudiantes" — la hipótesis original del brief NO aplica acá**:
- Archivo: `attendance-profesor-estudiantes.component.ts`. El merge de salones (tutoría + horario, `forkJoin` en `loadSalones()`, líneas ~168-220) es correcto y ya soporta N salones — no hay ningún filtro por propiedad singular.
- El filtro real está en el computed `salones` (línea ~100): `this.allSalones().filter((s) => s.totalEstudiantes > 0 && esGradoAsistenciaDiaria(s.graOrden))`. `esGradoAsistenciaDiaria` (en `@shared/constants` → `attendance-scope.ts`) excluye grados con `graOrden < 8` (umbral Plan 27 · INV-C11, "5to Primaria en adelante", alcance CrossChex).
- Con la cuenta de prueba, `allSalones()` tiene 2 elementos pero `salones()` (filtrado) queda en 0 → dispara el `@else if (!view.loading())` del template (`attendance-profesor-estudiantes.component.html`, líneas ~169-172) → `<app-empty-state message="No tiene salones asignados." />`. Mensaje engañoso: sí tiene salones, están fuera de alcance biométrico.
- Ya existe el componente correcto para este caso: `AttendanceScopeStudentNoticeComponent` (`@intranet-shared/components/attendance-scope-student-notice`), usado hoy en el mismo template (líneas ~26-28) cuando hay **1 solo** salón seleccionado y ese salón está fuera de alcance (`salonFueraAlcance()` computed, línea ~118, chequea `!esGradoAsistenciaDiaria(salon.graOrden)` sobre el salón seleccionado). El fix es generalizar ese mismo aviso al caso "todos los salones sin filtrar quedan fuera de alcance", usando `this.allSalones()` (sin filtrar) como señal de "sí tiene salones" antes de decidir qué empty-state mostrar.

**Resumen de Salones — no tiene bug, no se toca**:
- `profesor-final-salones.facade.ts` (`TeacherFinalClassroomsFacade.loadAll()`, línea ~52) usa `getSalonesProfesor(anio)` sin ningún filtro de `graOrden` — dominio de notas finales, el umbral biométrico no le aplica. Confirma ambos salones con badge "Tutor" correctamente hoy. Ningún cambio de código en esta vista.

## ALCANCE

- `profesor-attendance-widget.component.ts` + `.html` (+ `.scss` si el indicador lo requiere): agregar señal de "+N salones tutorados" cuando `salones.filter(s => s.esTutor).length > 1`, con link a la pantalla que lista todos (Resumen de Salones o "Mis estudiantes", a definir en la implementación cuál es más natural — ambas listan correctamente). Mantener el salón principal mostrado con el mismo criterio actual (primero con `esTutor`).
- `attendance-profesor-estudiantes.component.ts` + `.html`: distinguir en el template "sin salones" (mensaje actual, solo cuando `allSalones().length === 0`) de "salones fuera de alcance" (nuevo: cuando `allSalones().length > 0 && salones().length === 0` → reusar `<app-attendance-scope-student-notice>`, ya importado en el componente).

## TESTS MÍNIMOS (manual, no hay runner e2e para esto)

- Profesor con 2 salones tutorados, ambos `graOrden < 8` (cuenta MENDO CALDERON MARIELA): Home muestra salón principal + indicador "2 salones"; "Mis estudiantes" muestra el aviso de fuera de alcance (no "No tiene salones asignados").
- Regresión — profesor con 1 salón tutorado y `graOrden >= 8`: Home sin indicador de "+N", "Mis estudiantes" con tabla normal — sin cambios visibles respecto a hoy.
- Regresión — profesor con 1 salón tutorado y `graOrden < 8`: "Mis estudiantes" sigue mostrando el aviso de fuera de alcance (comportamiento ya existente, solo se generaliza el chequeo — no debería cambiar).
- Profesor sin ningún salón (si hay cuenta de prueba disponible): "Mis estudiantes" sigue mostrando "No tiene salones asignados" sin cambios.

## REGLAS OBLIGATORIAS (educa-web, FE)

- Standalone components + `OnPush` (ambos componentes ya lo son — mantener).
- `inject()`, signals (`computed`, no lógica derivada fuera de un computed).
- Alias `@app/@core/@data/@config/...` en imports nuevos.
- No introducir llamadas HTTP nuevas en Home solo para el indicador — la data ya está disponible en la respuesta de `getSalonesProfesor()` que el widget ya consume.

## APRENDIZAJES TRANSFERIBLES

- `esGradoAsistenciaDiaria` / `graOrden` (umbral 8, Plan 27 · INV-C11) es el mecanismo de alcance biométrico compartido por varias vistas de asistencia (`attendance-profesor-estudiantes`, `profesor-attendance-widget`, `attendance-reports.facade`, `attendance-director-estudiantes`) — cualquier fix futuro sobre "salón fuera de alcance" debería revisar si ya existe un componente de aviso reusable antes de escribir uno nuevo (ya existe `AttendanceScopeStudentNoticeComponent`, con `nombre` como único input opcional).
- El merge tutoría+horario en `attendance-profesor-estudiantes.component.ts::loadSalones()` es el patrón correcto de referencia para "listar todos los salones de un profesor" — Home debería reusar la misma fuente (`getSalonesProfesor()`) que ya consume, solo cambia cómo se interpreta el resultado (no hace falta el `forkJoin` con horario para el indicador, alcanza con `esTutor`).

## FUERA DE ALCANCE

- Cambiar el modelo de datos de tutoría de salón.
- Relajar o rediscutir el umbral de alcance biométrico (`graOrden >= 8`) — decisión de producto ya tomada en otro plan (Plan 27 · INV-C11).
- Selector multi-salón completo dentro del widget de Home (opción descartada en el diseño).
- Resumen de Salones — confirmado sin bug, no tocar.
- Los demás hallazgos del audit de navegación profesor (promedio confuso, videoconferencias, resumen de asistencia en cero, contador ambiguo, placeholder de notas) — cada uno tiene su propio task file.

## VALIDACIÓN FINAL

- [ ] Lint + build FE sin errores nuevos.
- [ ] Los 4 casos de "TESTS MÍNIMOS" verificados en vivo (browser, no solo lectura de código) — usar `ver-como` admin → profesor si no hay login directo de la cuenta de prueba.
- [ ] Sin regresión visual en Resumen de Salones (no debería tener diff).

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Task file `profesor-audit-salon-asignado-contradiccion.md` actualizado marcando el hallazgo como cerrado (con referencia a este commit).
- [ ] `audit-profesor-navegacion-2026-08.md` — fila del inventario actualizada si corresponde.
- [ ] Brief movido `running/` → `closed/`.
- [ ] Commit final único: código + move del brief + updates de task/plan file, mismo commit.

## COMMIT MESSAGE sugerido

```
fix(intranet): show all tutored classrooms consistently across profesor screens

Home widget only surfaced the first tutored "salón" via .find(), hiding
additional ones. "Mis estudiantes" showed a generic "no salones" message
even when the teacher's classrooms existed but fell outside the
biometric attendance scope (graOrden < 8) — reuses the existing
out-of-scope notice instead.
```

Ajustar subject/body si el alcance final difiere (ej. si se separa en 2 commits FE por componente — seguir igual las reglas de idioma inglés + sin `Co-Authored-By`).

## CIERRE

Al cerrar, pedir al usuario confirmación visual de los 2 indicadores nuevos (captura o descripción de lo visto en browser) — no asumir "se ve bien" solo por pasar el build.

## RESULTADO (2026-08-12)

Implementado en worktree `chat/553-fe-salon-tutorado-home-mis-estudiantes`. Lint + build OK.

Verificado en vivo con MENDO CALDERON MARIELA (dataset local actual: 3 salones tutorados, todos fuera de alcance — cambió desde el audit original de 2, no afecta el fix):

- **Home**: "MI SALÓN: INICIAL 3 AÑOS B" + nuevo link "Tutoría en 3 salones →".
- **Link**: navega a `/intranet/asistencia?salonId=26` → tab "Mis estudiantes" activa → aviso "Este alumno aún no usa asistencia biométrica." (en vez de "No tiene salones asignados").
- **Resumen de Salones**: sin cambios, confirmado en vivo.
- Regresión "1 salón dentro de alcance" / "0 salones": verificada por lectura de código (caminos condicionales no tocados), no había cuenta de prueba disponible para verificar en vivo.

**Bug encontrado y corregido en el camino**: el link nuevo apuntaba primero a `/intranet/profesor/asistencia` (pantalla equivocada, `TeacherAttendanceComponent` — registro de asistencia por curso) en vez de `/intranet/asistencia` (`AttendanceComponent`, la vista con tabs). Corregido antes de cerrar. El link pre-existente "Ver detalle" del mismo widget tiene el mismo problema de ruta — queda documentado en el task file, fuera de alcance de este brief.
