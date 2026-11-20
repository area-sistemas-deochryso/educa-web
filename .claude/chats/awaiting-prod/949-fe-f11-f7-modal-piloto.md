---
exclusive: false
isolation: worktree
touches:
  - src/app/shared/edu-ui/lib/dialog/edu-dialog.ts
  - src/app/shared/edu-ui/lib/dialog/edu-dialog.scss
  - src/app/shared/edu-ui/lib/dialog/edu-dialog.spec.ts
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: [`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) (F11) · **Chat**: 7 · **Fase**: F7 · **Creado**: 2026-11-20 · **Estado**: ✅ cerrado localmente 2026-11-20.
> **Validación prod**: ⏳ pendiente desde 2026-11-20 (revisión visual de modales en `/intranet/admin/cursos` y `/intranet/asistencia`, desktop y móvil; medición del costo del desenfoque). **F8 NO aprobada hasta registrar la medición.**
> **MODO SUGERIDO**: `/investigate` → `/design` → `/execute` → `/validate`.
> **modules**: `ui` (motion, `edu-dialog`).

---

# F11 F7 — Modal piloto: fondo desenfocado, contenido escalonado y hoja inferior en móvil

## PLAN FILE

[`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) — fase F7 (`depends_on: [F1]`). F1-F6 ✅ en `awaiting-prod/` (943-948; F6 commit `f3c29dda`). El plan guarda intención; no seguir rutas o firmas que mencione.

## OBJETIVO

1. `edu-dialog`: el fondo se **desenfoca** al abrir y el contenido interno entra **escalonado** (header → cuerpo → footer).
2. Variante de **hoja inferior en móvil**: el modal sube desde abajo en viewport angosto.
3. Validar en los modales de las **páginas piloto** (`/intranet/admin/cursos`, `/intranet/asistencia`) y **medir el costo del desenfoque** en un móvil modesto antes de aprobar F8.

## MODO SUGERIDO

`/investigate` (cómo abre/cierra hoy `edu-dialog`, qué usa el overlay, si ya hay salida animada; qué modales tienen las páginas piloto) → `/design` (toca 3+ archivos y hay decisión de rendimiento) → `/execute` → `/validate`.

## PRE-WORK OBLIGATORIO

- Leer `src/_motion-expressive.scss` (tokens `--motion-*`, `--ease-spring`, utilidades) y `edu-dialog.ts/.scss/.spec.ts`.
- Leer `reference/dialogs-sync.md` (nunca `edu-dialog` dentro de `@if`) y `reference/eduui.md` (`appendTo`, slots `#header`/`#footer`).
- `styles.scss` ya trae `backdrop-filter: blur(0px)` en ~línea 936 (comentario: "el blur real lo aplicamos al contenido"): entender qué elemento es antes de decidir dónde va el desenfoque.
- 74 templates usan `<edu-dialog>`: la API pública de `edu-dialog` no puede cambiar.

## IMPLEMENTATION DETAIL (ADR-0006)

- **Aún sin tocar**: nada de `dialog/` se modificó en F1-F6. Los detalles concretos se descubren en `/investigate`.
- **Patrón de salida ya usado (F4 fila, F5 toast, F6 acordeón)**: retener el nodo con clase `--leaving` y quitarlo en `animationend` (filtrar `event.target === event.currentTarget`) con timer de respaldo (600 ms); clase base = estado final, keyframes solo con `from`, fill-mode `backwards` (nunca `both`/`forwards`). Ver `edu-ui/lib/accordion/edu-accordion-panel.ts` (más reciente) y `toast/edu-toast.ts`.
- **Tokens**: `--motion-emphasis: 420ms`, `--ease-spring`, `--motion-base/slow/fast`, `--ease-out`. Sin ms ni curvas literales.
- **Reglas de F1**: solo `transform`/`opacity`/color. El desenfoque (`backdrop-filter`) y la hoja inferior son decisiones de `/design`: si `backdrop-filter` se usa, justificar la excepción y medir (el plan lo exige antes de F8).

## APRENDIZAJES TRANSFERIBLES (del chat 948)

- `vi.useFakeTimers()` + `fixture.detectChanges()` + `TestBed.tick()` + `detectChanges()` es el `settle()` de estos specs; jsdom no dispara `animationend`, así que todo spec de salida pasa por el timer de respaldo.
- `window.matchMedia` en tests es `writable` (definido en `src/test-setup.ts`): se asigna directo y se restaura en `finally`; `vi.stubGlobal` falla ("Cannot redefine property").
- Un panel/overlay que se abre por input `value` desde un `effect` del contenedor anima una vez al cargar (primer `sync` ya es "closed"). Si un modal se abre programáticamente al montar, comprobar que no anime de más.
- `grid-template-rows: 0fr ↔ 1fr` animado por keyframes funciona para plegar altura desconocida (precedente: `edu-accordion-panel.scss`).
- `eslint-config-guards.spec.ts` da timeout de 15 s cuando se corre dentro de una suite grande; pasa solo. No es del código.
- Entorno: lint/build no corren con Node v20.19.6. Tests: `cmd.exe /c "npm run test -- <ruta>"` desde PowerShell; typecheck: `cmd.exe /c "node node_modules\typescript\bin\tsc -p tsconfig.app.json --noEmit"`. El navegador automatizado (claude-in-chrome) se congela al capturar pantalla: para ver animaciones hace falta ventana visible o revisión manual.

## REGLAS OBLIGATORIAS

