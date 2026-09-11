# 637 — P10 F2: Conectividad real + modo offline forzado (DEP-2/DEP-3)

> **Repos afectados**: `educa-web` (frontend), `educa-coord` (actualización de plan/maestro al cierre)
> **Creado**: 2026-09-11 · **Estado**: trabajo completo, listo para `/end` (pendiente commit).
> **MODO SUGERIDO**: `/execute`
> **Plan xrepo**: [`educa-coord/plans/xrepo/000-019/xrepo-10-flujos-alternos.md`](../../../../../../WD/educa-coord/plans/xrepo/000-019/xrepo-10-flujos-alternos.md) — F2 (DEP-2 Azure App Service, DEP-3 Internet del usuario)
> **touches**: `src/app/core/services/connectivity/` (nuevo), `src/app/core/interceptors/`, `src/app/core/services/wal/`, `src/app/features/intranet/shared/components/offline-indicator/`, `package.json` (`@capacitor/network`)

## CONTEXTO

Chat de `educa-coord` (P10 F1 recién cerrado, brief 643 en `Educa.API`) siguió con F2. Investigación de este chat confirmó que, a diferencia de F1 (donde el WAL ya cubría casi todo), acá la mayoría de lo que el plan pide para DEP-2/DEP-3 **genuinamente no existe**:

- **NO EXISTE** interceptor que cuente fallos consecutivos (network error / 5xx) y fuerce un "modo offline global" — cada error se clasifica y muestra un toast individual (`error.interceptor.ts`), sin estado acumulado.
- **PARCIAL** `SwService.isOnline$` solo usa `navigator.onLine` + eventos `online`/`offline` del browser — exactamente el patrón que el plan señala como propenso a falsos positivos. Sin verificación real (fetch/HEAD).
- **NO EXISTE** health-check polling activo cuando la app está en modo degradado — la recuperación depende pasivamente del evento `online`.
- **NO EXISTE** límite de storage del WAL: `navigator.storage.estimate()` nunca se llama. El modo `frozen` (`WalMode` type) es un placeholder sin lógica que lo dispare.
- **NO EXISTE** `@capacitor/network` — ni instalado ni usado.
- **EXISTE** `OfflineIndicatorComponent` (banner de lectura degradada, ya cubre el caso de "datos podrían no estar actualizados"), pero alimentado por el mismo `SwService.isOnline$` poco confiable de arriba.

Decisión con el usuario: alcance completo de F2 (las 4 piezas), incluyendo `@capacitor/network` pese a que el resto del stack nativo (`@capacitor/push-notifications`) está instalado sin uso — el usuario prefirió incluirlo igual porque el plan original lo pide explícitamente para DEP-3.

## ALCANCE

### Pieza 1 — Servicio de conectividad real

Nuevo `ConnectivityService` (o extensión de `SwService`) que reemplaza la fuente de verdad de `isOnline$`:
- Sigue escuchando `navigator.onLine`/eventos del browser como señal rápida (útil para reaccionar de inmediato).
- Confirma con una prueba real: `HEAD` (o `GET` liviano) a un endpoint de health conocido del backend, con debounce/intervalo razonable — no en cada cambio de `navigator.onLine` a lo bruto.
- Expone un estado consolidado (`online` / `degraded` / `offline`) que WAL, interceptor y banners consumen en vez de `navigator.onLine` crudo.

### Pieza 2 — Interceptor de fallos consecutivos → modo offline forzado

- Contador de fallos consecutivos (network error `status===0` o `5xx`) en requests a `/api/*`, ventana de 30s, umbral N=3 (valores del plan original, ajustables si el diseño real lo amerita).
- Al disparar, marca el `ConnectivityService` como `degraded`/`offline` (no espera al evento del browser).
- Se resetea con cualquier request exitoso.

### Pieza 3 — Health-check polling activo en modo degradado

- Cuando `ConnectivityService` está `degraded`/`offline`, polling periódico (cada 30s, según plan) al endpoint de health.
- Al recuperar, dispara la transición a `online` → WAL sync engine ya reacciona a eso (`sw.isOnline$`, aunque el source real cambia de `SwService` a `ConnectivityService` — evaluar cuál de los dos servicios es la fuente canónica final, evitando duplicar lógica).

### Pieza 4 — Límite de storage del WAL

