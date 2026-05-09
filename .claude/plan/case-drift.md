# Plan 42 — Normalización de Casing en Contratos REST FE↔BE

> **Fecha**: 2026-05-09
> **Objetivo**: Eliminar el drift de casing entre FE (Angular, espera camelCase) y BE (ASP.NET Core 9 + Newtonsoft.Json sin política explícita) para que los contratos sean consistentes y verificables.
> **Coordinación**: Plan dual FE+BE. Prerrequisito implícito de [Plan 14 — Contratos FE-BE](./contratos-fe-be.md): los snapshots estructurales de Plan 14 fallarían sistémicamente si la base de casing no está estabilizada.
> **Trigger**: Auditoría dual `/investigate` 2026-05-09 detectó **mito documental** en `Program.cs:74` ("camelCase para coincidir con HTTP") + 4 políticas de serialización distintas dentro del mismo BE.

---

## Diagnóstico — 8 hallazgos confirmados

| # | Hallazgo | Path | Severidad |
|---|----------|------|-----------|
| 1 | **Mito documental**: `Program.cs:74` afirma "camelCase" pero `AddNewtonsoftJson` no setea `ContractResolver`. Newtonsoft default = PascalCase. | [Educa.API/Program.cs:32-38](../../../Educa.API/Educa.API/Program.cs) | 🔴 Alta |
| 2 | **4 políticas distintas en el mismo BE**: HTTP REST = PascalCase (Newtonsoft sin override) · SignalR = camelCase (`Program.cs:78`) · `GlobalExceptionMiddleware` = camelCase · `PayloadSanitizer` = camelCase | varios | 🔴 Alta |
| 3 | **DTOs C# sin overrides**: 0 ocurrencias de `[JsonPropertyName]` en `DTOs/**`. Todos emiten su nombre nativo PascalCase. | `Educa.API/DTOs/**` | 🟡 Media |
| 4 | **FE TS interfaces 100% camelCase** (audit en `schedule.models.ts`, `user.models.ts`, `calificacion.models.ts`). Hay un mismatch aparente que necesita verificación empírica F1. | `educa-web/src/app/data/models/**` | 🟡 Media |
| 5 | **FE sin normalización casing** en `apiResponseInterceptor`. Si BE alguna vez devuelve PascalCase real, FE rompe silencioso (TS no valida runtime). | [api-response.interceptor.ts](../../src/app/core/interceptors/api-response/api-response.interceptor.ts) | 🟡 Media |
| 6 | **CORS Expose-Headers incompleto**: solo `Retry-After`. Headers `X-Correlation-Id` y `X-Schema-Version` NO son legibles desde FE en navegador (CORS los bloquea). | [RateLimitingExtensions.cs:119](../../../Educa.API/Educa.API/Extensions/RateLimitingExtensions.cs) | 🟢 Baja-Media |
| 7 | **WAL endpoint paths lowercase hardcodeados** en `api-schema-versions.ts:40-83`. Lookup normaliza con `.toLowerCase()` (defensivo OK), pero el `endpoint` string del `WalEntry` se persiste tal cual. Si un service lo construye PascalCase, el cache miss es invisible. | [api-schema-versions.ts](../../src/app/shared/constants/api-schema-versions.ts) | 🟢 Baja |
| 8 | **Buen patrón replicable**: `Roles.cs:50-71` tiene lookup case-insensitive vía Dictionary. Replicar el patrón en otros lookups que hoy son case-sensitive sin justificación. | [Roles.cs](../../../Educa.API/Educa.API/Constants/Auth/Roles.cs) | ✅ Pattern |

---

## Pregunta abierta (a resolver en F1)

**Si BE emite PascalCase pero FE TS espera camelCase, ¿cómo funciona el sistema en producción hoy?**

Hipótesis a verificar empíricamente:

