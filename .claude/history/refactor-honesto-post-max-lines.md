# Refactor honesto — Deuda estructural escondida tras Fase 2 max-lines

> **Estado**: Completado (2026-04-13)
> **Origen**: [history/eslint-unblock-frontend.md](../history/eslint-unblock-frontend.md) — Fase 2 (2026-04-11)
> **Prioridad**: Media — no bloquea build, pero es deuda técnica real
> **Contexto**: La Fase 2 bajó 31 archivos bajo 300 líneas efectivas, pero en varios casos la técnica fue **compactación visual** (trucos de formato) en lugar de mejora arquitectónica real. Este task cataloga los casos y propone refactors honestos.

---

## El problema

Cuando un archivo con 30+ setters triviales de 3 líneas los compacta a 1 línea cada uno, el archivo baja de 350 a 290 líneas efectivas **sin reducir complejidad real**:

```typescript
// Antes (3 líneas)
setUsuarios(usuarios: UsuarioLista[]): void {
  this._usuarios.set(usuarios);
}

// Después (1 línea) — pasa lint pero sigue siendo 1 setter trivial
setUsuarios(usuarios: UsuarioLista[]): void { this._usuarios.set(usuarios); }
```

Esto cumple la regla, pero el archivo sigue teniendo **20+ setters pass-through que no aportan valor**. El refactor honesto sería:

1. Exponer `store` como `readonly state = this.store;` y dejar que los consumidores llamen `facade.state.setX()` directamente
2. O usar un patrón functional con una sola función `patchState({ key, value })`
3. O promover `BaseCrudStore` a que cubra más cases (que ya existe en `@core/store/base/`)

Cualquiera de esos **reduce la cantidad de código** en vez de solo reordenarlo visualmente.

---

## Archivos con compactación visual (candidatos a refactor real)

### Stores

| Archivo | Setters triviales compactados | Refactor honesto |
|---|---:|---|
| `usuarios.store.ts` | ~25 | Promoverlo a `BaseCrudStore<UsuarioLista, UsuarioFormData, UsuariosEstadisticas>` — el proyecto ya tiene esta base class y este store debería extenderla |
| `horarios.store.ts` | ~20 | Igual — es CRUD admin estándar, candidato natural a `BaseCrudStore` |
| `campus-admin.store.ts` | ~15 | Caso especial (2 signals domain+ui separados). Mantener patrón o extraer `UiState` signal a otro store |
| `curso-contenido.store.ts` | ~14 | Ya usa patrón `{ domain, ui }`. OK. La parte compactada fueron los dialog open/close. Aceptable. |

### Facades

| Archivo | Delegates compactados | Refactor honesto |
|---|---:|---|
| `permisos-usuarios.facade.ts` | ~8 | Dividir en `permisos-usuarios-data.facade.ts` + `permisos-usuarios-crud.facade.ts` + `permisos-usuarios-ui.facade.ts` (patrón documentado en [crud-patterns.md](../rules/crud-patterns.md)) |
| `calificaciones.facade.ts` | ~6 + WAL optimistic vacíos | **Crítico**: además de compactar dialog delegates, este facade tiene 4 `wal.execute` con `optimistic: { apply: () => {}, rollback: () => {} }` — pesimismo disfrazado que viola [optimistic-ui.md](../rules/optimistic-ui.md). Migrar a optimistic real o documentar con referencia a invariante |
| `campus-admin.facade.ts` | ~10 UI setters + onSuccess multilinea | Aceptable — `executeCrud` abstracción ya existe. Mantener |
| `salones-admin.facade.ts` | ~10 UI setters + helper `loadDetailSection<T>` | Aceptable — el helper SÍ es refactor real |
| `estudiante-cursos.facade.ts` | `uploadAndRegister` helper | **Caso bueno** — helper real, no compactación |
| `grupos.facade.ts` | `buildDropRequest` + `applyDropOptimistic` | **Caso bueno** — extracción real |
| `usuarios-crud.facade.ts` | Payload builders extraídos | **Caso bueno** — refactor real |

