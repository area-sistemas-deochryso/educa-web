---
title: Plan 26 F3 — Time-of-day modifier para rate limiting
mode: execute
created: 2026-05-09
closed: 2026-05-09
exclusive: false
isolation: main
touches:
  - Educa.API/RateLimiting/RateLimitPartitionResolver.cs
  - Educa.API/RateLimiting/RoleMultipliers.cs
  - Educa.API/RateLimiting/SchoolHoursResolver.cs
  - Educa.API/Extensions/RateLimitingExtensions.cs
  - Educa.API.Tests/RateLimiting/**
hot-paths: []
---

> **Creado**: 2026-05-09 · **Estado**: ✅ shipped local, awaiting-prod (smoke `/intranet/admin/rate-limit-events` 1-2 semanas).

## Contexto

Plan 26 F1 (telemetría) + F2 (multiplier por rol + override por endpoint) shipped y observados ~2026-05-06. F3 agrega un **time-of-day modifier** suave: dentro de la franja escolar 7am-5pm L-V el multiplier sube; fuera de franja queda apenas por encima de la base. Decisión 2026-04-23: NO corte duro fuera de franja (admin trabaja tarde, reuniones, etc.).

Plan file: inline en `educa-web/.claude/plan/maestro.md` §"Plan 26" (líneas 1071-1168). F3 detallado en líneas 1118-1127.

## Objetivo

Agregar una capa adicional al `RateLimitPartitionResolver` que aplique `schoolHoursMultiplier` antes del cap 5x. Sin tocar policies de auth/biometric.

## Cierre

### Calibración aplicada

- **Dentro de franja (L-V 7am-5pm Lima)**: ×1.5
- **Fuera de franja**: ×1.2
- **Cap 5x** sigue clampeando el efecto compuesto.

### Cambios

| Tipo | Archivo | Cambio |
|---|---|---|
| Nuevo | `Educa.API/RateLimiting/SchoolHoursResolver.cs` | Inyectable + variante estática pura. Consume `TimeProvider` BCL. |
| Mod | `Educa.API/RateLimiting/RoleMultipliers.cs` | Constantes `SchoolHoursIn`/`SchoolHoursOut` + overload `ResolveEffectiveLimit(base, role, endpoint, schoolHours)`. Overload de 3 factores delega con neutro 1.0 (compat). |
| Mod | `Educa.API/RateLimiting/RateLimitPartitionResolver.cs` | Lee `SchoolHoursResolver` desde `context.RequestServices`; fallback `1.0` si no está registrado (preserva tests legacy sin DI). |
| Mod | `Educa.API/Extensions/RateLimitingExtensions.cs` | `TryAddSingleton(TimeProvider.System)` + `TryAddSingleton<SchoolHoursResolver>()`. |
| Nuevo | `Educa.API.Tests/RateLimiting/SchoolHoursResolverTests.cs` | 13 tests (8 estáticos + 5 con `FakeTimeProvider`). |
| Mod | `Educa.API.Tests/RateLimiting/RoleMultipliersTests.cs` | +5 tests para overload de 4 factores. |
| Mod | `Educa.API.Tests/RateLimiting/RateLimitPartitionResolverTests.cs` | +4 tests con `RequestServices` y `FrozenTimeProvider`. |

### Validación

- `dotnet build`: ✅ 0 errores.
- `dotnet test --filter RateLimiting`: ✅ **52/52** verdes.
- `dotnet test` suite completa: ⚠️ 12 fallos pre-existentes (TestServer/`bypassLimits=true`), idénticos antes y después de F3 — sin regresión.

### Verificación post-deploy (ventana 1-2 semanas)

Revisar `/intranet/admin/rate-limit-events`:

1. Confirmar que 429 fuera de franja para Director / Asistente Admin / Promotor / Coordinador Académico bajan respecto a la línea base de F2.
2. Confirmar que el % global de rechazos no sube por aplicar x1.5 dentro de franja (no debería abrir boquete a abuso porque el cap 5x sigue activo).
3. Si fuera de franja sigue habiendo 429 legítimos, considerar subir `SchoolHoursOut` de 1.2 a 1.3.
4. Si dentro de franja todavía hay 429 de admin en uso normal, considerar subir `SchoolHoursIn` o el multiplier de rol del rol afectado.

## Aprendizajes transferibles

- **`TimeProvider` BCL es la abstracción correcta** para tiempo testeable en .NET 8+. Cero dependencias nuevas — basta una subclase mínima en tests para fijar el reloj. Evita la tentación de crear un `IClock` propio.
- **Overload con default neutro preserva backward compat sin breaking change**: agregar un nuevo factor de multiplier vía nuevo overload + delegación del viejo al nuevo con `1.0` mantiene los call-sites y tests existentes intactos.
- **Resolver desde `RequestServices` con `?.GetService<>()` + fallback** permite que tests legacy sin DI sigan pasando sin tocarlos. Solo los tests nuevos necesitan wirear `RequestServices`.
- **`TryAddSingleton` en lugar de `AddSingleton`** para infra opt-in (TimeProvider) — los tests pueden registrar uno fake antes y `TryAddSingleton` no lo pisa.

## Referencias

- F2 código vivo: `Educa.API/RateLimiting/RateLimitPartitionResolver.cs:55-63`, `RoleMultipliers.cs`.
- Decisión calibración: maestro líneas 1122-1126.
- Reglas: `Educa.API/.claude/rules/backend.md` (cap 300 líneas, structured logging, ApiResponse).
