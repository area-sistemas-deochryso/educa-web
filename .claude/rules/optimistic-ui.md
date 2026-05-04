# Optimistic UI (WAL) — Regla obligatoria

> **"El usuario no espera al servidor. Y si algo falla, el estado vuelve exacto, sin refetch."**

Toda mutación CRUD en el frontend **debe** pasar por `WalFacadeHelper.execute()`
con nivel `optimistic` (default). Subir el nivel de consistencia solo cuando el
negocio lo exige — cada nivel más alto cuesta latencia percibida y rompe la
regla de rollback determinista.

Para los principios transferibles del subsistema completo ver
`@.claude/documentacion-subsistemas/wal-write-ahead-log.md`.

---

## Patrón único correcto

```typescript
this.wal.execute({
  operation: 'UPDATE',
  resourceType: 'horarios',
  resourceId: item.id,
  endpoint: `${API}/horarios/${item.id}`,
  method: 'PUT',
  payload,
  http$: () => this.api.update(item.id, payload),
  optimistic: {
    // apply aplica el cambio visible YA (antes del round trip)
    apply: () => {
      this.store.updateItem(item.id, patch);
      this.store.closeDialog();
    },
    // rollback restaura el snapshot exacto si el server rechaza
    rollback: () => {
      this.store.updateItem(item.id, snapshot);
    },
  },
  // onCommit SOLO reconcilia campos derivados del server (id, rowVersion,
  // descripciones resueltas por join, timestamps). NUNCA es el lugar donde
  // ocurre el cambio visible — eso ya pasó en apply.
  onCommit: (result) => {
    this.store.updateItem(item.id, { rowVersion: result.rowVersion });
  },
  // onError NO hace nada: el engine llama rollback() automáticamente.
  // Solo loggear + mensaje al usuario.
  onError: (err) => this.errorHandler.showError('Error', 'No se pudo guardar'),
});
```

**Regla operativa**: el cambio visible vive en `apply`. `onCommit` solo reconcilia
campos que solo el server conoce. Si te ves moviendo `store.updateItem()` a
`onCommit`, estás haciendo **pesimismo disfrazado** — la UI va a esperar el
round trip igualmente.

---

## Cuándo CREATE con WAL

El servidor asigna el ID. Hay dos patrones válidos:

| Patrón | Cuándo |
|--------|--------|
| `apply` solo cierra dialog + stats incrementales; `onCommit` llama `store.addItem(result)` | Default. Simple y seguro. |
| `apply` agrega un item con `tempId` negativo; `onCommit` reemplaza el temp por el real | Solo cuando el usuario debe ver el item inmediatamente (chat, feeds). |

El tipo `WalCreateConfig<T>` acepta `optimistic` opcional por esta razón.

## UPDATE / DELETE / TOGGLE

`WalMutateConfig<T>` fuerza `optimistic` **obligatorio** en el tipo TypeScript.
No puedes llamar `wal.execute` con UPDATE/DELETE/TOGGLE sin declarar `apply` y
`rollback`. Esto es enforcement de compilación, no de runtime.

---

## Niveles de consistencia

| Nivel | Cuándo usar | Ejemplos |
|-------|-------------|----------|
| `optimistic` (default) | CRUD normal: editar, togglear, eliminar un registro | Usuarios, cursos, horarios, eventos, notificaciones, calificaciones |
| `optimistic-confirm` | Optimistic pero la UI espera confirmación para navegar/cerrar flujo | Guardar + navegar a detalle |
| `server-confirmed` | Operación crítica del dominio. Sin optimistic. Sin offline. | Pagos, cierre irreversible de periodo (INV-T01), cierre/revertir mensual (INV-AD03/INV-AD04), aprobación masiva (INV-T02) |
| `serialized` | `server-confirmed` + ejecutar una a la vez | Contadores, secuencias, operaciones que no pueden solaparse |

### Subir el nivel requiere justificación escrita

Si una operación usa `consistencyLevel: 'server-confirmed'` o superior, **debe**
tener un comentario cercano referenciando el invariante (`INV-*`) del dominio
que lo exige. Ver `salones-admin.facade.ts` y `attendances-crud.facade.ts:crearCierre`
para el patrón.