---

## Casos de "compactación honesta aceptable"

Estos no necesitan re-refactor porque la compactación es legítima (métodos verdaderamente triviales que existen por delegación necesaria):

- `base-crud.facade.ts` — compact one-line delegates son parte del contrato de base class
- `campus-admin.facade.ts` (executeCrud calls) — el helper `executeCrud` ya abstrajo lo importante
- Los templates/styles migrados a archivos externos (5 componentes) — son refactors reales, no compactación

---

## Plan de refactor

### Prioridad 1 — `calificaciones.facade.ts` (crítico)

Violación de [optimistic-ui.md](../rules/optimistic-ui.md). Los 4 `wal.execute` con `optimistic: {}` vacíos son **pesimismo disfrazado** que el proyecto explícitamente prohíbe. Acciones:

1. Identificar los 4 métodos afectados (`calificarLote`, `calificarGruposLote`, `actualizarNota`, `eliminarPeriodo` o similar)
2. Para cada uno, decidir:
   - ¿Es operación optimista legítima? → implementar `apply` + `rollback` con snapshot
   - ¿Es operación crítica que DEBE esperar servidor? → subir a `consistencyLevel: 'server-confirmed'` con comentario referenciando el invariante de negocio que lo exige
3. El `eslint-disable wal/no-direct-mutation-subscribe` si aplica debe tener justificación específica

### Prioridad 2 — Migrar `usuarios.store.ts` y `horarios.store.ts` a `BaseCrudStore`

Ambos son CRUD admin estándar. `BaseCrudStore` ya existe en `@core/store/base/base-crud.store.ts` y cubre:

- Loading/error/dialog visibility
- CRUD mutations (add/update/remove/toggle)
- Estadísticas incrementales
- Form data management

Migrarlos elimina ~150 líneas reales de boilerplate duplicado (no compactado).

### Prioridad 3 — Dividir `permisos-usuarios.facade.ts` en multi-facade

Seguir el patrón `*-data.facade.ts` / `*-crud.facade.ts` / `*-ui.facade.ts` documentado en [crud-patterns.md](../rules/crud-patterns.md). Esto elimina el acoplamiento de 3 responsabilidades en un solo archivo — razón original por la que superó 300 líneas.

---

## Criterio de éxito

Para cada archivo refactorado:

- [ ] La reducción de líneas viene de **menos lógica**, no de menos formato
- [ ] El archivo original compactado puede volverse a 3 líneas por método sin superar 300 líneas efectivas
- [ ] Ningún `wal.execute` tiene `apply: () => {}` + `rollback: () => {}` vacíos sin justificación de invariante
- [ ] Los stores `usuarios` y `horarios` extienden `BaseCrudStore`
- [ ] `permisos-usuarios.facade` está dividido en 3 facades

---

## Lo que NO es parte de este task

- Los 18 helpers creados durante Fase 2 están bien — extracción real de lógica pura
- Los 5 componentes migrados a template/styles externos están bien — es la convención del proyecto
- Los archivos Tier 1 (`notifications.config`, `horarios-import-dialog`, `campus-3d-view`) ya quedaron con refactors honestos (catálogo dividido, template externo, setup helper)

---

## Referencias

- [history/eslint-unblock-frontend.md](../history/eslint-unblock-frontend.md) — plan ejecutado que generó la deuda
- [history/eslint-max-lines.md](../history/eslint-max-lines.md) — detalle por archivo
- [rules/crud-patterns.md](../rules/crud-patterns.md) — patrón multi-facade
- [rules/optimistic-ui.md](../rules/optimistic-ui.md) — regla de optimistic obligatorio
- [core/store/base/base-crud.store.ts](../../src/app/core/store/base/base-crud.store.ts) — base class existente
