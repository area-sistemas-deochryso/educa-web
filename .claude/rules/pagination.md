# Paginación de Tablas

## Principio fundamental

> **"El paginador debe mostrar el total real desde la primera carga, no descubrirlo avanzando una a una."**

Si una tabla pagina del lado del servidor (BE devuelve solo la página actual), el FE **debe** conocer el total de filas que matchean los filtros para que `[totalRecords]` del paginador refleje la realidad. De lo contrario, el usuario se queda sin saber cuántas páginas hay y tiene que ir avanzando hasta encontrar el final.

---

## Decisión: ¿server-side o client-side?

| Característica | Client-side | Server-side |
|----------------|-------------|-------------|
| ¿Cuántas filas? | ≤ 500 | > 500 |
| ¿Filtros pesados en BD? | No | Sí |
| ¿Cambia frecuentemente? | No | Sí |
| ¿Ordenamiento por campos derivados? | OK | Difícil |
| ¿Búsqueda fulltext? | OK | Mejor server |

**Regla práctica**: si la tabla puede crecer indefinidamente con el tiempo (logs, eventos, telemetría, registros transaccionales), va **server-side**. Si es un catálogo acotado (cursos, salones, vistas, permisos), va **client-side**.

---

## Patrón client-side (default para listas acotadas)

> **"BE devuelve toda la lista. PrimeNG conoce el total y pagina solo. No hay nada especial que hacer."**

```html
<p-table
  [value]="vm().items"
  [paginator]="true"
  [rows]="15"
  [rowsPerPageOptions]="[10, 15, 25, 50]"
  [showCurrentPageReport]="true"
  currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords}"
>
  <!-- ... -->
</p-table>
```

El `[totalRecords]` lo deduce PrimeNG automáticamente del array. El usuario filtra/ordena en el cliente y ve el total real instantáneamente.

**Cuándo usar**: cursos, salones, vistas, permisos, eventos, notificaciones, email-outbox, rate-limit-events, feedback-reports — todo lo que cabe sin paginar y se trae en una sola request.

---

## Patrón server-side con total (default para listas que crecen)

> **"BE devuelve `{ data, page, pageSize, total }` o expone `/count` separado. El FE alimenta `[totalRecords]` con el total real."**

### Variante A: BE devuelve un wrapper paginado

Patrón cuando el endpoint ya está diseñado para paginar (recomendado para features nuevas):

```csharp
// BE — un solo response con la página + el total
public class PaginatedResult<T>
{
    public List<T> Data { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; }
}
```

```typescript
// FE — store guarda total, facade lo setea desde la response
loadPage(page: number, pageSize: number): void {
  this.api.getAllPaginated(page, pageSize).subscribe({
    next: (res) => {
      this.store.setItems(res.data);
      this.store.setPaginationData(res.page, res.pageSize, res.total);
    },
  });
}
```

**Ejemplos canónicos del proyecto**: `usuarios admin`, `horarios admin`, `vistas admin`. Todos usan el shape `{ data, page, pageSize, total }` y `setPaginationData`.

### Variante B: endpoints separados (listado + count)

Patrón cuando el endpoint de listado existe sin total y agregar el wrapper rompe consumidores:

```csharp
// BE — endpoint /count paralelo al listado, mismos filtros
[HttpGet("count")]
public async Task<IActionResult> ObtenerCount([FromQuery] string? filtro1, ...)
{
    var total = await _service.ObtenerCountAsync(filtro1, ...);
    return Ok(ApiResponse<int>.Ok(total));
}
```

```typescript
// FE — store con _totalCount: signal<number | null>
// Facade dispara count en paralelo al listado
loadData(): void {
  this.api.getList(...).subscribe(/* setItems */);
  this.api.getCount(...).subscribe({
    next: (count) => this.store.setTotalCount(count),
    error: () => this.store.setTotalCount(null), // fail-safe
  });
}

// Component usa total real, cae a estimación si null
readonly totalRecordsEstimate = computed(() => {
  const { page, pageSize, items, totalCount } = this.vm();
  if (totalCount !== null) return totalCount;
  // Fallback: estimación progresiva
  const offset = (page - 1) * pageSize;
  return items.length < pageSize ? offset + items.length : offset + pageSize + 1;
});
```

**Ejemplo canónico del proyecto**: `error-logs admin` (commits BE `7e9d10b` + FE `1a13062`).

**Cuándo usar variante B vs A**:

| Situación | Variante |
|-----------|----------|
| Endpoint nuevo desde cero | A (wrapper) |
| Endpoint existente con consumidores múltiples | B (`/count` separado) |
| Endpoint público que no se quiere romper | B |
| Necesidad de `count` independiente (ej: badge sin cargar lista) | B |