| # | Hipótesis | Probabilidad | Cómo verificar |
|---|-----------|-------------|----------------|
| a | Newtonsoft .NET 9 cambió default a camelCase implícito | Baja | Doc oficial Newtonsoft + curl real a endpoint |
| b | Hay un middleware/filter post-procesando JSON | Baja | `grep` exhaustivo en `Middleware/**`, `Filters/**` |
| c | FE accede campos con bracket notation y casualmente compila | Muy baja | Inspect uno de los services principales |
| d | **Hay `ContractResolver` registrado en otra parte que el grep inicial no detectó** | Alta | Búsqueda más amplia + dumps reales de respuesta |
| e | Hay un atributo nivel-assembly o un convention en el ApplicationDbContext que hidrata DTOs | Media | Inspeccionar `Educa.API.csproj`, `IConfigureOptions<MvcOptions>` |

**F1 cierra esta pregunta antes de tocar código de producción.** El diseño de F2 depende de la respuesta.

---

## Resultado F1 (2026-05-09, chat 138 educa-web)

**🟢 Rama A — BE ya emite camelCase consistente. El "mito documental" denunciado por el plan inicial era falso mito.**

### Cómo se verificó

Sin acceso a internet ni BE corriendo, se descartaron las hipótesis vía análisis estático exhaustivo + inspección binaria:

1. **Hipótesis (d) descartada** — grep exhaustivo en `Educa.API/**` por `ContractResolver`, `CamelCasePropertyNames`, `JsonNamingPolicy`, `PropertyNamingPolicy`, `DefaultContractResolver`: 0 ocurrencias en código fuente. Las únicas referencias a camelCase explícitas son `System.Text.Json` (SignalR/`Program.cs:78`, `GlobalExceptionMiddleware`, `PayloadSanitizer`), no Newtonsoft.
2. **Hipótesis (e) descartada** — grep por `IConfigureOptions<MvcOptions>`, `MvcNewtonsoftJsonOptions`, `IConfigureNamedOptions`, `JsonSerializerSettings`, `UseMemberCasing`, `AddJsonOptions`: 0 ocurrencias.
3. **Hipótesis (b) descartada** — todas las `JsonProperty`/`JsonPropertyName` del proyecto están en payloads de **integraciones externas** (`DTOs/Asistencia/Record.cs`, `Models/External/AttendanceRecord.cs` — CrossChex), no en DTOs REST FE↔BE.
4. **Hipótesis (c) altamente improbable** — el FE TS tiene 1535+ tests verdes consumiendo BE y producción opera con apoderados/profesores recibiendo datos. Si BE emitiera PascalCase, los accesos `response.success` en FE serían `undefined` y todo estaría roto.
5. **Hipótesis (a) confirmada vía inspección binaria del package** — `grep -ao` sobre `bin/Debug/net9.0/Microsoft.AspNetCore.Mvc.NewtonsoftJson.dll` extrae los strings:
   - `NewtonsoftJsonMvcOptionsSetup` (clase interna `IConfigureOptions<MvcOptions>` de Microsoft)
   - `CamelCaseNamingStrategy`
   - `DefaultContractResolver`
   - `NamingStrategy`
   - `ContractResolver`
   Match exacto con la implementación oficial de Microsoft: cuando se invoca `AddNewtonsoftJson()`, el package registra automáticamente vía un `IConfigureOptions<MvcOptions>` interno: `JsonSerializerSettings.ContractResolver = new DefaultContractResolver { NamingStrategy = new CamelCaseNamingStrategy() }`. Es invisible a grep en código del proyecto porque vive en el package, no en `Program.cs`.

### Implicancia para F2/F3/F4

