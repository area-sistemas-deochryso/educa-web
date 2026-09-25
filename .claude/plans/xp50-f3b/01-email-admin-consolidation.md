# xP50 F3b — Email admin consolidation

> Diseño para F3b en [xrepo-50](../../../../educa-coord/plans/xrepo/040-059/xrepo-50-fe-cohesion-coupling-refactor.md). Contract-only.

## Problema

El audit 213 (2026-05-21), fuente del plan xrepo-50, describía el dominio de email admin como el más fragmentado del repo: 6 submódulos con 21 cross-imports internos y 7 modelos dispersos en `@data`. **Investigando el código actual, ese diagnóstico está desactualizado** — ya existe un módulo `email-outbox-shared` (con su propio `email-hub.service`, modelos y componentes compartidos) que consumen `email-outbox`, `email-outbox-dashboard-dia`, `email-outbox-diagnostico`, `auditoria-correos` y `monitoreo`. La consolidación que el audit pedía ya ocurrió en gran parte, solo que el plan/audit no se actualizó para reflejarlo.

Lo que queda, verificado contra el código de hoy:

- **Dependencia circular real**: `monitoreo/shared` (un componente `HubContextBannerComponent` + un helper `readHubContext`) es importado por los 4 tabs de `email-outbox` + `email-outbox.component.ts` + `rate-limit-events.component.ts` (6 puntos) — pero `monitoreo` a su vez importa servicios de `email-outbox-dashboard-dia`, `rate-limit-events` y `error-groups` para armar sus badges. Esto forma un ciclo: `monitoreo ↔ {email-outbox, email-outbox-dashboard-dia, rate-limit-events}`.
- **Barrel bypass puntual**: `monitoreo-hub-badges.facade.ts` importa `EmailMonitoreoApiService` desde el path interno `email-outbox-dashboard-dia/services/email-monitoreo.api.service` en vez del barrel del módulo (`email-outbox-dashboard-dia`), pese a que el símbolo ya está exportado ahí.
- **`monitoreo` como hub agregador**: que `monitoreo` importe servicios de `email-outbox-dashboard-dia`, `rate-limit-events` y `error-groups` para mostrar badges de estado de cada área **no es una violación a resolver** — es el propósito arquitectónico declarado de un hub de monitoreo (agregar señales de múltiples dominios). Confundir esto con el cross-import a resolver sería un refactor oportunista fuera de alcance.
- **Fragmentación de modelos en `@data`** (7 archivos: outbox, quarantine, blacklist, domain-pause, defer-event, mensajeria, notificaciones-admin): sigue así. Investigado su contenido, cada archivo mapea a una entidad de dominio genuinamente distinta (no son splits arbitrarios del mismo concepto) — no hay evidencia de que consolidarlos reduzca acoplamiento real; sería reorganización de archivos sin beneficio arquitectónico medible.

## Opciones

