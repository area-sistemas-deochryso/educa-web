# Auditoría de paginación de tablas — `[totalRecords]` real vs estimado

> **Estado**: 🟡 abierto · **Origen**: 2026-04-25 · `error-logs` mostraba "Página 1 de 2" al cargar y revelaba el total real (30 páginas) solo avanzando una a una.
>
> **Fix de referencia**: `Educa.API master 7e9d10b` (endpoint `/count`) + `educa-web main 1a13062` (consumo + fallback).
>
> **Regla canónica**: ver [`.claude/rules/pagination.md`](../rules/pagination.md). Toda decisión de implementación que cite este plan se rige por esa regla.

---

## Por qué este plan existe

Cualquier tabla que **pagine del lado del servidor** sin exponer el total real cae en el mismo síntoma:

- El usuario ve un paginador con 1-2 páginas aunque haya cientos.
- Para descubrir el total real hay que avanzar página por página.
- Filtrar reinicia el descubrimiento.
- Si el contador se basa en `offset + pageSize + 1` (estimación progresiva), **siempre** miente cuando la página actual está llena.

Las tablas que paginan **client-side** no caen en este síntoma — PrimeNG conoce el total del array completo. El problema solo aparece cuando el BE recorta los resultados antes de mandarlos.

---

## Cómo decidir si una tabla necesita el fix

**Test rápido por archivo**:

1. ¿La página tiene `<p-table>` con `[paginator]="true"` o `<p-paginator>` standalone? → seguir; si no, no aplica.
2. ¿El service del feature recibe `pagina` / `pageSize` y los manda al BE? Si **no**, es client-side → **no aplica**.
3. Si **sí** envía pagina+pageSize, ¿el shape de la respuesta incluye `total` (o equivalente)?
   - **Sí, hay total** → ya está bien (variante A del rule). Marcar ✅.
   - **No hay total**, el FE estima con `offset + pageSize + 1` o `+ items.length` → ❌ aplica fix.
4. Si el endpoint sí pagina pero no expone total, hay que decidir:
   - **Variante A**: cambiar la respuesta a `{ data, total, page, pageSize }`. Mejor para endpoints nuevos o internos.
   - **Variante B**: agregar endpoint paralelo `/count` con los mismos filtros. Mejor cuando el endpoint existente tiene varios consumidores y no se quiere romper.

---

## Inventario actual (snapshot 2026-04-25)

Listado de tablas paginadas detectadas en el proyecto + estado.

### Server-side con total expuesto ✅ (ya correcto)

| Feature | Ruta | Wrapper / Endpoint count | Notas |
|---------|------|-------------------------|-------|
| `usuarios admin` | `/intranet/admin/usuarios` | Wrapper `{ data, page, pageSize, total }` | `usuarios-data.facade.ts` consume `paginated.total` y lo persiste en store via `setPaginationData`. |
| `horarios admin` | `/intranet/admin/horarios` | Wrapper paginado | `horarios-data.facade.ts:269` setea `page/pageSize/total` desde la response. |
| `vistas admin` | `/intranet/admin/vistas` | Wrapper paginado | `getVistasPaginated` devuelve `{ data, page, pageSize, total }`. |
| `permisos por rol admin` | `/intranet/admin/permisos/roles` | Wrapper paginado | `permisos-roles.facade.ts:63` y `:196` setean `total`. |

### Server-side con count separado ✅ (fixed 2026-04-25)

| Feature | Ruta | Endpoint count | Commits |
|---------|------|---------------|---------|
| `error-logs admin` | `/intranet/admin/trazabilidad-errores` | `GET /api/sistema/errors/count` | BE `7e9d10b`, FE `1a13062` |

### Client-side ✅ (no aplica)

PrimeNG ya conoce el total del array completo. Estas tablas reciben todo el listado en una sola request:

- `cursos admin`
- `salones admin`
- `eventos-calendario admin`
- `notificaciones admin`
- `email-outbox admin` (paginación in-memory sobre el listado completo)
- `rate-limit-events admin` (cap 500 en BE; se trae todo)
- `feedback-reports admin`
- `permisos por usuario admin`

> **Cuidado**: si alguna de estas crece y empieza a tardar, hay que migrar a server-side. Hoy todas tienen ≤ 500 filas en producción real.

### 🔍 A verificar (pendiente de auditar en este chat)

Estas tienen `<p-paginator>` en el template y/o `setPage`/`onLazyLoad`, pero no tuve tiempo de leer el shape de la response BE en este plan. Cada una requiere abrir el service+facade y aplicar el test rápido de arriba:

| Feature | Ruta | Estado | Riesgo |
|---------|------|--------|--------|
| `attendances admin` | `/intranet/admin/asistencias` | 🔍 verificar | Probablemente client-side (lista del día) — bajo riesgo |
| `attendance-reports cross-role` | `/intranet/profesor/reportes-asistencia` y `/director/...` | 🔍 verificar | Mediano: reportes con muchas filas posibles |
| `email-outbox-diagnostico` | `/intranet/admin/email-outbox/diagnostico` | 🔍 verificar | Pagina por correo individual; cap 50 por BE — bajo riesgo |
| `email-outbox-dashboard-dia` | `/intranet/admin/email-outbox/dashboard-dia` | 🔍 verificar | Tabla de fallos; cap por día — bajo riesgo |
| `attendance-day-list` (componente embebido) | varios | 🔍 verificar | Embebido en varias páginas; verificar caso por caso |
| `responsive-table` (componente shared) | shared | 🔍 verificar | Si paga el BE, verificar; si solo proxy del array, no aplica |
| `student-attendance-tab` | `/intranet/estudiante/...` | 🔍 verificar | Por estudiante, lista acotada — bajo riesgo |
| `attendance-summary-panel` (profesor) | `/intranet/profesor/...` | 🔍 verificar | Acotado por curso — bajo riesgo |

---

## Cómo ejecutar la auditoría (chat dedicado)

1. **Por cada feature 🔍**, abrir su `.facade.ts` y/o `.service.ts`. Buscar:
   - ¿Llama al BE con `pagina` y `pageSize`?
   - ¿La response tiene `total` u otro campo de cuenta?
   - ¿El componente usa `[totalRecords]="vm().total"` directo o calcula con estimación?

2. **Clasificar**:
   - **Server-side con total expuesto** → mover a la tabla "✅ ya correcto".
   - **Client-side** → mover a "no aplica".
   - **Server-side sin total** → agregar a la tabla "❌ requiere fix" con su propuesta (variante A o B).

3. **Aplicar fix** (si aplica):
   - **Variante A** (cambiar response): mejor cuando el endpoint solo lo consume el FE actual.
   - **Variante B** (`/count` paralelo): mejor cuando el endpoint tiene consumidores externos o la response es estable.

4. **Validar**: lint, build, tests. Browser check de "X páginas reales" desde el primer load.

---

## Criterios de cierre del plan

- [ ] Cada fila 🔍 del inventario tiene status final ✅ o ❌+propuesta.
- [ ] Cada ❌ tiene su fix implementado y commit asociado.
- [ ] Suite FE verde + browser check.
- [ ] Plan movido a `history/planes-cerrados.md` cuando todo el inventario esté en ✅.

---

## Trampas conocidas

1. **Filtros divergentes entre listado y count**: si extraés filtros a un método compartido, asegurarte que listado y count consumen el mismo. Ejemplo del fix `error-logs`: `AplicarFiltros(...)` privado static lo garantiza.

2. **Mutación quirúrgica que no decrementa el total**: al borrar un item localmente, el `_totalCount` debe bajar 1; si no, el paginador queda inconsistente con la lista. Patrón en el `removeItem` del store.

3. **Doble fetch al paginar**: cambiar de página NO requiere recalcular el count (los filtros no cambiaron). Solo `loadData` (refresh + cambio de filtro) dispara `loadCount` en paralelo. Si `loadPage` también recarga el count, duplicás la carga del BE en cada click del paginador.

4. **SW cache stale**: si la app usa SWR (Service Worker) y se invalida el cache del listado tras una mutación, el count también debe invalidarse o reflejar la mutación local. Acoplar SW invalidation entre listado y `/count` usando el mismo prefix.

5. **Fail-safe**: si el `/count` falla, **NO romper la página**. Dejar el total como `null` y caer al estimate progresivo. El paginador queda en modo degradado pero la lista funciona.

---

## No alcance

- **Cambios a páginas client-side por bajo rendimiento**: cuando el JSON pesa demasiado, hay que migrar a server-side desde un plan dedicado, no desde este. Este plan solo cierra el bug del paginador.
- **Tests de paginación**: cada feature ya tiene su suite. Este plan reusa tests existentes; si un fix introduce un comportamiento nuevo (ej: `loadCount`), agregar test mínimo de ese método.
- **Refactor del wrapper paginado**: si una feature está hoy en variante A pero querríamos B (o viceversa), eso es deuda separada. Este plan no migra entre variantes.