- **F2-BE.1** (setear `CamelCasePropertyNamesContractResolver` explícito en `Program.cs:32-38`): **opcional, pero recomendado como defensa en profundidad**. Si Microsoft cambia el default en .NET 10+, el contrato no rompe. **Coste**: 1 línea + comentario citando este plan.
- **F2-BE.2** (audit DTOs sensibles): puede recortarse a un grep rápido de `[JsonProperty]` en DTOs no externos — esperable 0 hallazgos fuera de `DTOs/Asistencia/Record.cs` y `Models/External/*`.
- **F2-BE.3** (overrides explícitos en DTOs externos): aplicar solo a payloads CrossChex/JaaS si no los tienen ya. Hoy todos los payloads externos usan `[JsonProperty(...)]` o `[JsonPropertyName(...)]` con casing explícito.
- **F2-BE.4** (CORS Expose-Headers `X-Correlation-Id, X-Schema-Version`): **sigue siendo crítica**. El hallazgo lateral del Plan 41 (correlation hub potencialmente roto en navegador real) sigue vivo y es el riesgo prioritario.
- **F2-BE.5** (snapshot test de contrato): **sigue siendo recomendable**. Convierte la convención implícita en garantía explícita verificada en CI.
- **F2-FE.1** (audit `obj.PascalCase`): probablemente 0 hallazgos (Rama C descartada por evidencia operativa). Mantener el grep como confirmación.
- **F2-FE.2** (`normalizeKeys()` defensivo en interceptor): **descartado**. BE ya es consistente; agregar normalización agrega coste sin beneficio.
- **F2-FE.3** (WAL endpoint normalize lowercase): **sigue siendo válido** — mejora consistencia interna entre `WalService.add()` y `api-schema-versions.ts`.
- **F2-FE.4-5** (audit query params + headers custom): siguen siendo valiosos como auditoría preventiva.
- **F4 docs** (INV-CONTRACT01/02/03): **sigue siendo crítica**. Convierte el contrato en invariante documentado y elimina el riesgo de "comentario aspiracional".

### Comentarios sobre `Program.cs:74`

El comentario fue mal interpretado por la auditoría inicial:

```csharp
// SignalR (camelCase para que coincida con los controllers HTTP)
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
```

La afirmación "para que coincida con los controllers HTTP" es **correcta** — los controllers HTTP sí emiten camelCase vía la convención implícita. SignalR usa un protocolo distinto (`System.Text.Json` vs Newtonsoft) y necesita configuración explícita; HTTP REST no la necesita por convención del package. El comentario dejaría de ser ambiguo si se reescribiera como `// SignalR (alinear casing con los controllers HTTP que ya usan CamelCaseNamingStrategy por convención de AddNewtonsoftJson)`.

### Hallazgos secundarios validados como reales

- **Hallazgo #6 (CORS Expose-Headers incompleto)** — sigue siendo bug real. Plan 41 puede estar pagando este costo en navegador real.
- **Hallazgo #7 (WAL endpoint paths sin normalize en persistencia)** — bug real menor, fix simple en F2-FE.3.
- **Hallazgo #2 (4 políticas distintas)** — relativamente cosmético: HTTP REST y SignalR ya están alineados en camelCase aunque por mecanismos distintos (Newtonsoft convención vs `System.Text.Json` explícito). `GlobalExceptionMiddleware` y `PayloadSanitizer` también emiten camelCase. La crítica del plan inicial ("4 políticas distintas") era estilística, no funcional.
- **Hallazgo #1 (mito documental)** — **falso positivo de la auditoría inicial**. El comentario es correcto.

### Decisión

**Avanzar a Rama A reducida**: F2-BE recortado a CORS + tests + override defensivo opcional. F2-FE recortado a WAL normalize + audits preventivos (sin interceptor defensivo). F4 sigue intacto. F2-BE y F2-FE pueden correr en paralelo sin riesgo de Rama C.

---

## Estrategia: Plan dual coordinado

