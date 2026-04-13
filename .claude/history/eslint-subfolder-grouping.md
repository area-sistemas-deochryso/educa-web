# Agrupación en Subcarpetas — Convención Estructural

> **Estado**: Vigente — convención de code review, no automatizable (revisado 2026-04-13)
> **Origen**: Regla 2 de `eslint.md` (convención, no enforceable por ESLint)
> **Total**: 18 carpetas con 5+ archivos `.ts` planos (sin subcarpetas)
> **Prioridad**: Baja — refactor organizativo, no afecta runtime
>
> **Nota 2026-04-11**: Los 18 helpers creados durante [eslint-max-lines.md](./eslint-max-lines.md) añadieron archivos nuevos a carpetas ya listadas aquí (ej: `core/services/notifications/` ya tenía 8 archivos y ahora tiene 11 con los helpers/catalogs; `profesor/cursos/services/` de 8 a 9). Los umbrales no cambiaron — las mismas 18 carpetas siguen siendo candidatas a agrupar en subcarpetas. Se abordará al tocar cada una en un feature relacionado, no en PR dedicado.

---

## Regla

> **"Archivos relacionados viven juntos en una subcarpeta, no mezclados con no relacionados."**

**Criterio**: una carpeta con 5+ archivos `.ts` al mismo nivel (sin contar `index.ts` ni `*.spec.ts`) debe agruparse en subcarpetas por tipo o dominio.

**Subcarpetas estándar**: `components/`, `services/`, `models/`, `config/`, `pipes/`, `directives/`, `helpers/`, `adapters/`.

---

## Carpetas detectadas (ordenadas por cantidad)

### Tier 1 — Modelos y constantes globales: 2 carpetas

| Archivos | Carpeta | Acción sugerida |
|---:|---|---|
| 12 | [src/app/data/models/](../../src/app/data/models/) | Agrupar por dominio: `asistencia/`, `calificacion/`, `horario/`, `salon/`, `permisos/`, `usuario/` |
| 12 | [src/app/shared/models/](../../src/app/shared/models/) | Agrupar por tipo: `form/`, `stats/`, `select/`, `pagination/`, `calendar/` |

### Tier 2 — Services de feature: 7 carpetas

| Archivos | Carpeta | Acción sugerida |
|---:|---|---|
| 11 | [pages/admin/schedules/services/](../../src/app/features/intranet/pages/admin/schedules/services/) | Dividir por facade: `data/`, `crud/`, `ui/`, `helpers/` |
| 8 | [core/services/notifications/](../../src/app/core/services/notifications/) | Agrupar: `api/`, `store/`, `facades/`, `config/`, `models/` |
| 8 | [core/services/storage/](../../src/app/core/services/storage/) | Agrupar: `session/`, `preferences/`, `indexed-db/`, `cache/` |
| 8 | [pages/profesor/cursos/services/](../../src/app/features/intranet/pages/profesor/cursos/services/) | Dividir por dominio: `contenido/`, `calificaciones/`, `asistencia/` |
| 6 | [pages/admin/schedules/helpers/](../../src/app/features/intranet/pages/admin/schedules/helpers/) | Agrupar por función (validación, parseo, conflictos) |
| 5 | [pages/admin/attendances/services/](../../src/app/features/intranet/pages/admin/attendances/services/) | Ya está cerca del límite — revisar si se justifica división |
| 5 | [pages/admin/users/services/](../../src/app/features/intranet/pages/admin/users/services/) | Ya está cerca del límite — revisar si se justifica división |

### Tier 3 — Core services: 4 carpetas

| Archivos | Carpeta | Acción sugerida |
|---:|---|---|
| 7 | [src/app/shared/constants/](../../src/app/shared/constants/) | Agrupar por dominio: `roles/`, `permissions/`, `routes/` |
| 6 | [core/services/error/](../../src/app/core/services/error/) | Agrupar: `handler/`, `reporter/`, `models/` |
| 6 | [core/services/speech/](../../src/app/core/services/speech/) | Agrupar: `recognition/`, `commands/`, `tts/` |
| 5 | [core/services/feedback/](../../src/app/core/services/feedback/) | Revisar si se justifica división |

### Tier 4 — Varios: 5 carpetas

| Archivos | Carpeta | Acción sugerida |
|---:|---|---|
| 6 | [pages/profesor/models/](../../src/app/features/intranet/pages/profesor/models/) | Agrupar por sub-dominio del rol |
| 6 | [src/app/shared/services/attendance/](../../src/app/shared/services/attendance/) | Agrupar por sub-responsabilidad |
| 6 | [src/app/shared/utils/](../../src/app/shared/utils/) | Agrupar por tipo: `date/`, `string/`, `array/` |
| 5 | [src/app/data/adapters/grade/](../../src/app/data/adapters/grade/) | Revisar si se justifica división |
| 5 | [campus-3d-view/services/](../../src/app/features/intranet/pages/cross-role/campus-navigation/components/campus-3d-view/services/) | Agrupar: `scene/`, `player/`, `collision/` |

---

## Estrategia de refactor

1. **Mantener barrel exports** — crear `index.ts` en cada subcarpeta nueva para no romper imports existentes
2. **Actualizar imports por alias** — si los consumidores usan alias (`@core/services/notifications`), el barrel raíz evita cambios
3. **Hacerlo en PRs separados por carpeta** — cada refactor de agrupación es mecánico pero toca muchos archivos
4. **Empezar por los Tier 1** — `data/models/` y `shared/models/` son los de mayor impacto estructural

---

## No enforceable por ESLint

Esta regla **no dispara errores automáticos**. Se valida en code review al crear archivos nuevos: si una carpeta ya tiene 4 archivos y estás por agregar el quinto, crear subcarpeta en lugar de planchar más archivos al mismo nivel.
