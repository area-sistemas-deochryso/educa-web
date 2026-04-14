# Archivos Grandes — Refactor Pendiente

> **Estado**: Resuelto
> **Origen**: Auditoría de asistencia + shared/ en `higiene-estructural.md` (2026-04-08)
> **Resuelto**: 2026-04-13

---

## Resultado

Todos los archivos pasan ESLint `max-lines` (300 líneas de contenido, sin contar blancos ni comentarios).

### Archivo refactorizado

| Archivo | Antes | Después | Acción |
| --- | --- | --- | --- |
| `attendance-view.service.ts` | 412 | 327 | Interfaces extraídas a `attendance-view.models.ts`, delegados PDF movidos a `AttendancePdfService`, `pdfMenuItems` movido a componentes consumidores |

### Archivos evaluados — no requieren split

| Archivo | Líneas totales | ESLint `max-lines` | Razón |
| --- | --- | --- | --- |
| `attendance-director.component.ts` | 348 | ✅ Pasa | Contenido < 300 (muchos imports, decorator, comentarios) |
| `director-attendance-api.service.ts` | 362 | ✅ Pasa | Contenido < 300 (muchos JSDoc) |
| `attendances-admin.store.ts` | 340 | ✅ Pasa | Contenido < 300 |
| `attendances-crud.facade.ts` | 340 | ✅ Pasa | Contenido < 300 |

### Archivos creados

| Archivo | Líneas | Contenido |
| --- | --- | --- |
| `attendance-view.models.ts` | 35 | `SelectorContext`, `AttendanceViewConfig` interfaces |

---

## Verificación

- Build: ✅ Pasa
- Lint: ✅ 0 errores (3 warnings existentes por setters triviales)
- Tests: ✅ 29/29 tests de asistencia pasan

---

## Regla de referencia

| Tipo | Límite OK | Warning | Refactor obligatorio |
| --- | --- | --- | --- |
| Funciones | ≤ 30 ln | 31-50 ln | > 50 ln |
| Archivos TS | ≤ 200 ln | 201-350 ln | > 500 ln |
| Templates HTML | ≤ 150 ln | 151-250 ln | > 250 ln |
| Backend (.cs) | ≤ 300 ln | — | > 300 ln |
| ESLint `max-lines` | ≤ 300 (contenido) | — | > 300 (error) |

---

## Checklist

```
[x] Revisar cada archivo y determinar estrategia de split
[x] Ejecutar refactor uno por uno (no big-bang)
[x] Verificar build + lint después de cada split
[x] Actualizar imports y barrel exports
[ ] Agregar nuevos archivos grandes que aparezcan en futuras auditorías
```