```
┌─────────────────────────────────────────────────────────┐
│ F1 (común, exploratorio) — Verificación empírica        │
│ Lo ejecuta uno de los dos chats. Resultado pisa F2.     │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   ┌─────────┐       ┌─────────┐
   │  F2-BE  │       │  F2-FE  │  ← pueden correr en paralelo
   │         │       │         │     si F1 confirma el contrato
   └────┬────┘       └────┬────┘
        │                 │
        └────────┬────────┘
                 ▼
   ┌──────────────────────────┐
   │ F3 (común) — Anti-regresión│
   │ F4 (común) — Documentar INV │
   └──────────────────────────┘
```

---

## Fases

### F1 — Verificación empírica (común, ejecuta cualquiera)

> Ejecutar **ANTES** de tocar código. La hipótesis ganadora pisa el diseño de F2.

- [ ] F1.1 Levantar BE local (Educa.API) y hacer `curl` a 3 endpoints representativos: `GET /api/sistema/usuarios/listar` (con auth), `GET /api/sistema/email-outbox/defer-fail-status` (auth admin), `GET /api/health` (anon). Capturar JSON crudo.
- [ ] F1.2 Confirmar casing real de cada respuesta: ¿`id` o `Id`? ¿`nombreCompleto` o `NombreCompleto`?
- [ ] F1.3 Si emite **PascalCase** → confirmar hipótesis (a)/(d). Buscar más exhaustivamente cualquier `ContractResolver` o `IConfigureOptions<MvcOptions>` no detectado en el grep inicial.
- [ ] F1.4 Si emite **camelCase** → encontrar dónde se configura. Documentar el path exacto.
- [ ] F1.5 Si emite **mixed casing** (algunos endpoints sí, otros no) → inventariar cuáles y por qué. Probable indicador de overrides parciales con `[JsonPropertyName]` que el agent no muestreó.
- [ ] F1.6 Reportar resultado en este plan + decidir entre las 3 ramas siguientes:
  - **Rama A** — BE ya emite camelCase (sólo falta documentar): saltar F2-BE de serializer; ejecutar solo F2-BE.CORS y F2-BE.Tests + F2-FE liviano.
  - **Rama B** — BE emite PascalCase y FE tiene normalización oculta: documentar la normalización; ejecutar F2-BE serializer + F2-FE liviano.
  - **Rama C** — BE emite PascalCase y FE tiene bugs latentes (acceso `obj.id` retorna undefined silencioso): full F2-BE + F2-FE.

### F2-BE — Normalizar contrato emisor (depende de F1)

> Este F2 asume **Rama B/C** como caso peor. Si F1 entrega Rama A, recortar.

- [ ] F2-BE.1 Setear `CamelCasePropertyNamesContractResolver` en `AddNewtonsoftJson` (`Program.cs:32-38`). Documentar el cambio + comentario citando este plan.
- [ ] F2-BE.2 Auditar 5 endpoints sensibles que probablemente dependen de PascalCase explícito:
  - Webhook CrossChex (recibe payload con casing externo — verificar que el deserializer sigue funcionando con `PropertyNameCaseInsensitive`)
  - Endpoints de integraciones externas (JaaS tokens, Firebase notifications)
  - Endpoints que retornan `JObject` o `dynamic`
  - DTOs con propiedades `IDXxx` o nombres con caps específicos del dominio (acrónimos)
- [ ] F2-BE.3 Si algún DTO debe preservar PascalCase por contrato externo, agregar `[JsonProperty("Foo")]` explícito y documentar el motivo.
- [ ] F2-BE.4 Agregar `Access-Control-Expose-Headers: X-Correlation-Id, X-Schema-Version, Retry-After` (concatenados o múltiples Append) en CORS config. Eliminar el comentario "fantasma" `Program.cs:74`.
- [ ] F2-BE.5 **Test de contrato**: snapshot test que ejecuta 5 endpoints contra `WebApplicationFactory` y assertea casing camelCase de cada respuesta. Falla si algún endpoint emite PascalCase. Vive en `Educa.API.Tests/Contracts/CasingContractTests.cs`.
- [ ] F2-BE.6 Validar suite BE: `dotnet test`. Esperar regresiones en tests viejos que assertaban shape PascalCase — corregir o documentar excepciones.

