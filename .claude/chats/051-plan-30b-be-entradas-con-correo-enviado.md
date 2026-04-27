> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 30b · **Chat**: BE · **Fase**: F1.BE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 30b BE — Lista detallada de "entradas con correo enviado" en el diagnóstico del día

## PLAN FILE

Plan 30b es derivado de Plan 30 (cerrado al 100% con commit FE el 2026-04-27). Vive **inline en el maestro** (no tiene archivo dedicado). Referencia obligada:

- Maestro: `../../educa-web/.claude/plan/maestro.md` — Plan 30 ya marcado 100%; agregar Plan 30b a la cola.
- Plan 30 BE Chat 3 cerrado: commit `eb92ec2` en `Educa.API master` — `GET /api/sistema/asistencia/diagnostico-correos-dia`.
- Plan 30 FE cerrado: commit en `educa-web main` (2026-04-27) — feature `email-outbox-diagnostico` con 32 tests verdes y flag `emailOutboxDiagnostico: true`.
- Memoria relevante: el feature FE consume el DTO `DiagnosticoCorreosDiaDto` y muestra ya 3 sub-tabs del lado del gap. Falta el lado positivo simétrico.

## CONTEXTO DEL PEDIDO

El admin abrió el feature FE en producción (2026-04-27 por la mañana) y observó que el sub-tab "Detalle" del Gap del día solo muestra 3 tablas, todas del lado **negativo**:

1. Entradas sin correo enviado (con razón tipada)
2. Estudiantes sin correo apoderado
3. Apoderados blacklisteados

El conteo de **correos enviados exitosamente** existe en el `Resumen` (card verde), pero falta la lista detallada del lado positivo: **¿quiénes son los N estudiantes a los que SÍ les llegó el correo hoy?** Esto cierra la simetría visual del feature.

## OBJETIVO

Agregar al endpoint `GET /api/sistema/asistencia/diagnostico-correos-dia` una **cuarta lista** en el DTO de respuesta con el detalle de las entradas en alcance INV-C11 que sí tuvieron correo encolado y enviado exitosamente hoy. Read-only, sin mutaciones, sin WAL.

## PRE-WORK OBLIGATORIO

1. **Leer los DTOs y servicios actuales** del Plan 30 Chat 3:

   ```bash
   ls Educa.API/Educa.API/DTOs/Sistema/ | grep -E "DiagnosticoCorreosDia|EntradaSinCorreoEnviado|EstudianteSinCorreoApoderado|ApoderadoBlacklisteadoDelDia|DiagnosticoCorreosDiaResumen"
   ls Educa.API/Educa.API/Services/Sistema/ | grep -E "DiagnosticoCorreosDia"
   ls Educa.API/Educa.API/Interfaces/Services/Sistema/ | grep -E "IDiagnosticoCorreosDia"
   ```

   Familiarizarse con `DiagnosticoCorreosDiaSnapshotFactory` — ahí vive el JOIN central. La nueva query debe seguir el mismo patrón (mismo filtro INV-C11, mismo cap de fecha, mismo fail-safe `LogWarning` + lista vacía).

2. **Confirmar la auditoría de correos al colegio** que ya documenta el patrón de tipo `"ASISTENCIA"` en mayúsculas (memoria `project_email_type_literals.md`). El filtro debe ser case-insensitive sobre `EO_Tipo` o usar el literal exacto que el `EmailOutboxWorker` inserta.

3. **Verificar índices BD existentes** sobre `EmailOutbox`:

   ```sql
   SELECT i.name, i.type_desc
   FROM sys.indexes i
   WHERE i.object_id = OBJECT_ID('EmailOutbox')
     AND i.name IS NOT NULL;
   ```

   Si no existe índice por `(EO_Tipo, EO_Estado, EO_FechaReg)` y la query nueva resulta lenta, agregar uno filtrado. Mostrar el script al usuario antes de ejecutar (regla: NUNCA ejecutar SQL sin mostrar al usuario primero).

## ALCANCE

### 1. Nuevo DTO `EntradaConCorreoEnviado`

`Educa.API/Educa.API/DTOs/Sistema/EntradaConCorreoEnviado.cs`:

```csharp
namespace Educa.API.DTOs.Sistema
{
    /// <summary>
    /// Plan 30b — entrada de asistencia del día en alcance INV-C11 que generó
    /// fila exitosa en EmailOutbox (filtrada por EO_Estado = SENT). Es la lista
    /// simétrica positiva al gap: el admin ve a quiénes SÍ les llegó el correo,
    /// no solo quiénes faltan. Permite cerrar la simetría visual del Detalle
    /// del Gap del día sin tener que cruzar manualmente con la Bandeja.
    ///
    /// El campo Estado se incluye aunque hoy siempre sea "SENT" — deja la puerta
    /// abierta a expandir el filtro a PENDING/RETRYING en el futuro sin romper
    /// el contrato del DTO.
    /// </summary>
    public sealed class EntradaConCorreoEnviado
    {
        public required long AsistenciaId { get; init; }

        public required int EstudianteId { get; init; }

        /// <summary>DNI enmascarado vía DniHelper.Mask → "***1234".</summary>
        public required string DniMasked { get; init; }

        public required string NombreCompleto { get; init; }

        /// <summary>Etiqueta corta tipo "4to Primaria B".</summary>
        public required string Salon { get; init; }

        public required int GraOrden { get; init; }

        /// <summary>ASP_HoraEntrada (hora Perú).</summary>
        public required DateTime HoraEntrada { get; init; }

        /// <summary>EO_CodID — permite deep-link al detalle del outbox o al hub correlation.</summary>
        public required long EmailOutboxId { get; init; }

        /// <summary>Correo del apoderado al que salió el envío, enmascarado ("e***o@dominio.com").</summary>
        public required string CorreoApoderadoMasked { get; init; }

        /// <summary>EO_Estado — siempre "SENT" en esta release (filtro de la query). Reservado para expansión futura.</summary>
        public required string Estado { get; init; }

        /// <summary>EO_FechaReg — timestamp del encolado (hora Perú). Cercano a HoraEntrada porque el webhook encola sincrónicamente.</summary>
        public required DateTime FechaEnvio { get; init; }

        /// <summary>EO_Remitente — buzón desde el que salió (multi-sender). Null en filas históricas.</summary>
        public string? Remitente { get; init; }

        /// <summary>EO_CorrelationId — para saltar al hub correlation (Plan 32) y reconstruir todo el contexto.</summary>
        public string? CorrelationId { get; init; }
    }
}
```

### 2. Campo nuevo en `DiagnosticoCorreosDiaDto`

Agregar al DTO existente (`Educa.API/Educa.API/DTOs/Sistema/DiagnosticoCorreosDiaDto.cs`):

```csharp
public required List<EntradaConCorreoEnviado> EntradasConCorreoEnviado { get; init; }
```

Campo `required` — al ser breaking del contrato, todos los consumidores actuales del DTO deben pasar el array (vacío si no hay datos). Hoy solo hay un consumidor: el FE `educa-web` que el chat FE 30b va a actualizar inmediatamente después.

### 3. Query JOIN en `DiagnosticoCorreosDiaSnapshotFactory`

Agregar método privado (siguiendo el patrón de los métodos existentes que producen las otras 3 listas):

