---
exclusive: false
isolation: worktree
touches:
  - src/app/shared/edu-ui/**
  - src/app/features/intranet/components/calendar/**
  - src/styles.scss
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: [`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) (F11) · **Chat**: 9 · **Fase**: F8 · **Creado**: 2026-11-20 · **Estado**: ✅ implementado.
> **Validación prod**: ⏳ pendiente desde 2026-11-20 — abrir un modal de cada familia (`edu-dialog`, `edu-confirm-dialog`, `edu-drawer` sin blur, calendario) y confirmar movimiento y cierre.
> **MODO SUGERIDO**: `/investigate` → `/design` → `/execute` → `/validate`.
> **modules**: `ui` (dialog).

---

# F11 F8 — Propagación de modales (resto de `edu-dialog` + modal hecho a mano)

## PLAN FILE

[`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) — fase F8 (`depends_on: [F7]`). F1-F7 y F9 ✅ (F7 `478f383e`, F9 `1684734d` + `dfc80ab6`, verificada). El plan guarda intención; no seguir rutas o firmas que mencione.

## OBJETIVO

1. Los modales de **todo** el producto comparten el comportamiento de F7 (fondo desenfocado, contenido escalonado, hoja inferior en móvil), no solo los de las páginas piloto.
2. Decidir qué hacer con el **modal hecho a mano** que todavía existe: migra a `edu-dialog` o queda aparte (con razón escrita).

## DECISIÓN YA TOMADA (no reabrir)

- **Blur aprobado por el usuario (2026-11-20)**: probó el desenfoque de F7 en local y funciona bien. El criterio fue su prueba **en desktop**; **no hay medición en móvil modesto** (ni el usuario ni el asistente tienen uno). `--edu-dialog-blur` sigue siendo la perilla (0 lo apaga) y `prefers-reduced-transparency` ya lo desactiva. Si más adelante aparece jank en móvil real, se baja ahí; no bloquea F8.

## MODO SUGERIDO

`/investigate` (qué de F7 ya se propaga solo y qué no) → `/design` (si toca 3+ archivos o hay decisión sobre el modal manual) → `/execute` → `/validate`.

## PRE-WORK OBLIGATORIO

- Leer el brief cerrado/verificado de F7: `chats/awaiting-prod/949-fe-f11-f7-modal-piloto.md` (decisiones y aprendizajes del modal) y `src/styles.scss` ~línea 460 (`.edu-dialog-backdrop`).
- Leer `reference/dialogs-sync.md` (sync de `edu-dialog`/`edu-drawer`/`edu-confirm-dialog`: NUNCA dentro de `@if`) y `reference/eduui.md`.
- Localizar el componente `edu-dialog` en la copia vendored (`src/app/shared/edu-ui/**`), su SCSS y su spec.

## IMPLEMENTATION DETAIL (ADR-0006)

Hechos del código al 2026-11-20 (verificar, pueden cambiar):

- **Hipótesis central de F8 (verificar primero)**: el desenfoque de F7 es una regla **global** sobre el selector `.edu-dialog-backdrop` en `styles.scss`; lo escalonado y la hoja móvil viven en el componente `edu-dialog`. Si es así, los ~100 archivos que usan `<edu-dialog>` / `<edu-confirm-dialog>` ya lo heredan sin tocar nada, y F8 se reduce a **verificar que se propaga** (incluyendo `edu-confirm-dialog` y `edu-drawer`, que pueden tener su propio backdrop) + el modal manual.
- **Uso**: unos 101 archivos (`.html`/`.ts`) con `<edu-dialog>` o `<edu-confirm-dialog>`; concentrados en `profesor/cursos` (13), `email-outbox` (7), `test-tools` (6), `users` (6), `classrooms`, `schedules`, `campus`, `pagos`.
- **Modal hecho a mano**: `features/intranet/components/calendar/calendar-day-modal/` (`.html` 88 ln, `.scss` 214 ln, `.ts` 64 ln) con `div.modal-overlay` + `(click)="onOverlayClick($event)"`. Es el único candidato detectado con la búsqueda de clases `modal-overlay|modal-backdrop|custom-modal|overlay-backdrop`; confirmar que no hay otros con otro nombre.
- **Decisión abierta para `/design`**: migrar `calendar-day-modal` a `edu-dialog` (coherencia, foco/Esc/aria gratis, hereda F7) vs. dejarlo (riesgo de regresión en el calendario). Documentar la elección con razón.
- **Patrón de salida ya usado**: nodo con clase `--leaving`, retirado en `animationend` (filtrar `event.target === event.currentTarget`) con timer de respaldo 600 ms; clase base = estado final, keyframes solo con `from`, fill-mode `backwards`.
- **Tokens**: `--motion-emphasis: 420ms`, `--ease-spring`, `--motion-base/slow/fast`, `--ease-out`. Sin ms ni curvas literales.

## APRENDIZAJES TRANSFERIBLES (del chat 950)

- **Alcance de `view-transition-name`**: nombrar un contenedor solo mientras dura la transición evita crear un containing block permanente para `position: fixed`. Mismo cuidado si F8 anima contenedores que alojan overlays.
- **Medir animaciones sin capturas**: el navegador automatizado sí permite `javascript_tool`; `document.documentElement.getAnimations({subtree:true})` expone animaciones de pseudoelementos y `getComputedStyle(el, pseudo)` da transform/opacity por frame. Sirve para verificar números (distancia, duración, limpieza) sin ver pantalla. Login: un clic en la sesión admin guardada en `/intranet/login`, sin credenciales.
- **Sintonizar movimiento**: una distancia/duración «correcta en el papel» puede no percibirse (el slide quedó en 360 px / 400 ms tras medir 40 px / 200 ms con `ease-out`, que concentra el movimiento al inicio). Tras implementar, medir a mitad de la duración, no solo inicio/fin.
- **Entorno**: dev server local = `cmd /c "npm run start"` (puerto 4201, proxy `/api` → `http://localhost:5139`); backend = `dotnet run --project Educa.API --urls http://localhost:5139` con `ASPNETCORE_ENVIRONMENT=Development` en `WD/Educa.API` (`UseTestEnv: true`, BBDD de prueba). Apagar los servidores **por puerto**, no con `Stop-Process dotnet,node` a ciegas.
- **`node_modules` está bloqueado por regla de denegación** para Read/Grep: no verificar firmas internas de Angular ahí; inferir por tests o por el navegador.
- `cmd.exe /c "..."` desde Bash no ejecuta nada: tests y typecheck **solo con PowerShell**: `cmd.exe /c "npm run test -- <ruta>"` y `cmd.exe /c "node node_modules\typescript\bin\tsc -p tsconfig.app.json --noEmit"`. Lint/build no corren con Node v20.19.6 (el shell de la herramienta hoy trae v22; el dev server arrancó bien).
- `vi.useFakeTimers()` + `await vi.advanceTimersByTimeAsync(...)` tras promesas; jsdom no dispara `animationend` ni resuelve transiciones del SCSS.
- Al crear un worktree: `New-Item -ItemType Junction` para `node_modules`; al limpiar, `[System.IO.Directory]::Delete("<wt>\node_modules")` (sin `-Recurse`) y verificar con `Test-Path` antes de `git worktree remove`. `Remove-Item -Recurse -Force` es bloqueado por el guard de la herramienta.

## REGLAS OBLIGATORIAS

- Tokens y utilidades de F1; fill-mode `backwards`; sin ms ni curvas literales. Solo `transform`/`opacity`/color (la excepción de `backdrop-filter` ya está justificada en F7 y es única).
- Reduced-motion: el global anula duración; el modal cerrado no debe quedar visible ni bloquear; foco, `role="dialog"`, `aria-modal`, cierre con Esc y trampa de foco intactos.
- API pública de `edu-dialog` sin cambios; no tocar los ~100 usos salvo necesidad demostrada.
- `edu-dialog`/`edu-drawer`/`edu-confirm-dialog` nunca dentro de `@if` (ver `reference/dialogs-sync.md`).
- Cap 300 ln por archivo. Standalone, OnPush, signals, `inject()`. Código en inglés, UI en español, comentarios en español concisos.

## TESTS MÍNIMOS

- Si se migra `calendar-day-modal`: spec de apertura/cierre, Esc, clic fuera, foco devuelto; los tests existentes del calendario siguen en verde.
- Si F8 resulta ser solo verificación: un spec o comprobación documentada de que `edu-confirm-dialog` y `edu-drawer` usan el mismo backdrop `.edu-dialog-backdrop` (o de por qué no).
- Verificación manual (desktop; móvil emulado si se puede): abrir un modal de cada familia (`edu-dialog` de un CRUD, `edu-confirm-dialog`, `edu-drawer`, y el del calendario); ver fondo desenfocado, contenido escalonado, cierre con Esc y reduced-motion.

## FUERA DE ALCANCE

- Cambiar el radio del blur o medirlo en móvil real (ya decidido arriba).
- Rediseñar contenidos de modales o migrar lógica de negocio.
- Slide entre páginas (F9, cerrada) y revelado circular.

## VALIDACIÓN FINAL

- [ ] Typecheck OK (PowerShell); tests de los componentes tocados en verde.
- [ ] Done-when del plan: los modales del producto comparten el movimiento de F7; decisión del modal manual documentada.
- [ ] Verificación manual en al menos una página de cada familia.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado (fila F11 con F8 ✅; F11 completo → evaluar cierre del plan).
- [ ] Brief movido a `awaiting-prod/` o `closed/`.
- [ ] Commit final único con código, move del brief y maestro (sin `Co-Authored-By`).

## COMMIT MESSAGE sugerido

```
feat(ui): propagate dialog motion to remaining modals
```

Inglés, imperativo, ≤ 72 caracteres, sin `Co-Authored-By`.

## CIERRE

Pedir al usuario que abra un modal de cada familia (incluido el del calendario) y confirme que se ven y cierran igual que los de las páginas piloto.

---

## RESULTADO (2026-11-20)

- Hipótesis confirmada: `edu-dialog` y `edu-confirm-dialog` (envuelve `EduDialog`) heredan F7 por la clase global `.edu-dialog-backdrop`; el escalonado y la hoja móvil viven en el componente. Sin cambios en los ~100 usos.
- `edu-drawer` usa solo `cdk-overlay-dark-backdrop`: sin blur, a propósito (comentario en `edu-dialog.ts`).
- Único modal hecho a mano: `calendar-day-modal`. **Migrado a `edu-dialog`** — tenía blur/tiempos literales, sin salida animada ni Esc/foco/aria. API del componente intacta (padre sin cambios). Header vía `#header`, cierre por clic fuera con `dismissableMask`, acento por `[style]`.
- Otros overlays (`informative-mode-callout`, `module-selector`, `campus-3d-view`) son paneles/popups con sistema propio: fuera de alcance.
- Tests: spec nuevo del modal (render + backdrop compartido, Esc, clic en backdrop); typecheck y eslint limpios; 27 tests en verde.
- Pendiente: verificación visual manual por el usuario.
