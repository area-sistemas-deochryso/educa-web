# Arquitectura

## Principios fundamentales

> **"Un componente no hace cosas, cumple un rol."**
> **"Un servicio no es estado. Es una fuente de estado."**

- La arquitectura correcta es lo más importante para evitar antipatrones
- Clasificar servicios y componentes por **rol**, no por tamaño
- Usar todo lo puro que se pueda y contenizar aquello que se desconoce
- Prácticamente siempre se debe hacer un pipe puro

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
│   ├── adapters/    # Transformación de datos
│   └── models/      # Modelos del dominio
├── shared/          # Componentes, pipes, directivas, servicios reutilizables
│   ├── components/  # layout, form-error, toast-container
│   ├── directives/
│   ├── pipes/
│   ├── services/    # AdminUtilsService (helpers para componentes admin)
│   └── validators/
└── features/        # Módulos lazy-loaded
    ├── public/      # home, about, contact, levels
    └── intranet/    # login, attendance, schedule, admin
```

## Taxonomía de Servicios (5 tipos)

### 1. Utility / Helper
**Mantra**: *Hace cosas, no guarda cosas.*

```typescript
// ✅ CORRECTO - Lógica pura sin estado
@Injectable({ providedIn: 'root' })
export class DateUtilsService {
  formatDate(date: Date): string { /* ... */ }
  isWeekend(date: Date): boolean { /* ... */ }
}
```

| Regla | Descripción |
|-------|-------------|
| ❌ No estado | Sin propiedades ni estado mutable |
| ❌ No UI | No interactúa con el DOM ni componentes |
| ✅ Puro | Funciones deterministas, mismo input = mismo output |
| 📍 Ubicación | `@core/helpers/` o `@shared/services/` |

**Ejemplo**: `DateUtilsService`, `ValidationUtils`, `FormatService`

### 2. Gateway / IO
**Mantra**: *Habla con afuera, no con la UI.*

```typescript
// ✅ CORRECTO - Comunicación externa que devuelve Observables
@Injectable({ providedIn: 'root' })
export class AsistenciaApiService {
  private http = inject(HttpClient);

  getAsistencias(mes: number): Observable<Asistencia[]> {
    return this.http.get<Asistencia[]>(`/api/asistencias?mes=${mes}`);
  }
}
```

| Regla | Descripción |
|-------|-------------|
| ✅ Devuelve Observables/Promises | Comunicación asíncrona |
| ❌ No expone estado a UI | Solo operaciones de entrada/salida |
| ✅ Mutabilidad encapsulada | Estado interno privado si es necesario |
| 📍 Ubicación | `@data/repositories/` o `@core/services/` |

**Ejemplo**: `HttpClient` wrappers, `IndexedDBService`, `WebSocketService`

### 3. State / Store (fuente de estado)
**Mantra**: *Un servicio no es estado. Es una fuente de estado.*

```typescript
// ✅ CORRECTO - Estado reactivo con signals
@Injectable({ providedIn: 'root' })
export class NotificationStateService {
  private readonly _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  readonly unreadCount = computed(() =>
    this.notifications().filter(n => !n.read).length
  );

  addNotification(notification: Notification): void {
    this._notifications.update(n => [...n, notification]);
  }
}
```

| Regla | Descripción |
|-------|-------------|
| ✅ Reactivo | Signals u Observables |
| ❌ NO estado mutable público | Solo lectura desde fuera |
| ✅ Cambios vía métodos | No exponer setters directos |
| 📍 Ubicación | `@core/store/` o NgRx Signals |

**Ejemplo**: `AuthStore`, `UserPermisosService`, `NotificationStateService`

### 4. Facade (Application Service)
**Mantra**: *El cerebro vive aquí, no en el componente.*

```typescript
// ✅ CORRECTO - Orquesta casos de uso
@Injectable({ providedIn: 'root' })
export class AsistenciaFacade {
  private api = inject(AsistenciaApiService);
  private state = inject(AsistenciaStateService);

  readonly asistencias = this.state.asistencias;
  readonly loading = this.state.loading;

