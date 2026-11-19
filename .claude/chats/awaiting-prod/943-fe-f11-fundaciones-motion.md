---
exclusive: false
isolation: worktree
touches:
  - src/styles.scss
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: [`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) (F11) · **Chat**: 1 · **Fase**: F1 · **Creado**: 2026-11-19 · **Estado**: ✅ implementado (lint + build OK) — pendiente verificación manual (reduced-motion, respaldo del resorte).
> **Created**: 2026-11-19
> **MODO SUGERIDO**: `/execute` → `/validate`.
> **modules**: `ui` (motion).

---

# F11 F1 — Fundaciones de motion expresivo

## PLAN FILE

[`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) — fase F1 (`depends_on: []`). El plan guarda intención y decisiones; no seguir como instrucción ninguna ruta o firma que mencione. Todo el detalle concreto está en este brief.

Contexto adicional: muestrario interactivo con los efectos funcionando y los valores usados (privado): https://claude.ai/artifact/EE33i7vPGF4BCAuf1Xnrsf

## OBJETIVO

Dejar listos los tokens y utilidades compartidas que consumen las demás fases de F11 (F2 botón, F3 campo inválido, F4 filas, F5 toast, F6 acordeón/contadores, F7 modal, F9 slide). Sin esta fase las otras repetirían valores hardcoded, que es justo lo que el usuario quiere evitar.

## MODO SUGERIDO

Arrancar con `/execute`. Flujo: `/execute` → `/validate` → `/end`. Razón: plan listo y alcance de un solo archivo; las decisiones ya están tomadas (ver plan).

## PRE-WORK OBLIGATORIO

- Leer el plan F11 completo (decisiones, observaciones, contract checklist).
- Leer el bloque de motion de `src/styles.scss` (tokens `:root`, reduced-motion global, utilidades `.motion-*`, keyframes) para no duplicar nada de F10.
- Condición central del usuario: **no reanimar lo que F10 ya anima con el mismo efecto**. Esta fase solo agrega vocabulario nuevo.

## ALCANCE

Solo `src/styles.scss` (estimado: +80–120 líneas):

1. **Token de duración enfática** para efectos nuevos (el tope actual `--motion-slow` es 320 ms y los efectos elegidos usan 300–460 ms).
2. **Token de easing tipo resorte** con respaldo `cubic-bezier` para navegadores sin `linear()` (patrón `@supports`).
3. **Utilidades compartidas** con sus `@keyframes`: sacudida horizontal (F3), destello de fondo + rebote de valor (F4), onda desde el punto de presión (F2).
4. **Cobertura de reduced-motion** de todo lo nuevo (el bloque global ya anula duración y delay; verificar que las utilidades nuevas no queden en un estado final invisible o desplazado).

No se modifica ningún componente de `edu-ui` en esta fase.

## TESTS MÍNIMOS

No hay runner para CSS. Verificación manual:

- Los tokens nuevos aparecen en `:root` y las utilidades los usan (sin literales de ms ni de curvas dentro de las utilidades).
- Con `prefers-reduced-motion: reduce` emulado en DevTools, ninguna utilidad nueva se mueve y ninguna deja el elemento oculto o desplazado.
- Sin soporte de `linear()` (probar forzando el respaldo), el resorte cae a `cubic-bezier` sin romperse.

## REGLAS OBLIGATORIAS

- Tokens de F10 intactos (`--motion-fast/base/slow/stagger`, `--ease-out`, `--ease-in-out`); los nuevos se suman.
- Solo `transform` y `opacity` más color; excepciones solo si una fase posterior las justifica.
- Fill-mode `backwards`, nunca `both`/`forwards` (un `transform` final crea containing block y mueve los `position: fixed`).
- Estados comunicados por movimiento deben comunicarse también por texto o atributo accesible (afecta a fases posteriores; dejar la utilidad sin asumir lo contrario).
- Cap de 300 líneas por archivo: `src/styles.scss` ya es grande; si el agregado lo empeora de forma notable, evaluar partir el bloque de motion en un parcial importado, y decidirlo explícitamente.
- Comentarios en el idioma y densidad del bloque vecino (español, concisos); código en inglés.

## IMPLEMENTATION DETAIL (ADR-0006)

