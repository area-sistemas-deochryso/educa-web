# Cache Offline + WAL — Flujos Problemáticos y Fixes

## Estado: COMPLETADO (excepto P2 coalescencia — edge case diferido)

> **Contexto**: Con cache offline (SW con SWR + Network-first) y WAL funcional, hay flujos CRUD que pueden producir data inconsistente, pérdida de trabajo o UI desincronizada.

---

## Problemas Identificados

### P0 — Cache stale después de WAL commit

**Severidad**: Alta | **Esfuerzo**: Bajo | **Estado**: ✅ Completado

**Descripción**: Cuando WAL commitea una mutación exitosamente, el cache del SW no se invalida. Si el usuario recarga, el GET devuelve data vieja del cache.

**Flujo problemático**:
1. Usuario edita recurso offline → WAL persiste → optimistic UI
2. App se cierra, usuario vuelve
3. GET devuelve cache VIEJO (pre-edición)
4. Store se sobreescribe con data vieja
5. WAL procesa entry → commit exitoso en servidor
6. Store sigue con data vieja del cache

**Facades afectadas**: Usuarios, Horarios, Cursos, Vistas, PermisosRoles, PermisosUsuarios

**Fix**: Invalidar cache del patrón relacionado en `onCommit` del WAL, antes de ejecutar el callback original. Puede hacerse centralizado en `WalSyncEngine` o en `WalFacadeHelper`.

```typescript
// Después de commitAndClean:
await this.swService.invalidateCacheByPattern(`/api/${entry.resourceType}`);
```

---

### P0 — Refetch post-CREATE devuelve cache SWR stale

