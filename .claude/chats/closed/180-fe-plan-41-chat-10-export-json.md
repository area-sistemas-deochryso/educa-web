# Brief 180 — Plan 41 Chat 10 · F5 Export JSON

> **Validación prod**: ✅ verificada 2026-05-19 — Blob 855B, shape `{correlationId, generatedAt, hubUrl, snapshot}` con sub-objetos por sección. Cowork BD-PROD-RO.
> **Creado**: 2026-05-16 · **Cerrado**: 2026-05-16 (awaiting-prod) · **Modo**: `/execute` → `/validate`
> **Repo**: educa-web (FE puro, sin BE)
> **Plan**: [`../../../../../educa-coord/plans/xrepo-41-correlation-hub-observability.md`](../../../../educa-coord/plans/xrepo-41-correlation-hub-observability.md) F5 Chat 10

## Scope

Plan 41 F5 brecha #10 (export / share). Agregar al hub `/intranet/admin/correlation/:id`:

- Botón **"Exportar JSON"** en `header-actions` de `correlation.component.html` (junto a Volver / Toggle vista / Refresh).
- Serializar snapshot completo + metadata: `{ correlationId, generatedAt, hubUrl, snapshot }`.
- Descarga como `correlation-{id}-{YYYYMMDD}.json` vía Blob + `URL.createObjectURL`.
- Service de export reutilizable en `correlation/services/correlation-export.service.ts`.
- Disabled cuando `vm().loading` o `!vm().snapshot`.

## Archivos tocados

| Archivo | Cambio |
|---|---|
| `correlation/services/correlation-export.service.ts` (nuevo, 60 ln) | Service con `exportSnapshot`, `buildPayload`, `buildFilename`. Inyectable `providedIn: 'root'`. |
| `correlation/services/correlation-export.service.spec.ts` (nuevo, 79 ln) | 4 tests: filename YYYYMMDD + padding, payload shape, anchor click + revoke. |
| `correlation/services/index.ts` | +1 re-export. |
| `correlation/correlation.component.ts` | inyectar `CorrelationExportService`, handler `onExport()`. |
| `correlation/correlation.component.html` | botón nuevo en `header-actions` antes del refresh. |

## Decisiones tomadas

1. **Service separado, no método del facade**. El export es lateral al snapshot data flow — no muta store ni hace HTTP. Mantener el facade focalizado en carga del snapshot.
2. **`generatedAt` del export ≠ `generatedAt` del snapshot**. El campo en el payload exportado representa "cuándo se generó el archivo JSON" (ISO `new Date().toISOString()`), no la fecha del snapshot. El snapshot ya tiene su propio `generatedAt` interno conservado.
3. **`hubUrl` absoluta**. Reconstruye `window.location.origin + /intranet/admin/correlation/{id}` para que el JSON sea autocontenido (permalink legible aunque el receptor no esté en el mismo origen).
4. **Sin botón "Share" ni permalink dedicado**. Out of scope — agregaría complejidad de auth/permisos sin pedido explícito.
5. **Botón con `p-button-outlined`** (no `p-button-text` como los demás) para diferenciar visualmente la acción "exportar artefacto" del resto de utilidades del header.

## Aprendizajes transferibles

- **Pattern de download client-side**: `Blob` + `URL.createObjectURL` + anchor invisible + click + `revokeObjectURL`. Aplicable a cualquier export futuro (CSV, PDF, etc.) — el método `triggerDownload` es genérico.
- **Testing de DOM side-effects con Vitest**: `Object.defineProperty(globalThis.URL, 'createObjectURL', { value, configurable: true })` para mockear APIs no-spy-ables. `vi.spyOn(document, 'createElement').mockReturnValue(anchor)` para interceptar la creación del anchor.
- **Drift del maestro descubierto al arrancar**: la línea del maestro decía "Chat 1 F1 listo para arrancar" pero F1 ya estaba awaiting-prod (chat 131). El plan file siempre es fuente más confiable que la nota del maestro. Aplicar `silent-merges-preflight.md` antes de pullear un plan listado como pendiente — ya cubierto por la regla global, pero vale reforzarlo.

## Métricas

- Lint correlation feature: 0 errores.
- Vitest correlation feature: 6 archivos · **24/24 tests verdes** (4 nuevos en `correlation-export.service.spec.ts`).
- TypeScript `tsc --noEmit -p tsconfig.app.json`: 0 errores.
- Build prod (`npm run build`): ✅ generado en `dist/educa-angular/browser/`.

## Verificación post-deploy

Cuando el deploy a Netlify pase:
- Entrar a `/intranet/admin/correlation/<algún-id-real>`, esperar a que cargue el snapshot.
- Click "Exportar JSON" → debería descargar `correlation-<id>-<YYYYMMDD>.json`.
- Abrir el JSON: debe contener `correlationId`, `generatedAt` ISO, `hubUrl` absoluta con `https://educa1.azurewebsites.net` (o el origen real), `snapshot` completo.
- Verificar que el botón está disabled mientras `loading` o cuando un correlationId no existente devuelve error.

Marcar verde con `/verify 180`. Si falla, mover a `running/` con motivo.

## Out of scope (no se hizo)

- Botón Share / permalink con state encoded.
- Export a CSV / PDF.
- Cambios en BE.
- Botón en cada sección individual (solo el del header del hub).
