# 852 — P70 F4: piloto de Signal Forms en un formulario de bajo riesgo

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/060-079/xrepo-70-angular22-migration.md` (F4)
> **Creado**: 2026-10-20 · **Estado**: ✅ cerrado localmente 2026-10-28.
> **Validación prod**: ⏳ pendiente desde 2026-10-28 — tras el deploy, smoke test en `/contacto` (errores por campo, envío real exitoso y 422 si el BE lo emite).
> **⚠️ Docs flagged for review (skipped)**: `reference/a11y.md` (vigila `src/app/**/*.html`; se tocó `contact/contact.html` con `aria-invalid`/`aria-describedby` manuales).
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

- [x] Estado de Signal Forms en Angular 22 confirmado contra la documentación (angular.dev + notas de versión de terceros; el blog oficial dio 403 y `node_modules` no era legible, ver nota).
- [x] Piloto funcionando en un worktree, con `lint` + `build` + tests en verde (vitest completo: 383 archivos, 3897 tests).
- [x] Nota de decisión escrita con la conclusión y la evidencia del piloto: `.claude/reference/signal-forms.md` → **adoptar para formularios nuevos**.
- [x] Comportamiento del formulario verificado en local (`ng serve` :4201, ya detenido); nada en producción. Envío exitoso real no probado (dispararía un correo). **Pendiente al integrar**: el cambio llega a `main` por el flujo normal (el push a `main` de `educa-web` despliega, y el formulario de contacto es público).

## Tiempo estimado

~120 min.

## Hallazgos de `/investigate` (2026-10-28)

**Estado de Signal Forms (criterio 1)** — confirmado, con una salvedad: no pude leer `node_modules` (permiso denegado), así que la versión instalada de `@angular/forms` no se verificó directamente; solo el rango `^22.1.3` de `package.json`.
- Estable en v22 (Ninja Squad "What's new in Angular 22.0": "the signal forms APIs are no longer experimental"). El blog oficial devolvió 403; la fuente es secundaria.
- Cambios de API relevantes: directiva `Field` → `FormField` (`[formField]`, ocurrió en 21.x); `field` → `fieldTree` en los errores de validación; custom controls usan input `touched` + output `touch()`; `when` en validadores (firma vieja deprecada); `getError(kind)`, `reloadValidation()`, `debounce` en async.
- `submit()`/`FormRoot`: valida → `action` → los errores devueltos se enrutan a campos vía `fieldTree`. Los errores del servidor se limpian al editar el campo. La doc **no** cubre status HTTP 422; mapear `errors{}` de ProblemDetails a `fieldTree` es extrapolación a validar en el piloto.
- Async: `validateHttp()` / `validateAsync()`; corren solo si pasa lo síncrono; `pending()` expuesto; `submit()` **no** espera validación pendiente por defecto.
- Interop: `compatForm` (envolver controles legacy) y `SignalFormControl` (signal dentro de `FormGroup`). La doc de migración **no describe `ngModel`**; solo cubre Reactive Forms. Límites: no hay `ng-valid`/`ng-dirty` automáticos (hay que dar `NG_STATUS_CLASSES`), `setErrors`/`setValidators` no soportados.

**Formulario candidato `features/public/contact` (hechos del código):**
- 3 campos (`fullName`, `email`, `message`), validadores `required` + `email`. Estado de envío en `signal` propio (`idle|submitting|success|error`), ya fuera del form.
- **La plantilla actual no muestra ningún error de campo.** Solo hay alerta global de éxito/error. "Mantener el comportamiento" significa no mostrar errores por campo; cualquier mensaje por campo sería una mejora, no paridad.
- `ContactApiService.enviar()` devuelve `void` y el componente trata todo error como genérico. **Contact no ejercita el cruce con `ProblemDetails`**: `parseProblemDetails()` (`core/helpers/problem-details.adapter.ts`) ya normaliza `errors: Record<string, string[]>`, pero contact no lo usa.
- Spec original: 12 casos; los de validación, el reset y el `setValue` del `beforeEach` tocan la API del form (`form.controls.x.hasError`, `touched`, `setValue`) y hubo que reescribirlos.
- ADR-0005 (`educa-coord/decisions/0005-problem-details-error-shape.md`) está `proposed`; el shape de error por campo es `errors: { campo: [mensajes] }`.

**Consecuencia para el piloto**: para evaluar el cruce con ProblemDetails hay que simularlo (spec con `HttpErrorResponse` 422 pasado por `parseProblemDetails` → `fieldTree`), porque el endpoint real de contacto no lo devuelve hoy (no verificado en BE; fuera de scope tocar BE).