- Tokens y utilidades de F1; fill-mode `backwards`; sin ms ni curvas literales.
- Reduced-motion: el global anula duración; el modal cerrado no debe quedar visible ni bloquear; mantener foco, `role="dialog"`, `aria-modal`, cierre con Esc y trampa de foco intactos. El desenfoque/movimiento no comunica estado por sí solo.
- Copia vendored de `edu-ui` es la fuente única (brief 942). Cap 300 ln por archivo.
- Standalone, OnPush, signals, `inject()`. Código en inglés, UI en español, comentarios en español concisos.
- Compatible hacia atrás: API pública de `edu-dialog` sin cambios (74 usos).

## TESTS MÍNIMOS

- Spec dialog: al cerrar, el contenido se retiene hasta terminar la salida y luego se quita; al abrir, aparece con el rol/atributos accesibles; reabrir durante la salida cancela el retiro.
- Verificación manual en un modal de `/intranet/admin/cursos` y de `/intranet/asistencia`: desenfoque, escalonado, hoja inferior en viewport móvil, `prefers-reduced-motion: reduce`.
- Medición del costo del desenfoque (Performance en móvil de gama baja o con throttling de CPU) anotada en el brief de cierre.

## FUERA DE ALCANCE

- Propagación al resto de modales y decisión sobre el modal hecho a mano (F8), router/slide (F9). Cambiar el diseño visual del modal más allá del fondo y la entrada.

## VALIDACIÓN FINAL

- [ ] Typecheck OK; tests de `edu-dialog` en verde.
- [ ] Done-when del plan: un modal piloto entra con fondo borroso y contenido escalonado; en móvil sube como hoja; reduced-motion deja el estado legible.
- [ ] Costo del desenfoque medido y registrado (insumo para aprobar F8).

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado (fila F11 con F7 ✅).
- [ ] Brief movido a `awaiting-prod/` o `closed/`.
- [ ] Commit final único con código, move del brief y maestro (sin `Co-Authored-By`).

## COMMIT MESSAGE sugerido

```
feat(ui): add blurred backdrop, staggered content and mobile sheet to dialog
```

Inglés, imperativo, ≤ 72 caracteres, sin `Co-Authored-By`.

## CIERRE

Pedir al usuario que abra un modal en `/intranet/admin/cursos` y otro en `/intranet/asistencia` (desktop y viewport móvil), y que confirme si el desenfoque se siente fluido o prefiere atenuarlo; con la medición, decidir si se aprueba F8.

---

## RESULTADO DEL CHAT (2026-11-20)

**Implementado** (archivos reales, más que los `touches` del brief):

- `edu-dialog.ts/.scss`: clase de backdrop `edu-dialog-backdrop`, entrada escalonada header → cuerpo → footer (activada con `[data-open]`, fill `backwards`) y hoja inferior (`matchMedia('(max-width: 600px)')` evaluado al abrir; `bottom('0')`, ancho 100%, `translate` sin resorte). `draggable`/`resizable` se ignoran en la hoja.
- `src/styles.scss`: `.edu-dialog-backdrop { backdrop-filter: blur(var(--edu-dialog-blur, 4px)) }` (global porque CDK crea el backdrop fuera del componente); `prefers-reduced-transparency` lo apaga. Radio fijo: solo se anima la `opacity` del backdrop.
- `overlay/edu-overlay-handle.ts` (compartido con drawer, popover, select, menu, datepicker, autocomplete): **bug corregido**. `open()` retornaba si había una salida en curso, y el `waitForTransition` pendiente borraba el diálogo con `visible()=true`. Ahora `open()` durante la salida descarta el overlay que sale y crea uno nuevo; el retiro pendiente se ignora si `overlayRef` cambió. `backdropClass` acepta `string | string[]`.
- `edu-dialog.spec.ts`: +5 tests (atributos accesibles, retención hasta fin de salida, reapertura durante la salida, hoja vs centrado, clase del backdrop).

**Validación**: typecheck ✅; `edu-ui/lib` 92 tests ✅ (11 en `edu-dialog`). Lint y build no corridos (Node v20.19.6).

**Pendiente (no hecho en este chat)**:

- [ ] Verificación manual: desenfoque, escalonado, hoja en viewport móvil y `prefers-reduced-motion` en un modal de `/intranet/admin/cursos` y otro de `/intranet/asistencia`.
- [ ] Medición del costo del desenfoque (Performance, CPU 4×/6× o móvil modesto). Umbral de "pasa/no pasa" **sin definir por el usuario**. Para atenuar: bajar `--edu-dialog-blur` (0 lo apaga).
- [ ] Probar a mano que reabrir durante la salida no rompe drawer/popover/select/menu/datepicker (cambio en el handle compartido; solo cubierto por los tests existentes).
- [ ] El test de reapertura no se verificó por mutación (que falle sin el arreglo).

## APRENDIZAJES TRANSFERIBLES (chat 949)

- **`cmd.exe /c "..."` desde la herramienta Bash (Git Bash) no ejecuta nada**: abre una consola interactiva y termina con exit 0 o se cuelga. Typecheck y tests solo con la herramienta PowerShell; un "typecheck limpio" desde Bash no significa nada.
- Con `vi.useFakeTimers()`, el retiro tras `waitForTransition` es una promesa: usar `await vi.advanceTimersByTimeAsync(...)`; el síncrono deja el panel en el DOM. jsdom no resuelve la transición del SCSS: se fija `transition-duration` inline en el panel.
- El backdrop de CDK vive fuera del componente: sus estilos van en `styles.scss` (o `ViewEncapsulation.None`, que rompería `:host-context`). `GlobalPositionStrategy` fija `align-items` inline, por eso la hoja se decide en JS (`bottom('0').width('100%')`) y no con CSS.
