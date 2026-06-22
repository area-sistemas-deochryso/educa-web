# 342 — Initial bundle reduction (fase 2)

- **origen**: sesión bundle-analysis 2026-06-22
- **modo**: `/execute`
- **branch**: continuar en `pre-release/v1.0.0`

## Contexto

El initial bundle pasó de ~1250 kB → 905 kB con:
1. `app.ts` + `permisos.guard.ts`: sub-path imports en vez de barrel `@core/services`
2. `clockSyncInterceptor`: sub-path `@core/services/wal/wal-clock.service` en vez de barrel
3. `CapacitorService`: dynamic `import()` para todos los plugins Capacitor
4. ESLint rule `eager-no-core-services-barrel` previene regresiones en guards/interceptors/app.ts

Budget: 400 kB warning, 500 kB max. Faltan ~505 kB.

## Lo que queda por hacer

### Fix 3 — errorInterceptor → SessionActivityService (~35 kB)

El `errorInterceptor` (eager, en app config) inyecta `SessionActivityService`, que arrastra:
- `SessionRefreshService` (3.4 kB) → `AuthApiService`, `SessionCoordinatorService`
- `AuthService` → `StorageService` (6.7 kB) → `SessionStorageService` (4.6 kB), `PreferencesStorageService` (5.7 kB), `NotificationStorageService` → `IndexedDBService`
- `UserPermissionsService` (3.5 kB) → `PermisosService` (4.1 kB)
- `SwService` (3.6 kB)

**Opciones**:
- (a) Extraer un `ForceLogoutService` liviano que solo haga lo mínimo del error interceptor sin arrastrar la cadena completa
- (b) Lazy-load `SessionActivityService` con dynamic inject pattern
- (c) Refactorizar el interceptor para que delegue el manejo pesado vía event/signal en vez de inyectar directamente

### Fix 4 — `sideEffects: false` en package.json

Habilita tree-shaking real de barrels por esbuild. Requiere validar que ningún archivo del proyecto tenga side effects reales (decoradores `@Injectable({providedIn:'root'})` son safe, pero hay que revisar archivos con top-level code).

### Análisis pendiente — composición restante del initial

Después de fix 3 y 4, los ~470 kB restantes son mayormente framework:
- `@angular/core` 177 kB, `@angular/router` 78 kB, `@angular/common` 50 kB, `@angular/forms` 46 kB → ~351 kB de Angular (no reducible)
- `@primeuix/themes` 104 kB + `primeng` ~75 kB → ~179 kB de PrimeNG

Para llegar a 400 kB habría que:
- Evaluar si `@primeuix/themes` se puede lazy-load o reducir (theme tree-shaking)
- Evaluar si `@angular/forms` se necesita en initial (¿login usa reactive forms?)
- Verificar que `shared/components` en initial (45 kB) solo trae lo que app shell necesita

## Herramientas disponibles

- `bun run bundle-report` — build + reporte HTML completo
- `bun scripts/bundle-report.mjs --check` — exit 1 si >400 kB (requiere build previo)
- `bun scripts/bundle-report.mjs --json` — JSON stdout
- ESLint rule `eager-no-core-services-barrel` — previene regresión de barrels en eager code
