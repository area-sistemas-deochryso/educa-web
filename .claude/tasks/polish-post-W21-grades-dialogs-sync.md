# polish-post-W21 · `profesor/grades` dialogs-sync 100% compliance

<!-- created: 2026-05-19 -->

> Deuda residual capturada al cerrar W21 F5 (chat 194). Origen: brief 193 (F3 refactor `profesor/grades`).

## Contexto

En el refactor F3 (brief 193) `p-confirmDialog` quedó fuera del `@if (contenido())` (compliance directo). Los 3 dialogs custom **no** salieron porque tipan inputs con non-null assertion sobre `contenido()`:

- `app-evaluacion-form-dialog` — recibe `[contenidoId]="contenido()!.id"`
- `app-calificar-dialog` — recibe `[contenidoId]="contenido()!.id"` y `[semanas]="contenido()!.semanas"`
- `app-periodos-config-dialog` — recibe `[contenidoId]="contenido()!.id"`

Sacarlos del `@if` requiere que cada sub-component acepte `null` en sus inputs y guarde internamente. Fix arquitectural fuera del scope F3.

## Scope

1. Cambiar `[contenidoId]: number` → `[contenidoId]: number | null` en los 3 sub-components con guard interno (early return en effects/loads cuando `null`).
2. Cambiar `[semanas]: SemanaDto[]` → `[semanas]: SemanaDto[] | null` en `app-calificar-dialog`.
3. Mover los 3 dialogs fuera del `@if (contenido())` en el template de `profesor/grades`.
4. Smoke: abrir/cerrar cada dialog sin `contenido` cargado y con `contenido` cargado.

## Done cuando

- 3 dialogs en el DOM siempre (compliance `dialogs-sync.md` 100%).
- Lint + build verdes.
- Sin regresiones en flujo de edición de notas.

## Referencias

- Brief origen: `chats/closed/193-fe-polish-W21-F3-profesor-grades-refactor.md`
- Regla: `.claude/rules/dialogs-sync.md`
