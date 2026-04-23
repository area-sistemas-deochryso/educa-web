> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 30 · **Chat**: 1 · **Fase**: F1.BE · **Estado**: ⏳ pendiente arrancar — cola top 3 del maestro posición #2.

---

# Plan 30 Chat 1 — BE: Dashboard "correos del día" (endpoint admin)

## PLAN FILE

- Plan canónico: **inline en el maestro** bajo sección **"🟡 Plan 30 — Dashboard Visibilidad Admin"**.
- Origen: 2026-04-23, sesión de cierre de Plan 24 Chat 2. El usuario declara que hoy depende de **25+ queries SQL manuales** para verificar el estado de correos y asistencia cada día — "altamente impráctico". Plan 30 convierte esas queries en pantallas admin reutilizables.

## OBJETIVO

Agregar un endpoint `GET /api/sistema/email-outbox/dashboard-dia` que el admin consume para ver en **una sola request** el estado del día de correos salientes: enviados, fallidos por tipo, distribución por hora, bounces 5.x.x acumulados y contador defer/fail cPanel. Reemplaza las queries **Q1/Q3/Q4/Q8 + D1/D4** del set SQL que el admin ejecuta manualmente hoy.

**Alcance explícito**: **solo BE**. El FE (pantalla `/intranet/admin/email-outbox/dashboard-dia`) es Plan 30 Chat 4, posterior.

## PRE-WORK OBLIGATORIO (investigación antes de codear)

1. **Leer** `Educa.API/Controllers/Sistema/EmailOutboxController.cs` — ver qué endpoints ya existen (defer-fail-status del Plan 29 Chat 2.6, throttle-status del Plan 22 Chat A). El nuevo endpoint sigue el **mismo patrón de ruta y rate-limit**.
2. **Leer** `Educa.API/Services/Sistema/EmailOutboxThrottleStatusService.cs` — template de service que agrega datos de `EmailOutbox` con `try/catch` de resiliencia (INV-S07) + fallback CRITICAL.
3. **Leer** `Educa.API/DTOs/Sistema/EmailDeferFailStatusDto.cs` — template de DTO para widgets admin.
4. **Leer** `Educa.API/Constants/Sistema/OutboxEstados.cs` (si existe) — constantes de `EO_Estado` para no repetir strings.
5. **Ejecutar SQL de referencia** en dev/prod para confirmar shapes reales:
   - `SELECT DISTINCT EO_Tipo FROM EmailOutbox WHERE EO_FechaReg >= CAST(DATEADD(HOUR, -5, GETUTCDATE()) AS DATE)` → catálogo de tipos del día.
   - `SELECT DISTINCT EO_TipoFallo FROM EmailOutbox WHERE EO_Estado = 'FAILED'` → catálogo de tipos de fallo.
6. **Leer** `Educa.API/Constants/Sistema/ReporteUsuarioTipos.cs` — patrón `const + static readonly array` que podría aplicar si se agrega catálogo de estados/fallos canónicos.

## DECISIONES A VALIDAR CON EL USUARIO (antes de tocar código)

4 decisiones no triviales. **Todas con recomendación del plan — el usuario puede aceptar el lote completo o ajustar**.

1. **Granularidad del endpoint**: 1 endpoint con DTO rico (preferible) vs 3 endpoints granulares (`/resumen-dia`, `/por-hora`, `/bounces-acumulados`).
   - **Recomendación**: **1 endpoint**. El admin consume la pantalla completa de una vez; 3 endpoints suman round-trips sin ganancia.

2. **Filtro de fecha**: parámetro `?fecha=yyyy-MM-dd` (permite históricos) vs siempre "hoy Lima" sin parámetro.
   - **Recomendación**: **parámetro opcional**, default "hoy Lima". Permite auditar días pasados sin duplicar endpoint. Validar formato + cap 90 días atrás para evitar queries caras.

3. **Bounces 5.x.x acumulados — incluir en este endpoint o diferir a F3**:
   - El set Q8 del SQL hoy cuenta bounces agrupados por destinatario con `HAVING COUNT(*) >= 2` — detecta candidatos a auto-blacklist (INV-MAIL02) antes del 3er bounce.
   - **Recomendación**: **incluir ya como sub-sección `BouncesAcumulados[]`**. Ya consume `EmailOutbox`, no agrega tabla nueva. Es el indicador temprano más útil para el admin.

4. **Rate limit policy**: `reads` (200/min por userId) vs `heavy` (5/min por userId) — el query agrega ~2-5K filas.
   - **Recomendación**: **`reads` + `[RateLimitOverride("reads", 0.5)]`** = 100/min efectivo. Barato para BD (índices de `EO_FechaReg` + `EO_Estado` ya existen), admin refresca frecuentemente.

