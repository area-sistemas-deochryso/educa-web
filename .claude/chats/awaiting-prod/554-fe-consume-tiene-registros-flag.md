> **Branch**: `main`.
> **Plan**: — (diseño acordado en chat de `educa-coord`, no hay plan file físico — scope acotado, ver IMPLEMENTATION DETAIL).
> **Creado**: 2026-08-13 · **Chat**: 2 de 2 (F2 de 2 — F1 fue `Educa.API`, ya mergeado a `main`) · **Estado**: ✅ implementado, esperando validación post-deploy.
> **Repo destino**: `educa-web`.
> **Origen**: `Educa.API/.claude/chats/closed/499-be-asistencia-flag-tiene-registros.md` (F1, ya cerrado y mergeado a `main`).
> **Validación prod**: ⏳ pendiente desde 2026-08-13.

```yaml
exclusive: false
isolation: worktree
touches:
  - src/app/features/intranet/pages/profesor/models/attendance-course.models.ts
  - src/app/features/intranet/pages/profesor/cursos/components/attendance-registration-panel/attendance-registration-panel.component.ts
  - src/app/features/intranet/pages/profesor/cursos/components/attendance-registration-panel/attendance-registration-panel.component.html
  - src/app/features/intranet/pages/profesor/cursos/components/attendance-registration-panel/attendance-registration-panel.component.scss
hot-paths: []
```

---

# Consumir flag `tieneRegistros` en el panel de Registrar (asistencia por curso)

## OBJETIVO

`Educa.API` ya expone `tieneRegistros: boolean` en la respuesta de `GET /api/AsistenciaCurso/horario/{horarioId}/fecha` (F1, `chat/499`, mergeado a `main`). Este chat consume ese flag en `educa-web` para que el tab "Registrar" muestre un indicador visual cuando la lista mostrada es un borrador sin guardar (todos "Presente" por default) — distinto de una clase con asistencia real guardada.

## MODO SUGERIDO

Arrancar con `/design` corto (decidir el tratamiento visual del indicador — badge, banner, color de fondo — no hay decisión de UI tomada todavía) y seguir con `/execute`. Razón: el contrato de datos ya está cerrado (`tieneRegistros` en el DTO), pero falta decidir cómo se comunica al profesor.

## PRE-WORK OBLIGATORIO

- Leer `Educa.API/.claude/chats/closed/499-be-asistencia-flag-tiene-registros.md` — contiene el diagnóstico completo (causa raíz, contrato del flag, precedente `SinPeriodosConfigurados`).
- Confirmar que `main` de `Educa.API` (local o deployado, según el entorno contra el que corra este chat) ya sirve `tieneRegistros` antes de integrar — si el backend consumido todavía no tiene el flag, la respuesta simplemente no traerá la propiedad (`undefined`), lo cual debe tratarse como "sin info" y no romper el render.

## ALCANCE

- `src/app/features/intranet/pages/profesor/models/attendance-course.models.ts:33-39` — agregar `tieneRegistros: boolean` a la interface `AsistenciaCursoFechaDto`.
- `src/app/features/intranet/pages/profesor/cursos/components/attendance-registration-panel/attendance-registration-panel.component.ts` — exponer un signal/computed derivado de `registroData()?.tieneRegistros` para consumir desde el template.
- `src/app/features/intranet/pages/profesor/cursos/components/attendance-registration-panel/attendance-registration-panel.component.html:26-33` — el bloque `stats-row` es el lugar natural para el indicador (ya muestra Total/Presentes/Tardes/Faltas condicionado a `hasEstudiantes()`). Agregar un indicador visual cuando `tieneRegistros === false` (ej. tag/banner "Sin guardar — valores por defecto").
- `.scss` del componente si el indicador requiere estilos propios.

No tocar `attendance-summary-panel` (tab "Resumen") — ese endpoint no lleva el flag (fuera de alcance de F1 también).

## REGLAS OBLIGATORIAS

- UI en español (labels, tooltips) — código/identificadores en inglés.
- Si `tieneRegistros` llega `undefined` (backend viejo sin el flag desplegado todavía), tratar como "sin info" — no mostrar el indicador de "sin guardar" por error (evitar falso positivo). Preferir `=== false` explícito en vez de `!tieneRegistros`.
- No cambiar el comportamiento de guardado rápido (`onSave()`, `puedeGuardar()`) — este chat es puramente indicador visual, no cambia lógica de negocio.

## IMPLEMENTATION DETAIL (heredado de F1, ADR-0006)

- **Causa raíz** (ver F1): `AsistenciaCursoService.ObtenerPorFechaAsync` rellena `Estado = "P"` default cuando no hay registro individual guardado — indistinguible en la UI de un guardado real.
- **Granularidad del flag**: a nivel de clase (horario+fecha), no por estudiante — `RegistrarLoteAsync` guarda todos los estudiantes matriculados en un único lote atómico.
- **Precedente reutilizado**: mismo patrón usado para `SinPeriodosConfigurados` en `RendimientoPropioCursoDto` (brief 498) — un flag booleano explícito en el DTO para distinguir "sin dato real" de "estado calculado por default".

## FUERA DE ALCANCE

- Cambios en `Educa.API` (F1, ya cerrado).
- Tab "Resumen" (`attendance-summary-panel`) — no consume este flag.
- Indicador por-estudiante dentro de una clase ya guardada (edge case de matrícula tardía) — no rediseñado en F1 tampoco.
- Actualizar el task file original de `educa-web` (`.claude/tasks/profesor-audit-resumen-asistencia-en-cero.md`) con el diagnóstico real — hacerlo al cerrar este chat (ver CIERRE).

## VALIDACIÓN FINAL

- [x] `ng build` / lint sin errores nuevos.
- [x] Verificación manual en navegador: clase sin registro guardado (QA E2E Curso Prueba, horarioId=16) → tag "Sin guardar" visible en tab "Registrar". Clase con registro real (misma clase, fecha 08/07/2026, único registro existente) → tag ausente.
- [x] Tests unitarios existentes de `attendance-registration-panel` / `attendance-course.store` siguen pasando (74/74).

## CRITERIOS DE CIERRE

- [x] Validación final pasa.
- [ ] Brief movido `running/` → `awaiting-prod/` (pendiente `/verify` post-deploy antes de `closed/`).
- [ ] Commit del código + move del brief (mismo patrón de F1: commit en branch `chat/554-...`, merge a `main`, commit de cierre del brief).
- [x] Actualizar `.claude/tasks/profesor-audit-resumen-asistencia-en-cero.md` con el diagnóstico real (nunca hubo datos guardados — la UI mostraba defaults como si fueran reales) y cerrar ese task.

## COMMIT MESSAGE sugerido

```
feat(asistencia-curso): show unsaved-draft indicator when tieneRegistros is false

Consumes the TieneRegistros flag exposed by Educa.API (chat 499) to
distinguish a real saved attendance list from the "P" default filled
in for students with no record, in the "Registrar" tab.
```

## CIERRE

Al cerrar, verificar en el entorno real (con `Educa.API` deployado con el flag) antes de dar por resuelto el bug original.
