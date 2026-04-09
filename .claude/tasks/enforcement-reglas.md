# Enforcement de Reglas — De Documentación a Restricción Técnica

> **Estado**: Plan aprobado, pendiente ejecución por fases
> **Prioridad**: Alta (fundacional — mejora la calidad de todo lo demás)
> **Origen**: Análisis Codex + Claude (2026-04-08)
> **Principio**: "Una regla buena no solo se explica, se diseña para resistir mal uso"

---

## Diagnóstico Actual

| Nivel de enforcement | Estado actual | Brecha |
|---------------------|---------------|--------|
| **Documentación** | Extensa (30+ archivos en `.claude/rules/`) | Informa pero no protege |
| **Wrappers** | Existen para áreas críticas (Storage, WAL, HTTP, Session, Cache) | No se fuerza su uso exclusivo |
| **Tipos** | Parcial (algunos `any`, tipos inline duplicados) | No todos los DTOs/estados usan tipos semánticos |
| **Estructura** | Clara (core/shared/features) pero sin fronteras duras | Nada impide imports cruzados |
| **Linting** | ESLint 9 básico, 0 reglas custom de arquitectura | No detecta violaciones de capas |
| **Tests** | Vitest configurado, cobertura mínima | Sin tests de contrato ni invariantes |
| **CI** | Inexistente | Nada bloquea merge de código roto |

### Wrappers que YA existen (no crear de nuevo)

| Zona crítica | Wrapper actual | Ubicación |
|--------------|---------------|-----------|
| Sesión | `SessionCoordinatorService` + `SessionActivityService` + `SessionRefreshService` | `@core/services/session/` |
| Storage | `StorageService` (facade sobre 8 implementaciones) | `@core/services/storage/` |
| HTTP | `BaseHttpService` (base class para API services) | `@core/services/http/` |
| WAL/Mutaciones | `WalFacadeHelper.execute()` | `@core/services/wal/` |
| Cache | `CacheInvalidationService` + `CacheVersionManagerService` | `@core/services/cache/` |
| Auth | `AuthService` + `AuthApiService` | `@core/services/auth/` |
| Errores | `GlobalExceptionMiddleware` (backend) | `Middleware/` |
| Logging | `logger` helper (frontend) | `@core/helpers/` |

**Conclusión**: Los wrappers están. Lo que falta es **forzar que se usen** y **detectar cuando se saltean**.

---

## Fases de Ejecución

### Fase 1 — Linting de Arquitectura (enforcement estático)

> **Objetivo**: Que ESLint detecte violaciones de capas y uso directo de APIs prohibidas.
> **Herramienta**: Reglas custom en `eslint.config.js` usando `no-restricted-imports` y `no-restricted-globals`.
> **Esfuerzo**: ~2-3 horas
> **Impacto**: Alto — cada `npm run lint` detecta violaciones automáticamente

#### 1.1 Imports prohibidos entre capas

| Regla | Qué prohíbe | Por qué |
|-------|-------------|---------|
| `shared/` no importa de `features/` | `@features/*` en archivos de `shared/` | shared es base, features es consumidor |
| `shared/` no importa de `@intranet-shared` | `@intranet-shared/*` en archivos de `shared/` | Dependencia inversa prohibida |
| Components no importan `HttpClient` directo | `@angular/common/http` en `*.component.ts` | Components usan facades/services, no HTTP |
| Features no importan de otras features | `@features/intranet/pages/admin` desde `@features/intranet/pages/profesor` | Cada feature es independiente |

**Implementación**: `no-restricted-imports` con overrides por carpeta en `eslint.config.js`.

#### 1.2 APIs prohibidas fuera de wrappers

| API prohibida | Solo permitida en | Regla ESLint |
|--------------|-------------------|-------------|
| `localStorage` | `@core/services/storage/` | `no-restricted-globals` |
| `sessionStorage` | `@core/services/storage/` | `no-restricted-globals` |
| `document.cookie` | `@core/services/storage/` | `no-restricted-globals` |
| `console.log` | Ninguno (usar `logger`) | `no-console` ya existe (warn → error) |
| `new HttpClient()` | `@core/services/http/` y services | `no-restricted-imports` por carpeta |

#### 1.3 Naming y estructura