  loadAsistencias(mes: number): void {
    this.state.setLoading(true);
    this.api.getAsistencias(mes)
      .subscribe({
        next: (data) => this.state.setAsistencias(data),
        error: (err) => this.state.setError(err),
      });
  }
}
```

| Regla | Descripción |
|-------|-------------|
| ❌ Poco o nada de estado propio | Delega en State services |
| ✅ Expone comandos | `load()`, `save()`, `delete()` |
| ✅ Expone ViewModels | `vm$`, `vm`, datos derivados |
| 📍 Ubicación | `@core/services/` o `@features/*/services/` |

**Ejemplo**: `AsistenciaFacade`, `UserManagementFacade`

### 5. Ephemeral / Scoped
**Mantra**: *Vive poco, decide poco.*

```typescript
// ✅ CORRECTO - Estado temporal con providers
@Injectable()  // Sin providedIn: 'root'
export class WizardService {
  private readonly _currentStep = signal(0);
  readonly currentStep = this._currentStep.asReadonly();

  nextStep(): void { /* ... */ }
}

@Component({
  providers: [WizardService],  // Scope del componente
})
export class WizardComponent { }
```

| Regla | Descripción |
|-------|-------------|
| ✅ Scope controlado | Providers en componente |
| ✅ Puede ser mutable | Si NO afecta UI directamente |
| ✅ Preferible reactivo | Si renderiza datos |
| 📍 Ubicación | Inline en componente o `@features/*/services/` |

**Ejemplo**: `WizardService`, `FormStepService`, `DialogDataService`

---

## Taxonomía de Componentes (6 tipos)

### 1. Presentational / Dumb
**Mantra**: *Muestra, no decide.*

```typescript
// ✅ CORRECTO - Componente presentacional puro
@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule, CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,  // SIEMPRE OnPush
  template: `
    <p-card>
      <h3>{{ user.nombre }}</h3>
      <button (click)="edit.emit(user)">Editar</button>
    </p-card>
  `,
})
export class UserCardComponent {
  readonly user = input.required<Usuario>();
  readonly edit = output<Usuario>();
}
```

| Regla | Descripción |
|-------|-------------|
| ✅ Inputs inmutables | `input()` signal API |
| ✅ Outputs | `output()` signal API |
| ❌ No servicios | Solo inyectar si es absolutamente necesario |
| ✅ OnPush SIEMPRE | Máxima optimización |
| 📍 Ubicación | `@shared/components/` o `@features/*/components/` |

**Ejemplo**: `UserCardComponent`, `TableRowComponent`, `FormFieldComponent`

### 2. Container / Smart
**Mantra**: *Decide, no diseña.*

```typescript
// ✅ CORRECTO - Componente contenedor
@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [UserCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (user of users(); track user.id) {
      <app-user-card
        [user]="user"
        (edit)="onEdit($event)" />
    }
  `,
})
export class UsersListComponent {
  private facade = inject(UsersFacade);

  readonly users = this.facade.users;

  onEdit(user: Usuario): void {
    this.facade.editUser(user);
  }
}
```

| Regla | Descripción |
|-------|-------------|
| ✅ Consume facades/state | Conecta UI con servicios |
| ✅ Maneja streams/signals | Orquesta datos |
| ✅ OnPush si controla datos | Default solo si necesario |
| 📍 Ubicación | `@features/*/pages/` o `@features/*/components/` |

**Ejemplo**: `UsersListComponent`, `DashboardComponent`

### 3. Page / Route
**Mantra**: *Contexto, no detalle.*

```typescript
// ✅ CORRECTO - Componente de ruta
@Component({
  selector: 'app-asistencia-page',
  standalone: true,
  imports: [AsistenciaListComponent, AsistenciaFiltersComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-asistencia-filters (filter)="onFilter($event)" />
    <app-asistencia-list [data]="asistencias()" />
  `,
})
export class AsistenciaPageComponent implements OnInit {
  private facade = inject(AsistenciaFacade);

  readonly asistencias = this.facade.asistencias;