Durante el chat, el usuario acepta/ajusta antes de que se escriba código.

## ALCANCE

### Archivos a crear

| # | Archivo | Rol | Líneas estimadas |
|---|---------|-----|-----------------:|
| 1 | `DTOs/Sistema/EmailDashboardDiaDto.cs` | DTO compuesto (resumen + porHora + porTipo + bouncesAcumulados) | ~80 |
| 2 | `Services/Sistema/EmailDashboardDiaService.cs` | Agrega datos de `EmailOutbox` con resiliencia fire-and-forget | ~150 |
| 3 | `Interfaces/Services/Sistema/IEmailDashboardDiaService.cs` | Contrato | ~15 |
| 4 | `Repositories/Sistema/EmailDashboardDiaRepository.cs` | 4 queries `AsNoTracking()` con CTEs o subqueries | ~180 |
| 5 | `Interfaces/Repositories/Sistema/IEmailDashboardDiaRepository.cs` | Contrato | ~15 |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `Controllers/Sistema/EmailOutboxController.cs` | Agregar `GET /dashboard-dia?fecha={yyyy-MM-dd}` con `[Authorize(Roles = Roles.Administrativos)]` + `[EnableRateLimiting("reads")]` + `[RateLimitOverride("reads", 0.5)]` |
| `Program.cs` (DI) | Registrar `IEmailDashboardDiaService` + `IEmailDashboardDiaRepository` como Scoped |

### Contrato DTO (tentativo — ajustable en el chat)

```csharp
public class EmailDashboardDiaDto
{
    public DateTime Fecha { get; set; }                            // Fecha consultada (Lima)
    public EmailDashboardResumenDto Resumen { get; set; } = new(); // Totales agregados
    public List<EmailDashboardPorHoraDto> PorHora { get; set; } = new();
    public List<EmailDashboardPorTipoDto> PorTipo { get; set; } = new();
    public List<EmailBouncesAcumuladosDto> BouncesAcumulados { get; set; } = new();
}

public class EmailDashboardResumenDto
{
    public int Enviados { get; set; }
    public int Fallidos { get; set; }
    public int Pendientes { get; set; }
    public int Reintentando { get; set; }
    public int FormatoInvalido { get; set; }    // EO_TipoFallo = FAILED_INVALID_ADDRESS
    public int SinCorreo { get; set; }          // FAILED_NO_EMAIL
    public int Blacklisteados { get; set; }     // FAILED_BLACKLISTED
    public int ThrottleHost { get; set; }       // FAILED_THROTTLE_HOST
    public int OtrosFallos { get; set; }
    public int DeferFailContadorCpanel { get; set; } // reutilizar lógica Plan 29 Chat 2.6
}

public class EmailDashboardPorHoraDto
{
    public int Hora { get; set; }        // 0-23
    public int Enviados { get; set; }
    public int Fallidos { get; set; }
    public int QueLlegaronAlSmtp { get; set; }  // Cuentan contra cPanel (Q4)
}

public class EmailDashboardPorTipoDto
{
    public string Tipo { get; set; } = ""; // "Asistencia", "CROSSCHEX_SYNC", etc.
    public int Enviados { get; set; }
    public int Fallidos { get; set; }
    public int Pendientes { get; set; }
}

public class EmailBouncesAcumuladosDto
{
    public string DestinatarioMasked { get; set; } = ""; // e***@dominio.com
    public int BouncesAcumulados { get; set; }
    public DateTime UltimoIntento { get; set; }
    public string UltimoError { get; set; } = ""; // truncado 100 chars
}
```

**Enmascaramiento**: `EmailDashboardDiaService` aplica `MaskEmail()` helper (inline, como en Plan 22 Chat 5 F4.BE) antes de exponer bounces — evita fuga de correos completos en la UI admin.

## TESTS MÍNIMOS

| Caso | Setup | Esperado |
|------|-------|----------|
| Dashboard día sin filtro → default "hoy Lima" | Seed 10 filas repartidas en estados | DTO con Resumen.Enviados/Fallidos correctos |
| Dashboard día con filtro futuro | `?fecha=2026-12-31` | 400 `FECHA_FUTURA_INVALIDA` |
| Dashboard día con filtro > 90 días atrás | `?fecha=2025-01-01` | 400 `FECHA_DEMASIADO_ANTIGUA` |
| Distribución por hora | Seed 3 filas en `EO_FechaReg` con horas 8/10/14 | `PorHora` con 3 entries no-cero |
| Distribución por tipo | Seed 2 Asistencia + 1 CROSSCHEX_SYNC | `PorTipo[2]` con counts correctos |
| Bounces acumulados — solo destinatarios con ≥2 | Seed 1 correo con 3 bounces 5.x.x + otro con 1 | `BouncesAcumulados[1]` con el de 3 |
| Correos masked en `BouncesAcumulados` | Destinatario `juan.perez@dominio.com` | Output `"j***z@dominio.com"` (o similar, definir patrón exacto) |
| Rate limit `reads` + override 0.5 efectivo | 101 requests/min | 102a retorna 429 |
| Authz: rol no-administrativo | Profesor autenticado | 403 |
| Resiliencia BD — query falla | Mock repo lanza | Service retorna DTO con `Resumen` en ceros + log Warning, no 500 (INV-S07) |

