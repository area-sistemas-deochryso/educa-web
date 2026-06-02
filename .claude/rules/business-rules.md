# Business Rules — educa-web

## REST Contracts FE↔BE

### INV-CONTRACT01 — JSON casing convention

All REST responses between FE↔BE serialize JSON properties in **camelCase**. All FE requests (query params and body) use **camelCase**.

PascalCase is allowed **only** in payloads for external integrations (CrossChex webhook, JaaS, Firebase) and must carry an explicit `[JsonProperty("Foo")]` with a justifying comment.

**Mechanism**: ASP.NET Core's `AddNewtonsoftJson()` registers `CamelCaseNamingStrategy` via an internal `IConfigureOptions<MvcOptions>` in the Microsoft package — no explicit `ContractResolver` is needed in `Program.cs`. SignalR uses a separate serializer (`System.Text.Json`) and configures `CamelCase` explicitly.

**Rationale**: verified empirically in Plan 42 F1. The implicit convention is invisible to grep on project code — it lives in the NuGet package binary. This invariant makes the contract explicit.

### INV-CONTRACT02 — CORS Expose-Headers

Custom headers emitted by BE must be listed in CORS `Access-Control-Expose-Headers` to be readable from FE in a browser. Without this, `response.headers.get('X-Foo')` returns `null` silently.

Canonical exposed headers: `Retry-After`, `X-Correlation-Id`, `X-Schema-Version`.

**Rule**: when adding a new custom response header in BE, add it to the CORS expose list in the same PR. Omitting this causes silent failure only visible in browser (Postman and SSR bypass CORS).

### INV-CONTRACT03 — WAL endpoint persistence casing

`WalEntry.endpoint` is persisted in **lowercase** to match the keys in `api-schema-versions.ts`. The `WalService.add()` normalizes with `.toLowerCase()` before storage.

**Rationale**: `api-schema-versions.ts` defines endpoint keys in lowercase. A case mismatch causes invisible cache misses in the WAL lookup — the entry exists but is never found.
