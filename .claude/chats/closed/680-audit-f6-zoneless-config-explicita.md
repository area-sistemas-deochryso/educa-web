# 680 — Audit F6: Decidir y aplicar configuración zoneless explícita

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F6)
> **Creado**: 2026-09-12 · **Estado**: ✅ cerrado 2026-09-14.
> **MODO SUGERIDO**: `/investigate` primero (confirmar comportamiento real) → `/execute`
> **touches**:
>   - `src/app/app.config.ts`
>   - `src/test-setup.ts`
>   - `angular.json` (verificar `polyfills`)

## Origen

Hallazgo de `/audit` (2026-09-12), categoría "Regla violada" — `test-setup.ts:71` provee explícitamente `provideZonelessChangeDetection()`, pero `app.config.ts` (bootstrap real de producción) no lo incluye, y `zone.js` tampoco es dependencia declarada (`package.json` no lo lista) ni está en `polyfills` de `angular.json` (el array `polyfills` ni siquiera existe ahí). Zoneless es default sin configurar desde Angular v21.

## Scope

- Investigar el comportamiento real hoy: ¿la app en producción efectivamente corre zoneless (porque no hay zone.js cargado en absoluto) y `test-setup.ts` solo lo hace explícito por claridad, o hay alguna divergencia real de comportamiento entre tests y producción?
- Si el comportamiento real ya es zoneless (lo más probable dado que zone.js no está ni en dependencies ni en polyfills), agregar `provideZonelessChangeDetection()` explícito a `app.config.ts` para que la intención quede declarada igual que en `test-setup.ts` — evita ambigüedad para quien lea el código.
- Si se confirma alguna divergencia real, investigar su causa raíz antes de "solo agregar el provider".
- Barrer código que dependa implícitamente de zone.js (callbacks de suscripciones, `setTimeout`/`setInterval` esperando detección automática sin `signal`/`markForCheck` manual) — ya hay ejemplos conocidos del audit (`counter-section.ts` con `detectChanges()` manual en RAF, mezclado con `markForCheck()` en otros componentes).

## Pre-work

- Confirmar con `/investigate` antes de tocar `app.config.ts` — no asumir que agregar el provider es un no-op solo porque "ya se comporta así".
- Revisar los hallazgos ya conocidos de mezcla `detectChanges()`/`markForCheck()` (`shared/components/sections/counter/counter-section.ts` y otros de la sección pública) como parte de este mismo brief, ya que están directamente relacionados.

## Out of scope

- El resto de hallazgos del audit (ver plan).
- No es una migración de zone.js a zoneless (ya está zoneless de facto) — es hacer explícita/consistente la configuración y limpiar el código que depende implícitamente del modelo viejo.

## Criterio de cierre

- [x] Investigación completa: comportamiento real confirmado.
- [x] `provideZonelessChangeDetection()` agregado a `app.config.ts` (o divergencia real documentada y resuelta si la había).
- [x] Código que dependía implícitamente de zone.js corregido (usar `markForCheck()`/signals en vez de `detectChanges()` manual donde corresponda).
- [x] Build + lint + tests OK.
- [x] Plan actualizado: F6 → ✅.
- [x] Maestro actualizado.

## Tiempo estimado

~1h30.

## Cierre 2026-09-14

**Investigación**: sin divergencia real test↔prod. `zone.js` no es dependencia (`package.json`), no está en `polyfills` de `angular.json` (el array ni existe), y no aparece en `node_modules` ni transitivamente tras `bun install` limpio. La app ya corría zoneless de facto — `test-setup.ts` solo hacía explícita una intención que `app.config.ts` dejaba implícita.

**Fix**:
- `app.config.ts`: agregado `provideZonelessChangeDetection()` (heredado por `app.config.server.ts` vía `mergeApplicationConfig`, sin cambios ahí).
- `counter-section.ts`/`.html`: `displayedCount` pasó de field plano + `cdr.detectChanges()` manual (imperativo, en RAF) a `signal()`, alineando con el patrón `markForCheck()` ya usado en `hero-section.ts` y `testimonials-section.ts`. Barrido de `detectChanges()`/`markForCheck()` en código no-spec confirmó que estos eran los únicos 3 archivos con el patrón, y solo `counter-section.ts` estaba desalineado.

**Validación**: lint 0 errores · build verde (warnings NG8113 preexistentes, no relacionados) · 2574/2574 tests verdes.

**Commit**: `ce8ae856` en `chat/680-audit-f6-zoneless-config-explicita`.