Framework: xUnit + FluentAssertions + Moq + `TestDbContextFactory`. Authz reflection pattern como en `AsistenciaAdminControllerAuthorizationTests`.

**Baseline esperado**: 1316 BE + ~12 nuevos = **1328**.

## REGLAS OBLIGATORIAS

- **Cap 300 líneas** por `.cs`. `EmailOutboxController.cs` ya tiene endpoints de Plan 22/29 — revisar línea actual ANTES de agregar. Si supera, extraer los nuevos endpoints a `EmailOutboxDashboardController.cs` separado.
- **INV-MAIL01/02** sin cambios: este endpoint es **read-only**, no muta outbox ni blacklist.
- **INV-S07**: fallo de repo o agregación no debe tirar 500 — retornar DTO con ceros + log Warning + 200 OK. El admin ve "0 enviados" en vez de error.
- **DNI enmascarado**: los bounces acumulados **no muestran DNI** (solo correo masked). Si en algún momento se agrega DNI, usar `DniHelper.Mask`.
- **`AsNoTracking()`** obligatorio en todas las queries del repo (read-only).
- **Logger structured**: `LogInformation("[EmailDashboardDia] Fecha {Fecha} → {Enviados} enviados, {Fallidos} fallidos", ...)` nunca interpolación.
- **Fecha Perú**: parámetro `fecha` parsea como local Lima. Comparaciones contra `EO_FechaReg` usan boundary `[00:00:00 Lima, 23:59:59 Lima]` convertidas a UTC.
- **ApiResponse<T>** como envelope (INV-D08).

## FUERA DE ALCANCE

- **Frontend** — Plan 30 Chat 4 (pantalla admin que consume este endpoint + los de F2 y F3). Este chat solo es BE.
- **Gap asistencia-vs-correos** — Plan 30 Chat 2 F2.BE. Endpoint distinto, cruce con `AsistenciaPersona`.
- **Búsqueda por correo específico** — Plan 30 Chat 3 F3.BE. Endpoint `GET /diagnostico-correo?correo=...`.
- **Escritura sobre `EmailOutbox`** — este endpoint NO reintenta, NO cancela, NO marca manual blacklist. Read-only.
- **Catálogo persistido de tipos** — los `EO_Tipo` ya se autodocumentan por `SELECT DISTINCT`. No se crea tabla nueva.
- **Histórico > 90 días** — el query rechaza esas fechas. El admin que necesite histórico profundo usa SSMS (caso raro, vale la pena).

## CRITERIOS DE CIERRE

```
INVESTIGACIÓN INICIAL (≤ 10 min)
[ ] Leer EmailOutboxController.cs (endpoints existentes Plan 22/29)
[ ] Leer EmailOutboxThrottleStatusService.cs (template de agregación)
[ ] Leer EmailDeferFailStatusDto.cs (template DTO)
[ ] SQL de referencia: SELECT DISTINCT EO_Tipo + EO_TipoFallo de hoy
[ ] Confirmar con usuario las 4 DECISIONES antes de codear

CÓDIGO
[ ] DTO compuesto con 4 sub-DTOs (Resumen + PorHora[] + PorTipo[] + BouncesAcumulados[])
[ ] Service con try/catch global (resiliencia INV-S07)
[ ] Repo con 4 queries AsNoTracking (agregada por estado, por hora, por tipo, bounces)
[ ] Controller endpoint con authz + rate limit + validación de fecha
[ ] MaskEmail aplicado a bounces
[ ] Cap 300 líneas en todos los archivos

TESTS
[ ] 2-3 tests contract del controller (authz, filtros, ApiResponse<T>)
[ ] 6-8 tests de service (agregación correcta, fecha default, fecha inválida, bounces filtrados, masking)
[ ] 1-2 tests de authz reflection
[ ] dotnet test verde — suite ~1316 baseline + ~12 = ~1328

INVARIANTES
[ ] INV-MAIL01/02 sin cambios (read-only)
[ ] INV-S07 preservado (resiliencia de agregación)
[ ] INV-D08 (ApiResponse<T>) respetado

VALIDACIÓN
[ ] dotnet build limpio
[ ] dotnet test verde con delta esperado
[ ] Smoke manual con Postman contra dev:
    1. GET /api/sistema/email-outbox/dashboard-dia → 200 con estructura completa
    2. GET ...?fecha=2026-04-22 → histórico 1 día atrás OK
    3. GET ...?fecha=2027-01-01 → 400
    4. Authenticar como Profesor → 403

MAESTRO
[ ] maestro.md Plan 30: 0% → ~25% (Chat 1 de 4)
[ ] cola top 3 actualizada: remover Plan 30 F1, promover F2 o Plan 24 Chat 3 FE

COMMIT
[ ] Un solo commit en Educa.API master con subject sugerido abajo
[ ] Mover este archivo a educa-web/.claude/chats/closed/ en el commit docs del maestro
```

