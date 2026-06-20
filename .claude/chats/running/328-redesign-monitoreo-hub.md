# 328 — Redesign monitoreo hub

> **Repos afectados**: `educa-web`
> **Creado**: 2026-06-19 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/design` → `/execute`
> **exclusive**: `false`
> **modules**: `monitoreo`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/monitoreo/**`

## Problema

La página `/intranet/admin/monitoreo` es un hub que muestra métricas (badges, conteos, niveles) pero funciona como mero redirector: al hacer click en un tile, la página destino no recibe contexto del hub. El usuario ve "5 pendientes" en el hub, navega, y llega a una lista genérica sin filtro.

Tres problemas identificados:

### P1 — Hub → detalle sin contexto
- Los tiles usan `routerLink` puro, sin query params ni state.
- Las páginas destino recargan todo desde cero, sin saber por qué el usuario llegó.
- **Impacto**: el hub pierde su valor como sistema de alerta — es solo un menú con números.

### P2 — Shells duplicados
- `CorreosShellComponent` y `IncidenciasShellComponent` tienen lógica casi idéntica (tabs derivadas de URL, navegación por tab change).
- Violación DRY que crece con cada nuevo dominio.

### P3 — Feature flags duplicados
- Cada tile declara `featureFlag` en `monitoreo-hub.catalog.ts` Y en `monitoreo.routes.ts`.
- Si falta en uno de los dos sitios: tile visible con ruta 404, o ruta accesible sin tile.

## Pre-work (al arrancar)

- [ ] Investigar si las páginas destino (bandeja, errores, reportes, rate-limit) ya aceptan query params para filtrado.
- [ ] Decidir estrategia de paso de contexto: query params vs. router state vs. shared signal.
- [ ] Revisar si hay un shell genérico reutilizable en el repo o hay que crear uno.

## Scope

### educa-web
- **P1**: Pasar contexto del hub a las páginas destino (filtro, nivel de alerta, o highlight).
- **P2**: Unificar shells en un componente genérico de tabs por ruta.
- **P3**: Centralizar feature flags (single source of truth entre catálogo y rutas).

## Out of scope

- Cambios en Educa.API (los endpoints ya devuelven los datos necesarios).
- Agregar nuevos dominios o tiles al hub.
- Cambios de diseño visual (colores, layout de cards) — salvo que surjan del rediseño funcional.

## Criterio de cierre

- [ ] Click en tile con badge → página destino muestra/filtra los items que el badge contaba.
- [ ] Un solo shell component maneja correos + incidencias (+ extensible a seguridad).
- [ ] Feature flag declarado en un solo lugar, consumido por catálogo y rutas.
- [ ] FE: lint + build OK, navegación hub→detalle verificada.

## Tiempo estimado

~90–120 min (design ~30 min, execute ~60–90 min).