**Sin justificación**, el default es `optimistic`.

---

## Prohibido: `.subscribe()` directo en facades

Todo facade (`*.facade.ts`) que llame a un servicio API con verbo de mutación
(`crear`, `actualizar`, `eliminar`, `toggle`, `guardar`, `aprobar`, `cerrar`...)
seguido de `.subscribe()` directo — con o sin `.pipe()` en medio — es un bug.

### Enforcement automático

ESLint rule `wal/no-direct-mutation-subscribe` (configurada en
`eslint.config.js`) detecta el patrón y falla el build.

```
error: Mutación 'crear' directa con .subscribe() — usar wal.execute({
  operation, optimistic: { apply, rollback }, onCommit, onError }).
  Si debe ser server-confirmed, pasar consistencyLevel: 'server-confirmed'
  con justificación escrita.
```

### Excepciones legítimas

Se permiten **solo** con `// eslint-disable-next-line` + justificación con el
invariante de negocio que lo motiva. O `/* eslint-disable */` a nivel de archivo
cuando **todas** las operaciones del facade son críticas. Ver `salones-admin.facade.ts`
para el patrón.

Los archivos `*-data.facade.ts` (read-only) y `*-ui.facade.ts` (state UI) están
ignorados por la regla porque no hacen mutaciones a la API.

---

## BaseCrudFacade

Para CRUDs admin estándar, extender `BaseCrudFacade` en `@core/services/facades/`.
Provee `walCreate`, `walUpdate`, `walToggle`, `walDelete` con el patrón optimista
correcto pre-implementado. Eliminar boilerplate ≈ 200 líneas por facade.

Features que NO son CRUD estándar (chat, batch imports, wizards) usan
`wal.execute` directamente con el patrón explícito.

---

## Refetch cross-tab tras commit del leader

Cuando hay múltiples tabs abiertas, solo el tab leader procesa la cola WAL.
Cuando el leader commitea una entry encolada por otro tab (follower), el
follower invalida la SW cache vía `WalSyncEngine.handleCrossTabCommit` —
pero **eso no actualiza el estado del store del componente**. Sin un
refetch explícito, la fila en el follower aparece consistente solo cuando
el usuario refresca o navega.

### Política — refetch automático en `BaseCrudFacade` (default ON)

`BaseCrudFacade` se suscribe al observable `WalLeaderService.entryCommittedByOtherTab$`
y dispara `silentRefreshAfterCrud()` cuando el `resourceType` del evento
matchea el del facade. El facade concreto activa el wiring llamando a
`initCrossTabRefetch()` en su constructor:

```typescript
constructor() {
  super();
  this.initErrorHandler();
  this.initCrossTabRefetch();   // suscribe al observable cross-tab
}
```

### Opt-out por facade

Cuando el refetch automático no se justifica (paginación server-side
pesada donde el evento cross-tab típicamente no afecta el viewport actual,
o listas muy grandes donde el costo del GET supera el beneficio),
declarar `crossTabRefetch: false` en el `BaseCrudFacadeConfig`:

```typescript
protected readonly config: BaseCrudFacadeConfig = {
  tag: 'XxxFacade',
  resourceType: 'Xxx',
  apiUrl: `${environment.apiUrl}/api/sistema/xxx`,
  loadErrorMessage: '...',
  crossTabRefetch: false,   // opt-out explícito + comentario con motivo
};
```

### Por qué default ON

- El refetch usa `silentRefreshAfterCrud()` → `refreshItemsOnly(silent=true)`,
  sin loading flicker. Costo bajo en CRUDs admin chicos.
- La UX cross-tab inmediata es lo esperado por el usuario; descubrir
  inconsistencias por refresh manual es señal de bug, no de feature.
- Casos donde no aplica son la excepción y son fáciles de declarar.

### Alternativa para facades que no extienden `BaseCrudFacade`

Inyectar `WalCrossTabRefetchService` (`@core/services`) y suscribirse en
el constructor con el `resourceType` del facade y el método de refetch
del feature:

