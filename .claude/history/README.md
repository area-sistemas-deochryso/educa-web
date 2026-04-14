# History

Registro de tareas completadas y cambios significativos del proyecto.

## Tareas archivadas

| Archivo | Descripcion | Fecha |
| --- | --- | --- |
| `correction-plan.md` | Plan de correccion de god components y migracion a Facade+Store | 2025-Q2 |
| `refactor-organizacion.md` | Reorganización de 14 bloques: tipos, servicios, templates, stores. BaseCrudFacade evaluada | 2026-03-28 |
| `admin-asistencia-formal.md` | Edición formal de asistencia para Admin/Director: backend completo (service+controller+DTOs+repos) + frontend completo (multi-facade CRUD) | 2026-04-07 |
| `email-outbox-audit.md` | Sistema outbox de correos: worker con retry exponencial, UI admin con stats/tendencias/reintentar, call-sites migrados | 2026-04-07 |
| `cache-wal-sync.md` | Fixes de flujos CRUD con cache offline + WAL | 2026-Q1 |
| `robustness-improvements.md` | Plan de robustez post-auditoría Codex (sistema distribuido) | 2026-Q1 |
| `abstraction-gaps.md` | Diagnóstico de gaps de abstracción en el codebase | 2026-Q1 |
| `import-masivo-estudiantes.md` | Import masivo de estudiantes desde Excel multi-hoja con upsert (backend + frontend + dialog 3 pasos) | 2026-04 |
| `trazabilidad-errores.md` | Sistema de trazabilidad de errores: backend + frontend + vista admin + outbox offline + clasificación NETWORK/BACKEND/FRONTEND + source location parsing. Validado en producción | 2026-04-10 |
| `roadmap.md` | Roadmap de 9 tasks (7 completadas + 2 incrementales por diseño): higiene estructural, revisión código muerto, enforcement F1-F5, normalización idiomática | 2026-04-10 |
| `revision-codigo-muerto.md` | Eliminación de archivos sin consumidores: access-denied-modal, lazy-content, progressive-loader, highlight, truncate, BaseRepository | 2026-04-09 |
| `normalizacion-idiomatica.md` | Normalización español→inglés en módulo asistencia (task origen) | 2026-04-10 |
| `normalizacion-idiomatica-mapa.md` | Mapa completo de la normalización (8 dominios, ~258 archivos, estrategia por fases) | 2026-04-10 |

| `eslint-prevenir-compactacion-setters.md` | Regla ESLint `structure/no-compact-trivial-setter` para detectar setters one-liner que burlan max-lines. Implementada + documentada | 2026-04-13 |
| `refactor-honesto-post-max-lines.md` | Refactor real de deuda post-max-lines: calificaciones WAL→server-confirmed (INV-C04), usuarios.store→BaseCrudStore, horarios.store→sub-stores expuestos, permisos-usuarios.facade→multi-facade (data/crud/ui) | 2026-04-13 |
| `eslint-subfolder-grouping.md` | Convención de agrupación en subcarpetas (18 carpetas detectadas). No automatizable — vigente como guía de code review | 2026-04-13 |
| `archivos-grandes-refactor.md` | Refactor de archivos grandes de asistencia: `attendance-view.service.ts` dividido (412→327), 4 archivos evaluados pasan ESLint sin split. Nuevo `attendance-view.models.ts` + métodos con contexto en `AttendancePdfService` | 2026-04-13 |

## Tareas pendientes (en `tasks/`)

| Tarea | Archivo | Estado |
| --- | --- | --- |
| Enforcement Fase 3 — tipos semánticos | `enforcement-reglas.md` | ⏳ Incremental — aplicar al tocar cada archivo |
