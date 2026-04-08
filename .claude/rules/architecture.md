# Arquitectura

## Principios fundamentales

> **"Un componente no hace cosas, cumple un rol."**
> **"Un servicio no es estado. Es una fuente de estado."**

- Clasificar servicios y componentes por **rol**, no por tamano
- Usar todo lo puro que se pueda y contenizar aquello que se desconoce

## Estructura del Proyecto

```
src/app/
├── config/          # Environments (production, development)
├── core/            # Servicios singleton, guards, interceptors, helpers
│   ├── guards/      # authGuard, permisosGuard
│   ├── helpers/     # logger, DebugService, rxjs utils (with-retry), array/string/stats utils
│   ├── initializers/# Hooks de inicialización de app
│   ├── interceptors/# auth, error, rate-limit, api-response, credentials, clock-sync, trace
│   ├── services/    # ~24 carpetas organizadas por DOMINIO (ver detalle abajo)
│   ├── store/       # NgRx Signals stores (AuthStore, BaseCrudStore)
│   └── utils/       # Utilidades generales
├── data/            # Capa de datos
│   ├── adapters/    # Transformación: base, date, grade-scale
│   ├── models/      # Modelos del dominio compartidos (user, salon, horario, calificacion, etc.)
│   └── repositories/# BaseRepository, CRUDs (user, notification, asistencia)
├── shared/          # Código reutilizable cross-feature (public + intranet)
│   ├── components/  # layout (header, footer, main-layout), skeleton-loader, toast, devtools
│   ├── constants/   # Constantes compartidas (app-roles, etc.)
│   ├── directives/  # highlight
│   ├── interfaces/  # Tipos compartidos
│   ├── models/      # SelectOption, StatsBase, FormMeta, PaginationState, etc.
│   ├── pipes/       # truncate
│   ├── services/    # UiMappingService, asistencia (por rol)
│   ├── utils/       # Utilidades compartidas
│   └── validators/  # Validadores custom de formularios
└── features/        # Modulos lazy-loaded
    ├── public/      # home, about, contact, faq, levels, privacy, terms
    └── intranet/
        ├── shared/          # Código compartido entre pages de intranet (@intranet-shared)
        │   ├── components/  # login, form-error, page-header, skeletons, intranet-layout, etc.
        │   ├── config/      # intranet-menu.config
        │   ├── directives/  # drag-drop, table-loading, uppercase-input
        │   ├── pipes/       # estado/*, format-time, initials, seccion-label, etc.
        │   └── services/    # calificacion-config
        └── pages/
            ├── cross-role/  # Pages accesibles por múltiples roles (home, attendance, calendar)
            ├── admin/       # Pages exclusivas de Director/Admin
            ├── profesor/    # Pages exclusivas de Profesor
            └── estudiante/  # Pages exclusivas de Estudiante
```

### core/services/ — Carpetas por dominio (~24)

| Dominio | Contenido |
|---------|-----------|
| `asistencia/` | API, store, facade de asistencia |
| `auth/` | AuthService, AuthApiService, auth.models |
| `blob/` | BlobStorageService |
| `cache/` | CacheInvalidationService, CacheVersionManager |
| `destroy/` | Utilidades de lifecycle |
| `error/` | ErrorHandlerService, GlobalErrorHandler, error.models |
| `excel/` | ExcelService (exportación) |
| `facades/` | BaseCrudFacade (base class) |
| `feature-flags/` | FeatureFlagsStore, FeatureFlagsFacade |
| `http/` | BaseHttpService (wrapper HTTP) |
| `keyboard/` | KeyboardShortcutsService + config |
| `modal/` | ModalManagerService |
| `notifications/` | NotificationsService, SmartNotificationService, NotificationsApiService |
| `permisos/` | PermisosService, UserPermisosService |
| `preloading/` | AdaptivePreloadingStrategy |
| `rate-limit/` | RateLimitService |
| `session/` | SessionActivityService, SessionCoordinator, SessionRefresh |
| `signalr/` | SignalRService (chat), AsistenciaSignalRService |
| `speech/` | SpeechService, VoiceRecognitionService, VoiceCommandExecutor |
| `storage/` | StorageService (facade), SessionStorage, PreferencesStorage, IndexedDB |
| `sw/` | SwService (Service Worker) |
| `trace/` | RequestTraceFacade, RequestTraceStore |
| `user/` | UserProfileService |
| `wal/` | WalService, WalSyncEngine, WalDbService, WalFacadeHelper, WalStatusStore |

---

## Taxonomia de Servicios (5 tipos)

### 1. Utility / Helper — *Hace cosas, no guarda cosas.*

```typescript
@Injectable({ providedIn: 'root' })
export class DateUtilsService {
  formatDate(date: Date): string { /* ... */ }
}
```

| Regla | Descripcion |
|-------|-------------|
| ❌ No estado | Sin propiedades mutables |
| ✅ Puro | Funciones deterministas |
| 📍 Ubicacion | `@core/helpers/` o `@shared/services/` |

### 2. Gateway / IO — *Habla con afuera, no con la UI.*