---

## Anti-patrón: estimación progresiva sola

> **"Sumar `pageSize + 1` cuando la página actual está llena obliga al usuario a avanzar página por página para descubrir el total."**

```typescript
// ❌ INCORRECTO — el usuario ve "Página 1 de 2" hasta que avanza
readonly totalRecords = computed(() => {
  const { page, pageSize, items } = this.vm();
  const offset = (page - 1) * pageSize;
  return items.length < pageSize ? offset + items.length : offset + pageSize + 1;
});
```

**Por qué duele**: con 30 páginas reales, el paginador muestra "1 de 2" en la primera carga. El usuario tiene que hacer click 30 veces para descubrir el total. Si filtra, el descubrimiento se reinicia.

**Cuándo se justifica**: solo como **fallback** cuando el endpoint `/count` falla. Nunca como única fuente de verdad.

---

## Reglas de implementación

### Server-side con `/count`

1. **Filtros compartidos**: extraer la lógica de filtros a un método/función reutilizable. El BE de listado y `/count` deben aplicar exactamente los mismos filtros — si difieren, el paginador miente. En el proyecto: `ErrorLogService.AplicarFiltros(...)` privado static que ambos métodos consumen.

2. **Mutación quirúrgica decrementa el count**: cuando el FE elimina un item localmente (rollback optimista o delete), el `_totalCount` debe decrementarse para mantener coherencia con la lista. Patrón:

   ```typescript
   removeItem(id: number): void {
     this._items.update((list) => list.filter((i) => i.id !== id));
     this._totalCount.update((c) => (c !== null && c > 0 ? c - 1 : c));
   }
   ```

3. **`loadPage` no recarga el count**: cambiar de página no cambia los filtros, así que el total no cambia. Solo `loadData` (refresh + cambio de filtro) debe disparar `loadCount` en paralelo. El usuario que pagina rápido no debe pagar 2N requests.

4. **Fail-safe del count**: si el count falla, dejar `null` y que el componente caiga al estimate. NUNCA romper la página por un count fallido.

5. **Cache invalidation por filtro**: si usás SWR (Service Worker) y matchás eventos de cache update, el matcher del listado y del count deben coincidir en query params. De otro modo, la lista se actualiza sin que el total reflee la realidad.

### Client-side

1. **Confiar en PrimeNG**: no calcular `[totalRecords]` manualmente. PrimeNG lo deduce del array.

2. **Filter computado**: si filtrás client-side, el computed `filteredItems` ya reduce la lista y el paginador muestra `n filas filtradas` automáticamente.

3. **No mezclar**: si la página tiene 1500 filas, no traer todo "porque PrimeNG es cómodo". Migrar a server-side con wrapper.

---

## Cuándo migrar de client-side a server-side

| Síntoma | Acción |
|---------|--------|
| El JSON de la lista pesa > 500 KB | Migrar a server-side |
| El primer paint tarda > 2s | Migrar |
| El usuario reporta lentitud al filtrar | Server-side con índice BD |
| La lista crece linealmente con el tiempo (logs, registros) | Empezar server-side desde el primer día |

---

## Checklist al crear una tabla nueva

```
DECISIÓN
[ ] ¿La lista cabe? → Client-side default (PrimeNG hace el resto)
[ ] ¿Crece sin límite? → Server-side desde el principio

SERVER-SIDE
[ ] ¿BE expone el total real? (wrapper o endpoint /count)
[ ] ¿Filtros compartidos entre listado y count? (mismo método)
[ ] ¿Store guarda totalCount o paginationData?
[ ] ¿Component usa total real, no solo estimate?
[ ] ¿Mutaciones quirúrgicas mantienen el total consistente?
[ ] ¿loadPage no recarga el count innecesariamente?
[ ] ¿Fail-safe del count cae a estimate sin romper la página?

CLIENT-SIDE
[ ] ¿Lista < 500 filas? (si no, migrar)
[ ] ¿No estás reinventando totalRecords? (déjaselo a PrimeNG)
[ ] ¿Filtros aplicados via computed? (no en pipe del template)
```

---

## Referencias del proyecto

- **Server-side variante A (wrapper)**: `usuarios admin`, `horarios admin`, `vistas admin`, `permisos-roles admin`
- **Server-side variante B (`/count` separado)**: `error-logs admin` (Educa.API master `7e9d10b` + educa-web main `1a13062`)
- **Client-side**: `cursos`, `salones`, `events-calendar`, `notificaciones-admin`, `email-outbox`, `rate-limit-events`, `feedback-reports`