**Severidad**: Alta | **Esfuerzo**: Bajo | **Estado**: ✅ Completado (resuelto por P0 #1)

**Descripción**: El patrón CREATE hace refetch (`refreshXxxOnly()`) para obtener el ID del servidor, pero si el SW está en modo SWR (primera visita/recarga), devuelve la lista vieja del cache.

**Flujo problemático**:
1. CREATE → WAL → optimistic close dialog
2. `onCommit` → `refreshUsuariosOnly()` → GET /api/usuarios
3. SW en SWR → devuelve cache VIEJO sin el nuevo registro
4. Store se llena con lista vieja

**Fix**: Invalidar cache del endpoint antes del refetch en cada método `refreshXxxOnly()`.

```typescript
private async refreshUsuariosOnly(): Promise<void> {
  await this.swService.invalidateCacheByPattern('/api/sistema/usuarios');
  this.api.getUsuarios().subscribe(/*...*/);
}
```

**Nota**: Network-first (navegación activa) ya lo resuelve, pero SWR tras recarga no.

---

### P1 — Asistencia del profesor sin WAL (pérdida de trabajo)

**Severidad**: Alta (UX) | **Esfuerzo**: Medio | **Estado**: ✅ Completado

**Descripción**: Profesor marca asistencia de 30 estudiantes, click guardar, y si está offline pierde todo. No hay WAL ni persistencia del formulario.

**Flujo problemático**:
1. Profesor marca asistencia estudiante por estudiante
2. Click "Guardar" → POST batch al servidor
3. Sin conexión → request falla
4. Sin WAL → toda la asistencia se pierde

**Fix**: Integrar `WalFacadeHelper` en `AsistenciaCursoFacade.registrar()` con el batch como payload. Opcionalmente, persistir el estado del formulario en sessionStorage como draft.

**Archivos**:
- `src/app/features/intranet/pages/profesor/cursos/services/asistencia-curso.facade.ts`
- `src/app/features/intranet/pages/profesor/cursos/services/asistencia-curso.store.ts`

---

### P1 — Facades profesor sin WAL (calificaciones, grupos)

**Severidad**: Media-Alta | **Esfuerzo**: Alto | **Estado**: ✅ Completado (Calificaciones + Grupos)

**Descripción**: Las facades del profesor (Grupos, Calificaciones, SalonesAdmin) no usan WAL. Sus operaciones CRUD fallan silenciosamente offline.

**Facades sin WAL**:
| Facade | Operaciones |
|--------|-------------|
| SalonesAdminFacade | Crear config/periodo, cerrar periodo, aprobar estudiante |
| GruposFacade | Crear/editar/eliminar grupo, asignar/remover estudiantes |
| CalificacionesFacade | Crear/eliminar evaluación, calificar lote, actualizar nota |
| SalonMensajeriaFacade | Crear conversación, enviar mensaje |

**Fix**: Integrar `WalFacadeHelper.execute()` en cada operación CRUD, siguiendo el patrón de las facades admin.

---

### P1 — Token expirado durante WAL retry

**Severidad**: Media | **Esfuerzo**: Medio | **Estado**: ✅ Completado

**Descripción**: Si la app se cierra y el usuario vuelve después de que el token expiró, el WAL intenta procesar entries con el fallback HTTP (sin callbacks). El 401 se clasifica como 4xx permanente → FAILED → mutación perdida.

**Flujo problemático**:
1. Edición offline → WAL entry
2. App se cierra, pasan 24+ horas
3. App abre → WAL recovery → procesa entry
4. Token expirado → 401
5. 401 es 4xx → FAILED permanente
6. Mutación perdida

**Fix**: En el sync engine, tratar 401 como retryable (no permanente). Alternativamente, verificar/refrescar sesión antes de procesar entries pendientes tras recovery.

**Archivos**:
- `src/app/core/services/wal/wal-sync-engine.service.ts` (clasificación de errores)

---

### P2 — SWR CACHE_UPDATED sobreescribe optimistic update

**Severidad**: Media | **Esfuerzo**: Bajo | **Estado**: ✅ Completado (UsuariosFacade)

**Descripción**: En primera visita (SWR), el SW devuelve cache y luego revalida en background. Si entre la respuesta del cache y la revalidación el usuario hizo una mutación optimistic, el CACHE_UPDATED sobreescribe el optimistic.

**Flujo**:
1. SWR → cache devuelve lista (estado=activo para #5)
2. Store se llena con cache
3. Usuario toggle #5 → optimistic: estado=inactivo
4. SW revalida → data fresca (estado=activo aún en servidor)
5. CACHE_UPDATED → store.setUsuarios(dataFresca) → SOBREESCRIBE optimistic
6. UI vuelve a mostrar activo

**Fix**: En el handler de `cacheUpdated$`, verificar si hay WAL entries PENDING/IN_FLIGHT para ese resourceType. Si las hay, ignorar el CACHE_UPDATED.

**Archivos**:
- Facades que escuchan `swService.cacheUpdated$` (ej: UsuariosFacade)

---

### P2 — Múltiples WAL entries para el mismo recurso

**Severidad**: Media | **Esfuerzo**: Alto | **Estado**: ⬜ Pendiente

**Descripción**: Si el usuario hace ediciones rápidas al mismo recurso, se crean múltiples WAL entries que pueden fallar en cadena por rowVersion conflicts.

**Flujo**:
1. Editar Horario #10 (nombre) → WAL entry A
2. Toggle estado Horario #10 → WAL entry B
3. Editar Horario #10 (otro campo) → WAL entry C
4. A se procesa OK, pero cambia rowVersion
5. B falla con 409/400 porque rowVersion ya no coincide
6. C falla también

**Fix posible**:
- Opción A: Coalescencia — fusionar entries del mismo resourceId antes de procesar
- Opción B: Re-read — después de cada commit, actualizar el rowVersion de entries pendientes del mismo recurso
- Opción C: Simplificar — para UPDATE, enviar siempre los campos completos sin rowVersion (backend decide)

---

### P3 — Rollback + cache estado intermedio

**Severidad**: Media | **Esfuerzo**: Bajo | **Estado**: ✅ Completado (resuelto por P0 #1)

**Descripción**: Cuando WAL falla y hace rollback, si entre la mutación optimistic y el rollback se hizo un GET que se cacheó, el cache tiene data inconsistente.

**Fix**: Invalidar cache del recurso en el `onError`/rollback del WAL.

---

### P3 — Drag-drop de estudiantes offline

**Severidad**: Media | **Esfuerzo**: Medio | **Estado**: ✅ Completado

**Descripción**: GruposFacade.dropEstudiante() hace optimistic UI move + API call. Si falla (offline), hace refetchGrupos() como fallback, pero el GET devuelve cache viejo.

**Fix**: Integrado WAL en toda GruposFacade (7 operaciones), incluyendo dropEstudiante con snapshot rollback. Cache invalidation automática via WAL_CACHE_MAP con `GrupoContenido`.

---

### P3 — Mensajería offline (enviar mensaje se pierde)

**Severidad**: Baja-Media | **Esfuerzo**: Medio | **Estado**: ✅ Completado

**Descripción**: SalonMensajeriaFacade.enviarMensaje() hace optimistic add + POST. Si falla offline, el mensaje aparece en UI pero se pierde al recargar.

**Fix**: Integrado WAL en `enviarMensaje` (optimistic add con tempId → rollback remove) y `crearConversacion`. Store actualizado con `replaceTempMensaje()` y `removeMensaje()`. Cache invalidation via `Conversacion` en WAL_CACHE_MAP.

---

## Orden de Implementación Recomendado

| Paso | Problema | Justificación |
|------|----------|---------------|
| 1 | P0: Cache invalidation post-WAL commit | Fix centralizado, bajo esfuerzo, arregla la raíz |
| 2 | P0: Refetch post-CREATE con invalidación | Complemento directo del paso 1 |
| 3 | P1: Token 401 en WAL retry | Evita pérdida de datos en sesiones largas |
| 4 | P2: SWR vs optimistic | Fix puntual en facades con cacheUpdated$ |
| 5 | P1: WAL en asistencia profesor | Mayor impacto UX para profesores |
| 6 | P1: WAL en calificaciones | Segundo mayor impacto UX |
| 7 | P3: Cache invalidation en rollback | Complemento del paso 1 |
| 8 | P2: Coalescencia WAL entries | Complejidad alta, edge case |
| 9 | P1: WAL en grupos/salones | Menor frecuencia de uso |
| 10 | P3: WAL en mensajería | Menor prioridad |

---

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `src/app/core/services/wal/wal-sync-engine.service.ts` | Motor de procesamiento y retry |
| `src/app/core/services/wal/wal-facade-helper.service.ts` | Punto de integración para facades |
| `src/app/core/services/wal/wal.service.ts` | Lifecycle y persistencia |
| `public/sw.js` | Service Worker con cache strategy |
| `src/app/features/intranet/services/sw/sw.service.ts` | Frontend API para cache management |
| `src/app/features/intranet/pages/admin/*/services/*.facade.ts` | Facades admin con WAL |
| `src/app/features/intranet/pages/profesor/*/services/*.facade.ts` | Facades profesor sin WAL |
