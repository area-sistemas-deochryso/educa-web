---
exclusive: false
isolation: worktree
touches:
  - src/app/shared/edu-ui/lib/toast/edu-toast.ts
  - src/app/shared/edu-ui/lib/toast/edu-toast.scss
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: [`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) (F11) · **Chat**: 5 · **Fase**: F5 · **Creado**: 2026-11-19 · **Estado**: ✅ implementado 2026-11-20.
> **Validación prod**: ✅ verificada 2026-11-20 — en local (BBDD de prueba): entrada `toast-enter-top` 200 ms, barra 5000 ms que pasa a `paused` con el cursor, salida `edu-toast-exit` 200 ms; reduced-motion cubierto por la regla global.
> **MODO SUGERIDO**: `/investigate` → `/design` → `/execute` → `/validate`.
> **modules**: `ui` (motion, `edu-toast`).

---

# F11 F5 — Toast completo: salida, cuenta regresiva y pausa

## PLAN FILE

[`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) — fase F5 (`depends_on: [F1]`). F1-F4 ✅ en `awaiting-prod/` (943-946; F4 commit `5724554f`). El plan guarda intención; no seguir rutas o firmas que mencione.

## OBJETIVO

1. **Salida deslizante** del toast al cerrarse (auto o manual), sin que desaparezca de golpe.
2. **Barra de cuenta regresiva** con el tiempo restante.
3. **Pausa al pasar el cursor** (y al enfocar): congela cuenta y temporizador; al salir, reanuda con el tiempo restante.

## HALLAZGOS PREVIOS

- Archivos: `toast/edu-toast.ts`, `edu-toast.scss`, `edu-message.service.ts` (el servicio emite; el componente renderiza y decide el cierre).
- El plan pide **primero confirmar si la restricción de versión de F10 sigue vigente** (ver F10 F-toast en `plan/`): puede condicionar `animate.leave` / View Transitions. Resolver en `/investigate`.
- La salida exige retener el toast mientras anima; mismo problema que F4 (`edu-table-row-motion.ts`): ahí se resolvió con clase base = estado final + keyframes `from`, fill-mode `backwards`, y `animationend` con timer de respaldo. Reutilizar el enfoque si encaja.
- La barra y la pausa dependen del temporizador real: la pausa debe frenar también el `setTimeout` de cierre, no solo la animación (`animation-play-state` solo no alcanza).

## PRE-WORK OBLIGATORIO

- Leer `edu-toast.ts`, `edu-toast.scss`, `edu-message.service.ts` y `src/_motion-expressive.scss`.
- Grep de consumidores del servicio con `life`/`sticky` para dimensionar (toasts persistentes no llevan barra).

## REGLAS OBLIGATORIAS

- Tokens y utilidades de F1 (sin ms ni distancias literales). Fill-mode `backwards`, nunca `both`/`forwards`.
- Solo `transform`/`opacity`/color; la barra usa `transform: scaleX`, no `width`.
- Reduced-motion: el global anula duración; el toast cerrado no debe quedar visible ni bloquear. El movimiento solo no comunica estado: mantener `role`/`aria-live` existentes y no depender de la barra para el tiempo.
- Copia vendored de `edu-ui` es la fuente única (brief 942). Cap 300 ln por archivo.
- Standalone, OnPush, signals, `inject()`. Código en inglés, UI en español, comentarios en español concisos.
- Compatible hacia atrás: API pública del servicio y del componente sin cambios.

## TESTS MÍNIMOS

- Spec: cierre retiene el toast hasta terminar la salida y luego lo quita del DOM.
- Spec: pausa (hover/focus) detiene el cierre automático; al reanudar cierra con el tiempo restante (fake timers).
- Spec: toast sticky no muestra barra.
- Verificación manual en una página piloto; `prefers-reduced-motion: reduce`.

## FUERA DE ALCANCE

- Acordeón (F6), modales (F7/F8), router (F9). Cambiar posición/stack de toasts.

## VALIDACIÓN FINAL

- [ ] Typecheck OK; tests de `edu-toast` en verde.
- [ ] Done-when del plan: el toast sale deslizando, muestra el tiempo restante y se pausa con el cursor.

> **Nota de entorno**: lint/build no corren con Node de Windows v20.19.6. Tests: `cmd.exe /c "npm run test -- <ruta>"`; typecheck: `cmd.exe /c "node node_modules\typescript\bin\tsc -p tsconfig.app.json --noEmit"`. Si Vitest se cuelga, sospechar de bucles en `effect` (en F4 fue eso) y de ediciones de template que no aplicaron.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado (fila F11 con F5 ✅).
- [ ] Brief movido a `awaiting-prod/` o `closed/`.
- [ ] Commit final único con código, move del brief y maestro.

## COMMIT MESSAGE sugerido

```
feat(ui): add exit slide, countdown bar and hover pause to toast
```

Inglés, imperativo, ≤ 72 caracteres, sin `Co-Authored-By`.