```typescript
import { WalCrossTabRefetchService } from '@core/services';

@Injectable({ providedIn: 'root' })
export class XxxFacade {
  private crossTabRefetch = inject(WalCrossTabRefetchService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.crossTabRefetch.subscribe({
      resourceType: 'Xxx',                          // mismo string que pasa a wal.execute
      refetch: () => this.silentRefreshAfterCrud(), // o el método de refetch del feature
      destroyRef: this.destroyRef,
    });
  }
}
```

El helper filtra por `resourceType` y cancela la subscripción al
destruirse el `DestroyRef`. Aplica a single-facades, multi-facades
(suscribir en el `*-data.facade.ts` que es dueño del listado) y
features ad-hoc con su propio refetch.

### Cuándo NO suscribir

- **Mensajería / chat**: SignalR ya provee tiempo real cross-tab; el
  WAL solo cubre la queue offline.
- **Modales/dialogs ephemeral**: el componente vive corto, no tiene
  listado persistente que necesite refetch.
- **Archivos lazy** (e.g. `estudiante-cursos.facade` cargando archivos
  por semana): el patrón de carga ya es bajo demanda; refetch automático
  no aporta.
- **Multi-facade con CRUD sin lista propia**: si el `*-crud.facade.ts`
  no tiene listado y delega en `*-data.facade.ts`, suscribir solo en
  el data facade.

---

## Checklist para una nueva mutación

```
DISEÑO
[ ] ¿Es CRUD estándar? → BaseCrudFacade con walCreate/walUpdate/walToggle/walDelete
[ ] ¿NO es CRUD estándar? → wal.execute directo con optimistic

OPTIMISTIC
[ ] apply aplica el cambio visible INMEDIATO (antes del HTTP)
[ ] rollback restaura el snapshot EXACTO (no refetch)
[ ] snapshot capturado ANTES de llamar wal.execute
[ ] onCommit SOLO reconcilia campos derivados del server (rowVersion, IDs reales, descripciones de joins)
[ ] onError NO muta estado (el engine llama rollback solo); solo logs + mensaje

TIPOS
[ ] TypeScript no se queja (union discriminado fuerza optimistic en UPDATE/DELETE/TOGGLE)
[ ] resourceType concuerda con un valor de WAL_CACHE_MAP si aplica

SERVER-CONFIRMED (si aplica)
[ ] Comentario explícito con el INV-* del dominio que lo justifica
[ ] Documentado por qué un rollback local sería inseguro

ESLINT
[ ] `npx eslint src/app/features/**/*.facade.ts` limpio
[ ] Ningún eslint-disable sin justificación ni sin referencia a invariante o TODO de migración
```

---

## Anti-patrones prohibidos

| Anti-patrón | Por qué es malo | Solución |
|-------------|-----------------|----------|
| `api.update().subscribe(() => store.update())` | Pesimista, UI espera ~300ms | `wal.execute` con apply |
| `optimistic.apply: () => {}` + lógica en `onCommit` | Pesimista disfrazado, la UI espera igualmente | Mover cambio visible a apply |
| `rollback: () => this.loadItems()` | Refetch no determinista; datos pueden diferir | Snapshot local + restaurar |
| `onError: () => store.rollback()` manual | Duplicado: el engine ya llama rollback del config | Dejar onError solo con logs/UI |
| Omitir `optimistic` en UPDATE/DELETE/TOGGLE | Rompe compilación (union discriminado) | Declarar apply + rollback |
| `consistencyLevel: 'server-confirmed'` sin justificación | Latencia alta sin motivo | Default optimistic o documentar el INV-* |

---

## Referencias cruzadas

- Principios del WAL: `@.claude/documentacion-subsistemas/wal-write-ahead-log.md`
- Arquitectura de facades y stores: `@.claude/rules/architecture.md`
- Patrones CRUD (BaseCrudFacade, multi-facade): `@.claude/rules/crud-patterns.md`
- Reglas de negocio (invariantes INV-*): `@.claude/rules/business-rules.md`
- Estado y signals: `@.claude/rules/state-management.md`
- ESLint config: `@.claude/rules/eslint.md`
