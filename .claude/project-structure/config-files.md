# Archivos de Configuración

| Archivo | Propósito |
| --- | --- |
| `angular.json` | Angular CLI config |
| `tsconfig.json` | TypeScript con path aliases |
| `eslint.config.js` | ESLint 9 flat config |
| `vite.config.ts` | Vitest config |
| `src/app/config/environment*.ts` | Variables de entorno |
| `public/sw.js` | Service Worker (cache + offline) |

## Path Aliases (tsconfig.json)

- `@app/*` → `src/app/*`
- `@core` / `@core/*` → `src/app/core`
- `@shared` / `@shared/*` → `src/app/shared`
- `@features/*` → `src/app/features/*`
- `@config` → `src/app/config`
- `@data/*` → `src/app/data/*`