- **A — Mover `monitoreo/shared` a una ubicación neutral fuera de `monitoreo/`**, consumida tanto por `monitoreo` como por sus hoy-consumidores (`email-outbox`, `rate-limit-events`), rompiendo el ciclo. Pros: resuelve la única dependencia circular real verificada; cambio acotado (1 componente + 1 util + sus imports). Contras: ninguno relevante — es el único punto real de fricción.
- **B — Dejar `monitoreo/shared` donde está y aceptar el ciclo.** Pros: cero esfuerzo. Contras: contradice el done-when original de F3b ("cero cross-imports directos entre submódulos"); el ciclo es exactamente el patrón que motivó la fase.
- **C — Reabrir la fragmentación de modelos en `@data`** (fix #10 del audit, "6→3 submódulos"). Pros: cierra el ítem tal como estaba redactado originalmente en el audit. Contras: la investigación de código no encontró evidencia de que sea un problema real hoy — cada modelo mapea a una entidad distinta; forzar la consolidación sería refactor sin motivo, prohibido por las reglas del proyecto ("no refactors oportunistas fuera del alcance").

## Recomendación

**Opción A**, acotada al ciclo real. Se descarta C explícitamente: el audit que la originó tiene 4 meses y el código cambió desde entonces: no hay base para tocar `@data/models` en este plan.

## Decisiones

| Decisión | Elección | Por qué |
|---|---|---|
| Destino de `HubContextBannerComponent` + `readHubContext` | Módulo neutral hermano (no `@intranet-shared`, no dentro de `monitoreo/`) | Sus consumidores (`email-outbox`, `rate-limit-events`, `monitoreo`) son todos admin-scoped — subirlo a `@intranet-shared` (compartido por todos los roles) sería sobre-elevar el scope. Un módulo hermano sigue el mismo patrón ya validado por `email-outbox-shared`. |
| Alcance de la fragmentación de `@data/models` | Fuera de alcance de F3b | Investigado en el código actual: cada uno de los 7 archivos mapea a una entidad de dominio distinta, no a un split arbitrario. No hay señal concreta de acoplamiento real a resolver — consolidar sería reorganizar sin beneficio medible. |
| Barrel bypass en `monitoreo-hub-badges.facade.ts` | Corregir como parte de la misma fase | Es un cambio de una línea (import path) descubierto al investigar el ciclo; dejarlo fuera obligaría a un chat de seguimiento para algo trivial ya identificado. |
| `monitoreo` importando servicios de `email-outbox-dashboard-dia`/`rate-limit-events`/`error-groups` | Se mantiene, no se toca | Es el propósito arquitectónico de un hub agregador — tratarlo como violación sería scope creep sobre un patrón intencional, no un defecto. |

## Fases funcionales

### F3b-1 — Extraer `monitoreo/shared` a un módulo hermano neutral
`depends_on: []`

**Qué logra**: `HubContextBannerComponent` y `readHubContext` dejan de vivir dentro de `monitoreo/` y pasan a un módulo hermano consumido tanto por `monitoreo` como por `email-outbox` y `rate-limit-events`. El ciclo `monitoreo ↔ {email-outbox, rate-limit-events}` desaparece — la dependencia queda unidireccional: todos consumen el módulo neutral, ninguno depende de `monitoreo` para UI compartida.

**Ordering rationale**: única fase con cambio funcional; no depende de nada.

**Non-obvious trap**: `HubContextBannerComponent` probablemente importa tipos o helpers internos de `monitoreo` (contexto de qué hub está activo) — verificar que esos tipos también migren o queden accesibles sin reintroducir el import inverso.

### F3b-2 — Barrel-fix en `monitoreo-hub-badges.facade.ts`
`depends_on: []`

**Qué logra**: el import de `EmailMonitoreoApiService` pasa a resolver contra el barrel público de `email-outbox-dashboard-dia` en vez del path interno del archivo de servicio.

**Ordering rationale**: independiente de F3b-1, cambio de una línea sin relación funcional.

## Done-when criteria

- Ningún archivo bajo `email-outbox/`, `email-outbox-dashboard-dia/`, ni `rate-limit-events/` importa desde `monitoreo/` (verificable por grep de imports).
- `monitoreo/` sigue pudiendo importar de sus dominios agregados (`email-outbox-dashboard-dia`, `rate-limit-events`, `error-groups`) — eso no es violación, es su función.
- Ningún import de `email-outbox-dashboard-dia` desde fuera del módulo usa un path interno cuando el símbolo ya está en su barrel.
- `ng lint` y `ng build` pasan sin errores nuevos.
- Comportamiento visual/funcional de los banners de contexto (`HubContextBannerComponent`) idéntico al actual — es solo reubicación, no rediseño.

## Dependencias

- Ninguna — F1/F2/F3a ya cerrados, y esta fase no depende de ellos funcionalmente (son capas distintas: F1-F3a tocaban `@core`, esta toca `@features/intranet/pages/admin`).
- No depende de F4 (descartado) ni de xP41 (BE only).

## Fuera de alcance

- Fragmentación de modelos en `@data` (7 archivos email-adjacent) — investigado, sin evidencia de problema real; ver Decisiones.
- Cualquier cambio a la lógica de `monitoreo` como agregador de badges — es su función, no un defecto.
- Rediseño visual del banner de contexto.
- El resto del catálogo de violaciones del audit 213 no relacionadas a email admin (ya cubierto por F1-F3a, o descartado en F4).

## Reglas/invariantes aplicables

- Convención barrel-only (F2, ya enforced por ESLint) — F3b-2 corrige un caso que la regla debería atrapar; confirmar si el lint actual ya lo marca como error (si no, es un gap de F2 a reportar aparte, no a resolver acá).
- `code-language.md` — naming en inglés para el nuevo módulo hermano.
- ADR-0006 (plan-as-contract) — este plan no fija el nombre exacto del módulo hermano; el chat de ejecución lo decide contra las convenciones de naming vigentes (mismo patrón que `email-outbox-shared`).

### Worktree strategy

- **Isolation**: worktree.
- **Exclusive**: false — toca solo `src/app/features/intranet/pages/admin/{monitoreo,email-outbox,rate-limit-events}/**`, sin overlap con capas `@core`/`@data` ya cerradas en Cat B.
- **Touches**: `src/app/features/intranet/pages/admin/monitoreo/**`, `src/app/features/intranet/pages/admin/email-outbox/**` (solo imports), `src/app/features/intranet/pages/admin/rate-limit-events/**` (solo imports).
- **Parallel risk**: none conocido.

---

## TL;DR
- **Problema**: el audit que originó F3b está desactualizado — la fragmentación de email admin ya se resolvió en su mayoría (`email-outbox-shared`); lo único que queda es un ciclo real entre `monitoreo` y sus consumidores vía `monitoreo/shared`.
- **Recomiendo**: opción A — extraer `monitoreo/shared` a un módulo hermano neutral · porque es el único punto de fricción real verificado contra el código actual, y el resto del alcance original (fragmentación de `@data/models`) no tiene evidencia de ser un problema.
- **Pendiente**: nada — diseño autocontenido.

| Opción | Esfuerzo | Riesgo | Toca | Veredicto |
| --- | --- | --- | --- | --- |
| A — extraer a módulo hermano | <1d | bajo | `admin/monitoreo`, `admin/email-outbox`, `admin/rate-limit-events` | ✅ recomendada |
| B — no tocar | 0 | — | — | descartada (no cierra el done-when de F3b) |
| C — reabrir fragmentación de `@data` | 1-2d | medio | `@data/models` | descartada (sin evidencia de problema real en el código actual) |

**Alcance** (si se ejecuta la recomendada):
- toca: `admin/monitoreo` (extracción + fix de barrel bypass), `admin/email-outbox` (5 imports actualizados), `admin/rate-limit-events` (1 import actualizado).
- fuera: `@data/models` (fragmentación), lógica de agregación de `monitoreo`, rediseño visual.

**Reglas que aplican**: barrel-only (F2), `code-language.md`, ADR-0006.

**Siguiente paso**: `/execute`.

## Contract checklist

- [ ] `HubContextBannerComponent` y `readHubContext` ya no viven bajo `admin/monitoreo/`.
- [ ] Ningún archivo en `admin/email-outbox/` ni `admin/rate-limit-events/` importa desde `admin/monitoreo/`.
- [ ] `admin/monitoreo/` sigue importando de `email-outbox-dashboard-dia`, `rate-limit-events` y `error-groups` para sus badges (sin cambios ahí).
- [ ] `monitoreo-hub-badges.facade.ts` importa `EmailMonitoreoApiService` desde el barrel de `email-outbox-dashboard-dia`, no desde el path interno.
- [ ] `ng lint` pasa sin errores nuevos.
- [ ] `ng build` de producción pasa sin errores nuevos.
- [ ] Los banners de contexto se ven y comportan igual que antes (spot-check visual o tests existentes en verde).
