# ESLint

El proyecto usa **ESLint 9** con flat config (`eslint.config.js`).

## Comandos

```bash
npm run lint           # Ejecutar ESLint
npm run lint:fix       # ESLint con auto-fix
```

## Reglas importantes

| Regla | Configuración | Descripción |
|-------|---------------|-------------|
| `no-console` | warn (excepto error, warn) | Usar `logger` en su lugar |
| `@typescript-eslint/no-explicit-any` | warn | Evitar `any`, tipar correctamente |
| `@typescript-eslint/no-unused-vars` | warn (ignora `_prefix`) | Variables no usadas |
| `@angular-eslint/prefer-standalone` | error | Componentes standalone obligatorios |
| `@angular-eslint/component-selector` | kebab-case con prefijo `app` | Selectores de componentes |

## Reglas deshabilitadas para PrimeNG

```javascript
// En archivos HTML - PrimeNG usa patrones que conflictuan
'@angular-eslint/template/elements-content': 'off',
'@angular-eslint/template/click-events-have-key-events': 'off',
'@angular-eslint/template/interactive-supports-focus': 'off',
'@angular-eslint/template/label-has-associated-control': 'off',
```
