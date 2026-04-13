# ESLint

El proyecto usa **ESLint 9** con flat config (`eslint.config.js`).

## Comandos

```bash
npm run lint           # Ejecutar ESLint
npm run lint:fix       # ESLint con auto-fix
```

## Reglas generales

| Regla | Nivel | Descripción |
|-------|-------|-------------|
| `no-console` | error (excepto error, warn) | Usar `logger` en su lugar |
| `@typescript-eslint/no-explicit-any` | warn | Evitar `any`, tipar correctamente |
| `@typescript-eslint/no-unused-vars` | warn (ignora `_prefix`) | Variables no usadas |
| `@angular-eslint/prefer-standalone` | error | Componentes standalone obligatorios |
| `@angular-eslint/component-selector` | error | kebab-case con prefijo `app` |

## Reglas contra crecimiento desproporcionado

| Regla | Nivel | Qué prohíbe |
|-------|-------|-------------|
| `max-lines` | error (300 líneas, skip blanks+comments) | Archivos > 300 líneas. Excepciones: `*.spec.ts`, escape hatch a nivel de archivo |
| `structure/no-deep-relative-imports` | error | Imports relativos con 3+ niveles de subida (`../../../`). Usar alias o reestructurar |
| `structure/no-repeated-blocks` | warn | Secuencias de 5+ sentencias que aparecen 3+ veces en el mismo archivo |
| `structure/no-compact-trivial-setter` | warn | Setters triviales compactados en una línea (delegación 1:1 a signal/store) |

### Regla 1 — `max-lines` (300)

Límite duro de 300 líneas por archivo TS (sin contar líneas en blanco ni comentarios). Consistente con la regla del backend en `backend.md`.

**Escape hatch a nivel de archivo** (la única regla que requiere comentario de bloque):

```typescript
/* eslint-disable max-lines -- Razón: <justificación específica> */
```

Debe ir en la **primera línea** del archivo. La razón debe ser específica (ej: "archivo de traducciones i18n — crecimiento lineal por idioma"). Si 3+ archivos requieren la misma justificación, es señal de que la regla está mal aplicada a ese tipo de archivo — agregar excepción por patrón en `eslint.config.js`.

### Regla 2 — Agrupación por subcarpetas (convención)

> **"Archivos relacionados viven juntos en una subcarpeta, no mezclados con no relacionados."**

Esta regla **no es enforceable con ESLint** (es estructural al árbol de archivos). Aplica en code review y al crear archivos nuevos.

**Criterio**: si una carpeta contiene 5+ archivos `.ts` al mismo nivel (sin contar `index.ts`), deben agruparse en subcarpetas por tipo o por dominio.

| ✅ Correcto | ❌ Incorrecto |
|-------------|---------------|
| `pages/admin/cursos/components/cursos-header.ts` | `pages/admin/cursos/cursos-header.component.ts` |
| `pages/admin/cursos/services/cursos.store.ts` | `pages/admin/cursos/cursos.store.ts` |
| `pages/admin/cursos/models/cursos.models.ts` | `pages/admin/cursos/cursos.models.ts` |

Subcarpetas estándar por feature: `components/`, `services/`, `models/`, `config/`, `pipes/`, `directives/`. Ver `architecture.md` para la estructura canónica de feature.

### Regla 3 — `structure/no-deep-relative-imports`

Un archivo solo puede importar de:
- **Hermanos** (misma carpeta): `./foo`
- **Hijos** (subcarpeta directa o nieta): `./components/foo`, `./services/nested/foo`
- **Padre inmediato** o **abuelo** (`../foo`, `../../foo`) — permitido para barrel exports cercanos
- **Aliases globales**: `@core`, `@shared`, `@features/*`, `@intranet-shared`, `@data`, `@config`

**Prohibido**: `../../../foo` o más profundo. Indica que el archivo alcanza una carpeta abuela externa sin pasar por la capa pública (alias). Reestructurar o usar alias.

### Regla 4 — `structure/no-repeated-blocks`

Detecta cuando una misma secuencia de 5+ sentencias consecutivas aparece 3+ veces en el mismo archivo. Heurística text-based después de normalizar espacios.

**Limitación**: solo detecta duplicación dentro del **mismo archivo**. Para duplicación cross-file se necesita una herramienta separada (`jscpd`, `sonarjs`) que no está integrada en el proyecto.

**Qué hacer si dispara**: extraer a una función privada del mismo archivo, helper del módulo, o método de una base class si el patrón se repite entre archivos hermanos.

### Regla 5 — `structure/no-compact-trivial-setter`

Detecta setters triviales compactados en una línea para evitar burlar `max-lines`. Un setter trivial es un método cuyo cuerpo es una sola delegación 1:1 a `this._field.method(param)` donde los argumentos coinciden exactamente con los parámetros del método.

```typescript
// ❌ Sucio — pasa max-lines pero oculta deuda estructural
setUsuarios(usuarios: UsuarioLista[]): void { this._usuarios.set(usuarios); }
setLoading(loading: boolean): void { this._loading.set(loading); }

// ✅ Honesto — si el archivo tiene muchos, refactorizar a BaseCrudStore
setUsuarios(usuarios: UsuarioLista[]): void {
  this._usuarios.set(usuarios);
}

// ✅ OK — NO es delegación trivial (hardcoded value, no param passthrough)
closeDialog(): void { this._dialogVisible.set(false); }
clearError(): void { this._error.set(null); }

// ✅ OK — NO es delegación trivial (transformación, no passthrough)
toggleExpanded(): void { this._expanded.update(v => !v); }
```

**Heurística**: un método es "delegación trivial" si (1) es one-liner, (2) su cuerpo es `this.X.Y(args)`, y (3) los args son los parámetros del método en el mismo orden. Métodos con valores hardcodeados, transformaciones o arrow functions en los argumentos NO disparan.

