> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: `educa-coord/plans/xrepo-79-primeng-replacement-library.md` (P79, F9) · **Creado**: 2026-08-27 · **Estado**: ✅ shippeado.
> **Validación prod**: ⏳ pendiente desde 2026-08-27 — depende de que brief 588 (swap completo F6 a `edu-ui`) llegue a `awaiting-prod`/deploy real, ya que prod hoy no corre `edu-ui` en absoluto (verificado: 0 elementos `edu-*`, paginador sigue siendo `p-paginator` de PrimeNG).
> **Depende de**: brief 599 en `educa-libs` (shippeado, commit `dd2a5df` en `educa-libs`) — trae el fix de fondo transparente en `edu-input-text`/`edu-textarea`/`edu-table` y el fix de estilo del paginador (centrado, padding, tinte de página activa, tipografía). Este brief empieza con **re-sincronizar la copia vendorizada** en `src/app/shared/edu-ui/` desde `educa-libs` main antes de tocar nada más — mismo patrón que brief 589 (post-F8) siguió tras brief 597.

---

# 601 — Re-sync copia vendorizada de edu-ui tras P79 F9 (599)

## Contexto

Brief 599 (`educa-libs`) shippeó 3 fixes de librería y marcó su Done-when en verde, incluyendo "suite de regresión visual verde". Pero esa suite corre contra la librería (`educa-libs`), no contra `educa-web`. Brief 600 (`educa-web`, hermano de 599) fue scopeado como "alcance disjunto, sin dependencia" — a diferencia de la ronda anterior (589 dependía explícitamente de 597 y arrancaba re-sincronizando la copia vendorizada). Esa asunción de independencia fue un error de scoping: los 3 fixes de 599 viven en archivos que `educa-web` consume como copia vendorizada estática (`src/app/shared/edu-ui/`), no como paquete npm linkeado — así que el fix en la fuente nunca llegó al build real hasta que alguien repita el paso de re-sync manual.

## Verificación que confirmó el gap (coord, 2026-08-27)

Verificación en vivo `localhost:4201` (rama `main`, post-599+600) vs. `educa.com.pe/intranet` real, cuenta Administrador, en `/admin/usuarios`:

