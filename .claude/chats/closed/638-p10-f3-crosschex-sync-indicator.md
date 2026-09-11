# 638 — P10 F3: indicador de sincronización CrossChex (DEP-4, FE)

> **Repos afectados**: `educa-web` (este worktree), `Educa.API` (endpoint consumido, brief 644 aparte), `educa-coord` (plan al cierre)
> **Creado**: 2026-09-11 · **Estado**: running.
> **MODO SUGERIDO**: `/execute`
> **Plan xrepo**: [`educa-coord/plans/xrepo/000-019/xrepo-10-flujos-alternos.md`](../../../../../WD/educa-coord/plans/xrepo/000-019/xrepo-10-flujos-alternos.md) — F3 (DEP-4 CrossChex)

## CONTEXTO

Contraparte frontend del brief 644 (`Educa.API`). El backend expone `GET /api/sistema/integration-status` (autenticado, envuelto en `ApiResponse<T>`) con el estado de la sincronización automática de CrossChex (último intento, último éxito, fallos consecutivos, minutos sin éxito, `OK`/`DEGRADADO`). Falta un indicador visible para el admin en la pantalla de asistencia diaria — hoy no hay forma de saber si el job automático (Hangfire, cada 5-10 min entre 6:00-18:59) está funcionando sin ir a revisar logs.

## ALCANCE

1. `CrossChexIntegrationStatusService` — cliente HTTP del endpoint, con header `X-Skip-Error-Toast` (no queremos un toast de error si el polling falla, el badge maneja el fallo en silencio).
2. `CrossChexIntegrationStatusBadgeComponent` — badge pasivo standalone, polling cada 60s (`interval` + `switchMap` + `takeUntilDestroyed`), muestra "Última sincronización biométrica: hace X" con severidad `warn` si `estado === 'DEGRADADO'`, tooltip con detalle de fallos consecutivos. Distingue "nunca sincronizado" (`minutosSinExito === null`) de degradado real. Un fallo de red en el polling deja el estado en `null` sin romper el componente.
3. Integrado en `attendances.component.html`, junto al subtítulo de la pantalla de asistencia admin.

**Confirmado sin cambios necesarios**: el `apiResponseInterceptor` global ya desenvuelve `ApiResponse<T>` — el servicio tipa la respuesta directo como `CrossChexIntegrationStatusDto` sin wrapper.

## VERIFICACIÓN

- `tsc --noEmit` limpio.
- `vitest run` completo (no solo la carpeta `attendances`): 255 archivos, 2560 tests, todos verdes.
- `ng lint` (Node 22 vía fnm) limpio.

## RESULTADO

- `CrossChexIntegrationStatusService` — GET a `/api/sistema/integration-status` con `X-Skip-Error-Toast` para que un fallo de polling no dispare un toast de error.
- `CrossChexIntegrationStatusBadgeComponent` — badge standalone, polling cada 60s, severidad `warn` si `estado === 'DEGRADADO'`, distingue "nunca sincronizado" de degradado real, tooltip con detalle de fallos consecutivos, resiliente a fallos de red del polling (queda en `null`, no rompe).
- Integrado en `attendances.component.html`/`.ts`, junto al subtítulo de la vista de asistencia admin.
- Contrato confirmado sin cambios: `apiResponseInterceptor` global desenvuelve `ApiResponse<T>` automáticamente.
- Verificación final: `vitest run` completo (255 archivos, 2560 tests) verde, `ng lint` (Node 22) limpio.
