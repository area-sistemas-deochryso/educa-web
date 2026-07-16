---
exclusive: false
isolation: worktree
touches: [src/app/features/intranet/pages/profesor/cursos/components/evaluacion-form-dialog/, src/app/features/intranet/pages/profesor/classrooms/components/salon-grupos-tab/]
hot-paths: []
---

> **Repo destino**: `educa-web`. Abrir en worktree `chat/450-evaluaciones-integridad-duplicado-crear-autocorreccion`.
> **Creado**: 2026-07-16 · **Estado**: ⏳ pendiente.
> **Fuente**: auditoría UX cross-repo "Horarios y Contenido de Cursos" (educa-coord, 2026-07-16) + investigación de este mismo chat.

# Evaluaciones: duplicado silencioso al crear + autocorrección sin avisar

## MODO SUGERIDO

`/execute` directo — causa raíz confirmada.

## ALCANCE

### 1. Duplicado silencioso al crear evaluación

**Archivo**: `evaluacion-form-dialog.component.html` (líneas 129-146, botón "Crear") y `.ts` (líneas 148-164, `onSave()`).

**Causa raíz confirmada**: el botón `[disabled]="!isFormValid()"` NO incluye `saving()` — `[loading]="saving()"` solo agrega spinner visual (la directiva `pButton` no liga `disabled` nativo a `loading`, a diferencia del componente `<p-button>`). `onSave()` no tiene guard local contra reentrancia. El WAL (`wal-coalescer.service.ts` líneas 8-13) nunca deduplica operaciones `CREATE` (solo `UPDATE`) — dos clicks rápidos generan dos entradas WAL CREATE independientes → dos POST reales → dos filas con id distinto.

**Fix**: agregar `|| saving()` al `[disabled]` del botón "Crear/Guardar" (línea 142) **y** agregar guard idempotente local en `onSave()` (flag `_submitting` o similar) — ambos son baratos y no conflictivos, hacerlos juntos.

**Nota importante — el doble-borrado NO se arregla acá**: la investigación confirmó que el filtro de borrado FE (`removeCalificacion`, por id numérico único) es correcto — no hay causa visible en este repo para que borrar un duplicado elimine también el otro. Ese síntoma se deriva a un brief BE aparte (`Educa.API` brief `447`, ya creado, prioridad alta). No investigar ni intentar arreglar el doble-borrado en este worktree.

### 2. Autocorrección silenciosa sin avisar la regla

**Peso de evaluación** — `evaluacion-form-dialog.component.html` (líneas 55-67): `p-inputNumber` con `[min]="PESO_MINIMO"` (0.01) `[max]="PESO_MAXIMO"` (1.0). Ya existe un hint estático (`<small class="field-hint">`) con el rango, pero al clampear (ej. "1.90" → "1,00") no hay ningún mensaje/toast en el momento de la corrección.

**Máx. por grupo** — `salon-grupos-tab.component.ts` (líneas 195-198, `onMaxInputChange`): **bug real confirmado** — `num && !isNaN(num)` trata `0` como falsy (JS), así que al tipear `0` el campo se vacía en vez de aplicar el valor. Negativos sí clampean correctamente a 1 vía `Math.min(Math.max(num, 1), 50)`.

**Decisión ya tomada (no re-abrir)**: `0` en "Máx. por grupo" debe **clampear a 1**, igual que los negativos — no significa "sin límite".

**Fix**:
- Corregir el chequeo en `onMaxInputChange`: cambiar `num && !isNaN(num)` por `num !== null && num !== undefined && !isNaN(num)`, y que el resultado siga pasando por el mismo `Math.min(Math.max(num, 1), 50)` — así `0` clampea a `1` igual que los negativos, en vez de vaciarse.
- Agregar feedback en el momento de la corrección para **ambos** casos (peso y máx.-por-grupo): usar `ErrorHandlerService.showWarning` (patrón ya usado en `wal-facade-helper.service.ts:109`) con mensaje explicando el límite aplicado (ej. "El peso máximo es 1.00, se ajustó automáticamente" / "El mínimo por grupo es 1, se ajustó automáticamente").

## OUT OF SCOPE