```typescript
@Injectable({ providedIn: 'root' })
export class AsistenciaApiService {
  private http = inject(HttpClient);
  getAsistencias(mes: number): Observable<Asistencia[]> {
    return this.http.get<Asistencia[]>(`/api/asistencias?mes=${mes}`);
  }
}
```

| Regla | Descripcion |
|-------|-------------|
| ✅ Devuelve Observables/Promises | Comunicacion asincrona |
| ❌ No expone estado a UI | Solo operaciones IO |
| 📍 Ubicacion | `@data/repositories/` o `@core/services/` |

### 3. State / Store — *Un servicio no es estado. Es una fuente de estado.*

```typescript
@Injectable({ providedIn: 'root' })
export class NotificationStateService {
  private readonly _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);
}
```

| Regla | Descripcion |
|-------|-------------|
| ✅ Reactivo | Signals u Observables |
| ❌ NO estado mutable publico | Solo lectura desde fuera |
| ✅ Cambios via metodos | No exponer setters directos |
| 📍 Ubicacion | `@core/store/` o NgRx Signals |

### 4. Facade — *El cerebro vive aqui, no en el componente.*

```typescript
@Injectable({ providedIn: 'root' })
export class AsistenciaFacade {
  private api = inject(AsistenciaApiService);
  private state = inject(AsistenciaStateService);
  readonly asistencias = this.state.asistencias;

  loadAsistencias(mes: number): void {
    this.state.setLoading(true);
    this.api.getAsistencias(mes).subscribe({
      next: (data) => this.state.setAsistencias(data),
      error: (err) => this.state.setError(err),
    });
  }
}
```

| Regla | Descripcion |
|-------|-------------|
| ❌ Poco o nada de estado propio | Delega en State services |
| ✅ Expone comandos y ViewModels | `load()`, `save()`, `vm` |
| 📍 Ubicacion | `@core/services/` o `@features/*/services/` |

### 5. Ephemeral / Scoped — *Vive poco, decide poco.*

```typescript
@Injectable()  // Sin providedIn: 'root'
export class WizardService { /* estado temporal */ }

@Component({ providers: [WizardService] })  // Scope del componente
export class WizardComponent { }
```

| Regla | Descripcion |
|-------|-------------|
| ✅ Scope controlado | Providers en componente |
| ✅ Preferible reactivo | Si renderiza datos |
| 📍 Ubicacion | Inline o `@features/*/services/` |

---

## Taxonomia de Componentes (6 tipos)

### 1. Presentational / Dumb — *Muestra, no decide.*

| Regla | Descripcion |
|-------|-------------|
| ✅ Inputs (`input()`) + Outputs (`output()`) | Signal API |
| ❌ No servicios | Solo inyectar si es absolutamente necesario |
| ✅ OnPush SIEMPRE | Maxima optimizacion |
| 📍 Ubicacion | `@shared/components/` o `@features/*/components/` |

### 2. Container / Smart — *Decide, no disena.*

| Regla | Descripcion |
|-------|-------------|
| ✅ Consume facades/state | Conecta UI con servicios |
| ✅ Maneja streams/signals | Orquesta datos |
| ✅ OnPush preferible | Default solo si necesario |
| 📍 Ubicacion | `@features/*/pages/` o `@features/*/components/` |

### 3. Page / Route — *Contexto, no detalle.*

| Regla | Descripcion |
|-------|-------------|
| ✅ Inicializa datos en `ngOnInit` | Carga inicial |
| ✅ Coordina subcomponentes | Orquesta flujo de datos |
| ❌ No UI compleja directa | Delega a subcomponentes |
| 📍 Ubicacion | `@features/*/pages/` |

### 4. Layout / Shell — *Estructura, no logica.*

| Regla | Descripcion |
|-------|-------------|
| ✅ Poco estado, muy estable | Solo UI estructural |
| ✅ Default suele bastar | No requiere OnPush |
| 📍 Ubicacion | `@shared/components/layout/` |

### 5. Wrapper / Integration — *Aqui vive el caos, bien aislado.*

| Regla | Descripcion |
|-------|-------------|
| ✅ Default obligatorio | NO forzar OnPush |
| ✅ markForCheck si hace falta | Control manual de deteccion |
| ❌ No sobre-Angular-izar | Dejar que la libreria trabaje |
| 📍 Ubicacion | `@shared/components/` |

### 6. Ephemeral / Flow — *Nace, fluye, muere.*

| Regla | Descripcion |
|-------|-------------|
| ✅ Estado local | Signals o servicio scoped |
| ✅ OnPush preferible | Reactivo si renderiza |
| 📍 Ubicacion | `@features/*/components/` o `@shared/components/` |

---

## Estructura de un Feature Tipico

### Feature simple (1 facade)

```
features/intranet/pages/mi-feature/
├── mi-feature.component.ts      # Page/Route (Smart)
├── mi-feature.component.html
├── mi-feature.component.scss
├── components/                  # Sub-componentes Presentational
│   ├── mi-list/
│   ├── mi-card/
│   └── mi-form/
├── models/                      # DTOs y tipos del feature
│   └── mi-feature.models.ts
├── config/                      # Configuraciones del feature
│   └── mi-feature.config.ts
└── services/
    ├── mi-feature.store.ts      # Estado reactivo (signals privados)
    └── mi-feature.facade.ts     # Orquestacion (RxJS -> signals)
```