**Umbrales**: 1-4 instancias = `warn` individual. 5+ = `warn` con mensaje de reestructuración (BaseCrudStore, patchState, o exponer store directamente).

**Excepciones**: Base classes (`base-*.ts`) están exentas — los delegates son parte de su contrato. Escape hatch: `// eslint-disable-next-line structure/no-compact-trivial-setter -- Razón: <justificación>`.

## Reglas de arquitectura (enforcement de capas)

| Regla | Nivel | Qué prohíbe |
|-------|-------|-------------|
| `no-restricted-globals` (localStorage/sessionStorage) | error | Acceso directo fuera de `@core/services/storage/` |
| `no-restricted-imports` (shared → features) | error | `shared/` no puede importar de `@features/*` |
| `no-restricted-imports` (shared → intranet-shared) | error | `shared/` no puede importar de `@intranet-shared` |
| `no-restricted-imports` (HttpClient en components) | error | Components no pueden importar `HttpClient` (solo tipos como `HttpErrorResponse`) |
| `no-restricted-imports` (store en components) | error | Components no pueden importar `*.store.ts` directamente — consumir vía facade |
| `no-restricted-imports` (HttpClient en stores) | error | Stores no pueden importar `HttpClient` — el facade hace IO |
| `no-restricted-imports` (facade/service en stores) | error | Stores no pueden importar facades ni services — flujo es facade → store |
| `no-restricted-syntax` (subscribe en stores) | error | Stores no pueden hacer `.subscribe()` — mover al facade |
| `no-restricted-imports` (cross-facade) | warn | Facades no deben importar otros facades — evitar acoplamiento |
| `no-restricted-imports` (cross-feature) | error/warn | Features no importan de otras features (`admin/` ↔ `profesor/` ↔ `estudiante/`) |

### Principio de las reglas de capa

> **"Fácil usar bien, difícil usar mal."**

Cada capa tiene un rol específico y las reglas lo hacen cumplir:

| Capa | Hace | NO hace |
|------|------|--------|
| **Component** | Consume `facade.vm` + llama comandos del facade | Importa stores, `HttpClient`, ni hace IO |
| **Facade** | Orquesta IO (RxJS) + llama `store.setX()` | Importa otros facades (warn) |
| **Store** | Muta estado síncrono + expone `asReadonly()` | `HttpClient`, `.subscribe()`, importar facades/services |
| **Service** | Llamadas HTTP puras | Importa stores/facades |

### Escape hatch — cuándo desactivar una regla

Las reglas arquitectónicas admiten excepciones cuando el caso lo justifica. Para desactivar una regla en una línea específica, usar el formato con **descripción obligatoria**:

```typescript
// eslint-disable-next-line no-restricted-imports -- Razón: <justificación específica>
import { SomeStore } from './some.store';
```

**Reglas de la escape hatch**:

- SIEMPRE usar `// eslint-disable-next-line` (no `/* eslint-disable */` de bloque)
- SIEMPRE incluir `-- Razón: <justificación>` después del nombre de la regla
- La razón debe ser **específica al caso**, no genérica ("es más cómodo" no sirve)
- Si el mismo escape se repite en 3+ lugares, es señal de que la regla está mal diseñada o que falta una abstracción — abrir discusión en code review en lugar de proliferar escapes

**Ejemplos válidos**:

```typescript
// ✅ Caso legítimo — store global que otros stores necesitan leer por composición
// eslint-disable-next-line no-restricted-imports -- Razón: AuthStore es global y el filtro depende del userId actual
import { AuthStore } from '@core/store/auth.store';

// ✅ Caso legítimo — facade coordina con otro facade por dependencia de dominio real
// eslint-disable-next-line no-restricted-imports -- Razón: PermisosFacade se consulta porque UsuariosCrudFacade debe refrescar permisos al cambiar rol
import { PermisosFacade } from '@core/services/permisos';
```

**Ejemplos inválidos**:

```typescript
// ❌ Sin razón
// eslint-disable-next-line no-restricted-imports
import { UsersStore } from './users.store';

// ❌ Razón genérica
// eslint-disable-next-line no-restricted-imports -- es necesario
import { UsersStore } from './users.store';

// ❌ Escape de bloque (oculta múltiples violaciones)
/* eslint-disable no-restricted-imports */
```

### Excepciones configuradas

| Archivo/carpeta | Excepción | Razón |
|-----------------|-----------|-------|
| `core/services/storage/**` | `localStorage`/`sessionStorage` permitidos | Es el wrapper |
| `core/helpers/debug/**` | `localStorage` permitido | Lee flag `DEBUG` de localStorage |
| `core/services/cache/**` | `localStorage` + `console` permitidos | Infraestructura de cache |
| `core/helpers/logs/**` | `console` permitido | Es el wrapper de logging |
| `**/*.spec.ts` | `localStorage` + `console` relajados | Tests necesitan mocking |
| `shared/**/index.ts` | Re-exports `@intranet-shared` con `eslint-disable` | Migración gradual (TODO F5) |

### Violaciones conocidas (pendientes de refactor)

| Archivo | Violación | Fix pendiente |
|---------|-----------|---------------|
| `profesor/final-salones/` | Importa de `admin/salones/` | Mover `SalonesAdminTable` y `SalonDetailDialog` a `@intranet-shared` |

## Reglas deshabilitadas para PrimeNG

```javascript
// En archivos HTML — PrimeNG usa patrones que conflictúan
'@angular-eslint/template/elements-content': 'off',
'@angular-eslint/template/click-events-have-key-events': 'off',
'@angular-eslint/template/interactive-supports-focus': 'off',
'@angular-eslint/template/label-has-associated-control': 'off',
```
