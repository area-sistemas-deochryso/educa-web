# Rate Limiting y Control de Requests

## Proteccion Global

El proyecto tiene un **rateLimitInterceptor** en `@core/interceptors/rate-limit/` que:

- Limita requests concurrentes a la API (`MAX_CONCURRENT = 10`)
- Encola requests excedentes hasta que se libere un slot
- **NO** sintetiza 429s ni activa cooldowns globales
- Propaga 429/503 del BE tal cual al caller (cada feature decide cómo mostrarlo)

**No requiere configuracion por feature** — se aplica automaticamente a todas las requests `/api/*`.

---

## Semántica 429 vs 503 (BE Plan 40)

El backend distingue dos tipos de rechazo. El FE debe tratarlos diferente:

| Status | Origen | `Retry-After` | Significado | Manejo recomendado |
|--------|--------|---------------|-------------|--------------------|
| **429** Too Many Requests | Capa 1: rate limiter por ventana (FixedWindow) | Ventana restante (≤ 60s) | El usuario/IP excedió su cuota por minuto. Es abuso o bug. | Mostrar mensaje claro al usuario. NO reintentar automáticamente — escala el problema. |
| **503** Service Unavailable | Capa 2/3: bulkhead de concurrencia | Dinámico = `max(1, ceil(p95 × 1.5))` (típico 1-5s) | El servidor está saturado momentáneamente. NO es abuso del cliente. | Reintentar UNA vez tras `Retry-After`. NO escalar a cooldown global. |

**Body de ambos**:
```json
{ "mensaje": "...", "retryAfterSeconds": 3, "policy": "concurrency:reports" }
```

El header `Retry-After` y `Access-Control-Expose-Headers: Retry-After` son confiables y se exponen vía CORS.

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

Reintenta con backoff exponencial: timeouts de red, 408, 500 (1 vez con delay extendido), 502/503/504 (transient infra).

> **Pendiente** (sub-task de Plan 40 F4): refinar `withRetry` para respetar el header `Retry-After` cuando el BE devuelve 503 con valor dinámico, en lugar del backoff fijo. Mientras tanto el backoff del helper (5s, 10s, 20s) suele ser ≥ al `Retry-After` real (1-5s típico), así que sobrecubre.

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
[ ] Errores 429 se muestran al usuario sin reintento automatico?
[ ] Errores 503 se reintentan UNA vez (sin cooldown global)?
```