- **Input/tabla transparente (599 #1, #2)**: `getComputedStyle` en el buscador y en `<table>` locales devuelve `background-color: rgb(255,255,255)` — el mismo valor opaco reportado en el hallazgo original. `src/app/shared/edu-ui/styles/tokens.css:136` local sigue en `--eduui-form-field-background: var(--eduui-surface-0)` mientras que `educa-libs/packages/edu-ui/src/lib/../styles/tokens.css:136` (fuente, ya corregida) dice `--eduui-form-field-background: transparent`. Mismo patrón en `edu-table.scss:26` (local: `background: var(--eduui-content-background)`; fuente: `background: transparent`).
- **Paginador (599 #3)**: `getComputedStyle` en `.edu-paginator__page--active` local devuelve `background-color: rgb(16,185,129)` (verde sólido), `color: rgb(255,255,255)`, `font-weight: 400` — exactamente los valores previos al fix. La fuente en `educa-libs/packages/edu-ui/src/lib/paginator/edu-paginator.scss:1-50` ya tiene `justify-content: center`, `padding: 1rem 0`, y `&__page--active { background: rgba(0,0,0,0.08); color: rgb(51,65,85); font-weight: 600; }` — correctos, simplemente no llegaron a la copia vendorizada.
- **Contraste — brief 600 (consumo, código directo en `educa-web`) sí llegó a producción local**: verificado en vivo que los 3 fixes de 600 (íconos de acciones con color semántico, `edu-popover` renderizando el menú de perfil completo, dropdown "Salón" mostrando nombres reales) funcionan correctamente, porque esos cambios se hicieron directo en archivos de `educa-web`, no en la copia vendorizada de una librería externa.

## Qué hacer

1. Re-sincronizar `src/app/shared/edu-ui/` desde `educa-libs` `main` (commit `dd2a5df` o posterior), igual que hizo brief 589 tras 597. Cubre como mínimo:
   - `src/app/shared/edu-ui/styles/tokens.css` (línea ~136, `--eduui-form-field-background`).
   - `src/app/shared/edu-ui/lib/table/edu-table.scss` (línea ~26, `background`).
   - `src/app/shared/edu-ui/lib/paginator/edu-paginator.scss` (reglas de `.edu-paginator`, `&__report`, `&__page--active`).
   - Cualquier otro archivo que el diff entre la copia local y `educa-libs` main muestre desviado — no asumir que solo estos 3 cambiaron, diffear la carpeta completa `packages/edu-ui/src/lib/` vs. `src/app/shared/edu-ui/lib/` por si hay más drift acumulado de rondas previas.
2. `npm run build` verde.
3. Verificación en vivo obligatoria contra `educa.com.pe/intranet` real (cuenta Administrador), no solo local: confirmar que `/admin/usuarios` (inputs, tabla, paginador) queda visualmente idéntico a prod.

## Qué NO hacer

- No volver a tocar `educa-libs` — el código fuente ya está correcto ahí.
- No re-litigar los hallazgos de brief 600 (consumo) — esos ya están verificados en vivo y funcionando.
- No asumir en rondas futuras que un brief de librería (`educa-libs`) y uno de consumo (`educa-web`) son independientes solo porque tocan archivos distintos — si el de consumo no incluye el paso de re-sync, el fix de librería no llega a ningún ambiente real hasta que alguien lo haga explícito. Documentar esta dependencia en el plan para P80+ si aplica un patrón similar.

## Done-when

- [x] Copia vendorizada de `edu-ui` en `src/app/shared/edu-ui/` re-sincronizada desde `educa-libs` main (post-599, commit `dd2a5df`).
- [x] `edu-input-text`/`edu-table` background transparente (`rgba(0,0,0,0)`), verificado en vivo con `getComputedStyle` en `localhost:4201/intranet/admin/usuarios` (cuenta Administrador, sesión guardada "CODE CLAUDE").
- [x] Paginador (centrado `justify-content: center`, `padding: 16px 0`, tinte `rgba(0,0,0,0.08)` en página activa, `color: rgb(51,65,85)`, `font-weight: 600`) verificado en vivo — coincide exacto con fuente.
- [x] `npm run build` verde (solo warnings preexistentes NG8113 de imports no usados en componentes no tocados).
- [x] Diff completo `packages/edu-ui/src/lib/` (educa-libs) vs. `src/app/shared/edu-ui/lib/` (educa-web) revisado con `diff -rq` — solo 3 archivos con drift (`tokens.css`, `edu-table.scss`, `edu-paginator.scss`), todos ya re-sincronizados, `diff` post-copia vacío.

### Nota — hallazgo durante verificación contra prod real

Se intentó verificar contra `educa.com.pe/intranet/admin/usuarios` (sesión guardada "CODE CLAUDE — Administrador", switcher de `/intranet/login`, sin alteración de datos). Resultado: **prod real no tiene ningún elemento con clase `edu-*`** (`document.querySelectorAll('[class*="edu-"]').length === 0`) y el paginador sigue siendo el `p-paginator` de PrimeNG (`p-paginator-page-selected`, no `edu-paginator__page--active`). Es decir, **prod todavía corre la versión pre-migración P79 F6** — el swap completo a `edu-ui` (brief 588) sigue en `awaiting-prod`, consistente con el estado del maestro. Por lo tanto no existe hoy un ambiente prod real contra el cual comparar visualmente estos 3 fixes de `edu-ui` — la única verificación posible es local.

La verificación en vivo se hizo entonces contra `localhost:4201/intranet/admin/usuarios` (sesión Administrador real, datos reales), que sí corre la migración completa: `edu-input-text`/`edu-table` con `background: rgba(0,0,0,0)` y `.edu-paginator__page--active` con `background: rgba(0,0,0,0.08)`, `color: rgb(51,65,85)`, `font-weight: 600`, `.edu-paginator` con `justify-content: center` y `padding: 16px 0` — todos coincidentes exacto con la fuente corregida en `educa-libs` (`dd2a5df`).

## Plan cross-repo

[`educa-coord/plans/xrepo-79-primeng-replacement-library.md`](../../../../EducaWeb/WD/educa-coord/plans/xrepo-79-primeng-replacement-library.md) — P79 F9.

## Origen

Verificación en vivo de coord tras el cierre reportado de briefs 599/600, sesión 2026-08-27. Gap de scoping detectado: 599 y 600 se marcaron como disjuntos pero 599 requería el mismo paso de re-sync vendorizado que 589 sí incluyó tras F8.
