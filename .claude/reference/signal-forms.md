# Signal Forms — decisión de adopción (P70 F4, brief 852)

> **Trigger**: vas a crear un formulario **nuevo** en `educa-web`, o a decidir entre Reactive Forms, `ngModel` y Signal Forms.
> **Decisión (2026-10-28)**: **adoptar para formularios nuevos**, con la convención de abajo. **No migrar** los existentes (138 archivos con `ngModel`, 5 con Reactive Forms, el login incluido).
> **Evidencia**: piloto en `features/public/contact` (3 campos, `required` + `email`, envío al BE) + `contact/signal-forms-eduui.spec.ts`. Angular `^22.1.3`.

## Estado de la API

- Estable desde Angular 22 (las APIs dejaron de ser experimentales). Import: `@angular/forms/signals` (`form`, `FormField`, `required`, `email`, `submit`, `validateHttp`, `validateAsync`).
- Renombres de 21.x que afectan a cualquier ejemplo viejo: `Field` → `FormField` (`[formField]`), `field` → `fieldTree` en los errores.
- Fuente: documentación en angular.dev y notas de versión de terceros. No se pudo inspeccionar la versión instalada en `node_modules` (acceso denegado en la sesión); el `build` del piloto sí compila contra ella.

## Convención para formularios nuevos

1. **Modelo = `signal`** con el valor inicial; `form(this.model, schema)` con los mensajes en español dentro del schema (`required(path.x, { message: '…' })`).
2. **Plantilla**: `<form novalidate (submit)="$event.preventDefault(); onSubmit()">` y `[formField]="form.campo"` en cada control. No agregar `required` a mano: la regla lo gestiona.
3. **Envío con `submit(this.form, action)`**: marca `touched`, corta si hay errores y rechaza un segundo envío en curso. Reemplaza el `markAllAsTouched()` + guarda manual. Un estado propio (`idle|submitting|success|error`) sigue sirviendo para las alertas y el botón.
4. **Errores del servidor**: en el `catch`, `parseProblemDetails(err).validationErrors` → devolver `{ kind, message, fieldTree }` desde la `action`. Las claves de `errors{}` llegan con el nombre del DTO del BE, así que se comparan en minúsculas (ver `ContactComponent.serverFieldErrors`). El error se limpia solo cuando el usuario edita ese campo.
5. **Accesibilidad a mano**: la doc no documenta `aria-invalid` ni foco automático. Por campo: `[attr.aria-invalid]="campo().touched() && campo().invalid()"`, `aria-describedby` apuntando al `<p role="alert">` del error. Para foco al primer inválido: `errorSummary()[0]?.fieldTree().focusBoundControl()`.
6. **No mezclar** en un mismo formulario Signal Forms con `ngModel`/Reactive. Conviven por formulario (un componente nuevo no obliga a tocar los otros). `compatForm`/`SignalFormControl` existen pero la doc de migración no cubre `ngModel`.
7. **Controles `edu-ui`**: son `ControlValueAccessor` y funcionan bajo `[formField]` (verificado con `EduCheckbox`: modelo→vista, vista→modelo, `touched`). Al usar `EduSelect`/`EduDatepicker`/etc. por primera vez, agregar el mismo test de tres casos.
8. **Tests**: leer señales (`form.campo().errors()`, `touched()`), `model.set(…)` en vez de `setValue`. **Vitest no hace typecheck**: un nombre de API mal escrito pasa los tests y rompe en `build` (pasó en el piloto: `TS2774`). Correr `ng build` además de `vitest`.

## Qué se ganó y qué costó (piloto)

| Aspecto | Resultado |
|---|---|
| Líneas `contact.ts` | 56 → 85. Pero 25 son el mapeo de `422` que el original no tenía; la lógica equivalente queda en ~60. |
| Líneas `contact.html` | 193 → 211. Las +18 son los 3 bloques de error por campo (comportamiento **nuevo**: el formulario original no mostraba errores por campo). |
| Tests | 12 → 17 en `contact.spec.ts` (+5 casos: 2 de render de error/`aria-invalid`, 3 de `ProblemDetails`) + 3 de compat `edu-ui`. Los 20 verdes. |
| Cruce `ProblemDetails` | Funciona (simulado con `HttpErrorResponse` 422 en el spec). ~15 líneas. La doc no cubre HTTP 422; es extrapolación validada por el test. |
| Pérdidas | `aria-invalid`/foco manuales; sin clases `ng-valid`/`ng-dirty` automáticas (hay `NG_STATUS_CLASSES`); el bloque de error se repite por campo → conviene un componente compartido `field-error` si se adopta. |

## Cambios de comportamiento respecto del formulario original

- **Nuevo**: se muestran mensajes de error por campo (antes solo había alertas globales). Se puede quitar si se quiere paridad estricta.
- Los atributos `required` estáticos del HTML se quitaron; la regla `required` los pone sola (verificado en el DOM, `ng serve` local).
- Verificado en el navegador (local, sin enviar el formulario): `novalidate` presente; envío vacío → 0 requests al BE, `aria-invalid="true"` y los tres mensajes en español; correo `abc` → "Ingresa un correo válido", y al corregirlo el error y `aria-invalid` se limpian. **No verificado**: foco del teclado tras un envío inválido y el envío exitoso real (dispararía un correo).

## No evaluado (lo que podría cambiar la decisión)

- **Validación asíncrona** (`validateHttp`/`validateAsync`): contact no tiene ninguna; solo hay lectura de la doc. Nota: `submit()` no espera validación pendiente por defecto.
- **`EduSelect`, `EduDatepicker` y el resto de controles** `edu-ui`: solo `EduCheckbox` verificado.
- **Mezcla `ngModel` + Signal Forms en el mismo componente**: la doc no la describe; no se probó.
- **Lector de pantalla real**: la accesibilidad se evaluó por atributos, no con tecnología asistiva.
- **Un formulario más grande** (selects dependientes, listas dinámicas, formularios en `edu-dialog`): el piloto es de 3 campos de texto.

Si alguno de los dos primeros falla al primer uso real, la decisión pasa a **no adoptar todavía** para ese tipo de formulario.
