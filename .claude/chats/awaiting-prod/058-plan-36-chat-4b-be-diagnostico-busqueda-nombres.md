> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat en este repo.
> **Plan**: 36 · **Chat**: 4b · **Fase**: F4.BE (`/design + /execute`) · **Creado**: 2026-04-27 · **Estado**: 🟢 cerrado local 2026-04-28 (awaiting-prod) · **Bloquea**: Chat 4 FE (059).
> **Validación prod**: ⏳ pendiente desde 2026-04-28 — el FE Chat 4 (059) consume `GET /api/sistema/email-outbox/diagnostico/buscar-personas?q=` y necesita el endpoint deployado + smoke test antes de arrancar.

---

## RESULTADO (cierre local 2026-04-28)

**Build + suite completa**: ✅ 1482/1482 BE verdes (baseline 1470, +12 tests nuevos).

### Decisiones tomadas
1. **Endpoint nuevo** `GET /api/sistema/email-outbox/diagnostico/buscar-personas?q=` — separado del `/diagnostico?correo=` para no mezclar texto libre con correo exacto.
2. Response devuelve **lista de personas** (typeahead, no auto-pick).
3. **Cap 10** total + 10 por tabla pre-merge.
4. **DNI incluido** vía `*_DNI_Hash == ComputeHash(q)` cuando `q` son 8 dígitos exactos.
5. Service convertido a **`partial class`** (`EmailDiagnosticoService.cs` 293 ln + `EmailDiagnosticoService.Busqueda.cs` 53 ln) para respetar cap 300.
6. Correo en plano en response (admin tiene permiso) + `CorreoMasked` para typeahead UI.

### Archivos
**Nuevos** (4): `DTOs/Sistema/PersonaConCorreoDto.cs`, `DTOs/Sistema/BuscarPersonasResponseDto.cs`, `Services/Sistema/EmailDiagnosticoPersonaSearch.cs` (216 ln, sibling de `*Lookup.cs`), `Services/Sistema/EmailDiagnosticoService.Busqueda.cs`.
**Modificados** (4): `Interfaces/Services/Sistema/IEmailDiagnosticoService.cs`, `Services/Sistema/EmailDiagnosticoService.cs`, `Controllers/Sistema/EmailOutboxController.cs`, `Educa.API.Tests/Services/Sistema/EmailDiagnosticoServiceTests.cs` (+12 tests).

### Aprendizajes transferibles
- **Pre-work SQL** del brief reveló campos críticos (`EST_DNI_Hash` etc.) que cambiaron la decisión sobre incluir DNI en scope. Pre-work SQL siempre vale.
- **Patrón sibling helper** (`*Lookup.cs` + `*Search.cs`) consolidado: cuando una operación nueva sobre las 4 tablas comparte estructura pero distinto criterio de match, extraer helper estático interno mantiene el service principal bajo 300 ln sin abusar de partial.
- **InMemory provider EF NO replica `CI_AS` collation** — `.ToLower().Contains()` en C# es ordinal-sensitive con acentos, igual que SQL Server CI_AS (`AS = accent-sensitive`). Tests deben usar valores ASCII puros para reflejar comportamiento real. Si se quiere accent-insensitive, hace falta `EF.Functions.Collate(...)` o accent-stripping explícito.

### Limitación conocida (deuda menor para follow-up)
🔸 **Búsqueda accent-sensitive**: tipear "perez" no matchea "Pérez" en prod. Si el admin reporta fricción, aplicar `EF.Functions.Collate(field, "Latin1_General_CI_AI")` en `EmailDiagnosticoPersonaSearch`.

### Gate post-deploy
Verificación requerida en prod (`/verify 058`):
- `GET /api/sistema/email-outbox/diagnostico/buscar-personas?q=garcia` debe responder 200 con personas con apellido "Garcia" (sin acento).
- `q` con 8 dígitos debe matchear por hash DNI.
- `q=""` o length < 2 debe responder 400 con código `Q_REQUERIDO` o `Q_MUY_CORTO`.

---

# Plan 36 Chat 4b BE — Búsqueda de diagnóstico por nombre/apellidos

## PLAN FILE

[`../educa-web/.claude/plan/monitoreo-pages-redesign.md`](../../../educa-web/.claude/plan/monitoreo-pages-redesign.md) · página #3 (Diagnóstico).

## OBJETIVO

Hoy `GET /api/sistema/email-outbox/diagnostico?correo={email}` solo busca por correo exacto. El usuario pidió **buscar por apellidos y nombres** además del correo. Extender el endpoint o agregar uno nuevo que haga lookup polimórfico en `Estudiante`/`Profesor`/`Director`/`Apoderado` por `nombres LIKE %term%` o `apellidos LIKE %term%`, devuelva las personas matchadas con sus correos enmascarados, y permita que el FE elija un correo específico para llamar al endpoint actual de diagnóstico.

## DECISIONES DE DISEÑO ABIERTAS

1. ¿Extender `/diagnostico?correo=` para aceptar también `?q=` con texto libre? O ¿endpoint nuevo `/diagnostico/buscar-personas?q=`?
2. ¿Devolver lista de personas con correo o ya disparar el diagnóstico completo del primer match?
3. ¿Cap de resultados? Sugerencia: 10 (typeahead-friendly).
4. ¿Búsqueda por DNI también? (el usuario no lo pidió — confirmar).

## PRE-WORK SQL OBLIGATORIO

Antes de codear, mostrar al usuario `SELECT TOP 5` de cada tabla persona con los campos `_Nombres` / `_Apellidos` / `_Correo*` / `_DNI` para confirmar el shape real antes de escribir el service. Ver `feedback_db_select_first.md`.

## RESTRICCIÓN

- DNI **siempre enmascarado** (`DniHelper.Mask`) en respuesta.
- Correo enmascarado tipo `EmailHelper.Mask`.
- Respetar [`backend.md`](../../educa-web/.claude/rules/backend.md) cap 300 líneas, structured logging, fail-safe INV-S07.

## VALIDACIÓN

`dotnet build` · `dotnet test` · tests nuevos para los 4 tipos de persona + universo vacío + INV-S07.

## POST-DEPLOY GATE

Sí — el FE Chat 4 (059) consume este endpoint, así que necesita estar deployado y validado antes.
