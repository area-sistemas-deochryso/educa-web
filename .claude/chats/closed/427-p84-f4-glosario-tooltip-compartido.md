# 427 — P84 F4: componente compartido de glosario/tooltip de dominio (FE)

> **Repos afectados**: `educa-web`.
> **Plan**: [`educa-coord/plans/xrepo-84-orientacion-flujo-academico.md`](../../../educa-coord/plans/xrepo-84-orientacion-flujo-academico.md) — Fase F4 (`depends_on: []`).
> **Creado**: 2026-07-10 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`.
> **exclusive**: `false` — puede correr en paralelo con 429 (F3), 430 (F5) y 428 (F6). Sin overlap de archivos esperado con ninguno de los tres.
> **touches**: `educa-web`: `src/app/shared/**` (componente nuevo, ubicación exacta a decidir — candidato `shared/components/domain-badge/` o similar), y refactor de los 4 sitios con tooltip inline duplicado:
> - `src/app/features/intranet/pages/admin/classrooms/components/salones-admin-table/salones-admin-table.component.{ts,html}`
> - `src/app/features/intranet/pages/admin/classrooms/components/salon-detail-dialog/salon-detail-dialog.component.ts`
> - `src/app/features/intranet/pages/admin/schedules/components/horario-detail-drawer/horario-detail-drawer.component.{ts,html}`
> - `src/app/features/intranet/pages/admin/schedules/horarios.component.html`
> - `src/app/features/intranet/pages/admin/users/components/usuario-form-dialog/usuario-form-dialog.component.ts` (+ `.helpers.ts`)

## Scope

Extraer una fuente única de texto/badge para los términos de modo de asignación ("tutor pleno" / "por curso"), reemplazando las implementaciones inline duplicadas hoy en al menos 4 pantallas (salones-admin, detalle de salón, horarios/detalle de horario, formulario de usuarios).

- Crear un componente compartido (badge + tooltip) que reciba el modo de asignación (`ModoAsignacion` / valor equivalente) y renderice label + explicación consistente.
- Migrar los 4 sitios listados arriba a consumir el componente nuevo en vez de su copy/tooltip inline actual.
- Mantener el patrón visual ya establecido en P71 F4.3/F4.4 (precedente de badge+tooltip) — este chat centraliza, no rediseña.
- Dejar el componente listo para que F3 (429) lo reuse si arranca/termina después — pero **no bloquear este chat esperando a F3**.

## Pre-work

- Leer `educa-coord/plans/xrepo-84-orientacion-flujo-academico.md` — decisión "Glosario/tooltips de dominio" y done-when de F4.
- Grep de `tutor pleno|modoAsignacion|ModoAsignacion` en `src/app` (ya ejecutado en el chat de evaluación — 4 sitios reales de UI, más `ui-error-messages.ts`/`classroom.models.ts`/stores que no son UI directa) para confirmar el texto exacto usado hoy en cada sitio antes de unificarlo.
- Revisar si ya existe una convención de ubicación para componentes de dominio compartido en `shared/` (ver memoria `project_educa_fe_arch` — signals store + facade pattern) antes de decidir el path final del componente nuevo.

## Out of scope

- Cambiar el criterio de negocio de qué es "tutor pleno" vs "por curso" — ya formalizado en `INV-AS01/02` (P71), este chat solo centraliza el texto/badge visual.
- Tocar `ui-error-messages.ts` (eso es scope de F5, brief 430).
- Checklist de completitud en Cursos (F3, brief 429) — solo dejar el componente listo para que F3 lo reuse si quiere.
- Navbar/sección activa (F6, brief 428) — independiente, sin relación de contenido.

## Criterio de cierre

- [x] Existe un único componente compartido para badge+tooltip de modo de asignación (`shared/components/modo-asignacion-badge/`: `ModoAsignacionBadgeComponent` + glosario `modo-asignacion.glossary.ts`).
- [x] Los 4 sitios inline identificados consumen el componente nuevo (cero duplicación de texto/tooltip remanente para este concepto): `salones-admin-table`, `salon-detail-dialog`, `horario-detail-drawer`, `usuario-form-dialog` (2 usos internos: lista de salones asignados + preview de modo al agregar salón).
- [x] El texto/comportamiento visual no cambia de forma perceptible para el usuario — se unificó a una única fuente de texto/tooltip (antes había 3 variantes ligeramente distintas del mismo tooltip entre sitios; se adoptó la versión de `horario-detail-drawer`, la más descriptiva, como canónica).
- [x] FE: lint + build + tests OK (lint 0 errores, build OK, 2327/2327 tests OK).
- [ ] Verificado visualmente en browser — **no verificado**: no hay herramienta de browser/Playwright MCP disponible en este chat.

## Tiempo estimado

~45-60 min.