| Regla | Qué detecta |
|-------|------------|
| Archivos > 500 líneas | Warning en lint (no bloqueo) |
| `any` en código nuevo | Ya existe como warn → subir a error en archivos nuevos |

#### Checklist Fase 1

```
[x] Agregar overrides por carpeta en eslint.config.js
[x] Prohibir localStorage/sessionStorage/document.cookie fuera de storage/
[x] Prohibir HttpClient en *.component.ts (solo HttpClient, no tipos como HttpErrorResponse)
[x] Prohibir imports @features/* desde shared/
[x] Prohibir imports cross-feature (admin ↔ profesor ↔ estudiante) — profesor→admin es warn por violación existente
[x] Prohibir imports @intranet-shared desde shared/ — re-exports temporales con eslint-disable (TODO F5)
[x] Subir no-console de warn a error
[x] Verificar: npm run lint pasa con 0 errores (88 warnings pre-existentes)
[x] Documentar reglas en .claude/rules/eslint.md
```

**Completado**: 2026-04-09. Violación conocida: `profesor/final-salones/` importa de `admin/salones/` (warn, pendiente refactor a @intranet-shared).

---

### Fase 2 — Tests de Contrato e Invariantes (red de seguridad)

> **Objetivo**: Que las reglas de negocio críticas tengan tests que fallen si alguien las rompe.
> **Herramienta**: Vitest + tests unitarios/integración
> **Esfuerzo**: ~4-6 horas (incremental, no todo de una vez)
> **Impacto**: Medio-alto — protege invariantes del dominio

#### 2.1 Prioridad de tests por riesgo

| Zona | Qué testear | Tipo | Prioridad |
|------|-------------|------|-----------|
| **Auth/Session** | Login flow, token refresh, logout cleanup | Unit | P1 |
| **Permisos** | Resolución 2 capas (rol → personalizado), verificación exacta por ruta | Unit | P1 |
| **Storage** | Facade delega correctamente, cleanup en logout | Unit | P1 |
| **WAL** | execute() con onCommit/onError, rollback en error | Unit | P2 |
| **Asistencia estados** | Cálculo A/T/F/J según ventanas horarias | Unit | P2 |
| **Guards** | authGuard bloquea sin token, permisosGuard verifica ruta exacta | Unit | P2 |
| **Calificación** | Promedio ponderado, ventana de edición 2 meses | Unit | P3 |
| **Interceptors** | Rate limit enqueue, auth header injection | Unit | P3 |

#### 2.2 Tests de contrato de wrappers

Verificar que los wrappers hacen lo que prometen:

```typescript
// Ejemplo: StorageService siempre limpia en logout
describe('StorageService', () => {
  it('clearAll limpia sessionStorage, preferences y notificaciones', () => {
    // Arrange: poblar datos
    // Act: clearAll()
    // Assert: todo vacío
  });
});

// Ejemplo: WalFacadeHelper ejecuta onCommit en éxito
describe('WalFacadeHelper', () => {
  it('ejecuta onCommit cuando HTTP responde ok', () => { /* ... */ });
  it('ejecuta onError y NO onCommit cuando HTTP falla', () => { /* ... */ });
});
```

#### 2.3 Tests de invariantes de negocio (backend-driven, frontend-verifiable)

```typescript
// INV-C01: Estado de asistencia lo determina el ingreso
describe('AsistenciaEstadoCalculador', () => {
  it('ingreso 7:45 en periodo regular → A', () => { /* ... */ });
  it('ingreso 8:25 en periodo regular → T', () => { /* ... */ });
  it('ingreso 9:35 en periodo regular → F', () => { /* ... */ });
  it('justificación tiene precedencia absoluta', () => { /* ... */ });
});
```

#### Checklist Fase 2

```
[ ] Tests de AuthService (login, logout, refresh)
[ ] Tests de StorageService (facade delegation, cleanup)
[ ] Tests de permisosGuard (ruta exacta, sin herencia)
[ ] Tests de WalFacadeHelper (commit/error callbacks)
[ ] Tests de cálculo de estado de asistencia
[ ] Tests de authGuard (bloqueo sin token)
[ ] Verificar: npm test pasa con tests nuevos
```

---

### Fase 3 — Tipos Semánticos Completos (enforcement por compilador)