- `navigator.storage.estimate()` al iniciar el WAL y periódicamente.
- Advertencia visual (reusar/extender `WalDegradedBannerComponent`) si uso >80%.
- Si se dispara el freeze, setear `WalMode = 'frozen'` (el tipo ya existe) y que `WalDbService`/`wal.service.ts` dejen de aceptar operaciones nuevas en ese modo (verificar todos los puntos donde se agregan entradas al WAL).

### Pieza 5 — `@capacitor/network`

- Instalar `@capacitor/network`.
- Usarlo como señal adicional de conectividad nativa en el shell móvil (más confiable que `navigator.onLine` en Capacitor) — integrarlo en el `ConnectivityService` de la Pieza 1, condicionado a plataforma nativa (`Capacitor.isNativePlatform()`).

## VERIFICACIÓN

- Tests unitarios para `ConnectivityService` (probe real, debounce, transición de estados).
- Tests para el interceptor (contador, ventana, reset).
- Tests para el freeze del WAL al superar 80% de storage (mockeando `navigator.storage.estimate`).
- Suite completa de `educa-web` sin regresión (equivalente al `dotnet test` de F1 — usar el comando de test que defina `.claude/commands/validate.md` o el override de `/end` del repo).
- Verificación visual (dev server) del banner de "sin conexión" reaccionando al nuevo `ConnectivityService`, no solo a `navigator.onLine`.

## RESULTADO (2026-09-11)

Las 5 piezas completas:

1. **`ConnectivityService`** (`core/services/connectivity/`) — nueva fuente de verdad consolidada (`online`/`offline`), escucha eventos browser + `@capacitor/network` nativo, confirma transición a `online` con `HEAD /api/health` real (fetch crudo, fuera del pipeline de interceptores), polling activo cada 30s mientras `offline`. `OfflineIndicatorComponent` migrado de `SwService.isOnline$` a este servicio. Decisión de scope: `WalSyncEngine` se dejó en `SwService` (no se rewireó) — es un trigger interno ya cubierto por el circuit breaker propio del WAL; cambiarlo agregaba riesgo de regresión sin beneficio claro para DEP-2/DEP-3.
2. **`connectivityInterceptor`** (`core/interceptors/connectivity/`) — cuenta fallos consecutivos (network error o 5xx) en `/api/*` dentro de ventana de 30s, umbral 3 → `connectivity.reportForcedOffline()`. Cualquier respuesta exitosa resetea y llama `reportSuccess()`.
3. Cubierta por la pieza 1 (polling de `ConnectivityService`).
4. **Límite de storage del WAL** — `WalDbService.getStorageUsageRatio()` (`navigator.storage.estimate()`), `WalStorageMonitor` engachado al timer existente del sync engine (sin timer nuevo), freeze a `WalMode='frozen'` al superar 80%, `WalService.append()` rechaza con `WalStorageFullError` en ese modo, `WalFacadeHelper` reusa el path de warning de "storage lleno" ya existente. Banner nuevo `'storage-full'` distinto de `'ephemeral'` (mensaje específico, no reutiliza el texto de modo efímero).
5. **`@capacitor/network`** instalado (`^8.0.1`, no `^8.0.2` como se pidió originalmente — esa versión no existe publicada) e integrado en `CapacitorService` (`getNetworkStatus()`/`onNetworkChange()`, patrón de import dinámico consistente con el resto del servicio).

**Incidente durante la instalación**: dos agentes en paralelo intentaron instalar `@capacitor/network` con una versión inexistente (`^8.0.2`), lo que rompió momentáneamente el `node_modules` compartido (junction entre todos los worktrees de `educa-web` y el repo principal) — restaurado con `npm ci` en el repo principal + recreación manual del junction + instalación de la versión correcta (`8.0.1`) + `npm install --package-lock-only` en el worktree para sincronizar su propio lockfile sin tocar `node_modules` de nuevo. Sin daño permanente, pero deja como aprendizaje: instalar dependencias nuevas siempre desde el repo principal (nunca desde un worktree con `node_modules` juncionado) para evitar que npm reemplace el junction por una copia real.

**Validación**: `tsc --noEmit` limpio, suite completa `vitest run` 2554/2554 (1 timeout inicial de `eslint-config-guards.spec.ts` confirmado flaky por carga del sistema, verde en aislamiento), `ng lint` limpio (con Node 22 vía fnm).
