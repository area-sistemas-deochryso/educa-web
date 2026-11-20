---
exclusive: false
isolation: worktree
touches:
  - src/app/shared/edu-ui/lib/datepicker/edu-datepicker.ts
  - src/app/shared/edu-ui/lib/input-text/edu-input-text.ts
  - src/app/shared/edu-ui/lib/select/edu-select.ts
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: [`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) (F11) · **Chat**: 3 · **Fase**: F3 · **Creado**: 2026-11-19 · **Estado**: ✅ cerrado local (validación manual, lint y build pendientes por Node 20).
> **Validación prod**: ✅ verificada 2026-11-20 — local con BBDD de prueba: medición en vivo + visto por el usuario
> **Created**: 2026-11-19
> **MODO SUGERIDO**: `/investigate` → `/design` → `/execute` → `/validate` (decisión de mecanismo antes de tocar varios campos).
> **modules**: `ui` (motion, campos de formulario edu-ui).

---

# F11 F3 — Campos: sacudida al pasar a inválido

## PLAN FILE

[`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) — fase F3 (`depends_on: [F1]`, F1 ✅ commit `23b82cca`, brief 943 en `awaiting-prod/`). F2 (944, `edu-button`) cerrada local en commit `80402584`, también en `awaiting-prod/`. El plan guarda intención; no seguir rutas o firmas que mencione.

## OBJETIVO

Sacudida horizontal (`.motion-shake` de F1) en campos de formulario compartidos **cuando pasan a inválidos**, siempre acompañada de mensaje de texto y atributo de invalidez. El movimiento solo no comunica el error.

## HALLAZGO PREVIO (chat 944)

La invalidez **no la gestionan los campos `edu-ui`**: solo `edu-datepicker` tiene `inputError()` / `aria-invalid` propio. En el resto, el consumidor pone `aria-invalid` y el mensaje a mano (ver `reference/signal-forms.md`, punto 5). No hay clases `ng-invalid` automáticas con Signal Forms. Por eso hay que **decidir el mecanismo en `/design`**, por ejemplo:

- A. Directiva compartida que observa `aria-invalid` (MutationObserver o `host` binding) y aplica `.motion-shake` solo en la transición a `true`. No toca cada campo; cubre también campos de consumidores.
- B. Input `invalid` explícito en cada campo `edu-ui`. Más API, más cambios, pero tipado.

Trade-off a medir: A depende de un atributo DOM (frágil si un consumidor no lo setea); B rompe la compatibilidad si se vuelve obligatorio.

## PRE-WORK OBLIGATORIO

- Leer `src/_motion-expressive.scss` (`.motion-shake`, `--motion-shake`, `--motion-shake-distance`) y `edu-datepicker.ts`/`.scss` (único campo con invalidez propia).
- Grep de quién setea `aria-invalid` hoy en `features/` y `shared/` para dimensionar el consumo real.
- Leer `reference/signal-forms.md` y `reference/a11y.md`.

## ALCANCE

1. Mecanismo elegido en `/design` aplicado a los campos compartidos relevantes (`edu-input-text`, `edu-select`, `edu-datepicker`, `edu-textarea` al menos; confirmar cuáles).
2. Sacudida **solo en la transición** a inválido (no en cada render ni permanente) y no al cargar un formulario ya inválido.
3. Reduced-motion: el global ya anula duración; verificar que el mensaje y `aria-invalid` siguen visibles.

## REGLAS OBLIGATORIAS

- Tokens y utilidades de F1 (sin ms ni distancias literales); solo `transform`.
- Fill-mode `backwards`, nunca `both`/`forwards`.
- Copia vendored de `edu-ui` es la fuente única (brief 942).
- Cap 300 ln; Angular standalone, OnPush, signals, `inject()`.
- Código en inglés, UI en español, comentarios en español concisos.
- Compatible hacia atrás: los formularios actuales no cambian si no están inválidos.

## TESTS MÍNIMOS

- Spec: pasar de válido a inválido agrega la clase de sacudida; ya inválido al montar no sacude; volver a inválido tras corregir sacude de nuevo.
- Verificación manual en un formulario piloto: enviar vacío → sacudida + mensaje + `aria-invalid`.
- `prefers-reduced-motion: reduce`: sin movimiento, mensaje legible.

## FUERA DE ALCANCE

- Botón (F2), filas (F4), toast (F5), acordeón (F6), modales (F7/F8), router (F9).
- Migrar formularios existentes a Signal Forms.

## VALIDACIÓN FINAL

- [ ] `npm run lint` sin errores nuevos.
- [ ] `npm run build` pasa.
- [ ] Tests de los campos en verde.
- [ ] Contract checklist del plan, ítem F3: sacudida solo con mensaje de texto y `aria-invalid`; tokens de F1; reduced-motion verificado.

> **Nota de entorno**: en el chat 944 lint/build no corrieron (Node de Windows v20.19.6, Angular CLI pide ≥ 22.22.3; en WSL no hay `node_modules/.bin`). Los tests sí corren con `cmd.exe /c "npm run test -- <ruta>"`. Resolver Node antes de cerrar.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado (fila F11 con F3 ✅).
- [ ] Brief movido a `awaiting-prod/` o `closed/`.
- [ ] Commit final único con código, move del brief y maestro.

## COMMIT MESSAGE sugerido

```
feat(ui): shake form fields when they become invalid
```

Inglés, imperativo, ≤ 72 caracteres.

## CIERRE

Pedir al usuario que revise en vivo un formulario piloto con envío vacío y confirme si la sacudida (440 ms, 8 px, definidas en F1) le parece bien.