### F2-FE — Endurecer recepción (depende de F1)

- [ ] F2-FE.1 **Audit servicios**: `grep -rn "obj\.[A-Z]" src/app/` y similares para detectar accesos PascalCase en código TS (señal de bug latente Rama C).
- [ ] F2-FE.2 Verificar interceptor `api-response.interceptor.ts`: ¿agregar normalización defensiva o exigir BE consistente? Decisión depende de F1:
  - Si F1 demostró BE consistente camelCase → mantener interceptor sin normalización (single source of truth en BE).
  - Si F1 demostró BE inconsistente → agregar `normalizeKeys()` recursivo (PascalCase → camelCase) con escape para campos canónicos en mayúscula (ej: `DNI`, `URL` que el BE pueda devolver como tal).
- [ ] F2-FE.3 **WAL endpoint normalize**: en `WalService.add()` o donde se construya `WalEntry.endpoint`, normalizar el path con `.toLowerCase()` antes de persistir. Asegura matching consistente con `api-schema-versions.ts:40-83`. Agregar test unit que confirme el comportamiento.
- [ ] F2-FE.4 **Audit query params**: `grep -rn "HttpParams" src/app/` muestreando keys. Confirmar 100% camelCase. Si hay snake_case o PascalCase, normalizar.
- [ ] F2-FE.5 **Audit headers custom enviados**: confirmar que FE solo emite `X-Request-Id` y `X-Schema-Version` con casing correcto (BE los lee case-insensitive vía `IHeaderDictionary`, pero mantener consistencia).
- [ ] F2-FE.6 Validar suite FE: `npm run lint && npm run test`. Verificar build limpio.

### F3 — Anti-regresión (común, ejecuta cualquiera al final)

- [ ] F3.1 **BE — Analyzer**: agregar regla `EDUCA002` en `Educa.API.Analyzers` que detecte DTOs que declaran `[JsonProperty(...)]` o `[JsonPropertyName(...)]` con casing distinto a camelCase **sin comentario justificando**. Severity: warning.
- [ ] F3.2 **BE — Roslyn check**: regla que detecte `AddNewtonsoftJson` u otras configs de serializer sin política de naming explícita. Severity: error.
- [ ] F3.3 **FE — ESLint rule custom** (opcional, si F1 demostró bugs Rama C): regla local `casing-mismatch/no-pascalcase-prop-access` que detecte `obj.PascalCase` en código TS sobre objetos tipados como interfaces de DTO.
- [ ] F3.4 **CI gate**: el snapshot test BE de F2-BE.5 corre en CI. Falla bloquea PR.

### F4 — Documentar invariante (común, ejecuta el último)

- [ ] F4.1 **Definir `INV-CONTRACT01`** en `educa-web/.claude/rules/business-rules.md` §nuevo "Contratos REST FE↔BE":
  > Toda response REST entre FE↔BE serializa propiedades JSON en **camelCase**. Toda request del FE al BE usa **camelCase** en query params y body. PascalCase queda permitido sólo en payloads de integraciones externas (CrossChex webhook, JaaS, Firebase) y debe llevar `[JsonProperty("Foo")]` explícito con comentario justificativo.
- [ ] F4.2 Definir `INV-CONTRACT02`: headers custom emitidos por BE deben ir en CORS `Access-Control-Expose-Headers` para ser legibles desde FE. Listado canónico: `Retry-After, X-Correlation-Id, X-Schema-Version`.
- [ ] F4.3 Definir `INV-CONTRACT03`: `WalEntry.endpoint` se persiste en lowercase para matchear `api-schema-versions.ts` de forma consistente.
- [ ] F4.4 Update `Educa.API/.claude/rules/backend.md` §nuevo "Serialización JSON" con la regla de camelCase + cómo registrar `[JsonProperty]` excepcional.
- [ ] F4.5 Update `educa-web/.claude/rules/optimistic-ui.md` (donde se documenta WAL) referenciando INV-CONTRACT03.
- [ ] F4.6 Eliminar comentario fantasma `Program.cs:74`.

