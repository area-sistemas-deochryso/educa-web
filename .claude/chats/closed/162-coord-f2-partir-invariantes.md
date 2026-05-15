# 162 — Coord F2: partir `business-rules.md` en `educa-coord/invariants/`

> **Repos afectados**: `educa-coord/` (escribe) + `educa-web/` (borra) + `Educa.API/` (actualiza puntero).
> **Plan**: [migracion-arquitectura-claude.md §F2](../../plan/migracion-arquitectura-claude.md)
> **Depende de**: chat 160 cerrado.
> **Creado**: 2026-05-14 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/design` primero (decidir partición), luego `/execute`.

## Scope

Partir `educa-web/.claude/rules/business-rules.md` (1213 ln) por dominio en `educa-coord/invariants/`. Es la fase más sensible porque toca los anchors `INV-*` referenciados desde código y commits.

### Pasos

1. **Inventario** — listar todos los `INV-*` del archivo + qué sección los contiene + a qué dominio pertenecen.
2. **Partición** propuesta (revisable):
   - `asistencia.md` — INV-C01..C11, INV-AD01..AD09, INV-AC01..AC03
   - `calificaciones.md` — sección 3 + INV-CA*
   - `horarios.md` — sección 6 + INV-U03..U05, INV-C06..C08, INV-AS01..AS05
   - `matricula.md` — sección 14.2 + INV-M01..M04
   - `aprobacion.md` — sección 4 + INV-T01..T06, INV-V01..V03
   - `permisos.md` — sección 8 + INV-S01..S04
   - `correos.md` — sección 18 + INV-MAIL01..MAIL10
   - `error-tracing.md` — sección 19 + INV-ET01..ET07, INV-CORR01
   - `feedback.md` — sección 16 + INV-RU01..RU08
   - `periodos.md` — sección 9, 14.4
   - `concurrencia.md` — sección 10 + INV-S05..S06
   - `reportes.md` — sección 17 + INV-RE01..RE03
   - `estructura-academica.md` — sección 5 + INV-D06..D07
   - `dni-y-auditoria.md` — sección 12 + INV-D01..D09
3. Cada archivo ≤300 ln. Si supera, partir más fino (ej: `asistencia.md` → `asistencia-diaria.md` + `asistencia-curso.md` + `asistencia-admin.md`).
4. **Preservar IDs `INV-*` idénticos** — son anchors estables citados en código.
5. Crear `educa-coord/invariants/README.md` con índice cruzado: tabla `INV-* → archivo`.
6. Actualizar `educa-web/.claude/CLAUDE.md` — reemplazar el puntero on-demand a `rules/business-rules.md` por punteros a `../educa-coord/invariants/<dominio>.md` con los triggers por path que ya existen.
7. Actualizar `Educa.API/.claude/CLAUDE.md` — reemplazar `../educa-web/.claude/rules/business-rules.md` por punteros a `../educa-coord/invariants/<dominio>.md`.
8. Borrar `educa-web/.claude/rules/business-rules.md` (no dejar `.deprecated.md` — decisión §4 del plan).

## Out of scope

- Cambiar el contenido de las invariantes. Solo reorganizar.
- Reescribir los triggers — copiar los que ya existen.
- Cambios al código fuente.

## Criterio de cierre

- `ls educa-coord/invariants/*.md` muestra los archivos planeados + README.
- Cada archivo ≤300 ln (`wc -l`).
- `grep -r "INV-" educa-coord/invariants/ | wc -l` ≥ count original en business-rules.md (ningún ID perdido).
- `educa-web/.claude/rules/business-rules.md` ya no existe.
- `grep -r "business-rules.md" educa-web/.claude/ Educa.API/.claude/` solo retorna menciones en history/, no en config viva.
- Commits separados en los 3 repos (escribir coord, borrar FE, actualizar puntero BE).

## Tiempo estimado

2-3 sesiones. **Riesgo medio** — volumen + cuidado con anchors. Hacer con `/design` primero para validar la partición antes de mover.
