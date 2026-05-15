# 170 — Recategorización de maestros, planes y pendientes (FE/BE → coord)

> **Repos afectados**: educa-web, Educa.API, educa-coord.
> **Predecesor**: ADR-0001 (`educa-coord/decisions/0001-arquitectura-coord-folder.md`), Plan migración F1-F7 (brief 167).
> **Creado**: 2026-05-15 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/design` (decisiones de relocalización) → brief follow-up `/execute` para ejecutar el move.

## Contexto

La migración cross-repo terminó en F7 (brief 167) pero solo cubrió **reglas**, **invariantes** y **contratos**. Los **planes**, **maestros** y **briefs pendientes** siguen donde estaban antes de que existiera `educa-coord`:

- **`educa-web/.claude/plan/maestro.md`** funciona como cola de los **dos repos** — mezcla planes FE, planes BE y planes cross-repo sin separación física. Histórico: cuando solo existían FE+BE, el maestro vivía donde había vida y se aceptó la mezcla.
- **`Educa.API/.claude/plan/`** tiene 8 planes BE pero **no hay maestro** propio — todo el flujo BE pasaba por el maestro del FE.
- **`educa-coord/plans/`** ya tiene 12 planes `xrepo-*` migrados durante F3 (brief 163), pero **no hay maestro coord** todavía.
- **`educa-web/.claude/plan/`** tiene 18 archivos: algunos son FE-only legítimos (`drift-doc-cleanup.md`), otros podrían ser cross-repo escondidos.

Síntoma operativo: cuando arrancás un chat BE puro, el maestro que mira `/go` está físicamente en el repo FE. Cuando arrancás un chat cross-repo, igual. La carpeta coord existe pero no se está usando como queue real.

## Problema concreto

1. **Sin maestro BE**, la cola del repo BE depende del repo FE. Si FE no está clonado, `/go` desde BE no sabe qué hacer.
2. **Sin maestro coord**, los `xrepo-*` viven sueltos sin orden de prioridad visible. Hoy se priorizan implícitamente vía el maestro FE.
3. **El maestro FE crece sin discriminación**: cada plan nuevo cross-repo termina ahí porque no hay otro lugar.
4. **Briefs pendientes en `chats/open/` están dispersos**: cada repo tiene sus `open/` propios + coord debería tener los suyos para chats cross-repo, pero la convención aún no se enforza.
5. **Duplicación silenciosa**: el mismo plan puede aparecer referenciado en el maestro FE como entrada y en `educa-coord/plans/xrepo-*.md` como archivo — pero la "versión maestra" sigue siendo la fila del FE.

## Scope del chat 170 (solo `/design`)

Decidir, no ejecutar. Los moves van en brief 171 follow-up.

### Decisiones a tomar

1. **¿Maestros independientes o maestro único?**
   - **Opción A**: 3 maestros (FE/BE/coord). Cada uno gestiona su cola. `/go` desde un repo mira solo su maestro.
   - **Opción B**: 2 maestros (FE/BE) + coord usa `plans/README.md` como índice sin priorización.
   - **Opción C**: maestro único en coord, pointers desde FE/BE. Volviendo a una sola fuente pero centralizada.
2. **Clasificación de planes — criterio de pertenencia**:
   - Plan toca solo archivos del FE → `educa-web/.claude/plan/`.
   - Plan toca solo archivos del BE → `Educa.API/.claude/plan/`.
   - Plan toca archivos de ambos repos **o** define contratos/invariantes que cruzan → `educa-coord/plans/xrepo-*.md`.
   - Plan toca solo coord (meta-arquitectura, principios, invariantes) → `educa-coord/plans/`.
3. **Naming**: `xrepo-` prefix obligatorio en coord, o nombre libre? Hoy hay mezcla (`xrepo-42-case-drift.md` y `xrepo-migracion-smtp-acs.md` con prefijo, pero también `xrepo-asignacion-profesor-salon-curso.md`).
4. **Estado del trabajo en curso**: planes mezclados (`Plan 28` AA en reportes BE+FE — vive inline en maestro FE pero el scope es claramente cross-repo). ¿Se migra retroactivamente o solo aplica a planes nuevos?
5. **Briefs pendientes en `chats/open/`**: ¿se reasignan por scope (FE/BE/coord) o se quedan donde están? Hoy en `educa-web/.claude/chats/open/` hay un brief BE-only (168) que probablemente debería vivir en `Educa.API/.claude/chats/open/`.
6. **Maestro coord — cola compartida**: si se crea, ¿qué columnas? Para xrepo necesita mostrar fase BE vs fase FE separadas (un plan puede estar 100% BE shipped + 0% FE).
7. **`maestro.md` FE post-migración**: cuántas filas quedan tras sacar lo cross-repo. Si quedan <5, ¿conviene maestro o solo una sección en `CLAUDE.md`?

### Pre-work obligatorio

Antes de proponer cualquier decisión:

1. Inventariar los 18 planes de `educa-web/.claude/plan/` y clasificarlos (FE-only / BE-only mal alojado / cross-repo / meta).
2. Inventariar los 8 planes de `Educa.API/.claude/plan/` y verificar cuáles son realmente BE-only (vs cross-repo).
3. Inventariar los 12 `xrepo-*` de `educa-coord/plans/` y verificar que ninguno cruzó la línea hacia FE-only o BE-only.
4. Inventariar `chats/open/` de los 3 repos y mapear qué brief pertenece a qué repo según su scope real.
5. Listar filas activas del `maestro.md` FE y marcar para cada una: pertenencia real (FE/BE/coord), estado de migración del plan file.

### Entregables

1. **Documento de decisión** en `educa-coord/decisions/0002-maestros-y-planes.md` (ADR-0002) con las 7 decisiones tomadas.
2. **Tabla de migración** en el ADR: cada plan/brief mal alojado → destino propuesto + razón.
3. **Brief 171** stageado en `educa-coord/chats/open/` para ejecutar los moves (`git mv`, update refs cruzadas, update maestros).
4. Si se aprueba la opción de crear maestro coord o BE: skeleton de `educa-coord/plans/maestro.md` / `Educa.API/.claude/plan/maestro.md` con la estructura propuesta (sin contenido todavía — el contenido entra en el brief 171).

## Out of scope (NO en este chat)

- Ejecutar moves de archivos. Eso es el brief 171.
- Cambiar la convención de naming retroactivamente (renombrar todos los planes a un formato único). Si se propone, queda como ADR-0003 separado.
- Migrar `chats/closed/` o `chats/awaiting-prod/`. Memoria institucional, no se mueve.
- Tocar `educa-web/.claude/CLAUDE.md` ni `Educa.API/.claude/CLAUDE.md` salvo para corregir el puntero al maestro si cambia físicamente.

## Criterio de cierre

- ADR-0002 commiteado en `educa-coord/`.
- 7 decisiones tomadas explícitamente (no quedan TBD).
- Tabla de migración cubre cada plan/brief identificado en el pre-work.
- Brief 171 listo en `educa-coord/chats/open/` con scope acotado y ejecutable.
- Maestro FE no se toca todavía (eso es 171).

## Tiempo estimado

~60-90 min — el pre-work de inventario es la parte densa. Las decisiones son acotadas si el pre-work está bien hecho.

## Dependencias

- ADR-0001 ya aceptado y commiteado (brief 167).
- `educa-coord/plans/` y `educa-coord/chats/` ya existen con contenido real (no se está creando la infra, solo redistribuyendo).
- Brief 169 (drift residual) puede correr en paralelo — no toca planes ni maestros.
