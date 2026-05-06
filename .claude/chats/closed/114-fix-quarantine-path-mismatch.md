# Fix path mismatch FE↔BE en quarantine — `email-outbox/quarantine` vs `email-quarantine`

> **Validación prod**: ✅ verificada 2026-05-06 — smoke Cowork ronda 2.
> **Repo destino**: `Educa.API` (master) **o** `educa-web` (main) — decisión a tomar al arrancar
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-06 · **Modo sugerido**: `/ask` (decidir naming canónico) → `/execute`
> **Origen**: smoke Cowork 2026-05-06 caso 068 ❌ (`/api/sistema/email-outbox/quarantine` 404).
> **Bloquea a**: `/verify 068` — cierre del Plan 37 Chat 3.

## CONTEXTO

Plan 37 Chat 3 FE construyó toda la UI de `EmailQuarantine` (tab + dialog + drawer + WAL) y la apuntó a:

```
${apiUrl}/api/sistema/email-outbox/quarantine
```

Documentado en `educa-web/src/app/features/intranet/pages/admin/email-outbox/services/email-quarantine.service.ts:28` (con JSDoc explícito sobre las 4 rutas esperadas).

Plan 37 Chat 2 BE construyó el controller pero lo registró bajo:

```
[Route("api/sistema/email-quarantine")]
```

Visible en `Educa.API/Educa.API/Controllers/Sistema/EmailQuarantineController.cs:19`.

Resultado: en producción la tabla siempre devuelve 404. Smoke Cowork 2026-05-06 lo confirmó.

## DECISIÓN A TOMAR (`/ask` al inicio)

¿Cuál es la URL canónica?

| Opción | URL | Implica |
|---|---|---|
| A | `/api/sistema/email-outbox/quarantine` | **Renombrar BE**. Más coherente con el agrupamiento `email-outbox` (la UI vive como tab dentro del shell `email-outbox`). Consistente con `email-outbox/defer-events` (brief 113). |
| B | `/api/sistema/email-quarantine` | **Renombrar FE**. Trata `EmailQuarantine` como dominio independiente (igual que `EmailBlacklist` o `EmailRecipientDomainPause`). |

**Recomendación inicial**: A. La UI ya está estable, los 3 facades + service + store + WAL ya apuntan a esa URL. Tocar BE es 1 archivo, tocar FE serían 5+ archivos + tests + types.

Confirmación pendiente con usuario al arrancar.

## ALCANCE — Si se elige A (renombrar BE)

### IN

1. `Educa.API/Educa.API/Controllers/Sistema/EmailQuarantineController.cs` — cambiar `[Route("api/sistema/email-quarantine")]` → `[Route("api/sistema/email-outbox/quarantine")]`.
2. **Sub-rutas internas**: el controller también expone `domain-pauses`. Decidir:
   - Mantener: `/api/sistema/email-outbox/quarantine/domain-pauses` (queda anidado dentro del nuevo prefix).
   - Mover: `/api/sistema/email-outbox/domain-pauses` a un controller separado.

   La UI 068 también consume `domain-pauses` (verificar `email-domain-pause.service.ts` si existe). Si la URL FE es `/api/sistema/email-outbox/domain-pauses` directo, separar el controller. Si es anidado, mantener.

3. **Tests** afectados: `Educa.API.Tests/Controllers/Sistema/EmailQuarantineControllerTests.cs` — actualizar URLs hardcoded.
4. **Doc**: actualizar `educa-web/.claude/context/api-endpoints.md` con la URL nueva.

### OUT

- No tocar lógica de service/repo. Solo routing.
- No deprecar la URL vieja con redirect 301 — no hay consumidores externos, el redirect agrega complejidad sin valor.

## ALCANCE — Si se elige B (renombrar FE)

### IN

1. `educa-web/src/app/features/intranet/pages/admin/email-outbox/services/email-quarantine.service.ts:28` — `apiBase` → `${apiUrl}/api/sistema/email-quarantine`.
2. JSDoc lines 20-23 actualizar URLs documentadas.
3. Si hay otros services consumiendo URLs anidadas (`domain-pauses`), también renombrar.
4. Tests del service en `email-quarantine.service.spec.ts` (si existen).
5. Doc en `api-endpoints.md`.

### OUT

- No mover el service a otra carpeta. Solo cambiar URL.

## VALIDACIÓN

- Local: `dotnet test` verde, `npm test` verde.
- Manual post-deploy: `/intranet/admin/monitoreo/correos/quarantine` carga sin 404 + agregar manual + liberar funcionan.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| `domain-pauses` o `defer-events` usan otra URL y se rompen | Auditar todos los services email del FE antes de tocar |
| Permisos por path: `intranet/admin/monitoreo/correos/quarantine` vs `intranet/admin/email-outbox/quarantine` | Confirmar que `permissionPath` en el routing FE no asume la URL del API |

## REFERENCIAS

- Origen: `chats/closed/068-plan-37-chat-3-fe-quarantine-admin-visibility.md`.
- Y: `chats/closed/099-fe-email-quarantine-tab-not-mounted-fix.md` (cerrado como falso positivo — la URL FE canónica es `/quarantine` EN, no `/cuarentena` ES).
- BE controller: `Educa.API/Educa.API/Controllers/Sistema/EmailQuarantineController.cs`.
- FE service: `educa-web/src/app/features/intranet/pages/admin/email-outbox/services/email-quarantine.service.ts`.
