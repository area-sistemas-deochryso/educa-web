# 768 — FE: P105 D1 — Decidir el futuro de «Mi Asistencia» del estudiante

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1 (pendiente heredado) · **Fase**: decisión de producto · **Creado**: 2026-10-05 · **Estado**: ✅ cerrado 2026-10-05 — decisión A (mantener las tres vistas), sin código
> **Origen**: cierre del brief 766 (F7, commit `8a28982a`); pendiente explícito del diseño D1 (brief 755).
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso", fila «Menú de asistencia». Solo intención y decisiones.
> **depends_on**: D1 F3 (pestaña Asistencia, brief 763) ✅ integrada.
> **MODO SUGERIDO**: `/investigate` → `/ask` (decisión del usuario) → `/design` solo si hay cambio → `/execute`. Razón: es una decisión de producto; faltan datos de uso antes de proponer.
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: por determinar (candidatos: `shared/config/intranet-menu.config.ts`, `intranet.routes.ts`, `pages/estudiante/attendance/`, `pages/estudiante/cursos/curso-hub/estudiante-curso-hub-asistencia.component.ts`).
> **hot-paths**: ninguno conocido (re-verificar `intranet-menu.config.ts`, lo tocan varios planes)

## OBJETIVO
El plan dejó abierto: «decidir el futuro de "Mi Asistencia" del estudiante cuando F3 esté integrada (puede quedar redundante)». F3 ya está integrada. Decidir si la página `/intranet/estudiante/asistencia` se mantiene, se reduce o se retira, y qué pasa con su entrada de menú.

## DECISIONES VALIDADAS (no re-preguntar)
- El menú de asistencia quedó **fuera de D1** a propósito; esta decisión es la que se difirió.
- El hub es solo para profesor y estudiante (admin y apoderado quedan fuera).

## PRE-WORK
- Leer `chats/awaiting-prod/763-…md` (F3, pestaña Asistencia) y la sección «Menú de asistencia» del plan.
- Leer `../educa-coord/invariants/` de asistencia antes de proponer retirar algo que muestre datos de asistencia.

## ALCANCE (re-verificar contra el código)
Mapa observado al cierre de 766:
- Menú estudiante: `Mi Asistencia` → `/intranet/estudiante/asistencia` (capability `ASISTENCIA_ESTUDIANTE_PAGE_VIEW`) **y** `Historial de Asistencia` → `/intranet/asistencia` (capability `ASISTENCIA`, `soloParaRol: ['Estudiante']`), ambos en el grupo «Mi Seguimiento». Dos entradas de asistencia para el mismo rol.
- Ruta: `intranet.routes.ts` (`path: 'estudiante/asistencia'`), componente `pages/estudiante/attendance/student-attendance.component.ts` (usa `selectedHorarioId`, resumen por horario, justificaciones).
- La pestaña Asistencia del hub estudiante es `estudiante-curso-hub-asistencia.component.ts` (por franja del par).
- Entregable de la investigación: tabla `capacidad | Mi Asistencia | pestaña del hub | Historial` que cubra qué datos y acciones tiene cada una (resumen, calendario, justificar inasistencia, filtros) y qué se perdería al retirar «Mi Asistencia».
- Decisión a pedir (`/ask`) con alternativas y trade-off: **A** mantener las tres vistas; **B** retirar «Mi Asistencia» y dejar hub + Historial; **C** convertir «Mi Asistencia» en redirect al hub / lista de cursos. Si B o C: qué pasa con deep links, el `?horarioId=` legacy y la capability.
- Si la decisión implica cambio: `/design` corto y brief(s) de ejecución derivados. **No ejecutar en este chat sin decisión validada.**

## IMPLEMENTATION DETAIL (ADR-0006)
- **766 no tocó** menú ni rutas. Lo relevante: F5a dejó un redirect del `?horarioId=` legacy hacia el hub; reutilizar ese patrón si se redirige.
- Retirar una entrada de menú puede requerir cambio de capability en BE (`CAP_Ruta`); si es así, derivar brief BE en vez de tocarlo desde aquí.
- La página `justificar-inasistencia-dialog` (171 ln) vive bajo `pages/estudiante/components/`: confirmar si el hub la ofrece antes de retirar la página que hoy la abre.

## APRENDIZAJES TRANSFERIBLES (de 766)
- **Buscar consumidores por ruta y por string**, no solo por símbolo: rutas y menús se referencian como texto (`'/intranet/estudiante/asistencia'`) en configs, tests y enlaces.
- **Leer el cuerpo antes de borrar**: en 766 `closeContentDialog` parecía un flag y también limpiaba estado que otro flujo necesitaba.
- **Tests**: `bunx vitest run src/app/features/intranet/pages/estudiante src/app/features/intranet/shared`; `bun run lint` y `bun run build` en paralelo.
- **Worktree**: `git worktree add -b chat/768-… ../../WT/educa-web/768-…`; `bun install --frozen-lockfile` en segundo plano.
- **Cierre**: `awaiting-prod/` está en **23** (soft 20, duro 25): `/verify` en bloque antes de cerrar otro brief ahí.

## FUERA DE ALCANCE
- Pestaña Asistencia del hub y su UX (ya integrada).
- Menús de asistencia de profesor, admin y apoderado (esta decisión es solo del estudiante; el lado profesor se mira aparte si se pide).
- Guard de salida de asistencia (brief 769).
- Cambios de BE (derivar brief si hace falta).

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@data/@config/...`, `logger` de `@core/helpers`, sin `console.*`. Código en inglés, UI en español. Rutas y labels en español. Lint prohíbe `!` y `type X = {…}`. Permisos: leer `reference/permissions.md` si se toca capability o `permissionPath`.

## VALIDACIÓN FINAL
- [ ] Tabla de capacidades entregada y decisión A/B/C registrada en el plan.
- [ ] Si hubo ejecución: lint, build y Vitest de `pages/estudiante` y `shared` en verde; smoke local con «ver como» (rol Estudiante) navegando menú → hub → asistencia.

## CRITERIOS DE CIERRE
- [ ] Decisión del usuario registrada en la fila «Menú de asistencia» del plan.
- [ ] Brief movido `running/` → `closed/` (o `awaiting-prod/` si hubo código) en el mismo commit.
- [ ] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`docs(plan): P105 D1 — record the decision on the student "Mi Asistencia" page` (solo decisión). Con código: `refactor(intranet): P105 D1 — retire student attendance menu entry`.

## PENDIENTES HEREDADOS
- Verificación en vivo de 757–766 (en `awaiting-prod/`).
- Push a `main` = deploy a prod: no sin autorización.
- Worktree viejo `709-be-p107-gaps-verificacion-f2-salones` sin entrada en el manifest: `/triage`.

## CIERRE
Pedir feedback con `/feedback`.
