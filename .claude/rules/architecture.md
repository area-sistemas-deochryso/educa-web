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
│   ├── interceptors/# authInterceptor, errorInterceptor
│   ├── services/    # auth, storage, permisos, notifications, etc.
│   ├── helpers/     # logger
│   ├── store/       # NgRx Signals stores
│   └── utils/       # TimerManager, etc.
├── data/            # Capa de datos
│   ├── repositories/# BaseRepository, CRUDs
│   ├── adapters/    # Transformacion de datos
│   └── models/      # Modelos del dominio
├── shared/          # Componentes, pipes, directivas, servicios reutilizables
│   ├── components/  # layout, form-error, toast-container
│   ├── directives/
│   ├── pipes/
│   ├── services/    # AdminUtilsService (helpers para componentes admin)
│   └── validators/
└── features/        # Modulos lazy-loaded
    ├── public/      # home, about, contact, levels
    └── intranet/    # login, attendance, schedule, admin
```

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

```
features/intranet/pages/mi-feature/
├── mi-feature.component.ts      # Page/Route (Smart)
├── mi-feature.component.html
├── mi-feature.component.scss
├── components/                  # Sub-componentes Presentational
│   ├── mi-list/
│   ├── mi-card/
│   └── mi-form/
└── services/
    ├── mi-feature.store.ts      # Estado reactivo (signals privados)
    └── mi-feature.facade.ts     # Orquestacion (RxJS -> signals)
```

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
