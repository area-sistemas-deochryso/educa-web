> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 10 · **Chat**: 4 · **Fase**: P0.4 · **Creado**: 2026-08-20 · **Estado**: ✅ cerrado.

---

# 560 — P0.4: UI defensiva fuera de admin

## Contexto

Plan 10 (Fallbacks críticos FE) tenía P0.1-P0.3 implementados y verificados en código, aunque sus briefs originales (249/262/263) fueron purgados como ruido histórico (`e0a2b9c6`). El patrón de UI defensiva validado en P0.3 — error signal en el store, bloque `@if error` en el template, `emptymessage` en `p-table` — era exclusivo de páginas **admin**.

Relevamiento inicial (2026-08-20):

| Rol | Archivos con `@if error` | Tablas con `emptymessage` |
|---|---|---|
| admin | 51 | 39/70 |
| profesor | 0 | 1/4 |
| estudiante | 0 | 1/2 |
| cross-role | 4 | 0/4 |

## Qué se hizo

Extendido el patrón a 28 archivos, agrupados en 4 categorías:

- **3 quick-wins** (cross-role): `attendance-reports`, `ayuda-ticket`, `justificacion-asistencia-bandeja` — el error ya existía en el facade pero se mostraba como texto plano; ahora usa `app-error-state` + retry.
- **Instrumentación completa**: `student-attendance.component` (estudiante, sin store — facade + `subscribe` directo) — agregados `horariosError`/`asistenciaError` signals desde cero.
- **Cadena estudiante-classrooms** (6 archivos): `estudiante-salones.store/facade` → `estudiante-salones.component` → `estudiante-salon-dialog` → `student-attendance-tab`. Nuevo signal `asistenciaError` threadeado por 2 niveles de dialog.
- **Cadena profesor-notas** (8 archivos): `ProfesorStore/Facade` → `profesor-salones.component` → `salon-estudiantes-dialog` → `salon-notas-estudiante-tab` + `salon-notas-tab`. Nuevo signal `notasSalonError`; reutiliza el output `notasRefresh` ya existente como retry (no hizo falta un output nuevo).
- **Cadena profesor-resumen-asistencia** (5 archivos): `attendance-course.store/facade` → `teacher-attendance.component` → `attendance-summary-panel`. Retry reutiliza el método `onBuscar()` local del panel (no hizo falta emitir un evento hacia el padre).

**Excluidos** (no aplica P0.4): `calificar-dialog` (sin HTTP propio, solo edita datos ya cargados), `reports-result` (presentacional, ya cubierto por su padre `attendance-reports`).

## Aprendizajes transferibles

- **El conteo inicial de "10 templates" sobreestimaba el trabajo real**: varios eran presentacionales puros (`input()`/`output()` sin HTTP) cuyo fix real vive en un ancestro compartido. Investigar la cadena completa (quién hace el fetch) antes de estimar alcance por cantidad de templates.
- **Antes de agregar un nuevo `@Output` de retry, revisar si ya existe uno reusable** (`notasRefresh`, o el propio método local del componente como `onBuscar()`). Dos de las cinco cadenas no necesitaron ningún output nuevo.
- **`git worktree add` no instala `node_modules`**: se resolvió con un directory junction (`mklink /J`) hacia el `node_modules` de main en vez de reinstalar. Evita duplicar ~1GB+ por worktree y corre en segundos.
- **`maestro.md` tenía drift real más allá de este brief**: briefs referenciados (249/262/263/332/458/480/481) estaban purgados intencionalmente (`e0a2b9c6`, limpieza de 170 archivos históricos) pero "Notas operativas" seguía listándolos como activos. No existe comando `/sync-maestro` implementado pese a estar referenciado en `command-hints.md` — se reconcilió a mano.

## Validación

- Lint: ✅ limpio (0 errores tras corregir 4 imports que violaban `layer-enforcement/imports-error` — debían usar el barrel `@shared/components`, no el path interno).
- Build: ✅ exitoso.
- Tests: ✅ 252 archivos / 2529 tests, suite completa sin regresiones.

## Plan file

[.claude/plan/fallbacks-criticos.md](../../plan/fallbacks-criticos.md) — fase P0.4 (completa).