```csharp
private async Task<List<EntradaConCorreoEnviado>> ObtenerEntradasConCorreoEnviadoAsync(
    DateTime fechaLima,
    int? sedeId,
    CancellationToken ct)
{
    try
    {
        // JOIN AsistenciaPersona (entrada hoy, TipoPersona='E', GRA_Orden>=8)
        //   con EmailOutbox (EO_Tipo='ASISTENCIA', EO_Estado='SENT', EO_FechaReg dentro del día)
        //   por correlación entidadOrigen + entidadId (TipoEntidadOrigen='AsistenciaPersona' + EntidadOrigenId=ASP_CodID)
        //   o por destinatario (EST_CorreoApoderado).
        //
        // Decidir cuál cruce es más confiable inspeccionando cómo encola hoy
        // el webhook (EmailOutboxWorker / EmailNotificationService.EnviarNotificacionAsistencia).
        // Si el outbox guarda EntidadOrigenId = ASP_CodID, ese es el cruce más limpio.

        var inicio = fechaLima.Date;
        var fin = inicio.AddDays(1);

        var query =
            from asp in _ctx.AsistenciaPersona
                .AsNoTracking()
                .Where(a =>
                    a.ASP_TipoPersona == "E" &&
                    a.ASP_HoraEntrada != null &&
                    a.ASP_FechaAsistencia >= inicio &&
                    a.ASP_FechaAsistencia < fin)
            join est in _ctx.Estudiante.AsNoTracking() on asp.ASP_PersonaCodID equals est.EST_CodID
            join ess in _ctx.EstudianteSalon.AsNoTracking() on est.EST_CodID equals ess.ESS_EST_CodID
            join sal in _ctx.Salon.AsNoTracking() on ess.ESS_SAL_CodID equals sal.SAL_CodID
            join gra in _ctx.Grado.AsNoTracking() on sal.SAL_GRA_CodID equals gra.GRA_CodID
            join sec in _ctx.Seccion.AsNoTracking() on sal.SAL_SEC_CodID equals sec.SEC_CodID
            join eo in _ctx.EmailOutbox.AsNoTracking()
                on new { TipoEntidad = "AsistenciaPersona", EntidadId = (long)asp.ASP_CodID }
                equals new { TipoEntidad = eo.EO_TipoEntidadOrigen, EntidadId = eo.EO_EntidadOrigenId }
            where
                gra.GRA_Orden >= AsistenciaGrados.UmbralGradoAsistenciaDiaria &&
                ess.ESS_Estado &&
                ess.ESS_Anio == fechaLima.Year &&
                eo.EO_Tipo == EmailOutboxTipos.Asistencia &&
                eo.EO_Estado == EmailOutboxEstados.Sent &&
                eo.EO_FechaReg >= inicio &&
                eo.EO_FechaReg < fin &&
                (sedeId == null || sal.SAL_SED_CodID == sedeId.Value)
            orderby asp.ASP_HoraEntrada
            select new EntradaConCorreoEnviado
            {
                AsistenciaId = asp.ASP_CodID,
                EstudianteId = est.EST_CodID,
                DniMasked = DniHelper.Mask(est.EST_DNI), // Mask sobre el byte[] decifrado
                NombreCompleto = (est.EST_Apellidos + ", " + est.EST_Nombres).Trim(),
                Salon = $"{gra.GRA_Nombre} {sec.SEC_Nombre}",
                GraOrden = gra.GRA_Orden,
                HoraEntrada = asp.ASP_HoraEntrada!.Value,
                EmailOutboxId = eo.EO_CodID,
                CorreoApoderadoMasked = EmailMasker.Mask(est.EST_CorreoApoderado ?? ""),
                Estado = eo.EO_Estado,
                FechaEnvio = eo.EO_FechaReg,
                Remitente = eo.EO_Remitente,
                CorrelationId = eo.EO_CorrelationId,
            };

        return await query.ToListAsync(ct);
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "Plan 30b: ObtenerEntradasConCorreoEnviadoAsync falló — devolviendo lista vacía (INV-S07)");
        return new List<EntradaConCorreoEnviado>();
    }
}
```

> **Nota de implementación**: Verificar el JOIN exacto. Si `EmailOutbox` no guarda `EntidadOrigenId = ASP_CodID` (puede que use `EST_CodID` o un compuesto), ajustar la cláusula. Si la query es lenta, considerar materializar primero el subset de outbox del día y hacer el JOIN en memoria, o agregar índice.

### 4. Llamar el nuevo método desde el orquestador

En el método principal `GetDiagnosticoAsync` del `DiagnosticoCorreosDiaService`, agregar:

```csharp
var entradasConCorreo = await _factory.ObtenerEntradasConCorreoEnviadoAsync(fechaLima, sedeId, ct);

return new DiagnosticoCorreosDiaDto
{
    // ... campos existentes ...
    EntradasConCorreoEnviado = entradasConCorreo,
};
```

### 5. Tests

**`DiagnosticoCorreosDiaServiceTests.cs`** — agregar 3 casos:

| # | Caso | Esperado |
|---|------|----------|
| 1 | Día con 5 entradas en alcance + 5 outbox SENT | `EntradasConCorreoEnviado.Count == 5`, ordenadas por `HoraEntrada` |
| 2 | Día con entradas en alcance pero outbox `FAILED` | `EntradasConCorreoEnviado.Count == 0` (filtra por SENT) |
| 3 | Día con entradas fuera de alcance (`GRA_Orden < 8`) + outbox SENT | `EntradasConCorreoEnviado.Count == 0` (respeta INV-C11) |

**`DiagnosticoCorreosDiaSnapshotFactoryTests.cs`** — agregar 1 caso de fail-safe:

| # | Caso | Esperado |
|---|------|----------|
| 4 | DbContext lanza excepción durante la query | Lista vacía + `LogWarning` (no propaga 500) |

## REGLAS OBLIGATORIAS