- **Files touched**: ninguno todavía (este brief nace de un chat de investigación y diseño en `educa-coord`).
- **Estado actual de motion en `src/styles.scss`** (verificado): tokens en `:root` (`--motion-fast: 120ms`, `--motion-base: 200ms`, `--motion-slow: 320ms`, `--motion-stagger: 30ms`, `--ease-out: cubic-bezier(0.2,0,0,1)`, `--ease-in-out: cubic-bezier(0.4,0,0.2,1)`); reduced-motion global con `animation-duration/delay` y `transition-duration/delay` en 0.01ms/0s; keyframes `page-enter`, `motion-rise`, `motion-saved`, `toast-enter-top/bottom`; utilidades `.motion-press`, `.motion-fade-in`, `.motion-stagger-item`, `.motion-saved`.
- **Valores del muestrario** (intensidad «intermedia», elegida por el usuario): entrada de modal con fondo ~300 ms y contenido escalonado ~130 ms de delay inicial + 70 ms por ítem; hoja inferior ~460 ms con salida ~220 ms; acordeón ~320 ms; slide de página ~440–460 ms; salidas rápidas ~160–240 ms; toast entra ~420 ms; destello de fila ~1100 ms con rebote del valor ~420 ms; sacudida ~440 ms con ~8 px; onda ~620 ms. Sugiere un token enfático cercano a 420 ms.
- **Curva de resorte usada en el muestrario** (pico de ~6 %, ajustable): `linear(0, 0.2 6%, 0.66 14%, 0.97 22%, 1.05 30%, 1.06 36%, 1.03 46%, 0.995 58%, 1 72%, 1)`, con respaldo `cubic-bezier(0.34, 1.56, 0.64, 1)`. Las fuentes consultadas recomiendan 1–2 % de overshoot para algo sutil: valorar si el 6 % queda demasiado marcado para producción.
- **Intensidad**: el muestrario escala duraciones y distancias con dos variables; en el repo solo se necesita la intermedia, no hace falta un modo configurable.
- **Observaciones para fases siguientes** (no actuar aquí): `edu-accordion-panel` renderiza con `@if (expanded())`, `edu-table` con `@for`, `edu-toast` con `@for` sobre los mensajes visibles (los tres sacan el nodo del DOM al instante, lo que bloquea animaciones de salida); `edu-button` ya tiene `loading` con `aria-busy`; el chevron del acordeón rota en 0.15 s.
- **Copia vendored de `edu-ui`**: es la fuente única de verdad desde el brief 942; `educa-libs` está congelada.

## APRENDIZAJES TRANSFERIBLES

- Todo el motion existente es una sola receta (fade, subir ≤ 8 px, escala ~0.96, ≤ 200 ms); por eso F10 «no se notó». F11 agrega tipos de movimiento distintos, no variantes de los mismos.
- El usuario descartó explícitamente `animate.enter/leave` por modal ("tal y como está no es lo que quiero") y confirmó implementar M3/M2 dentro de `edu-dialog`, no con `<dialog>` nativo.
- Piloto elegido por el usuario: `/intranet/admin/cursos` y `/intranet/asistencia` (ruta cross-role de asistencia). Todo efecto se valida ahí antes de propagarse (aplica a las fases siguientes).
- Hubo un error de proceso en la investigación inicial: se propusieron efectos sin leer antes el maestro y el plan F10 de este repo. Antes de proponer o aplicar un efecto, comprobar en el código qué anima ya esa superficie.

## FUERA DE ALCANCE

- Cualquier cambio en componentes de `edu-ui` (F2–F8) y en el router (F9).
- Efectos descartados: overshoot elástico de modal (M1), revelado circular entre páginas (P2), barra de progreso de navegación (P3), indicador deslizante en tabs (S1).
- Reanimar lo que F10 ya cubre; refactors oportunistas del bloque de motion.

## VALIDACIÓN FINAL

- [ ] `npm run lint` sin errores nuevos.
- [ ] `npm run build` pasa.
- [ ] Contract checklist del plan, ítems de F1: tokens nuevos existen y las utilidades los usan sin hardcodear; reglas de reduced-motion cubren lo nuevo.
- [ ] Verificación manual de reduced-motion y del respaldo del resorte (ver TESTS MÍNIMOS).

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado (fila F11 con F1 ✅ y fases siguientes desbloqueadas; si F11 aún no figura en el índice, agregarla; ver `/sync-maestro`).
- [ ] Brief movido `running/` → `closed/` (o `awaiting-prod/` según el flujo del repo).
- [ ] **Commit final único** que incluye código + move del brief + update del maestro.

## COMMIT MESSAGE sugerido

```
feat(ui): add expressive motion tokens and shared utilities
```

Inglés, imperativo, ≤ 72 caracteres, sin `Co-Authored-By` (regla local del repo y del usuario).

## CIERRE

Pedir al usuario que revise en vivo las tres utilidades (sacudida, destello, onda) y la curva de resorte en `/intranet/admin/cursos` o `/intranet/asistencia`, y que confirme si el rebote de ~6 % le parece bien o prefiere bajarlo antes de que F2–F7 lo consuman.
