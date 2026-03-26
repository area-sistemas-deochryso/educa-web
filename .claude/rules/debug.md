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
