# Plan — Limpieza de drifts BE (logging, DateTime.Now, inyecciones muertas)

> **Repo**: `Educa.API` (BE) · **Tipo**: refactor + docs · **Riesgo**: muy bajo
> **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.

## Contexto

Auditoría externa (codex, 2026-05-13) confirmó 3 patrones que violan reglas vivas de `backend.md`, todos con instancias acotadas. Son fixes mecánicos sin riesgo de regresión runtime.

## Hallazgos verificados

### F1 — Structured logging (regla: `backend.md` §Logging)

Logger con `$"..."` interpolation. Las reglas exigen placeholders. Instancias confirmadas:

| Archivo | Líneas |
|---|---|
| `Services/Integraciones/CrossChexApiService.cs` | 138, 143, 283 |
| `Services/Notifications/NotificacionFaltasService.cs` | 168 |

**Fix mecánico**:
```csharp
// Antes
_logger.LogError(ex, $"Error obteniendo registros del {date:yyyy-MM-dd}");
// Después
_logger.LogError(ex, "Error obteniendo registros del {Date:yyyy-MM-dd}", date);
```

Audit antes del fix: `grep -rE '_logger\.\w+\(\$"' Services/ Controllers/ Middleware/` por si hay más.

### F2 — `DateTime.Now` → `DateTimeHelper.PeruNow()` (regla: `backend.md` §Model Checklist + INV-D04)

| Archivo | Líneas |
|---|---|
| `Services/Asistencias/ReporteAsistenciaProfesorPdfService.cs` | 152, 208 |

Son timestamps de "Generado el ..." en PDFs — bajo riesgo, pero la regla es absoluta. Audit antes del fix: `grep -rn "DateTime.Now" Services/`.

### F3 — Inyección muerta `IEmailService` en `PasswordRecoveryService` (regla: backend.md §Envío de Correos)

`PasswordRecoveryService.cs:27,45` inyecta `IEmailService _emailService` pero **nunca lo usa** — todos los envíos van por `_outboxService.EnqueueAsync` (línea 295). Codex lo reportó como violación de outbox; **la realidad es inyección huérfana**, no violación funcional.

**Fix**: quitar `IEmailService` del constructor + propiedad. Validar que el DI container no tenga consumidores que esperen el campo.

## Fases

| Fase | Scope | Estimado | Riesgo |
|---|---|---|---|
| F1 | 4 líneas en 2 archivos + audit grep | 30 min | muy bajo |
| F2 | 2 líneas en 1 archivo + audit grep | 15 min | nulo |
| F3 | 3 líneas en 1 archivo + verificar consumers | 15 min | bajo |

Todas las fases pueden ir en **un solo chat de `/execute`** + `/validate` con `dotnet build` y suite de tests existente.

## Criterio de cierre

- `grep -rE '_logger\.\w+\(\$"' Educa.API/Services/ Educa.API/Controllers/ Educa.API/Middleware/` → 0 líneas (o sólo casos no logger).
- `grep -rn "DateTime.Now" Educa.API/Services/` → 0 líneas (o sólo en tests/comentarios).
- Suite BE verde (~1680 tests).
- `dotnet build` limpio sin warnings nuevos.

## Prioridad

**Media-alta**. Son violaciones de reglas activas, pero ninguna afecta producción hoy:
- F1 (logging) degrada observabilidad en errores reales — no rompe nada pero pierde estructura.
- F2 (DateTime.Now) puede dar timestamps en zona horaria del servidor en lugar de Perú — bajo impacto en PDFs.
- F3 (inyección muerta) es deuda menor pero el día que se elimine `IEmailService` del DI rompería el constructor.

Razonable de empaquetar en un chat de "limpieza chica BE" cuando se abra una ventana entre features grandes. No bloquea ningún plan vivo.
