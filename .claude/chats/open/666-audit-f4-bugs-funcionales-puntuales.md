# 666 — Audit F4: Bugs funcionales puntuales independientes

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F4)
> **Creado**: 2026-09-12 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **touches**:
>   - `src/app/shared/components/sections/courses/courses-section.ts`
>   - `src/app/shared/components/sections/testimonials/testimonials-section.ts`
>   - `src/app/shared/utils/periodo-academico.utils.ts`
>   - `src/app/shared/components/dependency-guidance/dependency-guidance.component.scss`
>   - `src/app/features/intranet/pages/cross-role/attendance-reports/components/reports-result/reports-result.component.ts`
>   - `src/app/features/intranet/pages/cross-role/attendance-reports/config/attendance-reports.config.ts`
>   - `src/app/features/intranet/pages/admin/notificaciones-admin/services/notificaciones-admin.facade.ts`
>   - `src/app/features/intranet/pages/admin/events-calendar/eventos-calendario.facade.ts`, `eventos-calendario.component.ts`
>   - `src/app/features/intranet/pages/admin/auditoria-correos/components/auditoria-correos-table/auditoria-correos-table.component.html`

## Origen

Hallazgos de `/audit` (2026-09-12), categoría "Bug" — 9 hallazgos funcionales de bajo acoplamiento entre sí, agrupados en un solo brief por ser fixes puntuales independientes (mismo patrón de agrupación que el brief 662 del audit BE).

## Scope

1. **`courses-section.ts:69-78` + `.html:16,87-96`** — hay UI completa de paginación (`currentPage`, `pages`, `onPageChange`), pero el `@for` que renderiza la lista siempre itera sobre `courses` completo, sin slice por página. Cambiar de página no hace nada. Fix: derivar `pagedCourses` (computed) por `currentPage` y usarlo en el `@for`.
2. **`testimonials-section.ts:112-114` (`nextSlide`)** — `maxSlide = Math.ceil(length/2)-1` asume ventana de a 2 ítems, pero el desplazamiento real es de a 1. Con 5 testimonios, el índice 4 nunca queda visible. Fix: `maxSlide = testimonials.length - itemsPerView`.
3. **`periodo-academico.utils.ts:58-61` (`esSeccionDeVerano`)** — el JSDoc declara "sección 'V' o que empieza con 'V' = verano", pero la implementación hace igualdad exacta. Secciones tipo `"V1"`/`"V-A"` se clasifican mal, propagándose a `seccionCompatibleConPeriodo`/`filtrarPorPeriodoAcademico`. Fix: `startsWith(SECCION_VERANO)` — **confirmar contra BD real antes de tocar**, por el impacto en filtrado de alumnos (mismo tipo de bug que el ya encontrado en el audit BE de reportes de asistencia — no asumir sin repro).
4. **`dependency-guidance.component.scss:36`** — el selector `::ng-deep .dependency-inline-message` no coincide con la clase real del template (`dependency-guidance-inline`). El modo inline nunca recibe estilos. Fix: alinear nombre de clase.
5. **`attendance-reports/reports-result.component.ts:81,97`** — construye `new Date(r.fechaInicio + 'T00:00:00')` sobre un ISO que ya viene completo del BE → `Invalid Date`, rompe columnas cuando `rangoTipo === 'semana'`. Fix: `r.fechaInicio.slice(0, 10)` antes de construir el `Date`.
6. **`attendance-reports.config.ts:9`** — `{ label: 'Tardanza', value: 'temprano' }` colisiona con `{ label: 'Tardanzas', value: 'tarde' }` — el filtro de llegadas tempranas queda etiquetado como tardanza.
7. **`notificaciones-admin.facade.ts:43-67,306-319`** — el KPI "Vigentes hoy" nunca se recalcula tras crear/editar/eliminar una notificación. Fix: en `refreshItemsOnly()` refetch también `getEstadisticas(anio)`.
8. **`eventos-calendario.facade.ts:90-100` (`create`)** — cierra el diálogo optimísticamente antes de confirmar el POST; si falla, no reabre el diálogo ni restaura `formData` — pérdida silenciosa de lo escrito. Fix: solo cerrar tras confirmación, o restaurar el diálogo con los datos en caso de error.
9. **`auditoria-correos-table.component.html:53,61`** — tooltip incorrecto ("copia al portapapeles" cuando en realidad filtra el listado) y link "Ver historial de correo" que pasa el correo enmascarado (`pa***el@gmail.com`) en vez del real — verificar si el endpoint destino acepta ese valor.

## Pre-work

- Cada punto es independiente — se pueden resolver en cualquier orden, con test de regresión antes de pasar al siguiente.
- Punto 3 requiere confirmar con datos reales de BD antes de aplicar el fix (no asumir solo por lectura estática) — mismo criterio que el brief 659 del audit BE.
- Punto 9 puede requerir cambio de contrato del BE si el endpoint de historial realmente no acepta el correo enmascarado — confirmar antes de asumir que el fix es solo de FE.

## Out of scope

- El resto de hallazgos del audit (ver plan — fases F5 a F12).

## Criterio de cierre

- [ ] Build + lint + tests OK.
- [ ] Los 9 puntos verificados individualmente (test de regresión donde aplique).
- [ ] Punto 3 confirmado con datos reales antes de cerrar.
- [ ] Punto 9 confirmado si requiere cambio de contrato BE.
- [ ] Plan actualizado: F4 → ✅.
- [ ] Maestro actualizado.

## Tiempo estimado

~2h (9 fixes puntuales + tests + verificación punto 3).
