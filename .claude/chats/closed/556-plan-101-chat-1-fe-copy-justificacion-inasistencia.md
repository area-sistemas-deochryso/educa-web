> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 101 · **Chat**: 1 · **Fase**: F1 · **Creado**: 2026-08-13 · **Estado**: ⏳ pendiente arrancar.
>
> **exclusive**: `false` · **isolation**: `worktree` · **touches**: `src/app/features/intranet/pages/estudiante/classrooms/components/student-attendance-tab/**`, `src/app/features/intranet/pages/estudiante/attendance/**` · **hot-paths**: ninguno identificado (componente de feature aislado, no compartido).

---

# Plan 101 F1 — Copy aclaratorio de justificación para Inicial/Primaria

## PLAN FILE

[`educa-coord/plans/xrepo-101-justificacion-inasistencia-secundaria.md`](../../../../educa-coord/plans/xrepo-101-justificacion-inasistencia-secundaria.md) — sección **F1**.

El plan es intención + decisiones (QUÉ y POR QUÉ), no un blueprint de implementación. No seguir rutas de archivo ni firmas del plan como instrucciones literales — investigar el código actual. Esta sección **IMPLEMENTATION DETAIL** de abajo es la fuente de contexto concreto (rutas/campos ya confirmados durante el diseño), y sí es confiable como punto de partida.

## OBJETIVO

Reemplazar el "—" mudo en la columna "Justificación" de la vista de asistencia del estudiante por un mensaje aclaratorio, **solo** para estudiantes de Inicial/Primaria (ej. "Las justificaciones las gestiona el colegio con tu apoderado"). Sin botón ni acción nueva. Estudiantes de Secundaria no deben ver ningún cambio en este brief (el botón de autoservicio es F3, depende de F2 backend — fuera de alcance acá).

## MODO SUGERIDO

Arrancar con `/execute`. Flujo: `/execute` → `/validate` → cierre. Razón: el diseño ya está resuelto (Plan 101, decisión de producto del 2026-08-12), el cambio es chico, un solo repo, sin ambigüedad de alcance.

## PRE-WORK OBLIGATORIO

- Leer sección **F1** y **Contexto** de `xrepo-101-justificacion-inasistencia-secundaria.md` (ya resumido en IMPLEMENTATION DETAIL abajo, pero el plan tiene el razonamiento completo si hace falta).
- No hay setup/dependencias nuevas — proyecto ya instalado.

## ALCANCE

- `src/app/features/intranet/pages/estudiante/classrooms/components/student-attendance-tab/student-attendance-tab.component.html` — línea ~76, celda `{{ item.justificacion || '—' }}`. Reemplazar el fallback por el mensaje aclaratorio cuando el estudiante es de Inicial/Primaria (mantener `item.justificacion || '—'` sin cambios para Secundaria).
- `student-attendance-tab.component.ts` — agregar el computed/helper que resuelve nivel del estudiante y decide qué mostrar en esa celda.
- `src/app/features/intranet/pages/estudiante/attendance/student-attendance.component.ts` (+ su `.html` homólogo, no confirmado su nombre exacto en esta pasada — está en el mismo directorio) — vista standalone equivalente ("Mi Asistencia" en `/intranet/estudiante/asistencia`). Aplicar el mismo cambio ahí; confirmar primero si comparte el mismo template/lógica que el tab o si es una implementación paralela que hay que tocar por separado.

## TESTS MÍNIMOS

- "Ver como" estudiante de Inicial (ej. grado `1ro Inicial`, `GRA_Orden` 1) → columna Justificación muestra el mensaje aclaratorio, no "—" ni botón, en ambas vistas.
- "Ver como" estudiante de Primaria (`GRA_Orden` 4-9) → mismo comportamiento.
- "Ver como" estudiante de Secundaria (`GRA_Orden` 10-14) → columna Justificación se comporta exactamente igual que hoy ("—", sin cambios). Regresión explícita: este brief no debe introducir ningún elemento nuevo para Secundaria.
- Verificar en vivo contra TEST DB, no solo build/lint.

## REGLAS OBLIGATORIAS

- Standalone components + `OnPush` (el componente ya lo es — mantenerlo).
- `inject()`, signals — el componente ya usa `input()`/`computed()`, seguir el mismo estilo.
- Reusar el criterio de nivel ya existente (`src/app/core/helpers/nivel-educativo.utils.ts` — `determinarNivelPorOrden` o `detectarNivel`, confirmar cuál aplica según qué dato de grado esté disponible en el contexto del estudiante logueado). **No** inventar un umbral nuevo ni duplicar el mapeo Inicial(1-3)/Primaria(4-9)/Secundaria(10-14).
- Alias del proyecto (`@app/@core/@data/@config/...`) en vez de rutas relativas largas.

## IMPLEMENTATION DETAIL (ADR-0006)

Contexto concreto ya confirmado durante la sesión de `/design` de Plan 101 (no volver a investigar esto):

