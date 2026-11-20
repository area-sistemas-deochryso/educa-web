---
exclusive: false
isolation: worktree
touches:
  - src/app/shared/edu-ui/lib/button/edu-button.ts
  - src/app/shared/edu-ui/lib/button/edu-button.scss
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: [`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) (F11) · **Chat**: 2 · **Fase**: F2 · **Creado**: 2026-11-19 · **Estado**: ✅ cerrado local; verificación manual + lint/build pendientes (Node 20 < 22.22.3).
> **Validación prod**: ✅ verificada 2026-11-20 — local con BBDD de prueba: medición en vivo + visto por el usuario
> **Created**: 2026-11-19
> **MODO SUGERIDO**: `/design` → `/execute` → `/validate` (toca la API pública de un componente compartido).
> **modules**: `ui` (motion, edu-button).

---

# F11 F2 — Botón: éxito y onda

## PLAN FILE

[`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) — fase F2 (`depends_on: [F1]`, F1 ✅ en commit `23b82cca`, brief 943 en `awaiting-prod/`). El plan guarda intención y decisiones; no seguir como instrucción ninguna ruta o firma que mencione.

## OBJETIVO

`edu-button` comunica el resultado de una acción: a continuación de `loading`, un estado de **éxito** (el botón se encoge, vuelve a su ancho y dibuja un check, con ancho fijo para que nada salte), y una **onda** desde el punto de presión en botones principales. Hoy el botón solo tiene `loading` (spinner + `aria-busy`) y no dice si salió bien.

## PRE-WORK OBLIGATORIO

- Leer `src/app/shared/edu-ui/lib/button/edu-button.ts` (77 ln) y `edu-button.scss` (148 ln) completos.
- Leer `src/_motion-expressive.scss` (F1): tokens `--motion-emphasis`, `--motion-ripple`, `--ease-spring` y la utilidad `.motion-ripple` (espera `--ripple-x`/`--ripple-y` en px dentro del host y la clase `.is-rippling`).
- Leer `.motion-press` en `src/styles.scss`: ya anima el `:active` con `scale(0.97)`; **no reanimar eso**. Condición central del usuario: solo vocabulario nuevo.
- Confirmar con grep qué botones usan `[loading]` hoy (candidatos del piloto: `/intranet/admin/cursos` y `/intranet/asistencia`).

## ALCANCE

1. **Estado de éxito** en `EduButton`: nuevo `input` (por ejemplo `success`), mutuamente coherente con `loading` (si ambos, gana `loading`). Reemplaza el icono por un check animado; ancho fijo (medir el ancho antes de cambiar, sin saltos de layout). Debe comunicarse también por atributo accesible o texto para lectores de pantalla, no solo por movimiento (p. ej. región `aria-live` o `aria-label` del estado). **Decidir en `/design`** quién vuelve a `false` el estado: el consumidor o un temporizador del componente.
2. **Onda** desde el punto de presión: setear `--ripple-x`/`--ripple-y` desde el evento de puntero y agregar/quitar `.is-rippling`. Solo en botones principales (`severity="primary"` y no `text`); decidir en `/design` si es opt-in por input o por defecto.
3. Reduced-motion: el global ya anula duración y delay; verificar que el check final y la onda quedan en estado legible.

## REGLAS OBLIGATORIAS

- Tokens y utilidades de F1 (sin ms ni curvas literales); solo `transform` y `opacity` más color.
- Fill-mode `backwards`, nunca `both`/`forwards`.
- `edu-button` es un componente de la copia vendored de `edu-ui` (fuente única de verdad desde brief 942; `educa-libs` congelada).
- Cap de 300 líneas por archivo; estándares Angular del repo (standalone, OnPush, signals, `inject()`).
- Código en inglés, UI en español, comentarios en español concisos.
- Cambios de API del botón compatibles hacia atrás: los cientos de usos actuales no deben cambiar de comportamiento.

## TESTS MÍNIMOS

- Spec del componente: `success` muestra el check y el atributo accesible; `loading` tiene prioridad; sin `success` el render actual no cambia.
- Verificación manual en vivo en las páginas piloto (ver CIERRE): guardado exitoso muestra cargando y luego éxito, sin saltos de ancho.
- `prefers-reduced-motion: reduce` emulado: no hay movimiento y el estado de éxito sigue legible.

## FUERA DE ALCANCE

- Otros componentes de `edu-ui` (F3–F7), router (F9), reanimar el `:active` de `.motion-press`.
- Propagar el estado de éxito a todos los consumidores: aquí solo se expone y se valida en el piloto.

## VALIDACIÓN FINAL

- [ ] `npm run lint` sin errores nuevos.
- [ ] `npm run build` pasa.
- [ ] Tests del componente en verde.
- [ ] Contract checklist del plan, ítem F2: `edu-button` expone un estado de éxito además de `loading`; toda animación nueva tiene regla de reduced-motion y usa los tokens de F1.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado (fila F11 con F2 ✅).
- [ ] Brief movido a `awaiting-prod/` (verificación manual pendiente) o `closed/`.
- [ ] Commit final único con código, move del brief y maestro.

## COMMIT MESSAGE sugerido

```
feat(ui): add success state and press ripple to edu-button
```

Inglés, imperativo, ≤ 72 caracteres, sin `Co-Authored-By`.

## CIERRE

Pedir al usuario que revise en vivo, en `/intranet/admin/cursos` o `/intranet/asistencia`, el ciclo cargando → éxito de un guardado real y la onda al presionar, y que confirme si el rebote del resorte (pico ~3 % definido en F1) le parece bien o prefiere ajustarlo.
