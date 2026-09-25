# 711 — P107 F5 FE: UI de creación masiva para Matrículas y Calificaciones

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-107-entorno-dev-datos-prueba.md` (Fase F5)
> **Creado**: 2026-09-25 · **Estado**: ✅ implementado y verificado en vivo, pendiente `/end`. Brief [710](../../../../Educa.API/.claude/chats/closed/710-be-p107-f5-bulk-create-matriculas-calificaciones.md) (`Educa.API`) cerrado — contrato de endpoints confirmado contra el código C#.
> **MODO SUGERIDO**: `/execute` (contrato ya resuelto por 710 y el patrón de 623/627 ya probado dos veces).

## CONTEXTO

Mismo patrón que 623 (Salones/Cursos) y 627 (Usuarios): sección "herramientas de prueba" del FE gana generación sintética + import de archivo para dos entidades nuevas — Matrículas y Calificaciones — completando el scope expandido de P107 (§3.2 del plan, matrículas/calificaciones antes excluidas, incorporadas 2026-09-25 por necesidad concreta confirmada).

## OBJETIVO

Extender `BulkTestDataApiService`/`BulkTestDataFacade` con `generarMatriculas()`/`loteMatriculas()` y `generarCalificaciones()`/`loteCalificaciones()`, reusando el componente de generación genérico (`BulkGenerateFormComponent`) o uno dedicado si el brief BE 710 define campos propios (ej. Calificaciones necesita seleccionar curso/período, análogo a como Usuarios necesitó selector de Rol en 627).

## PRE-WORK

- Leer el resultado de `/design` del brief 710 (contrato de endpoints, campos requeridos por entidad) antes de diseñar el formulario — no asumir el shape.
- Reusar diálogo de import (`UsuariosImportDialogComponent`/`horarios-import-dialog` como precedente de clonado) en vez de construir uno desde cero.

## OUT OF SCOPE

- F6 FE (borrado masivo) — brief [713](../open/713-fe-p107-f6-bulk-delete-ui-matriculas-calificaciones.md).
- Cualquier cambio a las UI de Salones/Cursos/Usuarios ya shipeadas (623/627/629/631).

## Criterio de cierre

- [x] FE: lint + build OK (`bunx ng lint` limpio, `bun run build` sin errores nuevos).
- [x] Verificado en vivo (FE+BE local, `BusinessTestMode=true`, `TestConnection`, cuenta admin de prueba): generación sintética exitosa — Calificaciones 5/5 creados; Matrículas 0/5 (mensaje real del backend: "no hay más estudiantes sin matrícula activa en el año 2026", no es bug). Import de archivo probado en ambas entidades con filas OK client-side + rechazo server-side (Matrículas: "Salón con ID 999999 no fue encontrado"; Calificaciones: "INV-T04: No se puede editar con período cerrado" / "Evaluación no encontrada") — confirma que el detalle de error por fila se propaga correctamente FE↔BE.
- [ ] Plan 107 (`educa-coord`) actualizado con el resultado de F5 FE — marca F5 como completo (BE+FE) si 710 también cerró.

## Resultado (2026-09-25)

Implementado siguiendo el patrón de Salones (no el de Usuarios — ambos `generar` de Matrículas/Calificaciones solo piden `{ cantidad }`, sin campo extra, así que reusan `BulkGenerateFormComponent` genérico sin necesitar form dedicado):

- `models/bulk-test-data.models.ts`: `CrearMatriculaDto`, `CrearNotaDto`.
- `services/bulk-test-data-api.service.ts`: `generarMatriculas`/`loteMatriculas` (`api/sistema/salones/prueba/matriculas/*`), `generarCalificaciones`/`loteCalificaciones` (`api/Calificacion/prueba/*` — **sin** prefijo `api/sistema/`, confirmado contra `CalificacionController`).
- `services/bulk-test-data.facade.ts`: wrappers con `resultPipe`.
- `components/matriculas-bulk-create/`, `components/calificaciones-bulk-create/`: paneles clonados de `salones-bulk-create` **sin** `BulkDeleteActionComponent` (F6/712 aún no implementó los endpoints de borrado).
- `components/matriculas-import-dialog/`, `components/calificaciones-import-dialog/` + `helpers/*-import.config.ts`: clonados de `salones-import-dialog` (precedente de solo-IDs-numéricos). `calificaciones-import.config.ts` agrega `parseNota` (nuevo — `parseId` no sirve porque exige entero positivo y `nota` es decimal con `0` como valor válido; la validación de fila usa `=== null` explícito, no falsy, por la misma razón).
- `test-tools.component.ts`/`.html`: 2 secciones nuevas integradas.

**Fuera de alcance** (según brief): borrado masivo — no se tocó nada de F6.

## ⚠️ Docs flagged for review (skipped)
<!-- doc-watch-skipped -->

| Doc | Trigger |
|---|---|
| context/domain.md | features/intranet/** |
| reference/a11y.md | **/*.html |
| reference/design-system.md | intranet/**/*.scss,*.html |
| reference/dialogs-sync.md | **/*dialog* |
| reference/state-management.md | **/*.facade.ts |
