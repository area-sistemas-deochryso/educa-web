> **Creado**: 2026-05-04 · **Estado**: ⏳ pendiente arrancar — handoff desde chat 090.

> **Validación prod**: ✅ verificada 2026-05-06 — smoke Cowork ronda 2 CASO 091/098 (tab A creó curso, tab B follower vio Total Cursos 28→29 sin F5 en ~2s).
# 091 · FE: WAL — wirear cross-tab refetch en los facades restantes

## Contexto

**Origen**: chat 090 (`090-fe-wal-cross-tab-auto-refetch.md`). En ese chat se creó el helper genérico `WalCrossTabRefetchService` y se cableó automáticamente en `BaseCrudFacade` (cubre `cursos`, `vistas`). Quedaron pendientes los facades que no extienden `BaseCrudFacade`.

**Repo**: `educa-web` (branch `main`).

**Pre-work**:
- `src/app/core/services/wal/wal-cross-tab-refetch.service.ts` (helper ya creado y exportado en `@core/services`)
- `.claude/rules/optimistic-ui.md` § "Refetch cross-tab tras commit del leader" (patrón documentado, incluye snippet copy-paste para facades que no extienden `BaseCrudFacade`)

## Patrón a aplicar

```typescript
import { WalCrossTabRefetchService } from '@core/services';

private crossTabRefetch = inject(WalCrossTabRefetchService);

constructor() {
  this.crossTabRefetch.subscribe({
    resourceType: '<mismo string que pasa a wal.execute>',
    refetch: () => this.silentRefreshAfterCrud(), // o método equivalente del feature
    destroyRef: this.destroyRef,
  });
}
```

## Inventario priorizado

### A — Wirear (CRUD admin con listado claro) — 12 facades

| Archivo | resourceType | Método de refetch a invocar |
|---|---|---|
| `pages/admin/users/services/usuarios-crud.facade.ts` | `usuarios` | método del data facade hermano (revisar `usuarios-data.facade.ts` si existe; si no, en este facade) |
| `pages/admin/permissions-users/services/permisos-usuarios-crud.facade.ts` | `PermisoUsuario` | método del data facade hermano o `silentRefreshAfterCrud` propio |
| `pages/admin/permissions-roles/services/permisos-roles.facade.ts` | `permisos-rol` | `silentRefreshAfterCrud()` (ya privado, OK) |
| `pages/admin/feedback-reports/services/feedback-reports.facade.ts` | `reporte-usuario` | método de refetch del feature (revisar) |
| `pages/admin/error-groups/services/error-groups-crud.facade.ts` | `error-groups` | método de refetch del feature |
| `pages/admin/email-outbox/services/blacklist-crud.facade.ts` | `email-blacklist` | refetch del feature |
| `pages/admin/email-outbox/services/email-quarantine-crud.facade.ts` | `email-quarantine` | refetch del feature |
| `pages/admin/email-outbox/services/email-domain-pause-crud.facade.ts` | `email-domain-pause` | refetch del feature |
| `pages/admin/health-permissions/services/admin-health-permissions.facade.ts` | `permisos-salud-salida` y `permisos-salud-justificacion` (2 suscripciones) | refetch del feature |
| `pages/admin/attendances/services/attendances-cierres.facade.ts` | `cierre-asistencia` | refetch del feature |
| `pages/admin/events-calendar/services/eventos-calendario.facade.ts` | revisar (no lo capturé en grep — confirmar) | refetch del feature |
| `pages/admin/notificaciones-admin/services/notificaciones-admin.facade.ts` | revisar | refetch del feature |

### B — Wirear (multi-facade — suscribir en *-data) — 1 facade complejo

| Archivo | resourceType | Notas |
|---|---|---|
| `pages/admin/schedules/services/horarios-data.facade.ts` (multi-facade: data + crud + ui + assignment) | `horarios` | El data facade es dueño del listado. Cualquier mutación cross-tab desde `horarios-crud.facade.ts` o `horarios-assignment.service.ts` debe disparar refetch en `horarios-data`. |

### C — Wirear (profesor) — 4 facades

