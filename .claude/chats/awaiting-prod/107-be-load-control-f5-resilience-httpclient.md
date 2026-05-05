# BE — Load Control F5: Resilience HttpClient (Polly 8)

> **Repo destino**: `Educa.API` (master)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-05 · **Modo sugerido**: `/execute` → `/validate`
> **Bloqueado por**: F3 (chat 105) cerrado — F5 extiende los `HttpClient` con `Timeout=30s` ya configurado.
> **Bloquea a**: F6b (calibración con datos reales).

## CONTEXTO

Implementación de capa de resilience para HttpClient externos. Decisión documentada en [ADR-0002](../../../Educa.API/.claude/decisions/0002-resilience-polly-vs-handcrafted.md): híbrido — handcrafted in-process, **Polly 8 para HttpClient**.

Deps externas que justifican retry + circuit breaker:
- **MailKit SMTP** (cPanel hosting con `INV-MAIL03` techo 5/h por dominio).
- **Azure Blob Storage** (`Services/Integraciones/BlobStorageService.cs`).
- **CrossChex API** (HTTP polling).
- **JaaS / videoconferencias** (token signing externo).

## OBJETIVO DEL CHAT

Agregar `Microsoft.Extensions.Http.Resilience` a los 4 named clients externos.

## ALCANCE

### IN

1. **Agregar paquete NuGet**:

   ```xml
   <PackageReference Include="Microsoft.Extensions.Http.Resilience" Version="9.x.x" />
   ```

2. **Configurar `AddStandardResilienceHandler` en cada named client**:

   ```csharp
   // En Program.cs o módulo correspondiente
   builder.Services.AddHttpClient("blobStorage", client =>
   {
       client.Timeout = TimeSpan.FromSeconds(15); // override del default 30 — uploads tienen su propio path
       client.BaseAddress = new Uri(configuration["AzureBlobStorage:Endpoint"]);
   })
   .AddStandardResilienceHandler(options =>
   {
       options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(10);
       options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(30);
       options.Retry.MaxRetryAttempts = 3;
       options.Retry.UseJitter = true;
       options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
       options.CircuitBreaker.FailureRatio = 0.5;
       options.CircuitBreaker.MinimumThroughput = 10;
   });

   // Ídem para "crossChex", "jaas", "mailkit-smtp" (este último es delicado — validar que MailKit acepta IHttpClientFactory; si no, mantener handcrafted retry actual del worker)
   ```

3. **Calibración de cada client**:

   | Client | AttemptTimeout | TotalRequestTimeout | MaxRetries | Justificación |
   |---|---|---|---:|---|
   | `blobStorage` | 10s | 30s | 3 | Reads pequeños (avatars, attachments). 3 retries cubre transitorio Azure. |
   | `crossChex` | 30s | 60s | 2 | API externa lenta histórico. 2 retries para no agotar `INV-MAIL03` análogo del proveedor bio. |
   | `jaas` | 5s | 10s | 2 | Token signing simple. Si JaaS no responde en 10s, abortar conferencia. |
   | `mailkit-smtp` | 30s | 60s | 1 | Reintento DELICADO — `INV-MAIL03` cuenta defers. Polly retry desde Educa antes de llegar al MTA NO consume el contador (se rechaza pre-handshake). Pero retry post-handshake SÍ. **Validar** y posiblemente desactivar retry de Polly aquí (la cola de outbox ya hace retry diferido). |

4. **Circuit breaker**: `FailureRatio = 0.5` (50% de fallos en `MinimumThroughput=10` solicitudes durante `SamplingDuration=30s` abre el circuito). Cuando abierto, devolver 503 con `Retry-After` configurado por el breaker.

5. **Logging estructurado** de eventos del breaker:
   - Apertura del circuito (`LogWarning` con `dependency`, `failureRatio`).
   - Cierre del circuito (`LogInformation`).
   - Retry attempt (`LogDebug` para no saturar).

6. **Tests**:
   - Mock que falla 3 veces, recupera al 4to → request exitosa con `MaxRetryAttempts=3`.
   - Mock que falla siempre → 503 con `Retry-After`, breaker abre tras `MinimumThroughput`.
   - Mock que tarda > `TotalRequestTimeout` → 504.
   - Test específico de MailKit: confirmar que el retry NO duplica `INV-MAIL03` consumption.

### OUT

- Reemplazar el `SemaphoreSlim` interno de `EmailService` o `NotificacionFaltasService` (ADR-0002 dice que se mantienen).
- Polly para concurrency in-process (capa 2/3 — usa `RateLimiter` built-in).
- Calibración con datos reales → F6b.

## CRITERIOS DE COMPLETADO

- ✅ Paquete `Microsoft.Extensions.Http.Resilience` agregado.
- ✅ 4 named clients (o 3 si MailKit retry se desactiva) configurados con `AddStandardResilienceHandler`.
- ✅ Tests pasan: retry exitoso, breaker abre, timeout total respetado.
- ✅ Test específico MailKit: retry no consume `INV-MAIL03` doble.
- ✅ Logging estructurado de eventos del breaker.
- ✅ Lint/build/dotnet test verde.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Retry MailKit consume `INV-MAIL03` 2x por intento | Validar en F5 si Polly retry aplica antes o después del SMTP handshake. Si después, desactivar retry para MailKit (la outbox ya hace retry diferido con backoff). |
| Circuit breaker abre por blob storage transitorio = avatars no cargan | `FailureRatio = 0.5` requiere 5+ fallos en 30s para abrir. Conservador. Documentar que con breaker abierto, `BlobStorageService` retorna placeholder. |
| Polly 8 API distinta a Polly 7 (refs viejos en internet) | Usar docs oficiales `Microsoft.Extensions.Http.Resilience` 9.x. |

## REFERENCIAS

- [ADR-0002](../../../Educa.API/.claude/decisions/0002-resilience-polly-vs-handcrafted.md).
- [Microsoft.Extensions.Http.Resilience](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience).
- F3 (chat 105) — base de timeouts default.
- `educa-web/.claude/rules/business-rules.md` §18 (`INV-MAIL03`) — constraint del MTA.
