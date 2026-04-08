# Archivos Grandes — Refactor Pendiente

> **Estado**: Pendiente
> **Origen**: Auditoría de asistencia + shared/ en `higiene-estructural.md` (2026-04-08)
> **Prioridad**: Media — no bloquea features pero viola el límite de 300 líneas (backend) / 500 líneas (frontend)

---

## Archivos identificados

### Asistencia frontend (hallados en P2.4)

| Archivo | Líneas | Tipo | Ubicación |
| --- | --- | --- | --- |
| `attendance-view.service.ts` | 531 | Servicio | `features/intranet/services/attendance/` |
| `attendance-director.component.ts` | 432 | Componente | `pages/shared/attendance-component/` |
| `director-asistencia-api.service.ts` | 363 | API Service | `shared/services/asistencia/` |

### Otros (agregar aquí los que aparezcan durante P1.1 de higiene-estructural)

| Archivo | Líneas | Tipo | Ubicación |
| --- | --- | --- | --- |
| `asistencias-admin.store.ts` | 340 | Store | `pages/admin/asistencias/services/` |
| `asistencias-crud.facade.ts` | 317 | Facade | `pages/admin/asistencias/services/` |

---

## Estrategia de refactor por archivo

### `attendance-view.service.ts` (531 líneas)

Servicio de vista que maneja transformaciones, filtros y lógica de presentación para asistencia diaria. Candidato a dividir por responsabilidad:
- Transformaciones de datos
- Lógica de filtrado
- Formateo para UI

### `attendance-director.component.ts` (432 líneas)

Componente smart del director para asistencia diaria. Candidato a extraer sub-componentes presentacionales y/o mover lógica a facade dedicado.

### `director-asistencia-api.service.ts` (363 líneas)

API service con múltiples endpoints del director. Evaluar si se puede dividir por subdominios (consulta vs mutación) o si la cantidad de endpoints justifica el tamaño.

### `asistencias-admin.store.ts` (340 líneas)

Store del módulo admin de asistencias. Evaluar si extiende BaseCrudStore o si tiene estado que debería delegarse.

### `asistencias-crud.facade.ts` (317 líneas)

CRUD facade del admin. Ya es un facade dividido (data/crud/ui). Evaluar si hay helpers extraíbles.

---

## Regla de referencia

| Tipo | Límite OK | Warning | Refactor obligatorio |
| --- | --- | --- | --- |
| Funciones | ≤ 30 ln | 31-50 ln | > 50 ln |
| Archivos TS | ≤ 200 ln | 201-350 ln | > 500 ln |
| Templates HTML | ≤ 150 ln | 151-250 ln | > 250 ln |
| Backend (.cs) | ≤ 300 ln | — | > 300 ln |

---

## Checklist

```
[ ] Revisar cada archivo y determinar estrategia de split
[ ] Ejecutar refactor uno por uno (no big-bang)
[ ] Verificar build + lint después de cada split
[ ] Actualizar imports y barrel exports
[ ] Agregar nuevos archivos grandes que aparezcan en futuras auditorías
```
