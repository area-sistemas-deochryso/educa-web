# 684 — Audit F10: Capa de datos — adapters con lógica de negocio + violación de layering

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F10)
> **Creado**: 2026-09-12 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **touches**:
>   - `src/app/data/models/classroom.models.ts`
>   - `src/app/data/adapters/grade/{vigesimal,centesimal,literal}-scale.adapter.ts`
>   - `src/app/features/intranet/shared/services/justificacion-asistencia/justificacion-asistencia-bandeja-api.service.ts`
>   - `src/app/features/intranet/pages/admin/vistas/services/vistas.facade.ts`

## Origen

Hallazgos de `/audit` (2026-09-12), categoría "Regla violada" — 4 hallazgos de la capa de datos agrupados por ser todos violaciones de separación de responsabilidades.

## Scope

1. **`data/models/classroom.models.ts:28-31`** — `resolveModoAsignacion()` es lógica de negocio (replica `ModoAsignacionResolver.cs` del backend) viviendo en un archivo `models/`, que debería ser solo contratos de tipos. Riesgo de divergencia silenciosa si el backend cambia el umbral. Fix: mover a `adapters/` o a un servicio de dominio.
2. **`data/adapters/grade/{vigesimal,centesimal,literal}-scale.adapter.ts`** — no son adapters de mapeo API↔dominio sino clases de estrategia de dominio completas (reglas de negocio de umbrales de aprobación). Además, `centesimal-scale.adapter.ts` es código duplicado línea por línea de `vigesimal-scale.adapter.ts` (mismo algoritmo, solo cambian constantes), sin caller real en `grade-scale.factory.ts`. Fix: documentar explícitamente como excepción (Strategy pattern) o mover a `domain/grade/`; extraer base común o eliminar el duplicado sin uso.
3. **`justificacion-asistencia-bandeja-api.service.ts:6`** — un servicio en `shared/services/` importa `SolicitudJustificacionAsistenciaDto` desde `@features/intranet/pages/estudiante/models`, rompiendo el layering shared→features (shared no debería conocer contratos de una página específica). Fix: mover el DTO a `@data/models` o a un `models` compartido dentro de `justificacion-asistencia/`.
4. **`vistas.facade.ts:124`** — `updateFormField(field, value as never)`, cast equivalente a `any` que bypassea el chequeo de tipos. Fix: tipar con genéricos `<K extends keyof CapabilityForm>`.

## Pre-work

- Punto 1 requiere confirmar con `Educa.API` (`ModoAsignacionResolver.cs`) cuál es la fuente de verdad real antes de mover el código — si el umbral puede cambiar del lado BE sin aviso, considerar si vale la pena traer el valor por API en vez de hardcodearlo en el FE.
- Punto 2 es de menor riesgo — el código duplicado sin caller puede eliminarse directamente tras confirmar que `grade-scale.factory.ts` no lo referencia.

## Out of scope

- El resto de hallazgos del audit (ver plan).
- No es una refactorización completa de `data/adapters/` — solo los 4 puntos señalados.

## Criterio de cierre

- [ ] Punto 1: lógica de negocio movida fuera de `models/`, confirmado contra el BE si el umbral puede divergir.
- [ ] Punto 2: adapters documentados como Strategy pattern o movidos a `domain/`; duplicado sin uso eliminado o justificado.
- [ ] Punto 3: layering corregido, `shared/services` ya no importa desde `features/pages`.
- [ ] Punto 4: cast `as never` reemplazado por genérico tipado.
- [ ] Build + lint + tests OK.
- [ ] Plan actualizado: F10 → ✅.
- [ ] Maestro actualizado.

## Tiempo estimado

~2h.
