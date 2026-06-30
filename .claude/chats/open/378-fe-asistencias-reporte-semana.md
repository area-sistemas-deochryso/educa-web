# 378 — FE: filtro "semana" en reportes de asistencias

> **Repo**: `educa-web`
> **Creado**: 2026-06-30 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`

## Contexto

En `/intranet/admin/asistencias?tab=reportes`, el rango "Semana" no activa la vista matricial.
"Día" y "Mes" funcionan; falta completar "Semana".

El componente vive en `src/app/features/intranet/pages/cross-role/attendance-reports/`.

## Archivos a tocar

- `components/reports-result/reports-result.component.ts`
- `components/reports-result/reports-result.component.html`

## Cambios requeridos

### `reports-result.component.ts`

1. **`esMatrizMensual` → renombrar a `esMatriz`** y cambiar condición:
   ```ts
   // Antes:
   readonly esMatrizMensual = computed(() => {
       const r = this.resultado();
       if (r.rangoTipo !== 'mes') return false;
       ...
   });
   // Después: activar también para 'semana'
   readonly esMatriz = computed(() => {
       const r = this.resultado();
       if (r.rangoTipo !== 'mes' && r.rangoTipo !== 'semana') return false;
       return r.salones.some(s => s.estudiantes.some(e => e.asistenciasDiarias != null))
           || r.profesores?.some(p => p.asistenciasDiarias != null) === true
           || r.asistentesAdmin?.some(a => a.asistenciasDiarias != null) === true
           || r.coordinadores?.some(a => a.asistenciasDiarias != null) === true
           || r.promotores?.some(a => a.asistenciasDiarias != null) === true;
   });
   ```

2. **`diasColumnas`** — para semana, retornar los días reales del mes (ej: 23, 24, 25, 26, 27, 28, 29):
   ```ts
   readonly diasColumnas = computed<number[]>(() => {
       const r = this.resultado();
       const dias = this.selectedSalon()?.diasEnMes ?? r.diasEnMes ?? 0;
       if (!dias) return [];
       if (r.rangoTipo === 'semana') {
           const start = new Date(r.fechaInicio + 'T00:00:00');
           return Array.from({ length: dias }, (_, i) => {
               const d = new Date(start);
               d.setDate(start.getDate() + i);
               return d.getDate();
           });
       }
       return Array.from({ length: dias }, (_, i) => i + 1);
   });
   ```

3. **`diasSemanaLabels`** — para semana, computar desde `fechaInicio` (que siempre es lunes):
   ```ts
   readonly diasSemanaLabels = computed<string[]>(() => {
       const r = this.resultado();
       const dias = this.selectedSalon()?.diasEnMes ?? r.diasEnMes ?? 0;
       if (!dias) return [];
       const labels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
       if (r.rangoTipo === 'semana') {
           const start = new Date(r.fechaInicio + 'T00:00:00');
           return Array.from({ length: dias }, (_, i) => {
               const d = new Date(start);
               d.setDate(start.getDate() + i);
               return labels[d.getDay()];
           });
       }
       const fecha = new Date(r.fechaInicio);
       return Array.from({ length: dias }, (_, i) => {
           const d = new Date(fecha.getFullYear(), fecha.getMonth(), i + 1);
           return labels[d.getDay()];
       });
   });
   ```

### `reports-result.component.html`

- Reemplazar todas las ocurrencias de `esMatrizMensual()` → `esMatriz()`.

## Criterio de cierre

- [ ] `esMatriz()` devuelve `true` cuando `rangoTipo === 'semana'` y hay `asistenciasDiarias`.
- [ ] Las columnas muestran días reales del mes (23, 24, 25... para una semana de junio).
- [ ] Los labels de día de semana son L, M, M, J, V, S, D (siempre, porque BE devuelve lunes como inicio).
- [ ] `ng build` sin errores.
- [ ] Verificado manualmente en el browser con datos reales del BE.

## Tiempo estimado

~30 min.