- **Modelo de datos confirmado**: es asistencia **por curso** (`EstadoAsistenciaCurso` = `'P'|'T'|'F'`, sin estado `'J'` hoy), no la asistencia diaria biométrica CrossChex — son modelos independientes. El campo `justificacion: string | null` (`MiAsistenciaCursoItemDto`) existe en el modelo pero **nadie lo popula hoy** — el "—" es simplemente el fallback de un campo vacío, no hay lógica de nivel involucrada actualmente.
- **Componente confirmado y leído**: `student-attendance-tab.component.ts`/`.html` — standalone, `OnPush`, usa `input()`/`computed()`/`effect()`. La celda de Justificación es literalmente `<td>{{ item.justificacion || '—' }}</td>` en la línea 76 del `.html`, sin ningún botón ni acción — confirma que la "pregunta abierta" de la task original (¿existe algún flujo oculto?) está cerrada: no existe.
- **Segmentación de nivel — fuente de verdad confirmada, reusar sin reinventar**:
  - FE: `src/app/core/helpers/nivel-educativo.utils.ts` — tipo `NivelEducativo = 'Inicial' | 'Primaria' | 'Secundaria'`, `determinarNivelPorOrden(gradoOrden)` (mapeo 1-3/4-9/10-14) y `detectarNivel(gradoNombre)` (por texto). Usado en 27+ archivos FE — es el criterio canónico.
  - Falta confirmar en este brief: **de dónde sale el `gradoOrden`/nivel del estudiante logueado en el contexto de este componente** — `MiAsistenciaCursoResumenDto` (los campos observados son `horarioId`, `cursoNombre`, totales, `detalle`) **no** trae el grado/nivel del estudiante directamente. Buscar si ya hay un signal/servicio de perfil del estudiante autenticado disponible en el feature `pages/estudiante/` (patrón usado en otros lados del mismo feature) antes de agregar una llamada nueva — no asumir que hay que pedirlo al backend.
- **Precedente de copy análogo ya en el sistema**: el mensaje para grados fuera del alcance de asistencia biométrica diaria (`INV-C11`, "La asistencia diaria está suspendida temporalmente para este grado") es el tono/patrón de referencia para redactar el mensaje aclaratorio de Inicial/Primaria — mismo estilo de aviso informativo no bloqueante.
- **Estado de ejecución**: 0% — este brief es diseño puro, ningún archivo fue editado todavía.

## APRENDIZAJES TRANSFERIBLES

- Existe un diálogo `justification-dialog.component.ts` (`components/attendance/justification-dialog/`) que **no** es relevante para este brief ni para F3 — es de uso administrativo directo (sin adjunto, sin estado pendiente), inalcanzable desde la vista de estudiante. No confundirlo con el flujo de autoservicio que se construye en F3.
- El plan completo (F1-F4) vive en `xrepo-101-...md` — F3 (botón de Secundaria) depende explícitamente de F1 porque ambos tocan el mismo componente de tabla (evita conflicto de merge). Si este brief F1 cierra primero, F3 puede arrancar limpio contra el `main` actualizado.

## FUERA DE ALCANCE

- El botón "Justificar" de Secundaria y todo el flujo de autoservicio (F3).
- Cualquier cambio en backend (F2) — este brief es 100% FE.
- La bandeja de aprobación profesor/admin (F4).
- Cualquier cambio al campo `justificacion` para Secundaria — se mantiene el comportamiento actual ("—") hasta F3.

## VALIDACIÓN FINAL

- `ng lint` y `ng build` sin errores.
- Verificación manual en vivo ("ver como" cada nivel) contra TEST DB en ambas vistas (tab de salón + standalone "Mi Asistencia").

## CRITERIOS DE CIERRE

- [x] Validación final pasa. `ng lint` ✅ · `ng build` ✅ · `vitest run` 2521/2521 ✅.
- [x] `educa-coord/plans/maestro.md` — entrada `P101` agregada (`educa-coord@7cc3454`).
- [x] Brief movido `running/` → `closed/`.
- [x] Commit final único (código + move del brief) en `educa-web`.

## RESULTADO

Verificación manual en vivo contra TEST DB ("ver como", chat 556):

- **Primaria** (ALCALA SANDOVAL DANIELA, 1RO PRIMARIA A): columna Justificación muestra "Las justificaciones las gestiona el colegio con tu apoderado" en ambas vistas (tab de salón + standalone "Mi Asistencia").
- **Inicial**: misma rama de código que Primaria (`nivel === 'Inicial' || nivel === 'Primaria'`); no se encontró un salón de Inicial con registros de asistencia poblados en TEST DB para verificarlo con datos reales, pero la lógica es idéntica a la ya confirmada.
- **Secundaria** (ALBINES MENDIETA JEREMY / ALTAMIRANO MATOS KRISTEL, 1RO/2DO SECUNDARIA A): sin regresión — la rama de código no fue tocada, tabla se comporta igual que antes (no había registros de asistencia poblados en TEST DB para esos salones, así que no se pudo confirmar el fallback `'—'` con una fila real, pero por inspección de código el camino de Secundaria es idéntico al preexistente).

**Fuente del nivel del estudiante**: no existía ningún signal/servicio de perfil (grado/nivel) del estudiante logueado en el feature `pages/estudiante/`. Se resolvió derivando el nivel desde `salonDescripcion` (ej. "PRIMARIA 1 - A") vía `detectarNivel()` — mismo helper canónico usado en 27+ archivos FE, sin inventar un criterio nuevo.

## COMMIT MESSAGE sugerido

```
feat(attendance): clarify justification column for Inicial/Primaria students

Replace the empty dash with an explanatory message for students below
Secundaria — justification is handled by the school with the tutor,
not the logged-in minor. No new action for Secundaria (Plan 101 F1).
```

## CIERRE

Al cerrar, pedir al usuario que confirme si vio el mensaje aclaratorio correctamente en ambas vistas contra TEST DB (no solo lint/build), y recordarle que F3 (botón de Secundaria) queda bloqueado hasta que F2 (backend) también cierre.
