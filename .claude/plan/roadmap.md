# Roadmap de Tasks — Orden de Ejecución

> **Última actualización**: 2026-04-10 (roadmap completado — solo quedan items incrementales)
> **Criterio de ordenamiento**: Dependencias + impacto + riesgo. Lo fundacional primero, lo cosmético al final.

---

## Estado General

```
Semana 1 (abr 7-11)     Semana 2 (abr 14-18)     Semana 3 (abr 21-25)
─────────────────────    ─────────────────────    ─────────────────────
✅ higiene-estructural   ✅ enforcement F2 (tests) ✅ normalización idiomática
✅ revision-codigo-muerto ✅ enforcement F4 (CI)
✅ enforcement F1 (lint)  ✅ enforcement F5 (barrels)

Incremental (sin fecha límite)
──────────────────────────────
⏳ archivos-grandes-refactor — al tocar cada archivo
⏳ enforcement F3 (tipos)    — al tocar cada archivo
```

**7 de 9 tasks completadas.** Las 2 restantes son incrementales por diseño — no bloquean nada y se aplican oportunistamente al tocar archivos por features o bugs.

---

## Tasks Completadas

| # | Task | Fecha | Resumen |
|---|------|-------|---------|
| 1 | Higiene Estructural | 2026-04-09 | Fronteras `shared/` vs `@intranet-shared` vs `features/` definidas |
| 2 | Revisión Código Muerto | 2026-04-09 | Archivos sin consumidores eliminados |
| 3 | Enforcement F1 — Lint | 2026-04-09 | Reglas de arquitectura en `eslint.config.js` |
| 4 | Enforcement F2 — Tests | 2026-04-09 | 5 contract specs de seguridad (auth, credentials, storage, permisos, user-permisos) |
| 5 | Enforcement F4 — CI | 2026-04-09 | Pipeline con concurrency, audit, Node 22 |
| 6 | Enforcement F5 — Barrels | 2026-04-09 | Barrels restringidos (storage, auth, wal, session) + ESLint deep-path rules |
| 7 | Normalización Idiomática | 2026-04-10 | 8 dominios renombrados español→inglés (365 archivos). URLs visibles al usuario en español. Regla documentada en `rules/code-language.md` |

---

## Tasks Incrementales (pendientes)

### 8. Archivos Grandes — Refactor

| | |
|---|---|
| **Task** | `tasks/archivos-grandes-refactor.md` |
| **Estado** | ⏳ Incremental — 5 archivos identificados |
| **Cuándo** | Al tocar cada archivo por feature o bug |
| **Dependencias** | Ninguna (normalización completada, CI activo) |

**Archivos** (verificar líneas actuales — los renames pueden haber cambiado los conteos):

| Archivo (post-normalización) | Ubicación |
|------------------------------|-----------|
| `attendance-view.service.ts` | `features/intranet/services/attendance/` |
| `attendance-director.component.ts` | `pages/cross-role/attendance-component/` |
| `director-attendance-api.service.ts` | `shared/services/attendance/` |
| `attendances-admin.store.ts` | `pages/admin/attendances/services/` |
| `attendances-crud.facade.ts` | `pages/admin/attendances/services/` |

**Regla**: Al tocar cualquiera de estos archivos, refactorizar en ese momento. No crear PRs dedicados solo para splits.

---

### 9. Enforcement Fase 3 — Tipos Semánticos

| | |
|---|---|
| **Task** | `tasks/enforcement-reglas.md` → Fase 3 |
| **Estado** | ⏳ Continuo — setup inicial pendiente |
| **Cuándo** | Al tocar cada archivo |

**Setup inicial pendiente**: Crear tipos base en `@data/models/` para estados que aún son `string`:

| Tipo | Valores | Ubicación sugerida |
|------|---------|-------------------|
| `EstadoMatricula` | `PREASIGNADO`, `PENDIENTE_PAGO`, `PAGADO`, `CONFIRMADO`, `CURSANDO`, `FINALIZADO`, `RETIRADO`, `ANULADO` | `@data/models/classroom.models.ts` |
| `MetodoPago` | `EFECTIVO`, `TRANSFERENCIA`, `YAPE`, `PLIN`, `OTRO` | Nuevo archivo o `@data/models/payment.models.ts` |

**Tipos ya creados** (documentados en `rules/semantic-types.md`): `AppUserRoleValue`, `NivelEducativo`, `DiaSemana`, `AprobacionEstado`, `PeriodoCierreEstado`, `TipoCalificacion`, `AttendanceStatus`, `EstadoAsistenciaCurso`, `TipoEntradaCalendario`, `TipoEventoCalendario`, `NotificacionTipo`, `NotificacionPrioridad`, `HorarioVistaType`.

**Regla**: Al tocar un archivo con `string` genérico para un estado conocido, reemplazar por tipo semántico en el mismo PR.

---

## Grafo de Dependencias (completado)

```
✅ higiene-estructural ──→ ✅ enforcement F1 (lint) ──→ ✅ enforcement F4 (CI) ──→ ✅ normalización
        │                         │                          │
        │                         │                          │
✅ revision-codigo-muerto ──→ ✅ enforcement F5 (barrels)    │
                                                             │
                          ✅ enforcement F2 (tests) ─────────┘

⏳ archivos-grandes-refactor ← incremental, dependencias cumplidas
⏳ enforcement F3 (tipos)    ← continuo, sin dependencias
```

---

## Reglas del Roadmap

1. **Enforcement F3 y archivos-grandes son incrementales** — no bloquean nada, se hacen "al tocar"
2. **Si un bug o feature urgente aparece, se atiende** — este roadmap no bloquea trabajo productivo
3. **Cada task completada se archiva en `.claude/history/`** con fecha de cierre
4. **Este roadmap se actualiza** cuando cambian prioridades o se completan fases
