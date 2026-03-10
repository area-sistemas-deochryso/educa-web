# Rate Limiting y Control de Requests

## Proteccion Global

El proyecto tiene un **rateLimitInterceptor** en `@core/interceptors/rate-limit/` que:

- Limita requests concurrentes a la API (`MAX_CONCURRENT = 10`)
- Encola requests excedentes (hasta `MAX_QUEUE_SIZE = 30`)
- En 429: espera 2s y reintenta una vez
- Rechaza inmediatamente si la cola esta llena

**No requiere configuracion por feature** — se aplica automaticamente a todas las requests `/api/*`.

---

## Reglas para Facades y Servicios

### NUNCA pre-cargar datos masivamente

```typescript
// INCORRECTO - Dispara N+1 requests al abrir un dialogo
contenido.semanas.forEach((s) => {
  this.loadMisArchivos(s.id);           // 16 calls
  s.tareas.forEach((t) =>
    this.loadMisTareaArchivos(t.id));   // 66+ calls
});

// CORRECTO - Lazy load cuando el usuario expande/interactua
onAccordionTabOpen(semana: SemanaDto): void {
  this.facade.loadMisArchivos(semana.id);
  semana.tareas.forEach((t) => this.facade.loadMisTareaArchivos(t.id));
}
```

### SIEMPRE usar guards de carga en facades

```typescript
// CORRECTO - Previene requests duplicados
loadContenido(horarioId: number): void {
  if (this.store.contentLoading()) return;  // Guard
  this.store.setContentLoading(true);
  // ...
}

// CORRECTO - Cache por ID ya cargado
loadMisArchivos(semanaId: number): void {
  if (this.store.loadedSemanas().includes(semanaId)) return;  // Cache
  // ...
}
```

### withRetry NO reintenta 429

El helper `withRetry` esta configurado para **no reintentar 429** (Too Many Requests). Reintentar empeora el rate limiting.

Solo reintenta: timeouts de red, 5xx del servidor, 408 Request Timeout.

---

## Checklist

```
PREVENCION
[ ] No hay forEach que dispare N requests en cascada al abrir UI?
[ ] Datos se cargan lazy (al interactuar) no eager (al abrir)?
[ ] Facades tienen guards de loading? (if loading return)
[ ] Datos ya cargados tienen cache? (if loaded.includes(id) return)

GLOBAL
[ ] rateLimitInterceptor esta en app.config.ts?
[ ] withRetry NO reintenta 429?
```