- Doble-borrado de evaluaciones duplicadas — brief BE aparte (`Educa.API` brief `447`).
- Sistema de deduplicación general en el WAL (`wal-coalescer.service.ts`) para `CREATE` — cambio arquitectónico más amplio, no parte de este fix.
- Pantalla de "papelera"/soft-delete — no existe hoy, no fue pedido.
- Cambiar el rango permitido de peso (0.01–1.0) o de máx.-por-grupo (1–50).

## Criterio de cierre

- [x] Doble-click en "Crear evaluación" ya no produce duplicados (guard `[disabled]="!isFormValid() || saving()"` + flag local `submitting` en `onSave()`).
- [x] "Máx. por grupo" en `0` clampea a `1` (no se vacía).
- [x] Al clampear peso o máx.-por-grupo, aparece un warning explicando el límite.
- [x] Lint + build + tests OK.
- [x] Commit en la rama del worktree — sin merge.

## Resumen de cierre — 2026-07-16

**Estado**: ✅ implementado, worktree listo para `/verify-prod` post-deploy.

### Archivos tocados

- `src/app/features/intranet/pages/profesor/cursos/components/evaluacion-form-dialog/evaluacion-form-dialog.component.html` — `[disabled]="!isFormValid() || saving()"` en el botón Crear/Guardar; nuevos bindings `(onInput)="onPesoInput($event)"` y `(onBlur)="onPesoBlur()"` en el `p-inputNumber` de Peso.
- `src/app/features/intranet/pages/profesor/cursos/components/evaluacion-form-dialog/evaluacion-form-dialog.component.ts` — guard local `submitting` (signal) con reset vía `effect()` sobre `saving()`; captura del valor crudo (pre-clamp) de "Peso" en `onPesoInput` y warning en `onPesoBlur` si excede `PESO_MINIMO`/`PESO_MAXIMO`.
- `src/app/features/intranet/pages/profesor/classrooms/components/salon-grupos-tab/salon-grupos-tab.component.ts` — fix del bug real en `onMaxInputChange` (`num && !isNaN(num)` → `num === null || num === undefined || isNaN(num)`, invertido y explícito) para que `0` clampee a `1` en vez de vaciarse; warning vía `ErrorHandlerService.showWarning` cuando el valor tipeado se clampea.

### Desviaciones del brief

- **Detección de clamp en "Peso"**: el brief no especificaba el mecanismo. `p-inputNumber` de PrimeNG no clampea en cada tecleo — el modelo (`ngModelChange`) recibe el valor crudo sin clampear durante el tipeo, y solo al hacer blur PrimeNG internamente llama `validateValue()` (clamp) antes de emitir el valor final. Para detectar el clamp con precisión sin falsos positivos por cada tecla, se usó `(onInput)` (evento nativo de PrimeNG que expone el valor crudo pre-clamp) para capturar el último valor tipeado, y `(onBlur)` para comparar ese valor contra `PESO_MINIMO`/`PESO_MAXIMO` y disparar el warning solo si efectivamente excedía el rango. Confirmado leyendo el código fuente de `primeng/fesm2022/primeng-inputnumber.mjs` (métodos `updateValue`/`handleOnInput` vs `onInputBlur`/`validateValue`).
- Sin otras desviaciones — el resto se implementó tal cual el brief (guard de reentrancia doble: disabled + flag local; fix `0`→`1` en máx.-por-grupo; warnings vía `ErrorHandlerService.showWarning` siguiendo el patrón de `wal-facade-helper.service.ts`).
- Respetada la nota de no tocar el doble-borrado (brief BE `Educa.API` #447) — no se investigó ni tocó `removeCalificacion` ni lógica de borrado.

### Lint / build / test

- `bun run lint` — OK, sin hallazgos.
- `bun run build` — OK (SSR + browser bundles + prerender, sin errores).
- `bun run test` — 2 fallos en la corrida completa del suite (`eslint-config-guards.spec.ts` y `attendance-director-profesores.component.spec.ts`), ambos timeouts no relacionados a los archivos tocados en este chat. Verificado: al correr esos 2 archivos aislados (`bunx vitest run ...`), los 16 tests pasan sin problema — son timeouts por carga de máquina durante la corrida completa del suite, no regresiones introducidas acá.
