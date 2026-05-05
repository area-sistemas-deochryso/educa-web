# 101 · BE · Asistencia admin search por DNI usa Equals, debería usar Contains (fix de 082)

> **Repo destino**: `educa-web` (main) — **el fix terminó siendo FE, no BE como suponía el título**
> **Estado**: ✅ cerrado 2026-05-05 · resolución **Opción C** (UX explicativo, sin schema change)
> **Creado**: 2026-05-04 · **Modo sugerido**: `/execute` (cambio chico, scope claro)
> **Origen**: smoke Cowork 2026-05-04 caso O-1 ❌

## Resolución (2026-05-05)

**Hallazgo de la investigación**: el título "Equals → Contains" era una hipótesis incorrecta. La búsqueda ya usa **hash SHA-256 del DNI completo** (`EST_DNI_Hash`/`PRO_DNI_Hash`/`DIR_DNI_Hash`) en `AsistenciaAdminQueryRepository.cs:78-85, 164-171, 243-250`. El comentario del código línea 75-77 ya documentaba: *"Partial DNI no es posible (SHA-256 no preserva subcadenas)"*. Cambiar Equals → Contains no hace nada útil sobre un hash criptográfico.

**Decisión**: Opción C — sin schema change, sin migración. Clarificar el constraint al usuario en el placeholder + tooltip.

**Cambio aplicado**: `src/app/features/intranet/pages/admin/attendances/attendances.component.html:171-178`

```diff
- placeholder="Buscar por nombre o DNI..."
+ placeholder="Buscar por nombre/apellido o DNI completo (8 dígitos)"
+ pTooltip="Por seguridad, el DNI está encriptado: la búsqueda parcial por DNI no es posible. Use los 8 dígitos exactos o busque por nombre/apellido."
+ tooltipPosition="bottom"
```

**Validación**: lint del archivo modificado pasa sin warnings.

**Aprendizajes transferibles**:

- Antes de aceptar un título de brief que sugiere fix mecánico, verificar el código real — el título puede arrastrar una hipótesis que no aplica.
- Constraint de encriptación AES-256 + hash SHA-256 sobre PII (DNI/nombres) **no admite búsqueda parcial sin schema change** (columna hash auxiliar como Last4Hash). Documentar el constraint en UX (tooltip) antes que cambiar el modelo cripto.
- Memoria del proyecto `project_encrypted_fields_in_queries.md` confirma el patrón: usar nombre+apellido+grado+sección para listados, no DNI parcial.

## Hallazgo (original)

Search por DNI en `/intranet/admin/asistencias` no permite búsqueda parcial:

| Input | Resultado | Esperado |
|---|---|---|
| `76357038` (8 dígitos exactos) | 1 match ✅ | 1 match ✅ |
| `7635` (parcial) | 0 matches ❌ | ≥1 matches |
| `763` (parcial) | 0 matches ❌ | ≥1 matches |
| Apellido parcial | matches ✅ | matches ✅ |

Predicado actual del DNI parece ser `Equals` (o `==` con valor completo). Brief 082 (cowork F-011) había sugerido **Contains** para soportar búsqueda parcial — el código deployado no lo refleja.

## Causa raíz probable

En el repository de búsqueda admin de asistencia (probablemente `AsistenciaAdminQueryRepository.cs` o `ConsultaAsistenciaRepository.cs`), el predicado de DNI:

```csharp
// ❌ Actual (probable)
.Where(a => a.Persona.Dni == filtro.Dni)

// ✅ Esperado
.Where(a => a.Persona.Dni.Contains(filtro.Dni))
```

**Constraint adicional**: el campo `EST_DNI` / `PRO_DNI` está **encriptado AES-256 binario** (ver memoria `project_encrypted_fields_in_queries.md`). Un `Contains` sobre un campo encriptado **no funciona** porque la encriptación es no-determinística (mismo plaintext → distinto ciphertext). Ese es probablemente **el motivo real de Equals**: el dev original asumió que Contains iba a fallar en runtime y dejó Equals.

→ El fix verdadero requiere o bien:
- **Opción A**: agregar columna hash determinística adjunta (`EST_DNI_Hash` con SHA-256 truncado de los últimos 4) y filtrar con `Contains` sobre el hash. Solo permite búsqueda por sufijo, pero es lo que el usuario realmente busca.
- **Opción B**: traer todos los registros, descifrar en memoria, filtrar con `Contains` en LINQ-to-objects. Caro para tabla grande.
- **Opción C**: index full-text sobre el campo encriptado — no funciona, sigue sin matchear partials.

## Scope del fix

**Investigate (1ra fase, 30 min)**:
- Confirmar la implementación actual del predicado en el repo.
- Confirmar el shape de la columna DNI (encriptada o plana) — leer `ApplicationDbContext` y configuración EF.
- Verificar si ya existe una columna hash o índice auxiliar.

**Design (2da fase)**:
- Decidir Opción A/B/C con el usuario. **Recomendación previa: Opción A** (hash de los últimos 4 dígitos en columna nueva), consistente con `DniHelper.Mask(dni)` que ya enmascara como `***1234`.
- ADR si la decisión es no trivial.

**Execute (3ra fase)**:
- Migration SQL para columna nueva (si Opción A) — **mostrar al usuario antes de ejecutar** (regla de migración).
- Backfill de la columna desde el AES descifrado.
- Ajustar repositorio + service + (si aplica) DTO.
- Tests de la query con DNI parcial vs completo.

## Repro mínimo

1. Login Director.
2. `/intranet/admin/asistencias`.
3. Tab gestión, filtro DNI:
   - Input `76357038` → confirmar matches (sanity).
   - Input `7635` → confirmar 0 matches (bug).
4. Esperado tras fix: ambos retornan matches.

## Tests

- Spec de `AsistenciaAdminQueryRepository` (o el que aplique) con casos:
  - DNI exacto match.
  - DNI sufijo 4 dígitos match (Opción A).
  - DNI sufijo 3 dígitos sin match (Opción A no soporta <4).
  - DNI inexistente sin match.

## Severidad

**Media** — la búsqueda funciona con DNI completo. La parcial es UX, no bloqueante. Pero F-011 fue feedback del usuario directo, así que cierra deuda con la operación.

## Referencias

- Brief original: `awaiting-prod/082-cowork-f011-be-asistencia-admin-search-dni.md` (mover a closed/ tras este fix con nota de superseded).
- Memoria del proyecto: `project_encrypted_fields_in_queries.md` — `EST_DNI`/`PRO_DNI` son AES-256.
- Helper: `Helpers/DniHelper.cs` — máscara `***1234`.
- Reglas: `rules/backend.md` §"Migraciones y Scripts SQL".
