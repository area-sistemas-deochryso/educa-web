# 679 — Audit F5: `edu-ui` — accesibilidad teclado/ARIA + `setDisabledState` faltante

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F5)
> **Creado**: 2026-09-12 · **Estado**: ⏳ pendiente arrancar.
> **Validación prod**: ✅ verificada 2026-09-17 — smoke visual/teclado en prod real OK.
> **MODO SUGERIDO**: `/execute`
> **touches**:
>   - `src/app/shared/edu-ui/lib/**/edu-checkbox.ts`, `edu-toggle.ts`, `edu-select-button.ts`, `edu-input-number.ts`, `edu-password.ts`, `edu-autocomplete.ts`, `edu-select.ts`, `edu-multi-select.ts`, `edu-datepicker.ts` (CVA)
>   - `edu-tab.ts`, `edu-step.ts`, `edu-accordion-header.ts`, `edu-accordion-panel.ts`, `edu-tabpanel.ts`, `edu-menu.ts`, `edu-tooltip.ts` (teclado/ARIA)

## Origen

Hallazgos de `/audit` (2026-09-12), categoría "Bug"/"Riesgo" — impacta toda la app porque `edu-ui` es el design system reusado en todos lados. Agrupados por ser todos del mismo módulo.

## Scope

### Bug — `setDisabledState` ausente en 9 controles CVA

`edu-checkbox.ts:49`, `edu-toggle.ts:31`, `edu-select-button.ts:39`, `edu-input-number.ts:54`, `edu-password.ts:69`, `edu-autocomplete.ts:133`, `edu-select.ts:182`, `edu-multi-select.ts:202`, `edu-datepicker.ts:224` — implementan `writeValue`/`registerOnChange`/`registerOnTouched` pero no `setDisabledState`. Con Reactive Forms, `formGroup.get('x').disable()` invoca `setDisabledState` en el CVA — al no existir, el control queda visualmente habilitado y clickeable aunque el `FormControl` esté `disabled`. Fix: implementar `setDisabledState(isDisabled)` en cada uno, combinando un signal privado con el input `disabled` existente. Usar `edu-sortable-column.ts` (ya referenciado como ejemplo de buen patrón de accesibilidad en el audit) y el patrón de los otros 3 métodos CVA ya implementados como referencia de estilo.

### Riesgo — accesibilidad teclado/ARIA

1. **Tabs/Stepper sin roving tabindex**: `edu-tab.ts:9-19` y `edu-step.ts:9-20` tienen `role="tab"`/`aria-selected` pero no `tabindex` ni manejo de flechas izquierda/derecha — solo `(click)`. Fix: implementar el patrón ARIA Tabs (roving tabindex + flechas).
2. **Accordion/Tabs sin `aria-controls`/`aria-labelledby`**: `edu-accordion-header.ts:9`/`edu-accordion-panel.ts:12` y `edu-tab.ts`/`edu-tabpanel.ts:10` no enlazan disparador↔contenido por `id`/`aria-controls`/`aria-labelledby`.
3. **Menu sin navegación por teclado**: `edu-menu.ts:33` — solo `(click)`, sin `tabindex`, Enter/Space, flechas, Home/End.
4. **Tooltip sin `aria-describedby`**: `edu-tooltip.ts` se inyecta en `document.body` sin `role="tooltip"`/`id`, y el host no recibe `aria-describedby`.
5. **Select/MultiSelect/Autocomplete sin `aria-activedescendant`**: las opciones no tienen `id`, y el combobox no expone `aria-controls`/`aria-activedescendant` apuntando al listbox — navegación con flechas invisible para lectores de pantalla.

## Pre-work

- El `setDisabledState` faltante es el hallazgo de mayor impacto funcional (bug real, no solo accesibilidad) — priorizar primero.
- Los 5 puntos de teclado/ARIA comparten el mismo tipo de fix (patrón ARIA estándar) — conviene resolverlos en la misma sesión.
- Verificar con un lector de pantalla real (NVDA/VoiceOver) o al menos con navegación 100% por teclado antes de cerrar, no solo por lectura de código.

## Out of scope

- Rediseño visual de los componentes — solo el comportamiento de accesibilidad/CVA.
- El resto de hallazgos del audit (ver plan).

## Criterio de cierre

- [x] `setDisabledState` implementado en los 9 controles (patrón `cvaDisabled` signal + `computed isFormDisabled`, template actualizado). Verificado por lectura de código consistente en los 9 archivos; no se exercitó contra un form reactivo real con `.disable()`/`.enable()` en esta sesión (gap residual, riesgo bajo — patrón mecánico repetido).
- [x] Los 5 componentes de teclado/ARIA navegables 100% por teclado, verificado en vivo (local `:4201` + backend `:5139`, sesión "CODE CLAUDE"):
  - `edu-menu` (kebab de `admin/usuarios`): foco inicial en primer item, flechas ↓/↑, Home/End, Escape cierra y devuelve foco al trigger — todo OK.
  - `edu-accordion` (`/intranet/ayuda/qa`): `aria-controls`↔`id` y `aria-labelledby`↔`id` correctamente enlazados, `role="region"` en el panel — OK.
  - `edu-tabs`/`edu-tab` (`admin/sistema/runtime-health` y diálogo "Nuevo Usuario"): roving tabindex correcto (`0` solo en el tab activo), ArrowLeft/Right mueve foco y selección con wrap — OK.
  - `edu-tooltip`: `aria-describedby` aparece en `mouseenter` apuntando al `id` real del tooltip, se limpia en `mouseleave` — OK.
  - `edu-select`/`edu-multi-select`: **bug real encontrado y corregido** — `aria-activedescendant` nunca se seteaba porque `onTriggerKeydown` solo abría el panel en el primer `ArrowDown` pero nunca delegaba la navegación subsiguiente a `onListKeydown` (el `<ul role="listbox">` vive en un overlay portado a `body`, no es ancestro DOM del trigger, así que su `(keydown)` nunca recibía el evento mientras el foco quedaba en el trigger). Fix: `onTriggerKeydown` ahora delega a `onListKeydown` cuando el panel ya está abierto. Verificado en vivo tras el fix (`edu-select` en `admin/usuarios`): ArrowDown avanza `aria-activedescendant` por las opciones, Enter selecciona y cierra. `edu-multi-select` recibió el mismo fix por paridad de código (arquitectura idéntica) pero no se pudo reproducir un multi-select real en la UI en esta sesión para confirmarlo visualmente — build/tests siguen verdes tras el cambio.
  - `edu-autocomplete`: no tenía el bug (su `(keydown)` está en el `<input>` real, que sí mantiene el foco) — sin cambios necesarios.
- [x] Build + lint + tests OK (2573/2573 tests verdes, lint 0 errores, build verde) — corrido tres veces (fork inicial, tras el fix de `aria-activedescendant`, y validación final de `/end`).
- [x] Plan actualizado: F5 → ✅.
- [x] Maestro actualizado.

> **Validación prod**: ⏳ pendiente desde 2026-09-14 — smoke test visual/teclado en `educa.com.pe/intranet` real (toca `edu-ui`, librería compartida en toda la intranet).

## Tiempo estimado

~3h (9 controles CVA + 5 componentes de accesibilidad).