> **Objetivo**: Que TypeScript rechace datos mal formados en compilación, no en runtime.
> **Herramienta**: Tipos estrictos, const + type pattern, eliminar `any`
> **Esfuerzo**: ~3-4 horas (incremental al tocar cada módulo)
> **Impacto**: Medio — errores detectados antes de ejecutar
> **Dependencia**: Parcialmente hecho (ver `semantic-types.md`), falta completar

#### 3.1 Tipos semánticos pendientes de crear

| Tipo | Valores | Dónde definir |
|------|---------|---------------|
| `EstadoMatricula` | `PREASIGNADO \| PENDIENTE_PAGO \| PAGADO \| CONFIRMADO \| CURSANDO \| FINALIZADO \| RETIRADO \| ANULADO` | `@data/models/matricula.models.ts` |
| `MetodoPago` | `EFECTIVO \| TRANSFERENCIA \| YAPE \| PLIN \| OTRO` | `@data/models/matricula.models.ts` |
| `EstadoEstudiante` | `MATRICULADO \| ACTIVO \| INACTIVO \| EGRESADO` | `@data/models/estudiante.models.ts` |
| `EstadoPeriodo` | Ya existe como `PeriodoCierreEstado` | Verificar uso consistente |
| `WalConsistencyLevel` | `optimistic \| optimistic-confirm \| server-confirmed \| serialized` | `@core/services/wal/models/` |

#### 3.2 Eliminar `any` restante

- Ejecutar `grep -r ": any" src/app/` → listar instancias
- Priorizar: services > stores > facades > components
- Reemplazar por tipos específicos o `unknown` en catch

#### Checklist Fase 3

```
[ ] Crear tipos semánticos de Fase 3.1
[ ] Audit de `any` en services y stores (prioridad)
[ ] DTOs de API usan tipos semánticos (no string genérico para estados)
[ ] Signals tipados con tipos semánticos
[ ] Verificar: ng build --configuration production sin errores
```

---

### Fase 4 — CI Pipeline (enforcement en merge)

> **Objetivo**: Que ningún código roto llegue a main/master.
> **Herramienta**: GitHub Actions
> **Esfuerzo**: ~2-3 horas
> **Impacto**: Máximo — enforcement no opcional
> **Dependencia**: Fases 1 y 2 deben estar estables

#### 4.1 Pipeline frontend (educa-web)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup-node (22.x)
      - npm ci
      - npm run lint          # Fase 1 reglas
      - npm run build -- --configuration production
      - npm test              # Fase 2 tests