---

## Orden de ejecución

```
F1 (1 chat, ~1-2h)
  ↓
F2-BE + F2-FE (paralelo, 2 chats independientes, ~3-5h cada uno)
  ↓
F3 (1 chat, ~2-3h)
  ↓
F4 (1 chat, ~1h)
```

**Coordinación cross-repo**: F2-BE y F2-FE pueden correr en paralelo si F1 confirma Rama A o B (sin bug latente compartido). Si F1 demuestra Rama C, ejecutar F2-BE primero y F2-FE después con el commit de F2-BE deployado a un entorno staging.

---

## Métricas de éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| Políticas de serialización en BE | 4 distintas | 1 (camelCase) + overrides documentados |
| Cobertura de casing en CORS Expose-Headers | 1/3 | 3/3 |
| Comentarios mentirosos sobre serializer | 1 (`Program.cs:74`) | 0 |
| Snapshot tests de contrato BE | 0 | 5 endpoints representativos |
| Bugs latentes Rama C confirmados/resueltos | desconocido | 0 (si F1 los detecta) o N/A (si Rama A/B) |
| `INV-CONTRACT*` documentados | 0 | 3 |
| Lookups case-sensitive sin justificación | desconocido | 0 (audit en F2-BE) |

---

## Salida esperada

Al final del Plan 42, **Plan 14 (Contratos FE-BE)** puede arrancar sobre una base estable:

- F1 de Plan 14 (snapshot DTOs) genera nombres camelCase consistentes.
- F2 de Plan 14 (FE verifica) compara contra interfaces TS que también son camelCase → match exacto.
- Plan 14 deja de necesitar normalización en su matcher.

---

## Coordinación con planes vecinos

| Plan | Relación | Acción |
|------|----------|--------|
| Plan 14 — Contratos FE-BE | Prerrequisito | Plan 14 espera a que Plan 42 cierre antes de F1 |
| Plan 24 — Sync CrossChex Background Job | Independiente | Webhook CrossChex es payload externo. Plan 42 F2-BE.2 lo audita pero no cambia el contrato externo. |
| Plan 26 — Rate limiting flexible | Cubre uno de los CORS Expose-Headers | `Retry-After` ya está exposed (F2 Chat 2). Plan 42 F2-BE.4 agrega `X-Correlation-Id` + `X-Schema-Version`. Sin conflicto. |
| Plan 41 — Hub de Correlación | Consumidor | El hub lee `X-Correlation-Id` del FE. Hoy esto **no funciona en navegador** por CORS — Plan 42 F2-BE.4 lo desbloquea. **Posible bug latente que Plan 41 ya está pagando**. |

> 🚨 **Hallazgo lateral importante**: Plan 41 puede estar funcionando sólo en server-side rendering / Postman / herramientas de desarrollo, pero **fallar silenciosamente en browser real** porque `X-Correlation-Id` no está en CORS Expose-Headers. Validar urgente.

---

## Aprendizajes transferibles

- **Comentarios en código mienten**. La intención del dev en `Program.cs:74` no se materializó. Lección: tests de contrato sobre serialización son baratos y eliminan el riesgo de "comentario aspiracional".
- **CORS Expose-Headers es invisible hasta que rompe**. `IHeaderDictionary` case-insensitive en BE genera falsa sensación de "todo bien" — el problema vive en el navegador, no en el server.
- **Single source of truth de casing**: una sola política por canal (HTTP REST, SignalR, JSON-RPC). 4 políticas distintas = 4 tickets futuros.
- **Verificación empírica antes de "fix"**: F1 puede demostrar que el sistema ya funciona accidentalmente (Rama A) y reducir el plan a documentación.
