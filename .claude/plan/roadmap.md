# Roadmap de Tasks — Orden de Ejecución

> **Última actualización**: 2026-04-09
> **Criterio de ordenamiento**: Dependencias + impacto + riesgo. Lo fundacional primero, lo cosmético al final.

---

## Esfuerzo del Modelo — Escala

Cada fase tiene un costo diferente para el modelo (Claude/Codex). No es lo mismo crear un archivo de config que refactorizar 5 servicios leyendo dependencias.

| Nivel | Significado | Contexto requerido | Ejemplo |
|-------|-------------|-------------------|---------|
| **Bajo** | Crear/editar 1-2 archivos conocidos, poca lectura previa | < 5 archivos leídos | Crear CI yaml, agregar reglas a eslint.config.js |
| **Medio** | Leer varios archivos, entender relaciones, editar con criterio | 5-15 archivos leídos | Escribir tests de contrato, reducir barrel exports |
| **Alto** | Explorar ampliamente, leer muchos archivos, decisiones de diseño, múltiples ediciones coordinadas | 15-30+ archivos leídos | Refactorizar archivos grandes, renames masivos |

---

## Paralelización — Qué puede correr en la misma sesión

Dos fases son **paralelizables** cuando no tocan los mismos archivos y no dependen del resultado de la otra. Fases paralelizables se pueden ejecutar como agentes simultáneos o en la misma sesión sin conflicto.

```
SESIÓN A (semana 1)              SESIÓN B (semana 1)
┌──────────────────────┐         ┌──────────────────────┐
│ higiene-estructural   │         │ revision-codigo-muerto│
│ (cerrar pendientes)   │   ✅    │ (decidir + eliminar) │
│ Archivos: shared/,    │ PARALELO│ Archivos: shared/    │
│ tsconfig, barrels     │         │ components muertos   │
└──────────────────────┘         └──────────────────────┘
⚠️ Ambos tocan shared/ — paralelizar solo si higiene NO mueve más archivos.
   Si higiene ya está cerrado, código muerto es 100% independiente.

SESIÓN C (semana 2)              SESIÓN D (semana 2)
┌──────────────────────┐         ┌──────────────────────┐
│ enforcement F1 (lint) │         │ enforcement F2 (tests)│
│ Archivos:             │   ✅    │ Archivos:            │
│ eslint.config.js      │ PARALELO│ *.spec.ts (nuevos)   │
│                       │         │                      │
└──────────────────────┘         └──────────────────────┘
✅ 100% paralelo — F1 toca eslint.config.js, F2 crea archivos .spec.ts nuevos.
   Cero conflicto de archivos.

SESIÓN E (semana 2, después de C+D)
┌──────────────────────┐         ┌──────────────────────┐
│ enforcement F4 (CI)   │         │ enforcement F5        │
│ Archivos:             │   ✅    │ (barrels)            │
│ .github/workflows/    │ PARALELO│ Archivos: */index.ts │
│ ci.yml (nuevo)        │         │ en core/services/    │
└──────────────────────┘         └──────────────────────┘
✅ 100% paralelo — F4 crea archivo nuevo, F5 edita barrels existentes.

SESIÓN F (semana 3+)             SESIÓN G (semana 3+)
┌──────────────────────┐         ┌──────────────────────┐
│ normalizacion-        │         │ archivos-grandes-    │
│ idiomatica            │   ❌    │ refactor             │
│ Archivos: asistencia/ │ NO PAR. │ Archivos: asistencia/│
│ (renames masivos)     │         │ (split services)     │
└──────────────────────┘         └──────────────────────┘
❌ NO paralelo — ambos tocan archivos de asistencia/.
   Hacer normalización PRIMERO, luego refactorizar los archivos ya renombrados.
```

### Resumen de paralelización

| Par de fases | ¿Paralelo? | Razón |
|---|---|---|
| Higiene + Código muerto | ⚠️ Condicional | OK si higiene ya cerró movimientos de archivos |
| Enforcement F1 + F2 | ✅ Sí | Archivos completamente distintos |
| Enforcement F4 + F5 | ✅ Sí | F4 crea archivo nuevo, F5 edita barrels |
| Enforcement F1 + F5 | ❌ No | F5 depende de que F1 esté estable |
| Enforcement F2 + F5 | ✅ Sí | Tests no tocan barrels |
| Normalización + Archivos grandes | ❌ No | Ambos tocan asistencia/ |
| F3 (tipos) + cualquier otra | ✅ Sí | Continuo, se aplica al tocar cada archivo |

