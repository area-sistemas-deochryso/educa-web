---
exclusive: false
isolation: worktree
touches: [src/app/features/intranet/pages/admin/users/, src/app/features/intranet/pages/admin/cursos/cursos.component.html, src/app/features/intranet/shared/components/layout/intranet-layout/intranet-layout.component.ts, src/app/core/services/session/session-activity.service.ts]
hot-paths: []
---

> **Repo destino**: `educa-web`. Abrir en worktree `chat/456-usuarios-admin-buscador-tilde-logout`.
> **Creado**: 2026-07-16 · **Estado**: ⏳ pendiente.
> **Fuente**: auditoría UX cross-repo "Horarios y Contenido de Cursos" (educa-coord, 2026-07-16) + investigación de este mismo chat.

# Administración de Usuarios: buscador no reactivo + tildes + logout voluntario

## MODO SUGERIDO

`/execute` — causa raíz confirmada para los 3 puntos.

## ALCANCE

### 1. Buscador de usuarios no reactivo al escribir

**Causa raíz confirmada — NO es foco/debounce, es condición de carrera entre dos writers del mismo store**: `usuarios-data.facade.ts` — `loadData()` (constructor, línea ~132 de `usuarios.component.ts`) dispara un `forkJoin` de 4 llamadas (estadísticas/salones/sedes/usuarios **sin filtrar**, líneas 72-130) que resuelve solo cuando la más lenta termina, y su `subscribe` hace `this.store.setItems(usuarios.data)` (línea 122) **incondicionalmente**, sobreescribiendo lo que haya en el store. En paralelo, `setupSearchPipeline()` (constructor, línea 45) usa `searchTrigger$` → `debounceTime(300)` → `distinctUntilChanged()` → `switchMap` con una llamada filtrada más rápida, que también hace `store.setItems()` (línea 327). Sin secuenciación entre ambos: si el usuario escribe antes de que el `forkJoin` inicial resuelva, la respuesta lenta y sin filtrar llega después y pisa el resultado filtrado. `usuarios.component.html:48` renderiza el buscador sin gatear detrás de `tableReady`/`statsReady`, así que la ventana de carrera es real y visible desde el primer render.

**Fix**: hacer que los dos writers sean mutuamente excluyentes/ordenados. Approach recomendado: agregar un id de request monotónico/generación en el store y descartar respuestas obsoletas en `store.setItems()` (guard de stale-response) — más correcto que deshabilitar el input durante la carga inicial, y el store ya trackea page/loading state para apoyarse en eso.

### 2. Título de página sin tilde

- `usuarios-header.component.html:2` — `title="Administracion de Usuarios"` → `"Administración de Usuarios"`.
- `cursos.component.html:4` — `title="Administracion de Cursos"` → `"Administración de Cursos"`.

Confirmado que no hay más ocurrencias de `"Administracion` en el repo — fix de 2 líneas, sin efectos colaterales.

### 3. "Sesión expirada" tras logout manual

**Causa raíz confirmada**: `intranet-layout.component.ts:246-248` (`logout()`, wireado al botón "Cerrar sesión") llama `this.sessionActivity.forceLogout()` — **la misma función usada para expiración real de sesión** (`session-activity.service.ts:156-182`), que siempre dispara `errorHandler.showWarning('Sesión expirada', 'Tu sesión expiró. Iniciá sesión de nuevo.', 5000)` antes de limpiar estado y redirigir a `/intranet/login`. No hay ningún parámetro/flag que distinga logout voluntario de expiración real — es literalmente el mismo call.

**Decisión ya tomada**: logout voluntario debe mostrar un **mensaje neutral de confirmación** ("Sesión cerrada correctamente"), no el mensaje de "Sesión expirada".

**Fix**: dar a `forceLogout()` un parámetro (ej. `forceLogout(reason: 'expired' | 'manual' = 'expired')`) o crear un path liviano separado para logout voluntario que muestre el toast neutral en vez del warning de expiración, manteniendo **idéntica** toda la limpieza existente (`coordinator.broadcast`, `stop()`, `userPermissionsService.clear()`, `notifications.cleanup()`, `signalr.disconnect()`, `swService.clearCache()`, `storage.clearAuth()`, `authService.logout()`) — solo cambia el mensaje mostrado. `intranet-layout.component.ts:logout()` debe llamar al nuevo path voluntario en vez de `forceLogout()` directo.

**Verificar de paso** (no requiere cambio si no aplica): `login-intranet.component.ts` — el flujo de `quickLogin`/cambio de sesión no llama `forceLogout()`, así que no debería estar afectado; confirmar que sigue así tras el cambio.