```

#### 4.2 Pipeline backend (Educa.API) — futuro

```yaml
# Cuando haya tests backend
- dotnet build
- dotnet test
```

#### Checklist Fase 4

```
[ ] Crear .github/workflows/ci.yml para educa-web
[ ] lint + build + test obligatorios
[ ] PR no mergeable sin CI verde
[ ] Crear .github/workflows/ci-backend.yml cuando haya tests backend
```

---

### Fase 5 — Hardening de Wrappers (cerrar escape hatches)

> **Objetivo**: Que los wrappers existentes sean el ÚNICO camino, no solo el camino sugerido.
> **Herramienta**: Refactor de barrel exports + ESLint + documentación
> **Esfuerzo**: ~2-3 horas
> **Impacto**: Alto para zonas críticas
> **Dependencia**: Fase 1 (lint ya detecta bypasses)

#### 5.1 Barrel exports restrictivos

Actualmente `@core/services/storage/index.ts` exporta TODAS las implementaciones. Solo debería exportar la facade:

| Módulo | Exportar públicamente | Mantener interno |
|--------|----------------------|-----------------|
| `storage/` | `StorageService` | SessionStorageService, PreferencesStorageService, etc. |
| `session/` | `SessionCoordinatorService` | SessionActivityService, SessionRefreshService |
| `wal/` | `WalFacadeHelper`, `WalStatusStore` | WalService, WalSyncEngine, WalDbService, etc. |
| `cache/` | `CacheInvalidationService` | CacheVersionManagerService |

**Riesgo**: Cambiar exports puede romper imports existentes. Hacer con grep previo.

#### 5.2 Patrón: lint + wrapper combinado

Para cada zona crítica, la estrategia completa es:

```
1. Wrapper existe (ya hecho)
2. Barrel export solo expone el wrapper (Fase 5.1)
3. ESLint prohíbe imports directos a implementaciones (Fase 1)
4. Test verifica que el wrapper hace lo correcto (Fase 2)
5. CI bloquea merge si algo falla (Fase 4)
```

#### Checklist Fase 5

```
[ ] Reducir exports de storage/index.ts a solo StorageService
[ ] Reducir exports de wal/index.ts a WalFacadeHelper + WalStatusStore
[ ] Reducir exports de session/index.ts a SessionCoordinatorService
[ ] Grep de imports directos → migrar a facade
[ ] ESLint rule para prohibir imports a archivos internos de wrappers
[ ] Verificar: npm run lint + npm run build pasan
```

---

## Mapa de Enforcement por Zona Crítica

| Zona | Wrapper | Lint | Test | CI | Estado actual → Objetivo |
|------|---------|------|------|----|--------------------------|
| **Sesión/Auth** | SessionCoordinator | Prohibir localStorage | Login/logout flow | Obligatorio | Wrapper solo → Full stack |
| **Storage** | StorageService | Prohibir localStorage/sessionStorage | Facade delegation | Obligatorio | Wrapper solo → Full stack |
| **HTTP** | BaseHttpService | Prohibir HttpClient en components | — | Obligatorio | Ninguno → Lint + CI |
| **WAL/Mutaciones** | WalFacadeHelper | Prohibir imports internos WAL | Commit/error callbacks | Obligatorio | Wrapper solo → Full stack |
| **Cache** | CacheInvalidation | Prohibir imports internos cache | — | Obligatorio | Wrapper solo → Lint + CI |
| **Permisos** | permisosGuard | — | Ruta exacta, sin herencia | Obligatorio | Guard solo → Test + CI |
| **Logging** | logger | no-console: error | — | Obligatorio | Warn → Error + CI |
| **Capas** | Arquitectura | Prohibir cross-imports | — | Obligatorio | Nada → Lint + CI |

---

## Orden de Ejecución Recomendado

```
Fase 1 (Lint)     ← Impacto inmediato, bajo riesgo, detecta problemas existentes
  ↓
Fase 2 (Tests)    ← Red de seguridad para zonas críticas
  ↓
Fase 4 (CI)       ← Hace las fases 1 y 2 no-opcionales (se puede adelantar si F1 está lista)
  ↓
Fase 3 (Tipos)    ← Incremental, se hace al tocar cada módulo
  ↓
Fase 5 (Barrels)  ← Cierra escape hatches, requiere lint estable
```

**Fase 3 es continua** — no necesita un sprint dedicado. Se aplica cada vez que se toca un archivo.

---

## Relación con Otras Tasks

| Task existente | Cómo se relaciona |
|---------------|-------------------|
| `higiene-estructural.md` | Fase 1 (lint de capas) refuerza las fronteras que higiene estableció |
| `archivos-grandes-refactor.md` | Fase 1 puede agregar warning de líneas. Los refactors facilitan tests (Fase 2) |
| `normalizacion-idiomatica.md` | Independiente — naming no afecta enforcement |
| `revision-codigo-muerto.md` | Fase 5 (barrel exports) puede eliminar exports de código muerto |

---

## Métricas de Éxito

| Métrica | Antes | Después de Fase 1-2 | Después de Fase 4-5 |
|---------|-------|---------------------|---------------------|
| Violaciones de capa detectables | 0 | Todas (lint) | Bloqueadas (CI) |
| Tests de invariantes | 0 | 10-15 tests críticos | Obligatorios en merge |
| `any` en services/stores | ? (auditar) | Reducido 80% | 0 en código nuevo |
| Bypass de wrappers posible | Sí (import directo) | Detectado (lint) | Bloqueado (barrel + lint) |
| CI pipeline | No existe | — | Lint + build + test |

---

## Cuándo NO aplicar enforcement

| Situación | Razón |
|-----------|-------|
| Regla depende mucho de contexto de negocio | Falsos positivos > valor |
| Wrapper solo reexporta sin agregar comportamiento | Capa tonta sin valor |
| La regla en realidad pide rediseño, no vigilancia | Lint no arregla arquitectura rota |
| Costo de mantener la regla > beneficio | Reglas de lint muy frágiles |
| Código legacy que no se va a tocar | No refactorizar "por si acaso" |