---

## Vista General

```
Semana 1 (abr 7-11)     Semana 2 (abr 14-18)     Semana 3+ (abr 21+)
─────────────────────    ─────────────────────    ─────────────────────
✅ higiene-estructural   enforcement F2 (tests)   enforcement F3 (tipos)
✅ revision-codigo-muerto enforcement F4 (CI)     normalizacion-idiomatica
✅ enforcement F1 (lint)  enforcement F5 (barrels) archivos-grandes-refactor
```

---

## Orden Detallado

### 1. Higiene Estructural — Cerrar pendientes

| | |
|---|---|
| **Task** | `history/higiene-estructural.md` |
| **Estado** | ✅ Completado (2026-04-09) |
| **Cuándo** | Ahora (semana abr 7-11) |
| **Esfuerzo humano** | ~1-2h (cierre) |
| **Esfuerzo modelo** | **Medio** — necesita leer checklist, verificar estado de archivos movidos, confirmar barrels. ~10-15 archivos. |
| **Paralelizable con** | Código muerto (⚠️ solo si higiene ya no mueve archivos de shared/) |
| **Por qué primero** | Es el fundamento. Estableció las fronteras `shared/` vs `@intranet-shared` vs `features/`. Todo lo demás se apoya en esta estructura. No tiene sentido forzar fronteras (enforcement) si las fronteras no están definidas. |
| **Bloquea** | Enforcement Fase 1 (lint necesita saber qué imports son válidos) |

**Acción**: Verificar que todos los items del checklist están done. Si hay items abiertos menores, cerrarlos. Marcar como completado y archivar en `history/`.

---

### 2. Revisión de Código Muerto — Decidir y limpiar

| | |
|---|---|
| **Task** | `tasks/revision-codigo-muerto.md` |
| **Estado** | ✅ Completado (2026-04-09) |
| **Cuándo** | Semana abr 7-11 (junto con higiene) |
| **Esfuerzo humano** | ~1-2h |
| **Esfuerzo modelo** | **Bajo** — los items ya están identificados. Solo necesita grep de confirmación (0 imports) y eliminar archivos. ~5 archivos. |
| **Paralelizable con** | Higiene (⚠️ condicional), Enforcement F3 (tipos) |
| **Por qué segundo** | Limpiar antes de forzar. Si vas a crear reglas de lint sobre imports y barrel exports (enforcement F1 y F5), es mejor que el código muerto no esté en el camino generando ruido. Eliminar exports innecesarios ahora simplifica los barrels que enforcement F5 va a restringir. |
| **Bloquea** | Enforcement Fase 5 (barrel exports restrictivos) |

**Acción**: Para cada item de 0 consumidores, decidir: eliminar (si no hay plan de uso) o mantener con razón documentada. Ejecutar eliminaciones. No crear PR solo de limpieza — puede ir junto con higiene.

---

### 3. Enforcement Fase 1 — Lint de Arquitectura

| | |
|---|---|
| **Task** | `tasks/enforcement-reglas.md` → Fase 1 |
| **Estado** | ✅ Completado (2026-04-09) |
| **Cuándo** | Semana abr 14-18 |
| **Esfuerzo humano** | ~2-3h |
| **Esfuerzo modelo** | **Bajo** — edita 1 archivo (`eslint.config.js`), necesita leer la config actual y los alias de tsconfig. ~3-4 archivos. Luego corre `npm run lint` y corrige violaciones si existen (pocas esperadas). |
| **Paralelizable con** | ✅ Enforcement F2 (tests) — archivos completamente distintos |
| **Por qué tercero** | Primer enforcement real. Con la estructura limpia (higiene + código muerto resueltos), las reglas de lint pueden apuntar a fronteras estables. Impacto inmediato: cada `npm run lint` detecta violaciones. Mejor ratio impacto/esfuerzo de todas las fases. |
| **Depende de** | Higiene completada (fronteras definidas) |
| **Bloquea** | Enforcement Fase 4 (CI necesita lint estable), Enforcement Fase 5 (barrels) |

