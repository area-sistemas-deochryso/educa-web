# 263 — P10 P0.3: UI defensiva en páginas admin

- **Plan**: [fallbacks-criticos.md](../../plan/fallbacks-criticos.md) — fase P0.3
- **Scope**: Error signals en stores, bloques `@if error` en templates admin, `#emptymessage` en p-tables
- **Modo sugerido**: `/investigate` → `/execute` → `/validate`
- **Prereq**: P0.2 ✅ (brief 262)

## Intent (del plan)

Ninguna página admin debe mostrar spinner eterno o tabla vacía sin contexto cuando la API falla.

## Sub-items

1. Auditar stores admin que no exponen `error` signal (email-outbox, feedback-reports, etc.)
2. Agregar bloques `@if error` en templates de páginas admin (inline error state)
3. Agregar `#emptymessage` en tablas p-table sin empty state
