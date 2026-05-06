# FE — Deep-link `/admin/asistencias?dni=...` no dispara refetch server-side

> **Repo destino**: `educa-web` (main)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-06 · **Modo sugerido**: `/execute` → `/validate`
> **Origen**: smoke Cowork 2026-05-06 caso 082 parcial (API funciona, deep-link cross-role NO).
> **Bloquea a**: cierre completo del Plan 23 Chat 5 (cross-link Profesores).

## CONTEXTO

El brief 082 (`closed/`) corrigió el predicado `search` del endpoint `/api/asistencia-admin/dia` para matchear DNI + nombre + nombre concatenado. La API funciona end-to-end (verificado por Cowork 2026-05-06: 3/4 búsquedas exitosas, la 4ta es limitación AES-256 conocida en `project_encrypted_fields_in_queries.md`).

**Bug residual descubierto en el smoke**: el deep-link cross-role no actualiza la tabla. Navegar a:

```
/intranet/admin/asistencias?tab=gestion&tipoPersona=P&dni=76357038&fecha=2026-04-29
```

resulta en:

- ✅ Tab `gestion` activado.
- ✅ Filtro `tipoPersona=P` aplicado.
- ✅ Fecha cargada en el calendar.
- ✅ Input search muestra `76357038`.
- ❌ **Tabla muestra "No hay registros"** aunque la API devuelve 1 fila si se llama directo.

## CAUSA RAÍZ

`attendances-data.facade.ts:228-230`:

```typescript
onSearch(term: string): void {
  this.store.setSearchTerm(term);
}
```

`onSearch` solo actualiza `searchTerm` en el store. **No dispara `loadItems()` ni `loadData()`**. La filtración asume **client-side** sobre las filas ya cargadas.

Flujo del deep-link (en `attendances.component.ts:201-223`):

1. `ngOnInit` ejecuta `loadData()` sin search → trae primeras 10 filas.
2. `subscribeToQueryParams()` lee `dni`, `tipoPersona`, `fecha` de queryParams.
3. Para `tipoPersona`: `onTipoPersonaChange()` SÍ refetch (`loadItems()` en línea 236).
4. Para `fecha`: `onFechaChange()` SÍ refetch (`loadData()` en línea 218).
5. Para `dni`: `onSearch(dni)` **NO refetch**. Solo setea filtro local.
6. El `computed` `filteredItems` filtra las 10 filas iniciales por `searchTerm`. Si el DNI no está en esas 10, devuelve 0.

## OBJETIVO

Que el deep-link con `?dni=` (o `?search=`) muestre la fila correcta inmediatamente, sin requerir interacción del usuario.

## ALCANCE

### IN

**Opción A (recomendada): hacer search server-side**

1. Modificar `onSearch(term)` en `attendances-data.facade.ts:228-230`:
   ```typescript
   onSearch(term: string): void {
     this.store.setSearchTerm(term);
     this.store.setTableReady(false);
     this.loadItems();  // ← nuevo
   }
   ```
2. Verificar que `loadItems()` envía `searchTerm` como query param `?search=...` al endpoint. Si no lo hace, ajustar el método para incluirlo (igual que `tipoPersonaFilter`).
3. **Debounce**: el input search del usuario va a disparar refetch en cada tecla. Agregar debounce 300ms vía RxJS Subject en el facade (patrón de `users-data.facade.ts` o similar). El deep-link inicial salta el debounce porque viene de queryParam, no de input.
4. **Loading**: setear `tableReady(false)` antes del refetch para que el skeleton aparezca en lugar de "No hay registros" engañoso.

**Opción B (alternativa): seed inicial con search**

Si Opción A es demasiado invasiva (otros consumidores de `onSearch` no quieren refetch), modificar solo `subscribeToQueryParams`:

```typescript
const dni = params.get('dni');
if (dni) {
  this.dataFacade.setSearchAndReload(dni);  // método nuevo que combina set + reload
}
```

Crea método explícito `setSearchAndReload(term: string)` en el facade que solo se usa para deep-links.

### OUT

- Cambiar el shape del endpoint o el predicado SQL — el brief 082 ya lo hizo y funciona.
- Resolver la limitación AES-256 sobre `Contains` en `PRO_DNI` (DNI parcial). Está documentado como riesgo conocido y requiere una decisión separada (denormalizar DNI a una columna hash searchable).

## VALIDACIÓN

- Test e2e (Vitest + Angular testing): cargar componente con queryParams `{ dni: 'X', fecha: 'Y', tipoPersona: 'P' }` → mock del API recibe `?search=X&fecha=Y&tipoPersona=P` → tabla muestra la fila mockeada.
- Smoke manual prod: deep-link desde Profesores (`/intranet/asistencia` → 5to Primaria A → tab Profesores → click pencil) aterriza en admin con la fila visible.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Otros consumidores de `onSearch` (input del usuario) sufren regresión por debounce | Implementar el debounce dentro del facade, no en el componente |
| Race condition: `subscribeToQueryParams` ejecuta antes de `loadData()` inicial | Asegurar orden con `take(1)` + `concatMap`, o setear flag `_initialQueryHandled` |
| El input search del usuario regresional dispara refetch en cada tecla | Confirmar debounce 300ms aplicado |

## REFERENCIAS

- Origen del bug: `chats/closed/082-cowork-f011-be-asistencia-admin-search-dni.md` (BE fix correcto, FE wiring incompleto).
- Componente: `educa-web/src/app/features/intranet/pages/admin/attendances/attendances.component.ts:201-223`.
- Facade: `educa-web/src/app/features/intranet/pages/admin/attendances/services/attendances-data.facade.ts:228`.
- Smoke report: `educa-web/.claude/claude-cowork/post-deploy-2026-05-06.md` CASO 082.
- Limitación AES-256 conocida: memoria global `project_encrypted_fields_in_queries.md`.
