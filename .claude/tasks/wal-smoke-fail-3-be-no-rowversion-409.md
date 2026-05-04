# WAL Smoke Caso 3 — bloqueado: BE no genera 409 con rowVersion stale

**Fecha**: 2026-05-04
**Commit FE**: `478df42`
**Caso**: 3 — Conflicto 409 (mismo item desde 2 tabs)
**Resultado**: bloqueado por BE — no es regresion del WAL

## Sintoma

El smoke del Caso 3 no puede validar el path `CONFLICT` del WAL porque el endpoint
`PUT /api/sistema/cursos/{id}/actualizar` devuelve **200 OK** incluso cuando el
`rowVersion` enviado por el cliente es claramente stale.

## Repro minimo (sin tocar 2 tabs)

Desde la consola del browser, autenticado como Director, en `/intranet/admin/cursos`:

```js
// 1. Obtener rowVersion actual del curso 31
fetch('/api/sistema/cursos/listar?page=1&pageSize=10&search=WAL-SMOKE-3', {credentials:'include'})
  .then(r => r.json())
  .then(d => console.log('rowVersion actual:', d.data.data[0].rowVersion));
// → "AAAAAAAArdg="  (ejemplo)

// 2. PUT con rowVersion explicitamente stale ("AAAAAAAAAQE=")
const csrf = document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('XSRF-TOKEN='))?.split('=')[1];
fetch('/api/sistema/cursos/31/actualizar', {
  method: 'PUT',
  headers: {'Content-Type':'application/json', 'X-XSRF-TOKEN': csrf},
  credentials: 'include',
  body: JSON.stringify({nombre:'WAL-SMOKE-3-CONFLICT-TEST', estado:true, gradosIds:[], rowVersion:'AAAAAAAAAQE='})
}).then(async r => console.log({status: r.status, body: await r.text()}));
// Esperado: status 409
// Obtenido: { status: 200, body: '{"success":true,"message":"Curso actualizado exitosamente"}' }
```

## Reproduccion del flujo de 2 tabs (smoke original)

1. Tab A y Tab B abiertos en `/intranet/admin/cursos`, mismo Chrome perfil Sistemas.
2. Ambos tabs hacen reload (`F5`) para sincronizar `rowVersion` del curso `WAL-SMOKE-3-A`.
3. Tab A: edita, cambia nombre a `WAL-SMOKE-3-A2`, **NO** guarda (mantiene snapshot
   de `rowVersion` vN en `selectedItem`).
4. Tab B: edita el mismo curso, cambia a `WAL-SMOKE-3-B2`, guarda → **200 OK** (BE
   incrementa `rowVersion` a vN+1).
5. Tab A: guarda → PUT con `rowVersion = vN` → **200 OK** (esperado: 409).
6. La fila queda con el nombre del ultimo write (`WAL-SMOKE-3-A2`), sin que el WAL
   marque CONFLICT y sin rollback.

## Estado del WAL durante el flujo

- IDB `wal-entries`: 0 entries al final del flujo (entry committed por path 200, no
  CONFLICT).
- Engine no emite `entryProcessed$` con `status: 'CONFLICT'`.
- Callback `onError` no se invoca → no hay toast de conflicto.

Esto **no es un fallo del WAL**: el WAL processa correctamente el 200 que recibe.
El gap esta en el BE: no enforce concurrencia optimista a pesar de que el codigo
SI llama a `SetOriginalRowVersion`.

## Causa raiz probable (a confirmar)

`Educa.API/Services/Academico/CursosService.cs` ActualizarCurso:

```csharp
var curso = await _cursoRepo.GetByIdAsync(cursoId)  // ← carga con rowVersion ACTUAL (vN+1)
    ?? throw new NotFoundException(...);

curso.CUR_Nombre = dto.Nombre;
// ...
await _cursoRepo.UpdateAsync(curso, dto.RowVersion);  // ← pasa rowVersion del cliente (vN)
```

Y en `BaseRepository.UpdateAndSaveAsync`:

```csharp
if (!string.IsNullOrEmpty(rowVersion) && !string.IsNullOrEmpty(rowVersionProperty))
    _context.SetOriginalRowVersion(entity, rowVersion, rowVersionProperty);

_context.Set<T>().Update(entity);
await _context.SaveChangesAsync(ct);
```

Hipotesis a verificar:
1. `_context.Set<T>().Update(entity)` despues de `SetOriginalRowVersion` puede estar
   sobreescribiendo `OriginalValue` con el rowVersion actual del entity ya tracked.
2. EF Core puede no estar incluyendo `CUR_RowVersion` en el WHERE del UPDATE.
3. El `OnModelCreating` no marca `CUR_RowVersion` como `IsRowVersion()` /
   `IsConcurrencyToken()`.

Verificar en `Data/Configurations/CursoConfiguration.cs` si el property tiene
`.IsRowVersion()` o `.IsConcurrencyToken()`.

## Por que importa

Sin enforcement de concurrencia optimista en el BE:
- El path `CONFLICT` del WAL queda sin verificacion end-to-end en este CRUD.
- El engine WAL maneja correctamente el 409 si llega, pero el smoke no lo demuestra.
- Operaciones cross-tab pueden generar lost-updates silenciosos en produccion
  (ultimo write gana sin notificar al usuario).

## Proximos pasos

1. **BE** — auditar `CursoConfiguration.cs` (y por extension otras entidades con
   `*_RowVersion`) para confirmar que el property esta marcado como
   `IsRowVersion()`. Si no, agregarlo.
2. **BE** — confirmar que el handler global captura `DbUpdateConcurrencyException`
   y la mapea a HTTP 409 (probablemente en un middleware/filter).
3. **Smoke Caso 3** — re-ejecutar una vez el BE devuelva 409. Si pasa, mover este
   archivo a `tasks/done/` o eliminarlo.

## Aprendizaje

Cuando un caso del smoke falla pero el path bajo prueba es del FE, verificar
primero la precondicion del BE con un repro directo (un solo `fetch` con
rowVersion forzado stale) antes de asumir regresion del FE.
