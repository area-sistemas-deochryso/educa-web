# 342 · BE · Investigate 44 Failing Tests

- **Repo**: Educa.API
- **Branch**: `pre-release/v1.1.0`
- **Modo sugerido**: `/investigate`
- **Prioridad**: media
- **Contexto**: la auditoría LINQ (commit `85bcd454`) confirmó que los 44 test failures son pre-existentes (idéntico count en `main`). Ninguno fue introducido por el refactor.

## Objetivo

Determinar para cada test si es:
1. **Test desactualizado** — el código cambió y el test no se actualizó (fix: actualizar test)
2. **Bug legítimo** — el test detecta un problema real (fix: arreglar el código)
3. **Flaky / configuración** — depende de estado externo, orden de ejecución, etc. (fix: aislar o skip con razón)

## Scope

Los 44 tests que fallan. Clusters conocidos:

| Cluster | Count | Sospecha |
|---------|-------|----------|
| `CursoContenidoControllerIntegrationTests` | 14 | WebApplicationFactory setup o DI registration |
| `RuntimeHealthControllerAuthorizationTests` | 7 | Authorization policy / role check |
| `HorarioServiceUpdateTests` | 6 | Mock setup desactualizado |
| `EmailBlacklistControllerCrudTests` | 3 | Authorization policy |
| `SalonesServiceTests` | 2 | Mock setup |
| `CursosServiceTests` | 2 | Mock setup |
| `AuthFacadeServiceTests` / `AuthServiceTests` | 2 | PasswordHasher o mock |
| `SalonRepositoryTests` | 1 | InMemory DB limitations |
| `ReporteAsistenciaProfesorExcelServiceTests` | 1 | Mock setup |
| `ReporteFiltradoAsistenciaServiceTipoPersonaTests` | 1 | NullRef in AsistentesAdmin.cs:114 (pre-existente) |
| Otros | 4 | Varios |

## Criterio de cierre

- Cada test clasificado en una de las 3 categorías
- Tests desactualizados: actualizados
- Bugs legítimos: issue documentado o fix incluido
- Flaky: marcados con `[Fact(Skip = "razón")]` temporalmente si no se puede resolver

## No hacer

- No tocar la optimización LINQ recién mergeada
- No agregar tests nuevos (eso es otro brief)
