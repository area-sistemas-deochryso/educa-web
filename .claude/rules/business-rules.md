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

## Identity & "ver como" (view-as)

### INV-VIEWAS01 — Every identity resolution and every user-data cache must consider the active "ver como" context

**BE — identity resolution**: any endpoint that resolves "who is asking" from the logged-in session must use the *effective* identity (`ResolveViewAsIdentity()`), not the raw logged-in user, whenever the endpoint reads or returns data scoped to a person. `RequireDni()`/`RequireRol()` alone are not ver-como-aware — they resolve the real admin, not the impersonated subject.

**FE — in-memory caches**: any client-side cache keyed only by URL/params for a "mis-*" (own-data) endpoint must also key or invalidate by `ViewAsContextService.activeContext().entityId`. A cache that only distinguishes by URL serves subject A's data to subject B after a context switch.

**FE — Service Worker cache**: `SwService.clearCache()` must be called on every identity transition — real login/logout (already covered) **and** `ViewAsContextService.setContext()` / `clearContext()` / the silent auto-clear on route change. The SW cache key is URL-only (`IndexedDB` `keyPath: 'url'`) and cannot read the session cookie to key by identity, so full invalidation on identity change is the only reliable fix — do not attempt a per-key fix without re-checking this constraint.

**FE — mounted components**: a component/facade that already fetched data before a context switch will not refresh on its own — `ViewAsContextService` changing does not force a re-subscribe. Either the component subscribes to `activeContext()` and re-fetches, or (the pattern currently used) `ViewAsBannerComponent.onUserSelected()` triggers `window.location.reload()` after `setContext()`.

**FE — role-switch dispatcher components**: a cross-role route kept reachable during "ver como" via `ViewAsContextService.SHARED_ROUTES` (e.g. `/intranet/asistencia`) that renders a different child component per role must branch on `effectiveRole = viewAsContext.activeContext()?.rol ?? userProfile.userRole()` — the pattern already used by `IntranetLayoutComponent` for nav/breadcrumb/menu — not on the raw session role. Branching on the raw role renders the admin's own sub-view while nav/breadcrumb correctly show the impersonated role, a silent desync with no console error (found in `AttendanceComponent`, Plan 104 F1, brief 578, 2026-08-28).

**FE — identity display labels**: a computed/property that renders "whose data is this" (e.g. a salon selector's `(Tutor {{ name }})` label, a PDF header) must source the name from `ViewAsContextService.activeContext()?.nombreCompleto`, falling back to the real session name — not read `UserProfileService.userName` (or equivalent) directly. A raw session-name read shows the admin's own name instead of the impersonated subject's, even when the underlying data (salones, asistencias) is already correctly scoped to the impersonated identity — a silent identity leak in display only, no console error (found in `AttendanceProfesorEstudiantesComponent.nombreProfesor`, Plan 104 F3, brief 612, 2026-08-29, while the period filter itself was confirmed working correctly).

**Checklist for any new endpoint or cache that touches per-user data**:
1. Does it resolve identity server-side? → use `ResolveViewAsIdentity()`, not the raw session user.
2. Does it cache client-side (in-memory or IndexedDB/SW)? → key or invalidate by `ViewAsContextService.activeContext().entityId`.
3. Does a component hold fetched state across a context switch? → re-subscribe to `activeContext()` or rely on the reload-after-switch pattern.
4. Does a component pick which child to render based on the user's role? → branch on `effectiveRole`, not the raw session role.
5. Does a component display a name/identity label (selector, PDF header, banner)? → source it from `activeContext()?.nombreCompleto`, not a raw session-profile read.

**Rationale**: found via live QA in Plan 97 (2026-08-10) — 4 independent violations of this invariant (Mensajería recipient resolution, FE in-memory cache, Service Worker cache, and component remount) surfaced across 4 different layers of the stack, all from the same root cause: new code written before "ver como" (Plan 92) existed doesn't know the pattern exists. This entry exists so the checklist is citable in design/review instead of rediscovered per endpoint. See `educa-coord/plans/xrepo-97-verificacion-identidad-ver-como.md` (F1-F4, F6) for the concrete fixes and affected endpoint list.
