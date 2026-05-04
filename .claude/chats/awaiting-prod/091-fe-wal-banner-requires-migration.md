> **Creado**: 2026-05-04 · **Estado**: ⏳ pendiente arrancar.

# 091 · FE · WAL banner REQUIRES_MIGRATION

## Contexto

**Origen**: F-S08 de la 1ra ronda del WAL Integration Smoke (commit `9c39d40`, docs en `claude-cowork/wal-integration-smoke.md`). Finding documentado en `tasks/wal-cache-audit-fixes.md` sección "Findings menores 1ra ronda smoke (2026-05-04)".

**Síntoma**: el motor del WAL emite `REQUIRES_MIGRATION` correctamente y la entry queda en ese estado en IndexedDB, pero ningún componente top-level consume `walStatus()` con un visual prominente. El usuario no se entera de que tiene migraciones pendientes. Verificado en Caso 8 del smoke.

**Repositorio**: `educa-web` (main)

---

## Objetivo

Cablear `WalStatusFacade.hasMigrations` / `migrationCount` en un componente top-level visible (intranet-layout o equivalente) usando el patrón banner B9 del `design-system.md` (sección 7 — alert banners con `color-mix()`).

---

## Hallazgos de /investigate (pre-ejecutado en chat 091)

- **`WalStatusFacade`** (`@core/services/wal/wal-status.facade.ts`): expone `hasMigrations` (computed boolean), `migrationCount` (number signal) y `discardMigrationEntries(): Promise<number>`. Ya tiene wiring al `WalSyncEngine.entryProcessed$`.
- **`WalStatusStore`**: `hasMigrations = computed(() => migrationCount() > 0)`.
- **`IntranetLayoutComponent`** (`features/intranet/shared/components/layout/intranet-layout/`): el slot ideal para montar el banner es entre `<app-offline-indicator />` y `<main>` — justo donde vive el indicador de offline. El componente usa `ChangeDetectionStrategy.OnPush`.

---

## Decisión de diseño (a tomar antes de ejecutar)

| Opción | Descripción |
|--------|-------------|
| **(a) Permanente** | Banner visible hasta que `migrationCount === 0`. Sin botón de dismiss. Solo desaparece cuando el usuario ejecuta "Descartar entradas" o navega y recarga con IDB limpio. |
| **(b) Dismissible** | Banner con botón X que lo oculta. Estado de dismiss en `sessionStorage` → reaparece en el próximo reload si `hasMigrations` sigue siendo true. Incluye botón de acción "Descartar entradas" que llama `discardMigrationEntries()`. |

**Resolución elegida**: **(b) dismissible con sessionStorage** — el estado `REQUIRES_MIGRATION` no bloquea el uso de la app, así que un banner permanente sería intrusivo. Con `sessionStorage` el usuario puede cerrar el banner temporalmente pero reaparece si el problema persiste al recargar.

---

## Plan de ejecución

1. **Crear `WalMigrationBannerComponent`** en `@intranet-shared/components/wal-migration-banner/`:
   - Standalone, `OnPush`
   - Inputs: ninguno (inyecta `WalStatusFacade` directamente)
   - Estado local: `dismissed = signal(false)` + init desde `sessionStorage['wal-migration-dismissed']`
   - Template: banner B9 con `color-mix(in srgb, var(--yellow-500) 15%, transparent)` + ícono `pi pi-exclamation-triangle` + mensaje + botón "Descartar entradas" + botón X
   - Acción "Descartar entradas": llama `walFacade.discardMigrationEntries()`, setea `dismissed = false` (el count cae a 0 y el banner desaparece por signal)
   - Acción dismiss (X): setea `dismissed = true` + `sessionStorage.setItem('wal-migration-dismissed', '1')`
   - Visible cuando: `hasMigrations() && !dismissed()`

2. **Montar en `IntranetLayoutComponent`**:
   - Import + add to `imports[]`
   - Insertar `<app-wal-migration-banner />` entre `<app-offline-indicator />` y `<main>`

3. **Test unitario** (`wal-migration-banner.component.spec.ts`):
   - Dado `hasMigrations = true` → banner visible
   - Dado `hasMigrations = false` → banner oculto
   - Click X → banner oculto + sessionStorage seteado
   - Click "Descartar entradas" → llama `discardMigrationEntries()`

---

## Criterios de cierre (smoke Caso 8)

- [ ] Tras inyectar entry con `schemaVersion` viejo y recargar, el banner aparece visible en `intranet-layout`
- [ ] Banner usa `color-mix` con `--yellow-500` + ícono `pi pi-exclamation-triangle` (B9 del design system)
- [ ] Test unitario que verifica wiring entre `WalStatusFacade` y el banner
- [ ] A11y: contraste WCAG AA (texto sobre fondo tintado yellow, `--text-color` sobre `color-mix`)
- [ ] Lint pasa sin warnings nuevos

---

## MODO SUGERIDO

`/execute → /validate`

(Decisión de diseño ya tomada en este brief — no requiere `/design` separado.)
