# 121 · FE · Design System F5.3.2 — migrar `attendances` admin al estándar

> **Repo destino**: `educa-web` (main)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-07 · **Modo sugerido**: `/investigate` → `/execute` → `/validate`
> **Origen**: `tasks/design-system-from-usuarios.md` F5.3.2 (#2 del backlog F5.2). Continuación de brief 120 (F5.3.1 `feedback-reports`).
> **Scope**: 1 chat, FE-only, cosmético (no bloquea features).

## Contexto

`tasks/design-system-from-usuarios.md` F5 migra incrementalmente las páginas admin que divergen del estándar canónico extraído de `/intranet/admin/usuarios`. Las pautas B1-B11 viven en `rules/design-system.md` sección 7. F5.3.1 (`feedback-reports`) ya cerró el patrón.

`attendances` admin (`/intranet/admin/asistencias`) es la #2 del backlog por: (a) frecuencia de uso del Director, (b) divergencia con falta de `<app-page-header>` (B2).

## Divergencias detectadas (auditoría F5.1)

| Pauta | Estado actual | Acción |
|---|---|---|
| **B2** Page header | ❌ falta `<app-page-header>` | Agregarlo con icono + title + subtitle + acciones |
| **B3** Stat cards | revisar contra anatomía canonical (content-left + icon-right 48×48, valor 1.75rem/700, label 0.85rem) | Alinear si difiere |
| **B6** Filter bar | revisar contra patrón canonical (search-box + filter-dropdowns + `btn-clear` con `margin-left: auto` + `opacity: 0.5 → 1`) | Alinear si difiere |
| **B1** Container con border, no background | ⚠️ a verificar — la auditoría F5.1 no detectó anti-B1 explícito pero requiere `grep` específico | Confirmar |
| Tokens hardcoded | revisar `#fff`, `#dc2626`, `#1e40af`, `rgba(...)` vs convención de tokens (sección 8 de design-system.md) | Migrar a `var(--*)` o `color-mix()` |

## Pre-work

- Leer `src/app/features/intranet/pages/admin/attendances/attendances.component.{html,scss,ts}` y subcomponentes en `attendances/components/`.
- Comparar con la página canónica `src/app/features/intranet/pages/admin/usuarios/` (referencia).
- Releer `rules/design-system.md` sección 7 (B1-B11) y sección 8 (tokens D).
- Ver brief 120 `closed/120-fe-design-system-feedback-reports.md` para el patrón concreto aplicado en F5.3.1 (mismo tipo de cambio).

## Plan de ejecución

1. **Investigate**: grep de `box-shadow`, `background: var(--surface-card)`, `background: #fff`, `#dc2626`, `#1e40af`, `#d97706` en los archivos del feature. Listar cada divergencia con line:col.
2. **Execute**:
   - Agregar `<app-page-header>` con icono adecuado (probablemente `pi pi-calendar-plus` o similar de asistencia), title + subtitle + bloque `header-actions` (refresh + exportar/cierre mensual si aplica) según patrón B2.
   - Migrar filter-bar al patrón B6 si difiere.
   - Migrar tokens hardcoded a variables del tema (sección 8 de design-system.md).
   - Si los stat-cards tienen `box-shadow` o `background` propio → remover (B1).
3. **Validate**:
   - `npm run lint` (solo archivos tocados).
   - `npm run build` (debe pasar; warnings ESM pre-existentes ignorables).
   - Smoke visual mental: confirmar que la página renderiza sin layout shifts y que los stats/filtros mantienen comportamiento.
4. **Actualizar task**: marcar F5.3.2 como `[x]` con resumen al cerrar (igual que F5.3.1 en el task file).

## Criterio de cierre

- `<app-page-header>` montado y funcional con acciones canónicas.
- Filter-bar alineada al patrón B6 si aplica.
- Sin tokens hardcoded en los archivos tocados (excepto excepciones documentadas: Sass `color.adjust`, Canvas API, paletas decorativas).
- Lint + build verdes.
- Task file actualizado con check F5.3.2 ✅.

## No-scope (no tocar en este chat)

- F5.3.3 (`email-outbox`), F5.3.4 (`vistas`), F5.3.5+ — son chats separados.
- Subcomponentes con shadows legítimos (drag & drop, overlays) si los hubiera — respetar excepciones documentadas en task F5.2.
- Refactor de la lógica de asistencia (store, facade, services) — solo cosmético del template/scss y page-header.

## Aprendizaje transferible esperado

Refinar el patrón de "migración cosmética 1-página-1-chat" iniciado en 120: cómo aplicar B2 (page-header) sobre páginas que ya tienen header propio sin romper layout, y cómo decidir qué acciones van en `header-actions` vs en otra ubicación visual cuando la página tiene workflows complejos (gestión + reportes en tabs).