**Acción**: Agregar reglas en `eslint.config.js`. Verificar que `npm run lint` pasa limpio. Corregir violaciones existentes si las hay (probablemente pocas).

---

### 4. Enforcement Fase 2 — Tests de Contrato

| | |
|---|---|
| **Task** | `tasks/enforcement-reglas.md` → Fase 2 |
| **Estado** | Pendiente |
| **Cuándo** | Semana abr 14-18 (paralelo a F1) |
| **Esfuerzo humano** | ~4-6h (incremental) |
| **Esfuerzo modelo** | **Medio-Alto** — necesita leer cada servicio a testear (auth, permisos, storage, WAL, guards) para entender su API, luego crear archivos .spec.ts. ~15-20 archivos leídos, ~6-8 archivos creados. Es la fase más pesada en contexto porque cada test requiere entender el contrato del servicio. Recomendable dividir en sub-sesiones por zona (auth, permisos, storage, etc.). |
| **Paralelizable con** | ✅ Enforcement F1 (lint), ✅ Enforcement F5 (barrels) |
| **Por qué cuarto** | Segundo enforcement. Los tests protegen las zonas que el lint no puede cubrir: lógica de negocio, flujos de auth, cálculos de asistencia. Se puede trabajar en paralelo con F1 porque son independientes. |
| **Depende de** | Nada (independiente de F1) |
| **Bloquea** | Enforcement Fase 4 (CI ejecuta tests) |

**Acción**: Empezar por P1 (auth, permisos, storage). No intentar cobertura completa de una vez — tests incrementales por zona.

---

### 5. Enforcement Fase 4 — CI Pipeline

| | |
|---|---|
| **Task** | `tasks/enforcement-reglas.md` → Fase 4 |
| **Estado** | Pendiente |
| **Cuándo** | Semana abr 14-18 (después de F1 estable) |
| **Esfuerzo humano** | ~2-3h |
| **Esfuerzo modelo** | **Bajo** — crea 1 archivo nuevo (`.github/workflows/ci.yml`). Necesita conocer los comandos del proyecto (`npm run lint`, `npm test`, `npm run build`), que ya están documentados. ~2-3 archivos leídos. |
| **Paralelizable con** | ✅ Enforcement F5 (barrels) — archivo nuevo vs edición de barrels |
| **Por qué quinto** | Hace todo lo anterior no-opcional. Sin CI, lint y tests son sugerencias. Con CI, son requisitos. Se puede crear el pipeline tan pronto como F1 pase limpio, e ir agregando tests de F2 incrementalmente. |
| **Depende de** | F1 (lint pasa limpio), F2 (al menos tests P1 pasando) |

**Acción**: Crear `.github/workflows/ci.yml`. Configurar como check requerido en GitHub.

---

### 6. Enforcement Fase 5 — Barrel Exports Restrictivos

| | |
|---|---|
| **Task** | `tasks/enforcement-reglas.md` → Fase 5 |
| **Estado** | Pendiente |
| **Cuándo** | Semana abr 14-18 (después de F1) |
| **Esfuerzo humano** | ~2-3h |
| **Esfuerzo modelo** | **Medio** — necesita leer cada barrel (`*/index.ts` en core/services/), grep de quién importa qué, decidir qué queda público y migrar imports existentes. ~10-15 archivos leídos, ~5-8 editados. |
| **Paralelizable con** | ✅ Enforcement F4 (CI), ✅ Enforcement F2 (tests) |
| **Por qué sexto** | Cierra los escape hatches. Con lint detectando bypasses (F1) y CI bloqueando merge (F4), ahora puedes restringir qué exportan los barrels sin miedo a romper cosas silenciosamente. |
| **Depende de** | F1 (lint detecta imports directos), código muerto eliminado |

**Acción**: Reducir exports de `storage/`, `wal/`, `session/`, `cache/`. Grep previo para migrar imports existentes.

---

### 7. Normalización Idiomática — Asistencia

