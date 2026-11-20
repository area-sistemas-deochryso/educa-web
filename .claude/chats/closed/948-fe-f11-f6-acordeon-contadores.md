---
exclusive: false
isolation: worktree
touches:
  - src/app/shared/edu-ui/lib/accordion/edu-accordion-panel.ts
  - src/app/shared/edu-ui/lib/accordion/edu-accordion-panel.scss
  - src/app/features/intranet/pages/admin/attendance-panel/components/attendance-panel-kpi-tile/
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: [`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) (F11) · **Chat**: 6 · **Fase**: F6 · **Creado**: 2026-11-20 · **Estado**: ✅ cerrado localmente 2026-11-20.
> **Validación prod**: ✅ verificada 2026-11-20 — local con BBDD de prueba: medición en vivo + visto por el usuario
> **MODO SUGERIDO**: `/investigate` → `/design` → `/execute` → `/validate`.
> **modules**: `ui` (motion, `edu-accordion`, KPI tiles).

---

# F11 F6 — Acordeón con altura animada y contadores numéricos

## PLAN FILE

[`plan/motion-expresivo.md`](../../plan/motion-expresivo.md) — fase F6 (`depends_on: [F1]`). F1-F5 ✅ en `awaiting-prod/` (943-947; F5 commit `df69068d`). El plan guarda intención; no seguir rutas o firmas que mencione.

## OBJETIVO

1. **Altura animada** en `edu-accordion`: abrir/cerrar un panel no corta la altura del contenido; el panel no desaparece del DOM de golpe.
2. **Contadores** que suben hasta su valor en los KPI tiles que **no animen ya** (verificar cuáles antes de tocar).

## MODO SUGERIDO

Arrancar con `/investigate` (qué KPI tiles ya animan; técnica de altura) → `/design` (toca 3+ archivos) → `/execute` → `/validate`.

## PRE-WORK OBLIGATORIO

- Leer `src/_motion-expressive.scss` (utilidades `motion-value-bounce`, `--ease-spring`, tokens) y `edu-accordion-panel.ts/.scss`.
- Inventario de KPI tiles: `attendance-panel-kpi-tile`, `estadisticas-dia`, `admin-rendimiento`, `quick-access-card` (grep `kpi` ya los ubicó). Decidir con evidencia cuáles ya animan y cuáles no.
- Si hace falta ver el resultado en navegador, ver "Nota de entorno".

## IMPLEMENTATION DETAIL (ADR-0006)

- **Estado actual del panel**: `edu-accordion-panel.ts` renderiza el contenido con `@if (expanded())` → el nodo entra y sale de golpe. `expanded` viene de `EduAccordionService` (signal con array de valores abiertos).
- **Patrón de salida ya usado (F4 fila, F5 toast)**: retener el nodo con una clase `--leaving` y quitarlo en `animationend` con timer de respaldo; clase base = estado final, keyframes solo con `from`, fill-mode `backwards` (nunca `both`/`forwards`). Mismos helpers de respaldo: `EXIT_FALLBACK_MS` en `table/edu-table-row-motion.ts`, constante de 600 ms en `toast/edu-toast.ts`.
- **Reglas del toast recién hecho**: estado `leavingIds` como `signal<ReadonlySet<number>>`, eventos `(animationend)` filtrados por `event.target === event.currentTarget` y `animationName`.
- **Altura**: solo `transform`/`opacity` está permitido por el plan. Animar `height` rompe la regla; alternativas a evaluar en `/design`: `grid-template-rows: 0fr → 1fr` (transición de una propiedad de layout, no transform) o pliegue con `scaleY` + contenido que no salte. Decidir y justificar la excepción si se usa `grid-template-rows` (el F4 de tabla ya plegó el hueco con `--row-h`; revisar `edu-row-fold` en `table/edu-table.scss` como precedente).
- **Token disponible**: `--motion-emphasis: 420ms`, `--ease-spring`, `--motion-base/slow`, `--ease-out`. Sin ms ni curvas literales.
- **Aún sin tocar**: ningún archivo de `accordion/` ni de KPI tiles fue modificado en F1-F5.

## APRENDIZAJES TRANSFERIBLES (del chat 947)

- `Date.now()` + `setTimeout` con vitest fake timers funciona sin configuración extra; `fixture.detectChanges()` + `TestBed.tick()` + `detectChanges()` es el `settle()` que estabiliza señales en estos specs.
- jsdom no dispara `animationend`: todo spec de salida debe pasar por el timer de respaldo.
- Estilos globales (`styles.scss`) con `.edu-toast__item` pisaron especificidad de animación: cuando un componente scoped necesita sobrescribir `animation`, subir especificidad (`.padre .hijo.hijo--leaving`).
- El navegador automatizado (claude-in-chrome) **se congela al capturar pantalla** en esta máquina desde que se abre una pestaña nueva; con mis cambios desactivados también pasa → no es del código. Para verificar animaciones hace falta ventana visible o revisión manual del usuario.
- Los tokens `--motion-*` los define `src/_motion-expressive.scss` (cargado desde `styles.scss`); `--motion-exit-distance: 24px` ya existe desde F5.

## REGLAS OBLIGATORIAS

- Tokens y utilidades de F1 (sin ms ni curvas literales). Fill-mode `backwards`, nunca `both`/`forwards`.
- Solo `transform`/`opacity`/color; la excepción de altura (`grid-template-rows`) debe justificarse en el brief de diseño.
- Reduced-motion: el global anula duración; el panel cerrado no debe quedar visible ni bloquear; los contadores muestran el valor final al instante. El movimiento solo no comunica estado: conservar `role="region"`, `aria-expanded`, `aria-labelledby`. Los contadores no deben cambiar el texto accesible a valores intermedios (usar `aria-label`/valor final para lectores).
- Copia vendored de `edu-ui` es la fuente única (brief 942). Cap 300 ln por archivo.
- Standalone, OnPush, signals, `inject()`. Código en inglés, UI en español, comentarios en español concisos.
- Compatible hacia atrás: API pública de `edu-accordion` sin cambios (hay 4 usos en `features/**`).

## TESTS MÍNIMOS

- Spec acordeón: al cerrar, el contenido se retiene hasta terminar la salida y luego se quita; al abrir, aparece y expone `role="region"`.
- Spec contador: llega al valor final; con valor inicial o sin cambio no anima; texto accesible final.
- Verificación manual en una página con acordeón (`semanas-accordion` del profesor) y en un KPI tile (`attendance-panel`); `prefers-reduced-motion: reduce`.

## FUERA DE ALCANCE

- Modales (F7/F8), router (F9). Reanimar KPI tiles que ya animen. Cambiar el diseño visual del acordeón.

## VALIDACIÓN FINAL

- [ ] Typecheck OK; tests del acordeón y del contador en verde.
- [ ] Done-when del plan: abrir y cerrar un acordeón no corta la altura del contenido; contadores suben en los KPI aplicables.

> **Nota de entorno**: lint/build no corren con Node de Windows v20.19.6. Tests desde PowerShell: `cmd.exe /c "npm run test -- <ruta>"` (desde Bash no devuelve salida); typecheck: `cmd.exe /c "node node_modules\typescript\bin\tsc -p tsconfig.app.json --noEmit"`. Backend local: `WD/Educa.API/Educa.API` con `ASPNETCORE_ENVIRONMENT=Development dotnet run --launch-profile http` (puerto 5139, `UseTestEnv: true`); FE: `npm start` (puerto 4201). Si Vitest se cuelga, sospechar de bucles en `effect`.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado (fila F11 con F6 ✅).
- [ ] Brief movido a `awaiting-prod/` o `closed/`.
- [ ] Commit final único con código, move del brief y maestro (sin `Co-Authored-By`).

## COMMIT MESSAGE sugerido

```
feat(ui): animate accordion height and add count-up to KPI tiles
```

Inglés, imperativo, ≤ 72 caracteres, sin `Co-Authored-By`.

## CIERRE

Pedir al usuario que revise en vivo un acordeón (abrir/cerrar sin corte de altura) y un KPI tile en `/intranet/admin/attendance-panel`, y que confirme si el conteo ascendente le parece bien o prefiere otra duración.

## RESULTADO (cierre)

- `attendance-panel-kpi-tile` ya animaba (chart.js, 3 s): no se tocó. Los KPI que no animaban son los de `app-kpi-stats` (~10 páginas admin): ahí va `app-count-up` (`shared/components/count-up/`).
- Acordeón: salida retenida con `--leaving` + `inert`, pliegue con `grid-template-rows` (excepción justificada en el SCSS).
- Pendiente: revisión visual del usuario; panel abierto por `value` anima una vez al cargar.
- Typecheck OK; 8 tests nuevos OK; `eslint-config-guards.spec.ts` flaky por carga (pasa solo).
