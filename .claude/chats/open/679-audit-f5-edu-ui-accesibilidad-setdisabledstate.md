# 679 — Audit F5: `edu-ui` — accesibilidad teclado/ARIA + `setDisabledState` faltante

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F5)
> **Creado**: 2026-09-12 · **Estado**: ⏳ pendiente arrancar.
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

- [ ] `setDisabledState` implementado en los 9 controles, verificado con un form reactivo real (`.disable()`/`.enable()` reflejado visualmente).
- [ ] Los 5 componentes de teclado/ARIA navegables 100% por teclado, verificado manualmente.
- [ ] Build + lint + tests OK.
- [ ] Plan actualizado: F5 → ✅.
- [ ] Maestro actualizado.

## Tiempo estimado

~3h (9 controles CVA + 5 componentes de accesibilidad).