## OUT OF SCOPE

- **Orden Nombre/Apellido inconsistente entre pantallas** — para "Notas del Salón" el backend manda el nombre ya concatenado en orden distinto al resto; no es arreglable limpio solo en este repo. Brief BE aparte (`Educa.API` brief `448`, ya creado).
- Cualquier cambio a `estadisticas`/`salones`/`sedes` del mismo `forkJoin` de `loadData()` — no están afectados por la carrera, no tocar esa parte.

## Criterio de cierre

- [x] Buscador de usuarios filtra correctamente al escribir inmediatamente después de cargar la página (repro: recargar, escribir de inmediato, sin esperar a que cargue todo).
- [x] Ambos títulos con tilde correcta.
- [x] Logout manual muestra "Sesión cerrada correctamente" (no "Sesión expirada"); expiración real de sesión sigue mostrando el mensaje de expiración sin cambios.
- [x] Lint + build + tests OK.
- [x] Commit en la rama del worktree — sin merge.

## Resumen de cierre (2026-07-16)

**Archivos tocados:**
- `src/app/features/intranet/pages/admin/users/services/usuarios-data.facade.ts` — guard de stale-response.
- `src/app/features/intranet/pages/admin/users/components/usuarios-header/usuarios-header.component.html` — tilde en título.
- `src/app/features/intranet/pages/admin/cursos/cursos.component.html` — tilde en título.
- `src/app/core/services/session/session-activity.service.ts` — `forceLogout(reason: 'expired' | 'manual' = 'expired')`.
- `src/app/features/intranet/shared/components/layout/intranet-layout/intranet-layout.component.ts` — `logout()` llama `forceLogout('manual')`.
- `src/app/features/intranet/shared/components/layout/intranet-layout/intranet-layout.component.spec.ts` — test actualizado para verificar `forceLogout('manual')`.

**Punto 1 — approach exacto (guard de stale-response):**

Se agregó un contador incremental `latestItemsRequestId` en `UsersDataFacade` (no en el store compartido, para no tocar `BaseCrudStore` usado por otras features). Cada uno de los tres writers que puede escribir la lista de usuarios (`loadData()`, `refreshUsuariosOnly()`, y el `switchMap` interno de `setupSearchPipeline()`) reserva un id vía `beginItemsRequest()` **antes** de disparar la llamada HTTP. Al resolver, cada `subscribe` valida `isCurrentItemsRequest(id)` antes de llamar `store.setItems()`/`store.setPaginationData()` — si otro request más reciente ya se disparó mientras este estaba en vuelo, la respuesta se descarta silenciosamente para la escritura de items (el resto del flujo — stats, salones, sedes, loading flags — sigue igual, sin tocar esa parte per "out of scope"). Esto resuelve la carrera entre el `forkJoin` inicial (lento, sin filtrar) y el pipeline de búsqueda (rápido, filtrado) sin deshabilitar el input ni depender de cancelación de RxJS entre pipelines independientes.

**Punto 3 — logout voluntario:** `forceLogout()` ahora acepta `reason: 'expired' | 'manual'`; con `'manual'` muestra `showSuccess('Sesión cerrada correctamente', 'Hasta pronto.', 3000)` en vez del warning de expiración. Toda la limpieza (`coordinator.broadcast`, `stop()`, clears, `authService.logout()`, navigate) es idéntica en ambos casos. Todas las demás llamadas internas a `forceLogout()` (401 sin refresh, sesión expirada, cross-tab logout/login) no pasan argumento y siguen usando el default `'expired'`.

**Lint/build/test:**
- `bun run lint` — OK, sin hallazgos.
- `bun run build` — OK (SSR + browser bundles, prerender de 9 rutas estáticas).
- `bun run test` — 2347 passed / 2 failed en la corrida completa. Ambos fallos son preexistentes y no relacionados a este cambio (confirmado corriendo los mismos 2 specs con `git stash` sobre el HEAD original de la rama, antes de mis cambios): `src/eslint-config-guards.spec.ts` (timeout de 5s en un test de config eslint, nada que ver con usuarios/logout) y `attendance.component.spec.ts` (`Hook timed out in 10000ms` — flaky bajo carga paralela; pasó en corrida aislada). No se tocó ningún archivo relacionado a esos specs.

**Commit:** en la rama del worktree `chat/456-usuarios-admin-buscador-tilde-logout`, sin merge ni push.
