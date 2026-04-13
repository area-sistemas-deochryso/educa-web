# ESLint `structure/no-deep-relative-imports` — Imports con 3+ niveles de subida

> **Estado**: ✅ COMPLETADO (2026-04-11)
> **Origen**: Regla `structure/no-deep-relative-imports` agregada 2026-04-11
> **Violaciones iniciales**: 69 imports en 39 archivos
> **Violaciones finales**: 0
> **Prioridad**: Alta — revelaba violaciones de scope y acoplamiento cross-feature

---

## Regla

```javascript
'structure/no-deep-relative-imports': 'error'
```

Un archivo solo puede importar de:
- **Hermanos** (`./foo`) o **hijos** (`./sub/foo`)
- **Padre inmediato** (`../foo`) o **abuelo** (`../../foo`)
- **Aliases globales** (`@core`, `@shared`, `@features/*`, `@intranet-shared`, `@data`)

**Prohibido**: `../../../foo` o más profundo.

---

## Resultado

Todos los imports profundos fueron reemplazados por aliases globales `@features/*` (patrón ya existente en el proyecto). No hubo movimientos físicos de archivos en esta fase — los alias cumplen la regla porque son globales.

### Fixes aplicados por causa raíz

| Causa | Archivos | Fix |
|---|---:|---|
| Cursos profesor → `../../../models` | 14 | Alias `@features/intranet/pages/profesor/models` |
| Classrooms tabs + notas estudiante → `../../../models` y facades | 11 | Alias intra-rol `@features/intranet/pages/{estudiante\|profesor}/...` |
| Campus 3D services → `../../../models` | 5 | Alias `@features/intranet/pages/cross-role/campus-navigation/models` |
| Cross-feature → `CampusNavigationComponent` | 2 | Alias directo |
| Estudiante → Profesor summary dialogs | 1 | Alias directo |
| Asistencia cross-role → `components/attendance/` y `services/attendance/` | 9 | Alias `@features/intranet/{components,services}/attendance/` |

**Total**: ~42 archivos tocados. Ver [.claude/plan/eslint-unblock-frontend.md](../plan/eslint-unblock-frontend.md) para el detalle del proceso.

---

## Follow-ups opcionales (no bloquean build)

Algunos de los fixes son "alias directos a carpetas privadas de otros roles" que funcionan pero conceptualmente violan el aislamiento cross-feature. Si se quiere refactor estructural futuro:

1. **`archivos-summary-dialog` y `tareas-summary-dialog`** (profesor/cursos/components) los consume estudiante/cursos. Son presentacionales — moverlos a `@intranet-shared/components/` sería más correcto.
2. **`CampusNavigationComponent`** se usa desde estudiante y profesor classroom dialogs. Exponerlo vía barrel en `@intranet-shared` sería más limpio que el alias directo.
3. **`components/attendance/` y `services/attendance/`** viven en `features/intranet/` raíz. Están consolidados como cross-role — podrían moverse a `@intranet-shared/attendance/` para clarificar que son compartidos.

Estos movimientos son cosmética arquitectónica, no afectan runtime ni lint. Se pueden abordar junto con la normalización idiomática `attendance-*` ↔ `asistencia-*`.
