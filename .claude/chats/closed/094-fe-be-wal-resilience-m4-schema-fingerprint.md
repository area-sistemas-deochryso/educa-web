# FE+BE WAL Resilience M4 — Schema fingerprint en cache

> **Validación prod**: ✅ verificada 2026-05-04 — verde happy path: X-Schema-Version: 1 en endpoints mapeados (/permisos, /notificaciones); ausente en no-mapeados. Mismatch real diferido al próximo deploy con bump.
> **Repo destino**: `educa-web` (main) + `Educa.API` (master) — coordinado
> **Plan**: WAL Resilience · **Chat**: M4 · **Fase**: F2.Execute
> **Creado**: 2026-05-04 · **Modo sugerido**: `/execute`
> **Estado**: ⏳ pendiente arrancar
> **Bloqueado por**: chats 092 + 093 (M1/M2/M3) — orden conservador, no hay dependencia técnica directa.

## CONTEXTO INMEDIATO

Diseño completo en [.claude/documentacion-subsistemas/wal-resilience-degradation.md](../../documentacion-subsistemas/wal-resilience-degradation.md) — sección M4.

**Problema**: `DB_VERSION` en `sw.js` invalida **todo el cache** cuando se incrementa. Dos escenarios donde no alcanza:

1. **Olvido de bump**: deploy con cambios breaking de DTO sin incrementar `DB_VERSION` → cache sirve estructura vieja → componentes reciben JSON inválido → errores en producción.
2. **Cambios incrementales**: un solo endpoint cambia, pero `DB_VERSION` invalida los 100 endpoints cacheados → mucha latencia post-deploy.

## OBJETIVO

Cada entrada cacheada lleva fingerprint del schema esperado. En lectura, si el fingerprint no coincide → discard + fetch fresh. Granularidad por endpoint.

**Decisión de diseño**: versionado manual (no hash automático). Migrar a automático si crece el costo. Razón: opción B requiere un build step nuevo que no tenemos.

## TOUCH LIST

### Frontend (educa-web/main)

- `src/app/shared/constants/api-schema-versions.ts` — **nuevo**, single source of truth FE:
  ```typescript
  export const API_SCHEMA_VERSIONS: Record<string, number> = {
    '/api/sistema/usuarios': 1,
    '/api/horario': 1,
    '/api/Calificacion': 1,
    // ... resto de endpoints cacheables
  };
  ```
- `src/app/core/interceptors/api-response.interceptor.ts` — agregar header `X-Schema-Version` al request, leyendo del map por URL normalizada.
- `public/sw.js` — leer header `X-Schema-Version` de la response, persistirlo con la entrada cacheada. En lectura, validar contra el map embebido. Mismatch → delete + retorna null para forzar fetch.
- `public/sw.js` — embebido del map (manual hasta tener build step). TODO: generar desde `api-schema-versions.ts` automáticamente — registrar como deuda técnica.
- `src/app/features/intranet/services/sw/sw.service.spec.ts` — tests del flujo con fingerprint.

### Backend (Educa.API/master)

- `Educa.API/Middleware/SchemaVersionMiddleware.cs` — **nuevo**, agrega header `X-Schema-Version` a la response basado en el endpoint matched. Si el endpoint no está en el map, no agrega header (FE asume v=1).
- `Educa.API/Constants/Sistema/ApiSchemaVersions.cs` — **nuevo**, mirror del map FE.
- `Educa.API/Program.cs` — registrar middleware después de `UseRouting`.
- `Educa.API.Tests/Middleware/SchemaVersionMiddlewareTests.cs` — tests del middleware.

## INVARIANTES NUEVAS

- `INV-WAL-RES11` — Toda response de `/api/*` que se cachea **debe** llevar fingerprint de schema. Si el endpoint no está en `API_SCHEMA_VERSIONS`, no se cachea (fallback conservador).
- `INV-WAL-RES12` — Cache miss por mismatch de schema **debe** loggear como `Information` en consola del SW para diagnóstico de deploys.
- `INV-WAL-RES13` — Bumpear el número en `API_SCHEMA_VERSIONS[endpoint]` es la única forma de invalidar selectivamente un endpoint. `DB_VERSION` sigue siendo el escape hatch nuclear.

## REGLAS DE BUMP

Cuando se cambia un DTO o endpoint:

| Tipo de cambio | Acción |
|---------------|--------|
| Agregar campo opcional al final del DTO | No bumpear (no breaking) |
| Renombrar campo | Bump versión del endpoint |
| Cambiar tipo de campo (string → number, etc.) | Bump |
| Cambiar formato de fecha / código de estado | Bump |
| Agregar endpoint nuevo | Agregar al map con versión 1 |
| Eliminar endpoint | Quitar del map |

## RIESGOS

| Riesgo | Mitigación |
|--------|-----------|
| FE/BE desincronizados (uno bumpea, el otro no) | Header opcional con default v=1. Si BE no envía header, FE asume v=1 y todo sigue funcionando. CI test (futuro) que verifica sincronización. |
| Olvido de agregar endpoint nuevo al map | Fallback: si el endpoint no está en el map, no se cachea (acepta latencia). |
| Bump no propagado al SW (manual) | Documentar en CHANGELOG-style en `api-schema-versions.ts`. Build step en chat futuro. |
| Map crece sin control | Aceptable: 50-150 endpoints es un map razonable en memoria. |

## DEFINICIÓN DE HECHO

- [ ] FE lint y tipado limpios; tests pasan.
- [ ] BE build limpio; tests pasan (`dotnet test`).
- [ ] Manual: bumpear versión de `/api/sistema/usuarios` en ambos repos → deploy coordinado → primera carga del listado hace network → resto del cache sigue intacto (ej: `/api/horario` sirve cached).
- [ ] Manual: BE devuelve sin header `X-Schema-Version` (mockear) → FE no rompe, asume v=1.
- [ ] Doc actualizada en `wal-resilience-degradation.md` y `cache-swr.md`.
- [ ] Commit coordinado FE+BE.

## REFERENCIAS

- Diseño: [wal-resilience-degradation.md](../../documentacion-subsistemas/wal-resilience-degradation.md) §M4.
- Service Worker: `@.claude/rules/service-worker.md` — sección "Versionado y Cambios Breaking".
- Cache SWR: [cache-swr.md](../../documentacion-subsistemas/cache-swr.md).

## NEXT

Tras cerrar este chat, el plan WAL Resilience queda completo. Próximo paso: monitoreo 30d en prod para validar métricas de éxito documentadas en el diseño:

- Reportes de "datos viejos / no se actualizó" → -80%
- `WAL_DEGRADED` minutos/día → <5 min/día
- Entries IN_FLIGHT abandonadas → <0.1%
- Cache hits con schema mismatch post-deploy → 100% en primer hit, 0% después
