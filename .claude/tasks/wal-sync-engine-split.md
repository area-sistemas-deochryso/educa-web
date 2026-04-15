# Task — Split estructural de `wal-sync-engine.service.ts`

> **Creado**: 2026-04-15
> **Origen**: F3.5.B del Plan 1 (Enforcement) destapó que el archivo está en 303 líneas efectivas (límite 300). Fix temporal aplicado con `eslint-disable max-lines` justificado. Este task cierra la deuda estructural correctamente.
> **Scope**: chat dedicado, medio día de trabajo.

---

## Contexto

`WalSyncEngine` es el loop central del subsistema WAL — procesa entries pendientes, coordina leader election cross-tab, maneja retry/backoff, y emite eventos al StatusFacade. Hoy vive en un único archivo con 8 regiones cohesivas y 303 líneas efectivas.

El escape hatch `eslint-disable max-lines` documentado en el encabezado del archivo es **honesto pero no permanente** — hace visible la deuda en vez de esconderla con refactor cosmético (colapsar comentarios para pasar el umbral).

---

## Diagnóstico previo

Distribución actual de regiones (líneas aproximadas sobre el archivo de 466 líneas totales, ~303 efectivas):

| Region | Líneas aprox | Rol |
|--------|--------------|-----|
| Dependencies | ~12 | `inject()` de servicios (WalDb, WalHttp, WalLeader, WalMetrics, WalCoalescer, WalClock, SwService) |
| State | ~26 | `queue`, `inFlight`, `entryProcessed$`, flags |
| Lifecycle | ~72 | `init()`, `registerCallbacks()` (consumers), cleanup en `DestroyRef` |
| Callback Registration | ~29 | Infra para que features se registren como consumers |
| **Processing** | **~137** | `processAllPending()`, loop de dispatch, coalescer integration — **el bloque más grande** |
| Error Handling | ~74 | Classification (conflict/permanent/transient), backoff, state transitions en WAL entries |
| Recovery | ~51 | Reintento de failed entries, schema migration checks |
| Cross-tab Coordination | ~20 | `isProcessing` flag via WalLeader, evitar doble procesamiento entre tabs |

---

## Candidatos a extracción (evaluar en el chat dedicado)

| Candidato | Archivo propuesto | Pros | Contras |
|-----------|-------------------|------|---------|
| **Error Handling** | `wal-sync-error-handler.ts` (helper, clase sin estado) | Regla clara (clasificación de error + cálculo de backoff). Muy testeable aislada. | Necesita recibir el entry y el error — contrato simple |
| **Recovery** | `wal-sync-recovery.ts` (service scoped al engine) | Flujo distinto (reintento manual de failed + migration purge), no es parte del hot loop | Comparte acceso al `WalDb` y `queue`; acoplamiento moderado |
| **Cross-tab Coordination** | `wal-sync-coordinator.ts` (service) | Pequeño, encapsula el uso de `WalLeader` | Solo 20 líneas — extracción marginal |
| **Processing split** | dividir el loop en `processNext()` privado + helper puro para coalescing | Reduce el bloque grande a pedazos manejables | Riesgo de romper invariantes del loop (orden FIFO, leader guard) |

**Recomendación inicial** (sujeta a revisión en el chat dedicado): extraer **Error Handling** como helper puro (clase sin estado, métodos estáticos o inyectable stateless). Es el ganador por ratio beneficio/riesgo — cohesivo, testeable, reduce ~70 líneas sin tocar el hot loop.

Si con eso no alcanza para bajar de 300, evaluar Recovery como segunda extracción.

---

## Plan de ejecución

### F1 — Diagnóstico confirmatorio
- [ ] F1.1 Leer completo `wal-sync-engine.service.ts` y mapear exactamente cuántas líneas ocupa cada region (no aproximado).
- [ ] F1.2 Identificar dependencias entre regions (qué llama a qué, qué estado privado comparten).
- [ ] F1.3 Confirmar qué tests cubren el engine hoy (`wal-facade-helper.service.spec.ts`, otros).

### F2 — Extracción Error Handling
- [ ] F2.1 Crear `src/app/core/services/wal/wal-sync-error-handler.ts` con clase/funciones puras para clasificación de error + backoff.
- [ ] F2.2 Mover la lógica desde la region "Error Handling" del engine al nuevo archivo.
- [ ] F2.3 `WalSyncEngine` inyecta/usa el nuevo helper.
- [ ] F2.4 Tests: agregar spec aislado para el helper (`wal-sync-error-handler.spec.ts`) con casos de conflict, permanent, transient, backoff calculation.
- [ ] F2.5 Verificar que specs existentes del engine siguen verdes.

### F3 — Evaluar si alcanza
- [ ] F3.1 Correr `npx eslint src/app/core/services/wal/wal-sync-engine.service.ts`.
- [ ] F3.2 Si pasa: remover el `/* eslint-disable max-lines */` del encabezado.
- [ ] F3.3 Si NO pasa: ejecutar F4 (segunda extracción).

### F4 — (Opcional) Extracción Recovery
- [ ] F4.1 Crear `wal-sync-recovery.ts` con la region "Recovery".
- [ ] F4.2 Resolver acoplamiento a `WalDb` y `queue` (inyección + método público para reencolar).
- [ ] F4.3 Test aislado.
- [ ] F4.4 Remover escape hatch del engine.

### F5 — Documentación
- [ ] F5.1 Actualizar `rules/architecture.md` si se introduce un nuevo patrón (p.ej. engine + helpers stateless).
- [ ] F5.2 Marcar este task ✅ en el maestro.

---

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Romper el orden FIFO del loop al extraer helpers | No tocar Processing en F2. Solo Error Handling (out-of-band del hot loop). |
| Invariante de leader election se rompe al separar coordination | Dejar Cross-tab Coordination dentro del engine — es el guard del loop, no extraer |
| Tests del engine son escasos — poca red de seguridad | F1.3 cataloga cobertura actual. Si hay gaps críticos, escribir tests mínimos del loop antes de extraer |
| Backoff calculation depende de `WalClock` para skew-aware delays | El helper puede recibir `clockSkewMs` como parámetro — evita acoplamiento |

---

## Criterios de éxito

- [ ] `wal-sync-engine.service.ts` sin `eslint-disable max-lines`
- [ ] `npx eslint src/app/core/services/wal/` limpio
- [ ] Specs existentes verdes
- [ ] Al menos 1 nuevo spec para el helper extraído
- [ ] Plan maestro actualizado
