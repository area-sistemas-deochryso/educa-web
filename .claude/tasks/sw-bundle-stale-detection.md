<!-- created: 2026-05-11 -->
# Detección + refresh de bundle stale post-deploy

## Problema

Cuando se hace deploy FE, los usuarios con pestaña abierta siguen ejecutando el bundle JS anterior hasta que recargan manualmente. Esto produce un "fallback fantasma": el UI corre código viejo pero pega a endpoints BE con shape nuevo. Síntoma típico — chips/badges/labels que muestran valores fallback (`'Outbox'` en vez de `'OutboxTotal'`, etc.) y el único diagnóstico es ojo humano + hard reload.

Caso vivo: Plan 43 Chat 1.1 (2026-05-11) — usuario reportó chips genéricos en el hub Correos. Diagnóstico tomó 3 turnos descartando SW de API endpoints (falsa pista) hasta caer en bundle JS stale. Resuelto con `Ctrl+Shift+R`.

## Por qué duele

- Cada deploy reproduce el bug para sesiones activas.
- Cowork QA y el usuario ven discrepancias entre el JSON crudo del endpoint (correcto) y la UI renderizada (con fallback).
- Sin notificación, el bundle stale puede persistir días si el usuario no recarga.

## Propuestas (2 sub-tareas independientes)

### A. Banner "nueva versión disponible" global

`SwService` ya expone `updateAvailable$` (regla `service-worker.md`). Falta consumirlo en el shell de la app para mostrar un banner persistente con CTA "Recargar para actualizar".

- Tocar: probablemente `intranet-layout.component.ts` o `app.component.ts`.
- Acción: suscribir `swService.updateAvailable$` con `takeUntilDestroyed` y mostrar banner no-dismissible (estilo B11 dev-banner) con botón que ejecute `swService.update()` + `location.reload()`.
- Estimado: ~1d (1 componente shared + integración).
- Beneficio: cero falsos positivos del tipo Plan 43 Chat 1.1 para cualquier deploy futuro.

### B. Facades suscritos a `cacheUpdated$` del SW

`MonitoreoHubBadgesFacade` (y similares) cargan datos una vez con TTL en memoria. Cuando el SW revalida en background y trae el shape nuevo del response, el facade no se entera — sigue mostrando el snapshot viejo hasta que se invalida el TTL o el usuario navega.

- Tocar: `MonitoreoHubBadgesFacade` + cualquier facade root con cache de extras que muestre chips/labels dependientes de campos opcionales del response.
- Acción: suscribir a `swService.cacheUpdated$` filtrado por URL del endpoint, y volver a llamar `runLoad(force=true)` cuando llegue revalidación.
- Estimado: ~0.5d (patrón ya existe en otros componentes — copiar setup).
- Beneficio: corrige el caso donde el bundle JS es nuevo pero el snapshot en memoria del facade es viejo.

## Relación con A

A es la solución de fondo (refresca el bundle entero, no hace falta B). B es defensa en profundidad para casos donde A no ha disparado todavía (TTL de SW + ventana entre deploy y notificación).

Si solo se hace una, elegir A — cubre más casos.

## Criterios de cierre

- Banner aparece tras un deploy real (smoke en Netlify preview o producción).
- Hard reload manual deja de ser necesario para que el usuario vea cambios FE.
- Documentar el patrón en `service-worker.md` para que futuros features sigan el mismo enfoque.

## No hacer

- ❌ Refresh automático sin CTA — perdería estado de formularios sin avisar.
- ❌ Polling agresivo del SW — innecesario, `updateAvailable$` ya emite cuando hay update.
- ❌ Mostrar el banner en dev local — el SW del proyecto se registra en dev también (ver `service-worker.md`), agregaría ruido al iterar código.