## COMMIT MESSAGE sugerido

### Commit BE (Educa.API master)

**Subject** (≤ 72 chars):

```
feat(sistema): Plan 30 Chat 1 — email dashboard-dia endpoint
```

**Body**:

```
Add GET /api/sistema/email-outbox/dashboard-dia for admin visibility
on daily outbound email health. Replaces 6 manual SQL queries
("Q1/Q3/Q4/Q8 + D1/D4") that the admin runs every day in SSMS.

 - "EmailDashboardDiaDto" returns a composed payload: "Resumen"
   (totals by state + failure type + cPanel defer/fail counter),
   "PorHora[]" (24 buckets with sent/failed/reached-SMTP),
   "PorTipo[]" (aggregation by "EO_Tipo"), and "BouncesAcumulados[]"
   (destinations with 2+ "5.x.x" bounces — early warning before
   "INV-MAIL02" auto-blacklist triggers at 3).
 - "EmailDashboardDiaService" wraps the 4 aggregation queries in a
   global try/catch returning zeroed DTO + LogWarning on failure.
   A failed aggregation NEVER surfaces a 500 to the admin
   ("INV-S07").
 - "EmailDashboardDiaRepository" runs "AsNoTracking()" queries with
   boundaries computed in Lima time. Optional "?fecha=yyyy-MM-dd"
   parameter accepts today and 90 days back; future or older
   returns 400 ("FECHA_*").
 - Emails in "BouncesAcumulados[]" go through a "MaskEmail()"
   helper — admin sees "j***z@dominio.com" instead of the full
   address ("INV-D09" spirit).
 - Endpoint sits under "[Authorize(Roles = Roles.Administrativos)]"
   + "[EnableRateLimiting(\"reads\")]" with
   "[RateLimitOverride(\"reads\", 0.5)]" (100/min effective).
 - Read-only — no mutation on "EmailOutbox" / "EmailBlacklist".

Tests:
 - 2-3 controller contract (authz + filters + envelope).
 - 6-8 service aggregation (default fecha, invalid fecha, bounces
   filter, masking, INV-S07 resilience).
 - 1-2 authz reflection.

Suite "1316 → ~1328 BE verdes" ("dotnet test"). Build OK.
Plan 30 row from 0% to ~25% — Chat 1 of 4.
```

### Commit docs-maestro (separado, repo educa-web)

**Subject**:

```
docs(maestro): Plan 30 Chat 1 F1.BE ✅ cerrado — commit <HASH> en Educa.API
```

## CIERRE

Feedback a pedir al cerrar el Chat 34 (Plan 30 Chat 1):

1. **Decisiones finales** — registrar las 4 decisiones aceptadas/ajustadas durante el chat.
2. **Smoke manual** — contrastar el JSON del endpoint contra las queries Q1/Q3/Q4/Q8 del SQL para verificar paridad numérica. Si hay drift, documentar por qué.
3. **Shape útil para Chat 4 FE** — ¿el admin ya puede imaginar la pantalla del Plan 30 Chat 4 FE con este shape, o falta algún campo? Agregar al DTO si sí.
4. **Tests baseline** — confirmar delta final (~12 esperados). Si subió/bajó, anotar razón.
5. **Próximo chat** — Plan 30 Chat 2 F2.BE (gap asistencia-vs-correos, cruce `AsistenciaPersona` + `EmailOutbox` + `EmailBlacklist`).
6. **Slot #3 del top 3** — al cerrar, decidir qué sube al slot que deja Plan 30 F1. Candidatos: Plan 30 Chat 2 F2.BE (natural), Plan 24 Chat 3 FE (UX pulida), Plan 29 Chat 3 OPS (sigue #1).