| Archivo | resourceType | Método |
|---|---|---|
| `pages/profesor/cursos/services/calificaciones.facade.ts` | `Calificacion` | refetch del feature |
| `pages/profesor/classrooms/services/grupos.facade.ts` | `GrupoContenido` | refetch del feature |
| `pages/profesor/classrooms/services/health-permissions.facade.ts` | `permisos-salud-salida` y `permisos-salud-justificacion` (2 suscripciones) | refetch del feature |
| `pages/profesor/cursos/services/curso-contenido-data.facade.ts` | `CursoContenido` | refetch del data facade. NOTA: `curso-contenido-crud.facade.ts` mutea pero no tiene lista propia — NO suscribir ahí, dejar que el data facade hermano lo capte. |

### D — Wirear (admin attendances) — 1 facade

| Archivo | resourceType | Notas |
|---|---|---|
| `pages/admin/attendances/services/attendances-crud.facade.ts` | revisar (no capturé en grep — confirmar resourceType) | si tiene listado propio, suscribir; si delega en data facade hermano, suscribir ahí |

### E — Skip (no aplica refetch tradicional) — 5 facades

| Archivo | Razón |
|---|---|
| `pages/cross-role/mensajeria/services/mensajeria.facade.ts` | SignalR ya provee tiempo real cross-tab; el WAL solo cubre la queue offline. |
| `pages/estudiante/services/estudiante-cursos.facade.ts` | Archivos lazy por semana — el patrón de carga ya es bajo demanda. Si se quiere refetch automático para los archivos cuando otro tab los sube/borra, evaluar caso a caso (escribir TODO con el resourceType específico). |
| `core/services/feedback/feedback-report.facade.ts` | Dialog ephemeral (botón flotante) — no es lista. |
| `features/intranet/components/schedule/course-details-modal/attachments-modal/attachments-modal.facade.ts` | Modal ephemeral. Si se quiere consistencia mientras el modal está abierto, evaluar suscripción local con destroyRef del modal. |
| `pages/profesor/cursos/services/curso-contenido-crud.facade.ts` | Multi-facade — el data facade hermano (`curso-contenido-data`) ya cubre el refetch. |

## Plan

### Fase 1 — `/investigate` rápido (≤ 30 min)
- Confirmar `resourceType` exacto de los 3 archivos marcados "revisar" (eventos-calendario, notificaciones-admin, attendances-crud)
- Para cada facade, identificar el método público o privado de refetch a invocar (típicamente `silentRefreshAfterCrud`, `refreshItemsOnly`, `loadAll`, o equivalente del feature)
- Verificar para los multi-facades que el data facade es accesible desde el lugar donde se inyecta el helper

### Fase 2 — `/execute`
- Aplicar el patrón en los 16 facades marcados A + B + C + D
- Para los facades con 2 resourceTypes (admin-health-permissions, profesor health-permissions), hacer 2 llamadas a `subscribe()`
- Cada cambio incluye:
  1. Import del helper
  2. Inject del helper
  3. Constructor (agregar si no existe) con `subscribe()`
- Si algún facade no tiene `destroyRef` inyectado, agregarlo

### Fase 3 — `/validate`
- `npm run lint` — sin errores
- `npm test` — todos los tests pasan
- Smoke manual de **al menos 3** features distintas:
  - Admin: `/intranet/admin/cursos` (ya validado en chat 090) o `/intranet/admin/usuarios`
  - Multi-facade: `/intranet/admin/schedules` (horarios)
  - Profesor: `/intranet/profesor/cursos` (calificaciones o curso-contenido)

## Criterios de cierre

- [ ] Los 16 facades de A + B + C + D wireados con el helper
- [ ] Los 5 facades de E con TODO comentado (o decisión documentada de no aplicar)
- [ ] Tests existentes siguen pasando
- [ ] Smoke manual en 3 features confirma refetch cross-tab funcional
- [ ] Si se descubre un facade más durante la ejecución, agregarlo al inventario

## Archivos esperados

- 16 archivos `.facade.ts` modificados
- Posibles ajustes a tests si los facades tienen specs y mockean `WalLeaderService`/etc — actualizar a `WalCrossTabRefetchService` siguiendo el patrón de `cursos.facade.spec.ts`

## MODO SUGERIDO

`/investigate` → `/execute` → `/validate`

## Notas operativas

- El patrón es mecánico — `/execute` con effort `low` debería bastar.
- Si algún facade rechaza el patrón (ej: no tiene un método claro de refetch), parar y decidir caso por caso.
- Si el chat se hace largo, dividir por bloque (A → B → C → D), cerrar parcialmente, abrir 092 con los restantes.
