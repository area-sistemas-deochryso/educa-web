# Sistema de Debug

> **"Logger comunica, Debug investiga."** Logger para producción, Debug para investigación temporal con tags.

## Cuándo usar Debug vs Logger

| Situación | Usar |
|-----------|------|
| Error crítico / producción | `logger.error()` |
| Warning / info general | `logger.warn()` / `logger.log()` |
| Investigar flujo específico | `debug.dbg('TAG').info()` |
| Timing de operaciones | `debug.time()` / `timeAsync()` |
| Debugging RxJS streams | `debug.tapDbg('TAG')` / `track$('TAG')` |
| Debugging effects | `debug.effectDbg('TAG')` |
| Log solo primera vez | `debug.once()` |

## Uso básico

```typescript
private debug = inject(DebugService);
private log = this.debug.dbg('UI:MiComponente');

this.log.info('Mensaje', { data });          // INFO
this.log.trace('Detalle', { value });         // TRACE (muy detallado)
this.log.time('operacion', () => { ... });    // Timing
this.debug.tapDbg('API:Users', 'search');     // RxJS pipe
this.debug.effectDbg('STORE:Users', 'sync', (onCleanup) => { ... }); // Effect
```

## Tags: `<DOMINIO>:<ENTIDAD>` — activar en consola

```javascript
localStorage.setItem('DEBUG', 'UI:*');           // Toda la UI
localStorage.setItem('DEBUG', 'KARDEX*,API:*');   // Múltiples
localStorage.setItem('DEBUG', '*,-UI:Noisy*');    // Todo menos ruidoso
localStorage.removeItem('DEBUG');                  // Desactivar
```

Dominios: `UI`, `API`, `STORE`, `FACADE`, `KARDEX`, `ASISTENCIA`. Niveles: ERROR(0), WARN(1), INFO(2), TRACE(3).

## Reglas

- **Mantener**: Debug de flujos complejos, timing, RxJS
- **Remover**: Debug temporal de investigación de bug, antes del commit
- **Nunca**: `console.log` — siempre `logger` o `debug`

## Quirk: Angular 21 + esbuild — `isDevMode()` retorna `false` en `ng serve`

> **`logger.log()` y `logger.warn()` están gateados por `isDevMode() && !environment.production`. En Angular 21 con builder `@angular-devkit/build-angular:application` (esbuild), `ngDevMode` no se setea como global → `isDevMode()` retorna `false` incluso con `npm run start` (ng serve dev). Resultado: `logger.log()` es no-op silencioso en dev.**

### Síntoma

Agregás `logger.log('[MI-DEBUG]', ...)` para investigar un flujo, refrescás la página, **no aparece nada en consola**. Verificás que el código se ejecuta (breakpoint, `console.log` directo) y sí corre — pero `logger.log` es silencioso.

Setear `localStorage.setItem('LOG', '*')` no ayuda porque el filter pattern se evalúa **después** del gate `enabled = isDevMode() && !environment.production`.

### Causa

El builder esbuild de Angular 21 elimina `ngDevMode` durante la transformación incluso en modo dev (a diferencia del builder webpack viejo que sí lo exponía). `isDevMode()` lee `typeof ngDevMode === 'boolean'` y como es `undefined`, retorna `false`.

Verificación rápida en consola del browser:

```javascript
console.log(typeof ngDevMode); // 'undefined' en Angular 21 dev y prod
```

### Workaround para debugging temporal

Cuando necesitás logs temporales que SIEMPRE emitan (independiente del modo), usar `console.log` directo en lugar de `logger.log`. Marcar con un tag y comentario `// TEMP debug <NNN>` para encontrar y remover al cerrar el chat:

```typescript
// TEMP debug 098 — punto A: leader procesó, antes de broadcast
console.log(`[WAL-CrossTab-DEBUG] A) processEntry committed, ...`);
```

**Reglas para el workaround**:

- Solo para debugging puntual de bugs reproducibles. NO para logs permanentes.
- Tag prefijado consistente (`[FEATURE-DEBUG]`) para grepear y remover.
- Comentario `// TEMP debug <NNN>` con número de chat/brief para auditoría.
- **Removerlos antes de commitear** (validar con `grep -rn "TEMP debug" src/`).

### Cuándo NO usar el workaround

- Logs que querés persistir → usar `logger.error` (ese sí pasa el gate en producción).
- Logs estructurados de subsistema → `debug.dbg('TAG').info(...)` (consciente de que requiere `localStorage.LOG=*` Y un build donde `isDevMode() === true`, lo cual no aplica hoy en Angular 21 esbuild).

### Deuda técnica

Mientras `isDevMode()` esté roto en Angular 21 esbuild, **el sistema `DebugService` con tags está efectivamente deshabilitado en runtime**. Hay que considerar:

- Reemplazar el gate `enabled` en `core/helpers/logs/logger.ts` por un check menos frágil (ej: `!environment.production` solo, o un flag explícito `localStorage.LOG_VERBOSE`).
- Migrar el `DebugService` a usar el mismo gate.
- Crear task de seguimiento si esto bloquea más sesiones de debug.
