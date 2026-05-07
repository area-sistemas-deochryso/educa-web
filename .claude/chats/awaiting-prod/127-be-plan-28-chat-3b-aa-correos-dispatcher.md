# 127 · Plan 28 Chat 3b BE — Correos diferenciados + dispatcher AA

> **Creado**: 2026-05-07 · **Estado**: ⏳ pendiente arrancar · **Repo**: `Educa.API` (master)
> **Split**: parte 2 de 3 del Chat 3 (3a reportes ✅ pre-req / 3b correos / 3c bandeja+notif).
> **Bloqueado por**: Chat 3a (no es bloqueo duro de código — solo deseable que entre primero para evitar conflicts en `ServiceExtensions.cs`).

## Modo sugerido

`/execute → /validate`. Pattern espejo del Plan 23 Chat 4 (correos profesor INV-AD05 ampliado).

## Contexto

Chat 3a (si ya cerró) habilitó visibilidad de AA en reportes. 3b cierra el flujo de **edición administrativa** sobre `'A'`: cuando un Director/Promotor/Coord corrige asistencia de un AA en `/intranet/admin/asistencias`, el AA recibe un correo diferenciado (plantilla azul administrativa, INV-AD05 ampliado tercera vez).

## Alcance estricto de 3b

1. **`PersonaAsistenciaContext` extendido**:
   - Agregar `Director? AsistenteAdmin` (modelo `Director` en `Models/Usuarios/Director.cs` — el AA vive ahí discriminado por `DIR_UsuarioReg = 'Asistente Administrativo'`).
   - Campos derivados: `PersonaId = AsistenteAdmin.DIR_CodID`, `NombreCompleto = NombreHelper.NombreCompleto(...)`, `DniNormalizado = DniHelper.Normalizar(...)`, `SedeNombre = ...`.

2. **`AsistenciaAdminCrudHelpers.ResolverPersonaAsync`**:
   - 3ra rama después de Profesor: `if (tipoPersona == TipoPersona.AsistenteAdmin)` → `_validator.ValidarAsistenteAdminActivoAsync(personaId, ct)` y armar context.
   - El validator necesita método nuevo (probablemente en `IAsistenciaAdminValidator` o equivalente — ubicar consumidor del actual `ValidarProfesorActivoAsync` y agregar análogo para AA).
   - Mensaje de error de `EsValido(tipoPersona)` ya soporta `'A'` (Chat 2 cambió `TipoPersona.EsValido`); update del string del exception actual (`"TipoPersona debe ser 'E' o 'P'"`) → `"'E', 'P' o 'A'"`.

3. **`IEmailNotificationService` + service**:
   - Agregar `EnviarNotificacionAsistenciaCorreccionAsistenteAdmin(emailDestino, nombreAA, fecha, horaEntrada, horaSalida, sede, tipoOperacion, usuarioAdmin)`.
   - Plantilla en `EmailNotificationService.Templates.cs`: nuevo `GenerarHtmlCorreoCorreccionAsistenteAdmin` que delegue a `HtmlCorreccion` reusando el template base (mismo banner azul, saludo `"Estimado/a {nombreAA}"` + descripcion "su asistencia administrativa fue {operacionTexto} manualmente por dirección").
   - Outbox tag: `EnqueueAsync(email, "ASISTENCIA_CORRECCION_ASISTENTE_ADMIN", usuarioAdmin, "AsistenciaAsistenteAdmin")`.
   - INV-C11 NO aplica a `'A'` (no tiene `GraOrden`).

4. **`IAsistenciaAdminEmailNotifier` + impl**:
   - Agregar `NotificarCorreccionAsistenteAdminAsync(Director asistenteAdmin, fecha, horaEntrada, horaSalida, sedeNombre, tipoOperacion, usuarioAdmin)`.
   - Si `DIR_Correo` vacío → silent skip (alineado con E/P).
   - Try/catch igual que las otras dos ramas (INV-S07).
   - `NotificarEliminacionAsistenteAdminAsync` análogo (delega con `tipoOperacion = "eliminada"`).

5. **`AsistenciaAdminCrudHelpers.NotificarCorreccionAsync`**:
   - 3ra rama: `else if (persona.Tipo == TipoPersona.AsistenteAdmin && persona.AsistenteAdmin is not null)` → `_notifier.NotificarCorreccionAsistenteAdminAsync(...)`.

6. **DI wiring**: `IAsistenciaAdminEmailNotifier` ya está registrado (Chat 2/Plan 23 Chat 4). No requiere cambios de DI nuevos en este chat.

## Lo que NO entra en 3b

- ❌ Reportes PDF/Excel (Chat 3a — debe estar en master antes de mergear este).
- ❌ Bandeja admin filtros (Chat 3c).
- ❌ Notificaciones masivas (Chat 3c).
- ❌ Autorización condicional INV-AD08 ("AA no se corrige a sí mismo") → NO es scope; queda como Chat 5 (cierre invariantes).

## Decisiones de Chat 1 a respetar

- INV-AD05 ampliado: destinatario único = el propio AA (DIR_Correo). Sin BCC, sin apoderado.
- `TipoEntidadOrigen='AsistenciaAsistenteAdmin'` para separar bandejas admin.

## Pre-work obligatorio

1. Leer `AsistenciaAdminEmailNotifier.cs` y `EmailNotificationService.cs` (ya cubiertos en Chat 3a si se hizo).
2. Ubicar el validator que tiene `ValidarProfesorActivoAsync` (probable `Validators/AsistenciaAdminValidator.cs` o similar) y replicar para AA con lookup por `DIR_CodID + DIR_Estado=1 + DIR_UsuarioReg='Asistente Administrativo'`.
3. Confirmar campo de correo del Director: `DIR_Correo` (mirror del modelo en `Models/Usuarios/Director.cs`).

## Validación esperada

- Build BE limpio.
- Suite verde (excepto los 8 Bulkhead preexistentes documentados en 3a).
- Tests nuevos (~10):
  - 2 dispatch en `AsistenciaAdminEmailNotifier`: AA con correo → encola; AA sin correo → silent skip.
  - 2 helper email: tag outbox `"AsistenciaAsistenteAdmin"`, plantilla incluye nombre AA y banner azul.
  - 2 `ResolverPersonaAsync`: AA activo → context completo; AA inactivo → `BusinessRuleException`.
  - 2 integration en `AsistenciaAdminCrudService`: crear/actualizar registro `'A'` dispara `NotificarCorreccionAsistenteAdminAsync` con datos correctos.
  - 2 contract: `EsValido` acepta `'A'`; mensaje de error actualizado.
- Smoke local: crear/editar registro `'A'` desde admin UI → verificar fila en `EmailOutbox` con `EO_TipoEntidadOrigen='AsistenciaAsistenteAdmin'` y destinatario igual a `Director.DIR_Correo` del AA.

## Salida esperada

- Chat 3c destrabado (necesita el tag `'AsistenciaAsistenteAdmin'` ya presente en outbox para bandeja).
- Chat 4 FE puede empezar la edit-dialog AA con confianza de que el correo se dispara.

## Referencias

- Plan 28 fila en `plan/maestro.md`.
- Patrón Plan 23 Chat 4 (commit en master): correos profesor.
- INV-AD05 en `business-rules.md §15.9` (ampliar comentario E/P → E/P/A en Chat 5).
