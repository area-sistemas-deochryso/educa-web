# 691 — Audit Tests F3: cobertura de mutaciones críticas de seguridad/aprobación

> **Repo destino**: `educa-web`
> **Plan**: [`audit-tests-frontend-2026-09-16.md`](../../plan/audit-tests-frontend-2026-09-16.md) (Fase F3)
> **Creado**: 2026-09-16 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **touches**: `features/intranet/pages/admin/permissions-users/services/`, `features/public/contact/`, `features/intranet/pages/profesor/final-classrooms/services/`, `features/intranet/pages/profesor/classrooms/services/grupos.facade.spec.ts`, `features/intranet/pages/profesor/services/profesor.facade.spec.ts`

## Origen

Hallazgos de `/audit` (2026-09-16), categoría **Riesgo** — mutaciones de seguridad y de flujos de aprobación con cobertura ausente o parcial. Agrupados porque comparten el mismo patrón de riesgo: "mutación real de datos sensibles sin ningún test que la ejercite".

## Scope

1. **`permisos-usuarios-data.facade.ts` — sin spec en absoluto.** Es la mutación de seguridad más granular del módulo de permisos (grant/deny de permisos individuales por usuario). Crear `permisos-usuarios-data.facade.spec.ts` cubriendo: happy path de `saveOverrides()`, error de backend, y verificación de que el payload enviado (permisos otorgados/denegados específicos) es el correcto — no alcanza con verificar que la API fue llamada.
2. **`contact.spec.ts`** — el componente tiene validadores reactivos (`required`/`email`), estado `idle/submitting/success/error` y llamada a `ContactApiService.enviar()` con manejo de error/logger, pero el spec solo hace `toBeTruthy()` de creación. Agregar: validación de campos (required, formato email), submit exitoso, submit con error de API (mensaje mostrado + estado `error`), y que el form queda deshabilitado durante `submitting`.
3. **`profesor-final-salones.facade.spec.ts`** — `aprobarEstudiante` y `aprobacionMasiva` (flujo central de aprobación de salones finales) están mockeados en el archivo pero ningún test los invoca. Agregar: happy path de ambos, error de backend, y rollback WAL si el facade lo implementa (confirmar contra el código real).
4. **`grupos.facade.spec.ts`** — solo `crearGrupo` tiene test. `actualizarGrupo`, `eliminarGrupo`, `asignarEstudiantes`, `removerEstudiante`, `configurarMaxEstudiantes` están mockeados pero sin ejercitar, incluyendo el rollback WAL (`onError`) que el mock ya soporta. Agregar cobertura de cada método (happy + al menos un caso de error/rollback).
5. **`profesor.facade.spec.ts`** — `calificarLote` y `eliminarNotaEstudiante` mockeados pero nunca invocados desde el facade en ningún test. Agregar cobertura de ambos (mutaciones de calificación — dominio educativo sensible).

## Pre-work

- Antes de escribir tests nuevos, revisar si hay un patrón común de "facade con `describe`/mocks completos pero `it()` incompleto" en estos 5 archivos — probablemente copy-paste del mismo scaffold sin terminar. Aprovechar la revisión para confirmar que no queda ningún otro método mockeado-pero-no-testeado en estos mismos archivos antes de cerrar el brief (no solo los listados arriba).
- Para el punto 1 (`permisos-usuarios-data.facade.ts`), revisar el patrón ya usado en `user-permisos-security.contract.spec.ts` (mismo dominio, ya auditado sin hallazgos) como referencia de rigor esperado.

## Out of scope

- F4 (lógica de negocio no ligada a mutaciones de seguridad/aprobación).
- F5 (gaps de infraestructura WAL genérica, no ligados a un facade de negocio específico).

## Criterio de cierre

- [ ] Los 5 puntos con cobertura agregada (spec nuevo en el caso 1, tests agregados en los demás).
- [ ] Build + lint + tests OK.
- [ ] Plan actualizado: F3 → ✅.
- [ ] Maestro actualizado.

## Tiempo estimado

~3h.