| | |
|---|---|
| **Task** | `tasks/normalizacion-idiomatica.md` |
| **Estado** | Pendiente — necesita decisión de idioma |
| **Cuándo** | Semana abr 21+ |
| **Esfuerzo humano** | ~3-4h |
| **Esfuerzo modelo** | **Alto** — rename masivo: 17+ archivos inglés → español (o viceversa). Necesita renombrar carpetas, archivos, selectores, clases, imports, re-exports, y verificar que nada se rompe. ~30+ archivos tocados. Recomendable ejecutar en sesión dedicada sin otras tareas simultáneas. |
| **Paralelizable con** | ❌ Nada de asistencia. ✅ Enforcement F3 (tipos) si es en archivos fuera de asistencia |
| **Por qué séptimo** | Es cosmético — mejora navegación y grep pero no protege contra bugs. Hacerlo después de enforcement porque: (a) los renames pueden romper tests recién creados, es mejor que CI los atrape; (b) lint de imports cruzados debe estar estable antes de mover archivos. |
| **Depende de** | CI activo (F4) — para detectar renames rotos automáticamente |

**Acción**: Decidir idioma estándar (español recomendado por consistencia con el resto del proyecto). Ejecutar renames con CI como red de seguridad.

---

### 8. Archivos Grandes — Refactor

| | |
|---|---|
| **Task** | `tasks/archivos-grandes-refactor.md` |
| **Estado** | Pendiente — 5 archivos identificados |
| **Cuándo** | Semana abr 21+ (o al tocar cada archivo) |
| **Esfuerzo humano** | ~4-6h (total de los 5 archivos) |
| **Esfuerzo modelo** | **Alto por archivo** — cada split requiere leer el archivo completo (300-530 líneas), entender responsabilidades internas, decidir cómo dividir, crear archivos nuevos, actualizar imports de consumidores. ~8-12 archivos leídos/editados por cada split. Recomendable hacer 1 archivo por sesión, no los 5 juntos. |
| **Paralelizable con** | ❌ Normalización idiomática (mismos archivos). ✅ Todo lo demás si el archivo no se toca en otra fase |
| **Por qué último** | Refactorizar archivos grandes es trabajo útil pero no urgente. Los archivos funcionan, solo violan el límite de líneas. Hacerlo último porque: (a) enforcement ya está en su lugar para proteger los refactors; (b) se puede hacer incrementalmente "al tocar" cada archivo en lugar de un sprint dedicado. |
| **Depende de** | CI activo — refactors grandes necesitan red de seguridad. Normalización idiomática completada (si aplica al mismo módulo) |

**Acción**: No dedicar un sprint. Al tocar cualquiera de los 5 archivos por feature o bug, refactorizar en ese momento. Si no se tocan, no hay urgencia.

---

### 9. Enforcement Fase 3 — Tipos Semánticos

| | |
|---|---|
| **Task** | `tasks/enforcement-reglas.md` → Fase 3 |
| **Estado** | Continuo |
| **Cuándo** | Siempre (al tocar cada archivo) |
| **Esfuerzo humano** | Distribuido (~15 min por archivo tocado) |
| **Esfuerzo modelo** | **Bajo por aplicación** — reemplazar `string` por tipo semántico en 1 archivo es trivial. **Medio para el setup inicial** (crear los tipos base en `@data/models/`): necesita revisar business-rules.md para extraer los valores válidos, ~5 archivos creados. |
| **Paralelizable con** | ✅ Todo — nunca conflicta porque se aplica al archivo que ya se está tocando |
| **Por qué continuo** | No requiere sprint dedicado. Cada vez que se toca un archivo con `any` o string genérico para un estado, se reemplaza por tipo semántico. El lint de `no-explicit-any` (F1) lo detecta, CI (F4) lo bloquea. |

**Acción**: Crear los tipos base (EstadoMatricula, MetodoPago, etc.) en F3.1 al inicio. Luego aplicar incrementalmente.

---

## Grafo de Dependencias

```
higiene-estructural ──→ enforcement F1 (lint) ──→ enforcement F4 (CI) ──→ normalizacion-idiomatica
        │                      │                         │                   archivos-grandes-refactor
        │                      │                         │
revision-codigo-muerto ──→ enforcement F5 (barrels)      │
                                                         │
                       enforcement F2 (tests) ───────────┘

enforcement F3 (tipos) ← continuo, sin dependencias
```

---

## Resumen: Esfuerzo del Modelo y Sesiones Óptimas

### Tabla de esfuerzo

