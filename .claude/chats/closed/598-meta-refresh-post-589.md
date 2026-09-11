> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Origen**: meta-refresh generado por `/end` al cerrar el brief 589 (P79 F8, 2026-08-26).

---

# 598 — Meta-refresh post-589: `design-system.md` describe la convención `tag-neutral` con el stack viejo (PrimeNG)

## Contexto

El brief 589 restauró la regla `.edu-tag.tag-neutral` en `src/styles.scss` (borrada por error en `986ea325` durante la limpieza de CSS muerto de P79 F6). Al hacerlo se encontró que `.claude/reference/design-system.md` — la referencia canónica de esta convención — sigue describiendo el patrón **pre-swap** (PrimeNG `p-tag`), no el actual (`edu-ui` `edu-tag`). No se corrigió en 589 porque el brief tenía scope cerrado a los 3 hallazgos de la auditoría 597, y el doc no era parte de ese scope.

## ITEMS

- [ ] `.claude/reference/design-system.md:191` — el bloque de código de la regla `tag-neutral` sigue mostrando `.p-tag.tag-neutral { ... }`. Actualizar a `.edu-tag.tag-neutral` y agregar `!important` en `background`/`color`, documentando el motivo (ver nota abajo).
- [ ] `.claude/reference/design-system.md:185` — la tabla dice el color viene de `--surface-200`. Es `--surface-100` desde el brief 523 (ya corregido en el código, el doc quedó atrás). Verificar si hay más referencias a `--surface-200` en el resto del archivo.
- [ ] `.claude/reference/design-system.md:203-215` — los ejemplos de uso (`<p-tag ... styleClass="tag-neutral" />`) siguen en sintaxis PrimeNG. Migrar a `<edu-tag ... styleClass="tag-neutral" />`.
- [ ] `.claude/reference/design-system.md:804,813` — dos snippets de ejemplo real (tabla de usuarios) también en `<p-tag>`; migrar a `<edu-tag>` o verificar si ya no aplican tras el swap.
- [ ] **Nota a agregar en el doc**: `edu-tag` usa `ViewEncapsulation.Emulated` (default de Angular) — su propio selector `[data-severity]` compila con el atributo `_ngcontent-*`, lo que le da más especificidad real que un override global de igual conteo de clases (`.edu-tag.tag-neutral`, 2 clases vs 2 "clases" efectivas del componente). Por eso la regla restaurada en 589 necesitó `!important` para ganar la cascada — cualquier futuro override global sobre un componente `edu-ui` con severity/estado debería anticipar el mismo problema.
- [ ] Verificar si quedan más referencias a `p-tag`/`p-*` (PrimeNG) en `design-system.md` fuera de este bloque — el doc es de 946 líneas y no se hizo un barrido completo post-P79.

## Qué NO hacer

- No re-litigar la convención `tag-neutral` en sí (F2.1, ya cerrada) — solo actualizar el doc para que describa el código actual.
- No expandir a un audit completo de todo `design-system.md` a menos que el barrido del último ítem encuentre más de 2-3 referencias sueltas — si son muchas, documentar el hallazgo y encolar como brief de seguimiento separado en vez de hacerlo dentro de este.

## Modo sugerido

`/execute` — son ediciones de texto en un doc de referencia, sin ambigüedad de diseño.
