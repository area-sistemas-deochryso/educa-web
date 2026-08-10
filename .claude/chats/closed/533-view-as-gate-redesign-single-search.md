# 533 — Rediseño de "Ver como" (view-as-gate): buscador único en vez de cascada salón→curso→persona

> **Repo destino**: `educa-web`
> **Creado**: 2026-08-10 · **Modo sugerido**: `/design` primero (rediseño de UX/layout, no es fix trivial)
> **exclusive**: `false`
> **touches**:
>   - `src/app/features/intranet/pages/admin/view-as-gate/view-as-gate.component.ts` (y su template/estilos)
>   - `src/app/core/guards/view-as/view-as-gate.guard.ts` (si el cambio de flujo afecta el guard)
>   - `src/app/core/interceptors/view-as/view-as.interceptor.ts` (verificar si depende del flujo actual)

## Contexto

Auditoría visual en vivo (localhost, admin logueado) de `/intranet/ver-como/estudiante` y `/intranet/ver-como/profesor`. Hallazgos confirmados con screenshots durante la sesión:

1. **Página completa en vez de modal/drawer** — navega a una URL propia (`/intranet/ver-como/:rol`) para lo que es, en esencia, elegir una identidad de prueba. No amerita navegación de página completa.
2. **Desperdicio horizontal severo** — el contenido vive en una columna angosta (~450px) pegada a la izquierda; más del 60% del viewport queda vacío salvo un botón flotante "Acciones".
3. **Flujo en cascada obligatorio con 3 widgets independientes**: salón (grid de tarjetas con scroll interno) → curso (otro grid con scroll interno) → persona (input de texto con dropdown, al final). Cada paso es obligatorio antes del siguiente, cada uno con su propio scrollbar diminuto.
4. El paso final ya es lo que debería ser el punto de entrada: un input "Buscar estudiante/profesor por nombre o DNI" con autocomplete — funciona standalone, no depende de los pasos previos para acotar resultados de forma útil.

Mismo patrón confirmado en ambas páginas (`estudiante` y `profesor`) — mismo componente/mecanismo reutilizado por rol.

## Decisión de dirección ya validada por el usuario (2026-08-10)

- **Lo esencial es elegir la persona (estudiante o profesor según el origen)** — eso es el buscador principal.
- **Salón y curso pasan a ser filtros opcionales** sobre ese buscador, no pasos previos obligatorios.
- Esto reduce el flujo de 3 pasos secuenciales a 1 acción principal + filtros colapsables.

## Preguntas abiertas para `/design`

- ¿Modal/drawer o mantener página propia pero con layout compacto? (la navegación a URL propia puede tener razón funcional — verificar si algo depende de esa ruta antes de asumir que se puede convertir a modal).
- ¿Los filtros de salón/curso se acotan a resultados ya visibles en el buscador principal, o quedan como filtros previos opcionales que el usuario puede ignorar?
- ¿Mismo componente sirve para estudiante y profesor sin duplicar lógica, o requiere generalizar el buscador por tipo de persona?

## Fuera de alcance

- Cualquier cambio al mecanismo de autenticación/impersonación en sí (`view-as.interceptor.ts`, guard) salvo que el rediseño de UI lo requiera.

## Criterio de cierre

- [x] Decisión de diseño tomada en `/design`: página (no modal), filtros salón/curso opcionales.
- [x] Buscador principal de persona (nombre/DNI) es el punto de entrada, funcional sin pasos previos.
- [x] Salón/curso disponibles como filtros opcionales, no pasos obligatorios.
- [x] Verificado en vivo por el usuario (screenshot real, `ver-como/estudiante`) — encontró 2 problemas que el fix de la primera ronda no cubría (ver "Ronda 2" abajo). Corregidos y commiteados; no se re-verificó visualmente la ronda 2 antes del merge (usuario pidió avanzar directo).
- [x] Build + lint OK.

## Tiempo estimado

A definir en `/design`.

## Diseño (2026-08-10)

**Hallazgo clave**: los puntos 3 y 4 del `## Contexto` (cascada obligatoria salón→curso→persona) **ya estaban resueltos antes de este audit**, en los commits `a5e6d798` (2026-07-31, "preload picker results + salon/curso filters") y `2cf7f331` (2026-08-04, "add shared picker-grid"). `view-as-picker.component.ts` ya corre `runSearch()` en `ngOnInit()` sin depender de filtros, y salón/curso (`app-picker-grid`) ya son opcionales — el audit en vivo probablemente corrió contra un build/cache viejo del dev server. No se tocó código de búsqueda/filtros por esto.

**Punto 1 (modal vs. página)**: se mantiene página. `viewAsGateGuard` (`view-as-gate.guard.ts:41`) redirige con `router.createUrlTree(['/intranet/ver-como', ...])` — es una navegación real (URL Tree), no una apertura de diálogo. Convertir a modal/drawer requeriría reestructurar el guard, que el brief marca fuera de alcance.

**Punto 2 (desperdicio horizontal, único hallazgo real que sobrevivió)**: confirmado en `view-as-gate.component.scss` — `.view-as-gate__picker-section` tenía `max-width: 480px` sin centrar. Con ese ancho, los dos `app-picker-grid` (`flex: 1 1 16rem` c/u en `view-as-picker.component.scss`) no entran en una fila y se apilan, generando el efecto "cascada con scroll" que describe el audit.

**Fix aplicado** (`view-as-gate.component.scss`, único archivo tocado):
- `max-width: 480px` → `640px` (entran los 2 `picker-grid` en una fila sin wrap).
- `align-self: center` en `.view-as-gate__picker-section` (no `align-items: center` en el padre — eso rompería `app-page-header`, que depende de `align-items: stretch` para que `margin-left: auto` separe título y botón "Cancelar").

Lint + build verdes en el worktree. No se verificó visualmente contra `/intranet/ver-como/*` en este chat — no había credenciales de un usuario Administrador de test disponibles.

## Ronda 2 (2026-08-10) — feedback del usuario con screenshot real

El usuario verificó con su propia sesión (datos reales) y encontró que el fix de ancho no alcanzaba:

1. **Orden invertido**: el buscador principal de nombre/DNI renderizaba **al final**, debajo de los dos filtros de salón/curso — dando la impresión de que el buscador de persona era "el último filtro" en vez del principal.
2. **Íconos confusos**: los 3 inputs (salón, curso, buscar persona) usaban el mismo ícono de lupa — sin jerarquía visual entre "el filtro principal" y "los filtros secundarios sobre él".
3. **Espacio seguía desperdiciado** incluso a 640px, en un viewport mucho más ancho.

**Fix aplicado** (`view-as-picker.component.html/scss`, `view-as-gate.component.scss`):
- Buscador de persona pasa a ser el primer bloque del template, con label propio ("Buscar estudiante/profesor por nombre o DNI...") e ícono `pi-search` dedicado (antes `p-autoComplete` no tenía ícono propio).
- Salón/curso bajan a una sección aparte debajo de un separador con label "ACOTAR POR SALÓN O CURSO (OPCIONAL)" + ícono `pi-filter` (distinto al de búsqueda), dejando explícita la jerarquía: son filtros *sobre* el buscador principal, no pasos equivalentes.
- `view-as-gate__picker-section`: `max-width` 640px → 960px, para que los dos `picker-grid` entren holgados en una fila y muestren más cards sin scroll interno.

Lint + build verdes. Commit `b3aba8b4` en `chat/533-view-as-gate-redesign-single-search`. Sin nueva verificación visual antes del merge — decisión explícita del usuario de avanzar directo a integrar.
