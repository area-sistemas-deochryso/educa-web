# Plan — Limpieza de drift documental en `.claude/`

> **Repo**: `educa-web` (FE) · **Tipo**: docs · **Riesgo**: bajo (sólo docs/rules)
> **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.

## Contexto

Auditoría externa (codex, 2026-05-13) detectó que partes del `drift-report.md` y de reglas activas describen estado del código que ya no aplica. Riesgo: futuros chats toman decisiones basadas en docs falsas.

## Hallazgos confirmados

1. **`@data/repositories` ya no existe** (alias removido de `tsconfig.json`), pero sigue mencionado en:
   - `.claude/rules/architecture.md:118` (taxonomía Gateway)
   - `.claude/rules/architecture.md:398` (bloque "Capa de Datos")
   - `.claude/rules/code-style.md:24` (ejemplo de import alias)
2. **`[(visible)]` ya no aparece en templates HTML reales** — sólo en ejemplos de `dialogs-sync.md`. Verificar que los ejemplos no induzcan a copiarlo.
3. **`feedbackReport` flag ya está documentado y usado** en `intranet-layout`. Confirmar que el `drift-report.md` no lo siga listando como pendiente.
4. **`drift-report.md` general** — varias secciones describen "violaciones pendientes" que ya fueron resueltas en commits posteriores. Necesita audit completo o archivado.

## Fases

### F1 — Borrar refs a `@data/repositories` (quick win, 30 min)

- `rules/architecture.md`: quitar `@data/repositories/` de la taxonomía Gateway (línea 118). Reemplazar bloque "Capa de Datos" (línea 396-402) por nota corta: "Patrón actual: feature service con `HttpClient` directo. `BaseRepository` eliminado por código muerto (ver `history/revision-codigo-muerto.md`)."
- `rules/code-style.md`: cambiar ejemplo de import (línea 24) — usar `@shared/models` o un alias vivo.
- No tocar `history/*.md` ni `reporte-drift-check/*` (son archivo histórico).

### F2 — Auditar `drift-report.md` (medio, 1-2h)

- Releer las 11 secciones contra estado actual del código.
- Marcar cada hallazgo: `✅ resuelto` / `⏳ pendiente` / `❌ obsoleto (no aplica)`.
- Mover el archivo a `.claude/history/drift-report-2026-04.md` si >70% obsoleto. Si no, dejarlo con nota de fecha de última verificación.

### F3 — Limpiar ejemplos `[(visible)]` en `dialogs-sync.md` (opcional)

- Si los ejemplos de "incorrecto" muestran `[(visible)]` sólo como contraste, conservar. Si están mezclados con código presentado como bueno, separar claramente.

## Criterio de cierre

- `grep -rn "@data/repositories" .claude/rules/` retorna 0 líneas activas (sólo dentro de `history/`).
- `drift-report.md` tiene fecha de verificación reciente o está archivado.

## Prioridad

**Baja**. No bloquea features. Hacer cuando haya rato libre o cuando se toque alguna de las reglas afectadas por otro motivo (regla de oportunismo).