### Feature complejo (multi-facade: data, crud, ui)

Para módulos CRUD admin con múltiples responsabilidades, el facade se divide:

```
features/intranet/pages/admin/usuarios/
├── usuarios.component.ts               # Page (Smart) — consume facades
├── usuarios.component.html
├── usuarios.component.scss
├── index.ts                             # Barrel export
├── components/                          # Sub-componentes Presentational (7+)
│   ├── usuarios-table/
│   ├── usuarios-stats/
│   ├── usuarios-filters/
│   ├── usuarios-header/
│   ├── usuario-form-dialog/
│   ├── usuario-detail-drawer/
│   ├── usuarios-table-skeleton/
│   └── usuarios-stats-skeleton/
├── models/
│   └── usuarios.models.ts
└── services/
    ├── usuarios.store.ts                # Estado reactivo (extends BaseCrudStore)
    ├── usuarios.service.ts              # API gateway (HTTP calls)
    ├── usuarios-data.facade.ts          # Carga de datos (load stats, load items)
    ├── usuarios-crud.facade.ts          # Operaciones CRUD (create, update, delete, toggle)
    └── usuarios-ui.facade.ts            # Estado UI (open/close dialog, drawer)
```

| Facade | Responsabilidad |
|--------|----------------|
| `*-data.facade.ts` | Carga de datos: `loadEstadisticas()`, `loadItems()`, `refreshItemsOnly()` |
| `*-crud.facade.ts` | Operaciones: `save()`, `delete()`, `toggle()`. Integra WAL para optimistic updates |
| `*-ui.facade.ts` | Estado UI: `openNewDialog()`, `openEditDialog()`, `openDetailDrawer()` |

> No todos los módulos necesitan 3 facades. Usar 1 facade para features simples, dividir cuando la complejidad lo justifique.

## State Management con NgRx Signals

```typescript
// Store centralizado
export const AuthStore = signalStore(
  withState(initialState),
  withComputed((store) => ({
    remainingAttempts: computed(() => MAX_LOGIN_ATTEMPTS - store.loginAttempts()),
  })),
  withMethods((store) => ({
    setUser(user: AuthUser): void { patchState(store, { user }); },
  }))
);

// Estado local con signals
private readonly _data = signal<Data[]>([]);
readonly data = this._data.asReadonly();
readonly derivado = computed(() => this.data().filter(d => d.active));
```

---

## Ubicación de Código Compartido

> **"`shared/` = usado por public + intranet (o por 2+ features independientes)."**
> **"`features/intranet/shared/` = usado por 2+ pages de intranet pero no por public."**

| Criterio | Ubicación | Alias |
|----------|-----------|-------|
| Usado por public y por intranet | `src/app/shared/` | `@shared` |
| Usado solo por intranet (2+ pages) | `src/app/features/intranet/shared/` | `@intranet-shared` |
| Usado solo por 1 page | Dentro de la page misma | N/A |

**Dependencias cross-boundary**: `@intranet-shared` puede importar de `@shared` (ej: `form-error` importa `@shared/validators`). Lo inverso está prohibido — `@shared` no debe importar de `@intranet-shared`.

**Re-exports temporales**: `@shared` re-exporta algunos items que migraron a `@intranet-shared` para no romper imports existentes. Estos re-exports se eliminan gradualmente conforme los consumidores se actualicen.

---

## Capa de Datos

**Patrón estándar**: Feature service (`*.service.ts`) con `HttpClient` directo para API específica del feature.

**`@data/repositories/`**: Existe `BaseRepository` para CRUD genérico compartido, pero actualmente sin consumidores activos. Sus 2 implementaciones (`UserRepository`, `NotificationRepository`) no se inyectan en ningún servicio. Solo `PaginatedResponse` se importa como tipo. Ver task `revision-codigo-muerto.md` para decisión pendiente.

Los 21+ feature services usan `HttpClient` directo — es el patrón de facto del proyecto.

---

## Asistencia — Subdominios

Asistencia tiene 4 subdominios con ~5,600 líneas TS:

| Subdominio | Ubicación | Rol |
|------------|-----------|-----|
| **Diaria** (CrossChex) | `pages/cross-role/attendance-component/` + `components/attendance/` | Cross-role — vista de asistencia por biométrico |
| **Curso** (en clase) | `components/schedule/` (embebido en horarios) | Profesor marca P/T/F |
| **Admin** (edición formal) | `pages/admin/asistencias/` | Director edita/corrige registros |
| **Reportes** | `pages/cross-role/reportes-asistencia/` | Cross-role — estadísticas y exportación |

La separación física actual es parcial — admin y reportes tienen carpetas propias, diaria y curso están mezclados con componentes del rol. Inconsistencia idiomática (`asistencia-*` vs `attendance-*`) documentada en task `normalizacion-idiomatica.md`.