  ngOnInit(): void {
    this.facade.loadAsistencias();
  }
}
```

| Regla | Descripción |
|-------|-------------|
| ✅ Inicializa datos | En `ngOnInit` |
| ✅ Coordina subcomponentes | Orquesta flujo de datos |
| ❌ No UI compleja directa | Delega a subcomponentes |
| 📍 Ubicación | `@features/*/pages/` |

**Ejemplo**: `AsistenciaPageComponent`, `AdminUsuariosPageComponent`

### 4. Layout / Shell
**Mantra**: *Estructura, no lógica.*

```typescript
// ✅ CORRECTO - Layout de estructura
@Component({
  selector: 'app-intranet-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.Default,  // Default está OK aquí
  template: `
    <app-sidebar />
    <div class="content">
      <app-header />
      <main>
        <router-outlet />
      </main>
    </div>
  `,
})
export class IntranetLayoutComponent { }
```

| Regla | Descripción |
|-------|-------------|
| ✅ Poco estado | Solo UI estructural |
| ✅ Muy estable | Raramente cambia |
| ✅ Default suele bastar | No requiere OnPush |
| 📍 Ubicación | `@shared/components/layout/` |

**Ejemplo**: `IntranetLayoutComponent`, `PublicLayoutComponent`

### 5. Wrapper / Integration
**Mantra**: *Aquí vive el caos, bien aislado.*

```typescript
// ✅ CORRECTO - Wrapper de librería externa
@Component({
  selector: 'app-chart-wrapper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,  // NO forzar OnPush
  template: `<div #chartContainer></div>`,
})
export class ChartWrapperComponent implements AfterViewInit {
  @ViewChild('chartContainer') container!: ElementRef;
  private cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    // Código imperativo con DOM manual
    this.initChart();
    this.cdr.markForCheck();
  }
}
```

| Regla | Descripción |
|-------|-------------|
| ✅ Default | NO forzar OnPush |
| ✅ markForCheck si hace falta | Control manual de detección |
| ❌ No sobre-Angular-izar | Dejar que la librería haga su trabajo |
| 📍 Ubicación | `@shared/components/` |

**Ejemplo**: `ChartWrapperComponent`, `MapComponent`, `RichTextEditorComponent`

### 6. Ephemeral / Flow
**Mantra**: *Nace, fluye, muere.*

```typescript
// ✅ CORRECTO - Flujo temporal
@Component({
  selector: 'app-create-user-wizard',
  standalone: true,
  providers: [WizardService],  // Scoped service
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (wizard.currentStep() === 0) {
      <app-step-personal-info />
    } @else if (wizard.currentStep() === 1) {
      <app-step-permissions />
    }
  `,
})
export class CreateUserWizardComponent {
  protected wizard = inject(WizardService);
}
```

| Regla | Descripción |
|-------|-------------|
| ✅ Estado local | Signals o servicio scoped |
| ✅ A veces servicio scoped | Para lógica compartida entre pasos |
| ✅ Reactivo si renderiza | OnPush preferible |
| 📍 Ubicación | `@features/*/components/` o `@shared/components/` |

**Ejemplo**: `CreateUserWizardComponent`, `MultiStepFormComponent`

---

## Estructura de un Feature Típico

```
features/intranet/pages/mi-feature/
├── mi-feature.component.ts      # Componente Page/Route (Smart)
├── mi-feature.component.html    # Template
├── mi-feature.component.scss    # Estilos
├── mi-feature.component.spec.ts # Tests (opcional)
├── components/                  # Sub-componentes Presentational (Dumb)
│   ├── mi-list/
│   ├── mi-card/
│   └── mi-form/
└── services/                    # Facade o Ephemeral services
    └── mi-feature.facade.ts
```

## State Management con NgRx Signals

```typescript
// Store centralizado (ej: AuthStore)
export const AuthStore = signalStore(
  withState(initialState),
  withComputed((store) => ({
    remainingAttempts: computed(() => MAX_LOGIN_ATTEMPTS - store.loginAttempts()),
  })),
  withMethods((store) => ({
    setUser(user: AuthUser): void {
      patchState(store, { user });
    },
  }))
);

// Estado local con signals
readonly notifications = signal<Notification[]>([]);
readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);
```

## Subscripciones - Prevenir memory leaks

```typescript
// SIEMPRE usar takeUntilDestroyed
private destroyRef = inject(DestroyRef);

this.service.data$
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(data => { });
```

## HTTP con interceptors

Los interceptors ya manejan:
- **authInterceptor**: Agrega `Authorization: Bearer {token}` automáticamente
- **errorInterceptor**: Manejo centralizado de errores HTTP

```typescript
// Solo hacer la llamada, los headers se agregan automáticamente
this.http.get<Usuario[]>('/api/usuarios').subscribe();
```

## Patrón CRUD en componentes admin

```typescript
saveItem(): void {
  this.loading.set(true);
  this.service.save(data)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: () => {
        this.hideDialog();
        this.loadData();  // Refresca toda la data
      },
      error: (err) => {
        logger.error('Error:', err);
        this.errorHandler.showError('Error', 'No se pudo guardar');
        this.loading.set(false);
      },
    });
}
```

## Manejo de errores hacia el usuario

```typescript
import { ErrorHandlerService } from '@core/services';

private errorHandler = inject(ErrorHandlerService);

// Mostrar error al usuario con toast
this.errorHandler.showError('Error', 'No se pudo guardar');
```
