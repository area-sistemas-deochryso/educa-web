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

## Reglas de arquitectura (enforcement de capas)

| Regla | Nivel | Qué prohíbe |
|-------|-------|-------------|
| `no-restricted-globals` (localStorage/sessionStorage) | error | Acceso directo fuera de `@core/services/storage/` |
| `no-restricted-imports` (shared → features) | error | `shared/` no puede importar de `@features/*` |
| `no-restricted-imports` (shared → intranet-shared) | error | `shared/` no puede importar de `@intranet-shared` |
| `no-restricted-imports` (HttpClient en components) | error | Components no pueden importar `HttpClient` (solo tipos como `HttpErrorResponse`) |
| `no-restricted-imports` (cross-feature) | error/warn | Features no importan de otras features (`admin/` ↔ `profesor/` ↔ `estudiante/`) |

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
