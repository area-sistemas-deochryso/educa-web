# 133 · Plan 28 Chat 3d BE — Endpoints faltantes para Chat 4 FE

> **Creado**: 2026-05-08 · **Estado**: 🟡 running · **Repo**: `Educa.API` (master)
> **Bloquea**: Chat 4a (self-service AA generalizado) y Chat 4b-tab (tab dedicada AA en director-profesores) en `educa-web`.

<!-- minimal-from-go -->

## Modo sugerido

`/investigate → /design → /execute → /validate`. Reuso de patrones existentes (espejos directos de `/profesor/me/*` y `director/profesores-asistencia-dia`), por lo cual el design es light.

## Contexto

Chat 3a/3b/3c cerraron BE (reportes PDF/Excel, correos correctivos AA, bandeja+notificaciones polimórficas). Chat 4 FE descubrió 3 endpoints inexistentes:

1. `GET /api/asistente-administrativo/me/mes` — espejo de `/profesor/me/mes`
2. `GET /api/asistente-administrativo/me/dia` — espejo de `/profesor/me/dia`
3. `GET /api/ConsultaAsistencia/director/asistentes-admin-asistencia-dia` — espejo de `director/profesores-asistencia-dia`

## Alcance

### Nuevo controller `AsistenteAdministrativoController`

- Ruta base `api/asistente-administrativo`
- `[Authorize(Roles = Roles.AsistenteAdministrativo)]`
- DNI extraído de `User.GetDni()`, NO de query/route
- Reusa `IConsultaAsistenciaService` con métodos nuevos `ObtenerAsistenciaAsistenteAdminDia/Mes`

### Nuevo endpoint en `ConsultaAsistenciaController`

- `GET director/asistentes-admin-asistencia-dia?fecha=`
- `[Authorize(Roles = Roles.Administrativos)]`
- Reusa servicio `ObtenerAsistentesAdminAsistenciaDia` que delega a `ListarAsistentesAdminPorFechaRangoAsync` ya existente

### Service additions (`IConsultaAsistenciaService`)

- `ObtenerAsistenciaAsistenteAdmin(sedeId, dni, inicio, fin)` — base
- `ObtenerAsistenciaAsistenteAdminDia(sedeId, dni, fecha)` — wrapper
- `ObtenerAsistenciaAsistenteAdminMes(sedeId, dni, mes, anio)` — wrapper
- `ObtenerAsistentesAdminAsistenciaDia(sedeId, fecha)` — listar para director-day

### Repo additions (`IConsultaAsistenciaRepository`)

- `GetAsistenciaAsistenteAdminAsync(sedeId, dni, inicio, fin)` — single AA por DIR_DNI_Hash, mirror de `GetAsistenciaProfesorAsync`

### Calculator overload

- `IAsistenciaEstadoCalculador.CalcularEstadisticas(List<AsistenciaAsistenteAdminDto>)` + delegación

### DTO

- `AsistenciaDiaAsistentesAdminConEstadisticasDto { AsistentesAdmin, Estadisticas }`

### Tests (~6-8 contract tests)

- `ConsultaAsistenciaControllerTests`: 2-3 tests para `director/asistentes-admin-asistencia-dia` (sin sedeId, con AAs, sin AAs)
- `AsistenteAdministrativoControllerTests` (nuevo): 6 tests cubriendo `me/dia` y `me/mes`
  - sin sedeId → 401
  - sin DNI → 401
  - delega con DNI claim
  - `/me/mes` usa mes/año actual por default
  - AA no encontrado → 404
- Reflection tests opcionales para autorización a nivel clase (similar a `AsistenciaAdminControllerAuthorizationTests`)

### Docs

- `business-rules.md §1.8` — nota: "self-service AA es read-only (GET /me/*), no muta. Mutaciones siguen yendo por `AsistenciaAdminController` con jurisdicción `Roles.SupervisoresAsistenteAdmin` (INV-AD08)."
- `plan/maestro.md` — agregar "Chat 3d ✅" a la línea de Plan 28.

## Excluido

- FE (`educa-web`): pausado.
- SQL schema: cero cambios.
- Rate limiting policies nuevas: hereda `concurrency:reports` del controller padre.

## Aprendizajes transferibles

- Self-service polimórfico: el patrón `GET /<rol>/me/dia|mes` se replica para cada `TipoPersona`. Próximo rol que aparezca, mismo molde.
- DTO `AsistenciaDia<rol>ConEstadisticasDto` es plantilla replicable.