- **`backend.md`** — DTOs en archivo individual (1 archivo = 1 clase). Service ≤ 300 líneas (verificar después del cambio). Usar `AsNoTracking()` (read-only). DNI enmascarado en respuesta, nunca crudo (INV-D01 + DniHelper).
- **`business-rules.md`** — respetar INV-C11 (filtro `GRA_Orden >= 8`), INV-D09 (filtrar `_Estado = true` en `EstudianteSalon`), INV-S07 (fail-safe — error en query interna no propaga 500).
- **`backend.md` — soft-delete en tablas de relación**: `EstudianteSalon` debe filtrar `ESS_Estado` para no traer matrículas inactivas.
- **`backend.md` — corrección sistemática**: si descubrís que el JOIN sobre `EmailOutbox.EO_TipoEntidadOrigen` requiere distinto literal del que asumí, grep en todo el código para verificar consistencia con cómo encola el `EmailNotificationService`.
- **Email enmascarado**: si no existe `EmailMasker.Mask`, usar el helper que ya usa `ApoderadoBlacklisteadoDelDia.CorreoMasked` o crear uno consistente con el patrón.
- **`code-language.md` + `backend.md`**: backend en español (DTOs, services, namespace `Educa.API.DTOs.Sistema`).
- **Migraciones BD**: si se decide agregar índice nuevo, MOSTRAR el script al usuario antes de ejecutar (NUNCA aplicar SQL sin confirmación).

## TESTS VERDES ESPERADOS

- `Educa.API.Tests` baseline actual + 4 tests nuevos del Plan 30b → todos verdes.
- `dotnet build` sin warnings nuevos.
- `dotnet test` verde end-to-end.

## FUERA DE ALCANCE

- **No tocar el FE** — el FE de Plan 30b vive en `educa-web main` y se ejecuta en un chat separado **después** del cierre de este BE. La señal para abrir el chat FE es el commit BE pusheado.
- **No agregar otros estados** — solo `SENT`. Si en el futuro se quiere expandir a `PENDING` / `RETRYING`, abrir mini-plan derivado. El campo `Estado` en el DTO deja la puerta abierta sin romper contrato.
- **No tocar `EmailOutbox`, `EmailBlacklist` ni `EmailOutboxWorker`** — son módulos hermanos.
- **No tocar la página `/admin/email-outbox` ni el hub de correlation (Plan 32)** — solo se referencian vía `EmailOutboxId` y `CorrelationId` del DTO.
- **No agregar paginación** — el día tiene typically <200 entradas en alcance; si crece, considerar paginar en futuro plan derivado.

## CRITERIOS DE CIERRE

- [ ] Pre-work hecho: DTOs y servicios actuales auditados, índice EmailOutbox verificado.
- [ ] Nuevo DTO `EntradaConCorreoEnviado` creado en su archivo dedicado.
- [ ] Campo `EntradasConCorreoEnviado` agregado a `DiagnosticoCorreosDiaDto` como `required`.
- [ ] Método `ObtenerEntradasConCorreoEnviadoAsync` implementado en el snapshot factory con fail-safe try/catch + `LogWarning`.
- [ ] DNI enmascarado, correo enmascarado, INV-C11 respetado, INV-D09 respetado.
- [ ] 4 tests nuevos verdes.
- [ ] `dotnet build` + `dotnet test` verde.
- [ ] Commit BE en `Educa.API master` con mensaje canónico (en inglés, sin Co-Authored-By).
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat (mantenido en repo FE).
- [ ] Avisar al usuario para abrir chat FE Plan 30b inmediatamente después del push BE.

## COMMIT MESSAGE sugerido

```
feat(diagnostico-correos): Plan 30b BE - add EntradasConCorreoEnviado list

Add the symmetric positive list to the daily gap diagnostic DTO. The
"diagnostico-correos-dia" endpoint now exposes "EntradasConCorreoEnviado"
alongside the 3 existing gap lists, so admins can see the complete picture
in one snapshot: who got the email AND who didn't.

The new list filters by "EO_Estado = SENT" + "EO_Tipo = ASISTENCIA" within
the day window, JOINed against attendance entries in INV-C11 scope (GRA_Orden
>= 8). Each row carries the EmailOutbox id and correlation id so the FE can
deep-link to the outbox detail or the correlation hub. Fail-safe with try/catch
and "LogWarning" — never propagates 500 (INV-S07).

Adds 4 tests covering happy path with SENT entries, filter by status, INV-C11
scope guard, and fail-safe behavior on DbContext exceptions.
```

## SIGUIENTE CHAT (Plan 30b FE — después del push BE)

Una vez este BE esté cerrado y desplegado, abrir un chat FE en `educa-web main`:

- Espejar `EntradaConCorreoEnviado` y campo `entradasConCorreoEnviado` en `correos-dia.models.ts`.
- Crear componente `entradas-con-correo-table` (simétrico a `entradas-sin-correo-table`, variant verde/success).
- Agregar 4to sub-tab "Entradas con correo (N)" en `tab-correos-dia.component.html` con badge verde.
- Actualizar `correos-dia.store.ts` para exponer el nuevo array vía `vm`.
- Tests del componente nuevo + ajustar tests existentes que assertean el shape del DTO.
