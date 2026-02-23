# Debug

Guías de debugging y troubleshooting para el proyecto.

## Sistema de Debug

El proyecto cuenta con un `DebugService` avanzado con filtrado por tags. Ver documentación completa en:

→ `@.claude/rules/debug.md`

## Activar debug en runtime

```javascript
// En consola del navegador:
localStorage.setItem('DEBUG', '*');           // Todos los tags
localStorage.setItem('DEBUG', 'UI:*');        // Solo UI
localStorage.setItem('DEBUG', 'API:*');       // Solo API calls
localStorage.setItem('DEBUG', 'STORE:*');     // Solo stores
location.reload();                            // Recargar para aplicar
```

## Troubleshooting común

| Problema | Causa probable | Solución |
| --- | --- | --- |
| Scroll desaparece al cerrar dialog | `@if` envolviendo overlay PrimeNG | Remover `@if`, dejar overlay siempre en DOM |
| Dropdown cortado en dialog | Falta `appendTo="body"` | Agregar `appendTo="body"` al componente |
| Datos no se actualizan en tabla | Falta mutación quirúrgica en store | Usar `updateItem()` en vez de `loadData()` |
| Memory leak en navegación | Falta `takeUntilDestroyed` | Agregar a todas las subscripciones |