| # | Fase | Esfuerzo modelo | Archivos leídos | Archivos editados/creados | Sesión dedicada |
|---|------|-----------------|-----------------|--------------------------|-----------------|
| 1 | Higiene (cierre) | Medio | ~10-15 | ~3-5 | No, compartida con #2 |
| 2 | Código muerto | Bajo | ~5 | ~5-9 (eliminar) | No, compartida con #1 |
| 3 | Enforcement F1 (lint) | Bajo | ~3-4 | ~1-2 | No, compartida con #4 |
| 4 | Enforcement F2 (tests) | Medio-Alto | ~15-20 | ~6-8 (crear) | Dividir por zona |
| 5 | Enforcement F4 (CI) | Bajo | ~2-3 | ~1 (crear) | No, compartida con #6 |
| 6 | Enforcement F5 (barrels) | Medio | ~10-15 | ~5-8 | No, compartida con #5 |
| 7 | Normalización idiomática | Alto | ~30+ | ~30+ (renames) | Sí, dedicada |
| 8 | Archivos grandes | Alto (por archivo) | ~8-12 por split | ~4-6 por split | 1 archivo por sesión |
| 9 | Enforcement F3 (tipos) | Bajo (por aplicación) | ~1-2 por archivo | ~1 por archivo | No, piggyback |

### Sesiones óptimas (cómo agrupar el trabajo)

```
SESIÓN 1 — Limpieza (semana 1)
├── #1 Higiene (cerrar)          ← Medio
├── #2 Código muerto (decidir)   ← Bajo
└── Total: ~2-4h, esfuerzo modelo Medio

SESIÓN 2a — Lint (semana 2, agente A)
├── #3 Enforcement F1 (lint)     ← Bajo
└── Total: ~2-3h, esfuerzo modelo Bajo

SESIÓN 2b — Tests auth+permisos (semana 2, agente B, PARALELO con 2a)
├── #4 Enforcement F2 parcial    ← Medio
│   └── Solo: AuthService, permisosGuard, StorageService
└── Total: ~2-3h, esfuerzo modelo Medio

SESIÓN 3 — Tests restantes + CI + Barrels (semana 2, después de 2a+2b)
├── #4 Enforcement F2 restante   ← Medio (WAL, asistencia)
├── #5 Enforcement F4 (CI)       ← Bajo      ┐
├── #6 Enforcement F5 (barrels)  ← Medio     ┘ paralelos entre sí
└── Total: ~4-5h, esfuerzo modelo Medio

SESIÓN 4 — Normalización (semana 3)
├── #7 Normalización idiomática  ← Alto
└── Total: ~3-4h, esfuerzo modelo Alto — sesión dedicada

SESIÓN 5, 6, 7... — Splits individuales (semana 3+, 1 por sesión)
├── #8 Archivo grande X          ← Alto por archivo
└── Total: ~1-1.5h por archivo, esfuerzo modelo Alto

CONTINUO — al tocar cualquier archivo
└── #9 Enforcement F3 (tipos)    ← Bajo por aplicación
```

### Cuándo usar agentes paralelos

| Escenario | Recomendación |
|---|---|
| F1 (lint) + F2 (tests) | ✅ Dos agentes en worktrees separados. No comparten archivos. |
| F4 (CI) + F5 (barrels) | ✅ Dos agentes. CI crea archivo nuevo, barrels edita existentes. |
| F2 tests por zona | ✅ Posible: un agente para auth/permisos, otro para storage/WAL. No comparten .spec.ts. |
| Normalización + cualquier cosa de asistencia | ❌ Un solo agente. Renames masivos tocan demasiados archivos. |
| Archivo grande split + otro archivo grande split | ⚠️ Solo si son de módulos distintos. Si ambos son de asistencia/, secuencial. |

---

## Reglas del Roadmap

1. **No empezar una task sin haber cerrado sus dependencias**
2. **Enforcement F3 y archivos-grandes son incrementales** — no bloquean nada, se hacen "al tocar"
3. **Si un bug o feature urgente aparece, se atiende** — este roadmap no bloquea trabajo productivo
4. **Cada task completada se archiva en `.claude/history/`** con fecha de cierre
5. **Este roadmap se actualiza** cuando cambian prioridades o se completan fases
