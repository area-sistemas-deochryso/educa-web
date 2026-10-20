# 852 — P70 F4: piloto de Signal Forms en un formulario de bajo riesgo

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/060-079/xrepo-70-angular22-migration.md` (F4)
> **Creado**: 2026-10-20 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/investigate`, luego `/design`, luego `/execute` sobre el piloto
> **Prioridad**: baja. Es adopción por actualización de stack; no hay un problema de formularios que lo motive (confirmado por el usuario, 2026-10-20).
> **exclusive**: `false`
> **modules**: formularios
> **touches**:
>   - `educa-web`: `src/app/features/public/contact/**` (candidato por defecto), `src/app/core/helpers/problem-details.adapter.ts` (solo lectura, para el cruce), `.claude/reference/` (nota de decisión)

## Qué se busca

Una **decisión informada**, no una migración. El piloto responde: ¿conviene usar Signal Forms para los formularios **nuevos** de `educa-web`?

## Hechos de partida (medidos 2026-10-20)

- Reactive Forms: 5 archivos (`login-intranet`, `contact`, `form.models.ts`).
- `ngModel`: 138 archivos. La superficie real de una migración sería esa, no los 5.
- `httpResource` / `resource()`: 0 usos. **Fuera de este piloto**: compite con el patrón facade + store + WAL del proyecto y no se evalúa aquí.
- Angular `^22.1.3`. Que Signal Forms sea estable en la 22 viene de la nota del plan P70; **confirmarlo en la documentación de Angular** antes de empezar.

## Scope

### Investigación (sin tocar código)
- Confirmar el estado de Signal Forms en la versión instalada y los cambios de API respecto de versiones previas.
- Elegir el formulario piloto con estos criterios: pequeño, reversible, sin datos sensibles, con validaciones reales. Candidato por defecto: `features/public/contact`. **Descartado: el login** (ruta crítica de acceso).

### Piloto (en un worktree, nunca en `main`)
- Reescribir el formulario elegido con Signal Forms, manteniendo el comportamiento y los mensajes en español.
- Evaluar y dejar por escrito, con ejemplos del código del piloto:
  - Validaciones síncronas y asíncronas, y cómo se muestran los errores.
  - Cruce con `ProblemDetails` (ADR-0005): ¿cómo se mapean los errores de campo que devuelve el BE (`422` con cita de INV) al formulario?
  - Accesibilidad: foco, `aria-invalid`, lectura de errores.
  - Tests: cuánto cuesta probarlo respecto del actual.
  - Convivencia con los 138 formularios con `ngModel`: ¿se pueden mezclar sin fricción?
  - Qué se gana y qué se pierde en líneas de código y en legibilidad.

### Entrega
- Una nota de decisión en `.claude/reference/` con una de dos conclusiones: **adoptar para formularios nuevos** (con la convención a seguir) o **no adoptar todavía** (con el motivo y qué cambiaría la decisión).
- Si se adopta: el piloto se integra a `main`. Si no: se descarta la rama y queda solo la nota.

## Pre-work

- Leer `.claude/reference/templates.md`, `.claude/reference/eduui.md` y `.claude/reference/state-management.md`.
- Leer `core/helpers/problem-details.adapter.ts` y ADR-0005.

## Out of scope

- Migrar los 138 formularios con `ngModel` o el login.
- `httpResource` y cualquier cambio en facades, stores o WAL.
- Cambios de BE.

## Criterio de cierre

- [ ] Estado de Signal Forms en Angular 22 confirmado contra la documentación.
- [ ] Piloto funcionando en un worktree, con `lint` + `build` + tests en verde.
- [ ] Nota de decisión escrita con la conclusión y la evidencia del piloto.
- [ ] Comportamiento del formulario verificado en local; nada en producción. Si el piloto se integra, el cambio llega a `main` por el flujo normal (el push a `main` de `educa-web` despliega, y el formulario de contacto es público).

## Tiempo estimado

~120 min.
