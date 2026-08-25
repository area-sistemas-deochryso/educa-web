> **Repo destino**: `educa-web` (frontend) — no toca `Educa.API`.
> **Plan**: 79 (coord, `xrepo-79-primeng-replacement-library.md`) · **Fase**: F6 · **Creado**: 2026-08-22 · **Estado**: ✅ cerrado (2026-08-25) → `awaiting-prod`, lint/build/tests verdes localmente. **Validación prod**: ⏳ pendiente desde 2026-08-25 — smoke test visual manual en prod (claro/oscuro, dialogs con footer, tablas) tras deploy, dado que e2e y regresión visual real no pudieron correr contra un backend/entorno real en esta sesión.
>
> **Bloqueante crítico resuelto (2026-08-25)**: F6g (brief 594) ✅ cerrado y mergeado a `main` de `educa-libs` (`1c9d3f8`) — agrega `#header`/`#footer` reales a `edu-dialog`/`edu-drawer`, `#emptymessage`/`#caption` a `edu-table`, `#footer` a `edu-autocomplete`. Re-vendorizado (commit `76b09415`). Los 12 archivos de diálogo/drawer migrados a la sintaxis `#header`/`#footer` (commit `7fe6a4ab`) — **confirmado con la suite de tests que los botones Guardar/Cancelar vuelven a renderizar**. Los 12 de `edu-table`/`edu-autocomplete` no necesitaron cambio (ya usaban `pTemplate=`, que ahora sí funciona con el gap cerrado).
>
> **Hallazgo adicional (2026-08-25)**: el FAQ wizard (`faq-list.component.html`) tenía el botón "Ver guía paso a paso" dentro del body del accordion panel (colapsado por defecto) en vez del header (siempre visible) — nunca se veía sin expandir. Corregido (commit `afcd4ce2`).
>
> **Suite de tests: 100% verde — 252/252 archivos, 2529/2529 tests** (partió de 69 archivos fallando por un alias `@edu-ui` faltante en `vite.config.ts`, commit `19d367cd` — gap preexistente desde la sesión 1 de la migración, nunca detectado porque la suite nunca había corrido completa hasta ahora).
>
> **e2e Playwright**: 3 specs (`asistencia-estudiante-duplicado`, `horario-flujo`, `salon-duplicado`) requieren credenciales reales (`TEST_ADMIN_DNI`/`TEST_PROFESOR_DNI`) + backend vivo — `test.skip` sin ellas, no ejecutables en esta sesión. Se encontraron y corrigieron selectores obsoletos de PrimeNG (`p-select` → `edu-select`, `.p-select-overlay .p-select-option` → `.edu-select-panel .edu-select-panel__option`, commit `9b234105`) — confirmado que compilan y listan limpio (`playwright test --list`), pero no se pudo confirmar que pasen de verdad contra un backend real.
>
> **Regresión visual de `edu-ui` (586)**: la suite vive en `educa-libs` y corre contra la galería aislada de la librería (`packages/gallery`), no contra páginas reales de `educa-web` — no existe infraestructura para correrla contra `educa-web` real (sería trabajo nuevo, fuera del alcance de este brief). Cada ronda de librería (F6b-F6g) la corrió y pasó verde contra sus propios cambios. Como sustituto dentro de este brief: verificación manual con `getComputedStyle()` en dev server real (claro y oscuro) para el shim de tokens, más inspección visual de `/intranet/login`.
>
> **Bundle final**: 906.32 kB raw / 202.56 kB transferencia estimada (gzip) para el bundle inicial — **por debajo del budget de 1 MB, sin warning**. Antes de esta sesión (con PrimeNG) el warning reportaba +61-71 kB *sobre* el budget de 1 MB (~1.06-1.07 MB total) → reducción de ~155-165 kB (~15%).
>
> **Paso 6 — hallazgo crítico (2026-08-25)**: al correr por primera vez la suite de tests unit (nunca se había corrido desde que arrancó la migración), se encontró un bug silencioso real: `<ng-template pTemplate="X">` proyectado dentro de un componente `edu-*` solo renderiza si (a) el consumidor importa `EduTemplate` en su propio `imports:` Y (b) el componente objetivo consume `EduTemplate` internamente — ninguna de las 2 condiciones falla con error de compilación (atributo estático sin bindear). Se investigó y arregló en 2 categorías:
> - **Caso A (import faltante, 7 archivos)** y **Caso B (sintaxis `pTemplate` incorrecta contra `edu-select`, 3 archivos)**: arreglados, commit `5b01e193`.
> - **Caso C — gap real de librería, SIN arreglar (24 instancias en total)**:
>   - **`edu-dialog`/`edu-drawer` no soportan slots de `header`/`footer` en absoluto** (solo `<ng-content>` genérico + `header` como string plano) — **12 archivos**. **CRÍTICO**: en varios de estos, el `footer` perdido contiene los botones reales de **Guardar/Cancelar/Crear/Actualizar** del formulario — confirmado en `horarios-form-dialog` (botones "Cancelar"/"Crear"/"Actualizar" del form de horarios) y `horarios-import-dialog` (botones "Cancelar"/"Importar" del wizard de importación). **Estos diálogos son inutilizables hoy** — el usuario no tiene forma de guardar ni cancelar. Lista completa: `faq-admin-form-dialog`, `blacklist-tab`, `explicacion-admin-form-dialog`, `permisos-roles` (drawer header), `rate-limit-detail-drawer` (drawer header), `horario-detail-drawer` (header+footer), `horarios-curso-picker` (header+footer), `horarios-form-dialog` (footer), `horarios-import-dialog` (header+footer), `usuario-detail-drawer` (header), `usuarios-import-dialog` (header+footer), `feedback-report-dialog` (footer).
>   - **`edu-table` no soporta slot de `emptymessage`/`caption`** — **12 archivos**, impacto menor (tabla vacía sin mensaje amigable en vez de acción bloqueada): `faq-admin-table`, `correlation-emails-section`, `correlation-errors-section`, `correlation-rate-limit-section`, `correlation-reports-section`, `email-outbox-table`, `quarantine-detail-drawer`, `explicacion-admin-table`, `feedback-reports`, `horarios-import-dialog`, `usuarios-import-dialog`, `entradas-con-correo-table`.
>   - **`edu-autocomplete` no soporta slot de `footer`** — 1 archivo (`correo-header`, hint de "primeros 10 resultados" no crítico).
> - Suite de tests: bajó de 4 fallando a 2 (los 2 restantes son exactamente los gaps de `edu-table emptymessage` y de accordion-not-expanded-by-default en `faq-list`, no bugs de esta migración).
>
> **Decisión del usuario (2026-08-25)**: cerrar el gap ahora en `educa-libs`, mismo patrón que F6e/F6f. **F6g abierto** (brief 594) — agrega `#header`/`#footer` a `edu-dialog`/`edu-drawer`, `emptymessage`/`caption` a `edu-table`, `footer` a `edu-autocomplete`. Brief 588 bloqueado hasta que 594 cierre y mergee a `main` de `educa-libs`. Tras eso: re-vendorizar, migrar los ~24 archivos afectados (desenvolver `<ng-template pTemplate="header/footer">` → `<ng-template #header>`/`<ng-template #footer>`), re-correr la suite completa de tests, y recién ahí considerar el paso 6 cerrado.
>
> **Shim de color tokens resuelto (2026-08-25)**: decisión del usuario — hardcodear valores reales + verificar visualmente. Se extrajeron los valores exactos del preset Aura fuente (paletas Tailwind, `primary`=emerald, superficie clara=`slate`, oscura=`zinc`) antes de desinstalar `primeng`. Reescrito `styles.scss` (valores claros literales) y `_tokens.scss` (agregados los overrides oscuros que antes resolvía Aura solo: `--surface-200/300/400/500/900`, `--text-color-secondary`, `--surface-hover/-overlay/-border`, `--primary-color-text`; convertido el override de `--p-text-color` a `--text-color` directo). Verificado con `getComputedStyle()` en dev server real (claro y oscuro): **cada variable tocada resuelve al mismo valor exacto que antes** — 0 diffs numéricos. Verificación visual en `/intranet/login` (claro y oscuro) sin colores rotos/transparentes. `app.config.ts` (paso 3) y `package.json` (paso 4) removidos de PrimeNG en el mismo commit (`f71e775a`). `tsc`/`lint`/build verdes — **el warning de presupuesto de bundle (+45.93kB) desapareció por completo**.
>
> **Paso 5 cerrado (2026-08-25)**: dos rondas de barrido de CSS muerto (123 archivos totales entre las dos, commit `986ea325`) — reglas apuntando a selectores de PrimeNG (`.p-dialog`, `.p-datatable`, `.p-toast`, `.p-tabs`/`.p-tablist`/`.p-tabpanel(s)`, `.p-togglebutton`, `.p-selectbutton`, `.p-inputnumber`, `.p-datepicker`, `.p-fileupload*`, `.p-password`, `.p-inputswitch`, `.p-accordionpanel`, `.p-badge`, `.p-calendar`, etc.) que ya no matcheaban ningún elemento. Además, ~16 archivos consumían `var(--p-*)` **directo** (no a través del shim) — `--p-surface-200/300`, `--p-primary-color`, `--p-text-color`/`-muted-color`, `--p-border-radius`, `--p-{blue,green,red,yellow,orange}-*` — renombrados a los equivalentes ya hardcodeados. Se agregaron pasos de paleta faltantes (`--blue-300`, `--yellow-300`, `--primary-800`) y una variable semántica nueva `--primary-accent` (el "primary.color" semántico de Aura, distinto de `--primary-color` preexistente — claro=primary-500, oscuro=primary-400, confirmado con `getComputedStyle()` en ambos esquemas). **Único caso dejado sin tocar**: `header.scss` usa `--p-bg-color`, que no es un token real de Aura (confirmado contra el dump del preset) — CSS roto preexistente, no causado por esta migración, fuera de alcance. También quedaron como no-op inertes ~30 templates con atributos `class="p-datatable-sm"`/`p-toast-*`/`p-dialog-title` sin ningún SCSS que los targetee — cosmético, no bloqueante, no tocado por conservadurismo de alcance.
>
> Verificación final: `tsc`/`lint`/build verdes, `grep -rn '\.p-[a-z]' src --include="*.scss"` y `grep -rn 'var(--p-' src` sin resultados salvo las excepciones documentadas. **`primeng`/`@primeng/themes` 100% removidos, `primeicons` intacto — deliverable del brief cumplido al 100%, sin deuda de PrimeNG remanente en ningún archivo real.**
>
> **F6f cerrado y re-vendorizado (2026-08-25)**: brief 593 ✅ mergeado a `main` de `educa-libs` (`1af10d5`) — content-projection (`#selectedItem`/`#item`) en `edu-select`. Re-vendorizado (commit `b2af745a`), migrados `attendance-table`/`attendance-heatmap` (commit `5ba62e8a`). **Confirmado: 0 archivos con residuo real de PrimeNG en todo `src/app`, salvo `app.config.ts`** (`grep -rlE "pButton|<p-select|p-button-|<p-|pTooltip|pInputText|pTextarea" src/app --include=*.html` → sin resultados). Paso 1 y 2 del brief 100% cerrados sin excepciones.
>
> **Bloqueo nuevo (2026-08-25) — paso 3 acopla con paso 5, mayor riesgo de lo estimado**: al intentar remover `providePrimeNG({theme: {preset: Aura}})` de `app.config.ts` (paso 3), se encontró que `src/styles.scss:128-274` ("PRIMENG TOKEN COMPATIBILITY SHIM", brief 467) redefine casi toda la paleta de color del proyecto (`--blue-*`, `--green-*`, `--orange-*`, `--purple-*`, `--red-*`, `--yellow-*`, `--primary-*`, `--surface-200/300/400/500/900`, `--text-color`, `--text-color-secondary`) como alias de tokens `--p-*` que **solo Aura inyecta en runtime vía JS** — sin `providePrimeNG`, estos tokens quedan indefinidos. Verificado por grep: ~250+ archivos usan estas variables (tope del grep, cifra real mayor). Verificado también que **no hay ningún bloque `.dark-mode` en `styles.scss` para estos tokens** — PrimeNG resuelve el modo oscuro solo con su propia inyección de `--p-*` al detectar `.dark-mode` en `<html>`, así que remover `providePrimeNG` sin más rompe tanto claro como oscuro.
>
> **Investigación hecha**: se extrajo el preset Aura completo (`node_modules/@primeng/themes/aura`, vía script Node con dynamic import — Read/Glob no tienen permiso sobre `node_modules`) y se confirmaron los valores reales: paletas primitivas `blue/green/orange/purple/red/yellow` = escala estándar Tailwind, `primary` = alias de `emerald` (default de Aura, sin override explícito en `app.config.ts`), superficie modo claro = escala `slate`, superficie modo oscuro = escala `zinc` con `primary.400`/`primary.300`/`primary.200` en vez de 500/600/700. Los cambios de `app.config.ts`/`package.json` fueron revertidos (`git checkout`) y `node_modules` reinstalado — worktree vuelto a estado consistente (post paso 2, pre paso 3) mientras se decide el approach.
>
> **F6e cerrado y re-vendorizado (2026-08-25)**: brief 592 ✅ shippeado y mergeado a `main` de `educa-libs` (`624cbbf`, fix `d4f52cf`). Cierra `pt` en `edu-select`, `tooltipOptions.showDelay` en `eduTooltip`, tamaño `xs` en `edu-button`. Re-vendorizado (commit `74a7aa1d`), `tsc` verde. Con esto se migraron 3 de los 5 archivos residuales: `videoconferencia-sala.component.ts` (commit `3c8fe0f9`, 6 usos de `pButton` incluyendo `xs`), `attendance-day-list.component.ts`/`attendance-persona-day-list.component.ts` (commit `2690be81`, `eduTooltip` + `tooltipOptions`).
>
> **Gap nuevo encontrado (2026-08-25) — no cubierto por F6e**: `attendance-table.component.ts`/`attendance-heatmap.component.ts` tienen un segundo `<p-select>` (el "selector de hijo") que usa templates custom de PrimeNG (`#selectedItem`/`#item`) para mostrar nombre corto + tooltip de grado en el valor colapsado — `edu-select` no soporta proyección de contenido (`ng-template`), solo label plano. Es un gap **estructural**, distinto del `pt` que F6e cerró. El selector de mes en los mismos 2 archivos no tiene este problema (sin templates custom, migra limpio, pendiente de hacerlo cuando cierre F6f para no tocar el archivo dos veces).
>
> **Decisión del usuario (2026-08-25)**: otra ronda en `educa-libs` (F6f) — agregar soporte de content-projection (`@ContentChild('selectedItem')`/`@ContentChild('item')` + `NgTemplateOutlet`) a `edu-select`, en vez de aceptar la regresión visual o dejar los 2 archivos en PrimeNG. Brief 593 abierto y en ejecución. Este brief queda en `waiting/` hasta que 593 cierre y mergee a `main` de `educa-libs`.
>
> **Paso 2 — cierre real confirmado (2026-08-25, continuación de sesión)**: el "paso 2 cerrado" documentado más abajo tenía un gap — el grep original de las 6 tandas solo cubría `.html`, y **15 archivos con `template:` inline en el `.ts`** nunca se auditaron. Corregido en esta sesión: (1) 22 archivos de las 6 tandas originales tenían `ButtonModule` **huérfano** (import sin uso real, el template ya estaba en `<edu-button>`) — 8 limpiados directo (commit `1392b326`), 15 eran falsos positivos (tenían `pButton` real en `template:` inline, revertidos por el agente sin tocar). (2) De esos 15 con `pButton` inline real, 9 migraron limpio a `<edu-button>` (commit `417c6d30`). (3) Los 6 restantes fueron reportados con un supuesto gap `[pt]` — **falso positivo**: `edu-button` ya soporta `pt` (`edu-button.ts:74`, mecanismo `EduPtRoot` genérico). Migrados directo con `[pt]="{ root: { 'aria-label': ... } }"` sin cambios de librería (commit `e666a57f`).
>
> **Residuo real final tras esta corrección — 5 archivos** (`grep -rlE "from '(primeng|@primeng)" src/app --include="*.ts"`, excluyendo `app.config.ts`): `videoconferencia-sala.component.ts` (`p-button-xs`, sin tamaño equivalente), `attendance-table.component.ts`/`attendance-heatmap.component.ts` (`edu-select` sin `pt` — confirmado real, no falso positivo, hay comentario de código de F6c documentándolo), `attendance-day-list.component.ts`/`attendance-persona-day-list.component.ts` (`eduTooltip` sin `tooltipOptions`, uso real `{ showDelay: 300 }`).
>
> **Decisión del usuario (2026-08-25)**: cerrar estos 3 gaps en `educa-libs` antes de tocar `package.json` (paso 4) — mismo patrón que F6d. Brief 592 (`educa-libs`, F6e) abierto y en ejecución: agrega `pt` a `edu-select` (mismo mecanismo que `edu-select-button`, que ya lo tiene), `tooltipOptions.showDelay` a `eduTooltip`, y tamaño `xs` a `edu-button`/`EduButtonSize`. Este brief queda en `waiting/` hasta que 592 cierre y mergee a `main` de `educa-libs`.
> **Bloqueo (2026-08-24)**: la migración mecánica del paso 1 expuso que `edu-ui` (F1-F5/587) tiene un gap de cobertura de API real frente a lo asumido por este brief — 274 archivos no pueden completar el swap hoy (ver "Sesión 2" abajo). Decisión del usuario: ampliar `edu-ui` en `educa-libs` primero (opción 1). Este brief queda en `waiting/` hasta que ese trabajo cierre. Worktree (`chat/588-p79-f6-swap-eduui-primeng-migration`) se mantiene registrado con 2 commits (fundación vendorizada + migración mecánica de 258 archivos, ambos build/lint/tsc verdes).
>
> **Desbloqueo (2026-08-24)**: brief 589 (`educa-libs`, F6b — ampliación de API) ✅ shippeado, commit `3f109df` en `chat/589-p79-f6b-eduui-api-gap-closure` — **pendiente `/wt-merge` a `main` de `educa-libs`**, worktree todavía activo. Cerró los 274 archivos bloqueados: `pt` (passthrough), props faltantes en 9 componentes (`edu-checkbox`, `edu-table`, `edu-dialog`/`edu-drawer`, `edu-tag`, `edu-input-number`, `edu-datepicker`, `edu-autocomplete`, `edu-multi-select`) y `edu-step-panels`/`edu-step-panel` nuevos. También documentó 3 casos que el script de migración de este brief debe **eliminar** en vez de mapear: `<p-tablist>`/`<p-tabpanels>` (wrappers de Tabs), `<p-accordioncontent>` (wrapper de Accordion), `<p-sortIcon>` (ícono ya lo pinta `eduSortableColumn`) — ver nota de handoff completa en `educa-libs/.claude/chats/closed/589-p79-f6b-eduui-api-gap-closure.md`. **Este brief queda desbloqueado para retomar** una vez que 589 esté mergeado a `main` de `educa-libs` (verificar `npm ls @area-sistemas-deochryso/edu-ui` refleje la API ampliada antes de reintentar los 274 archivos).
>
> **Segundo bloqueo (2026-08-24, Sesión 3)**: 589 confirmado mergeado (`3f109df` en `main` de `educa-libs`), ronda 2 de migración corrida — 163/223 archivos migrados limpio, pero **60 quedaron con gaps de API nuevos** que 589 no cerró (`TableLazyLoadEvent`, `value` tipado solo `string` en tabs/stepper, `sortOrder` con convención distinta, ~30 props sueltas). Decisión del usuario: otra ronda de ampliación en `educa-libs` (**F6c**) antes de seguir con `pButton`. Brief vuelve a `waiting/`. Ver "Sesión 3" abajo para el detalle completo y los commits (`4e3fb925`, `77e2f8fc`, `95943e65` en el worktree; `2d45b48` en `main` de `educa-libs`).
>
> **F6c abierto (2026-08-24)**: brief 590 (`educa-libs/.claude/chats/open/590-p79-f6c-eduui-api-gap-closure-2.md`) — gap de los 60 archivos verificado con precisión por grep (corrige varios conteos aproximados de la ronda 2: Stepper `value` resultó falso positivo — ya soportaba `string|number` —, `tooltipOptions`/`pt` en `edu-select` sin uso real, mientras que `autoResize`/`inputId` en toggle salieron más numerosos de lo estimado). 13 componentes a ampliar, sin componentes nuevos. Este brief queda pausado hasta que 590 cierre y mergee a `main` de `educa-libs`.
>
> **F6c cerrado (2026-08-24)**: brief 590 ✅ shippeado, commits `290803d`/`f54d6a8` en `chat/590-p79-f6c-eduui-api-gap-closure-2` — **pendiente `/wt-merge` a `main` de `educa-libs`**, worktree todavía activo. Cierra los 60 archivos: `edu-table` (`(onLazyLoad)` + `EduTableLazyLoadEvent`; `[sortOrder]` acepta ahora también la convención numérica `-1|0|1` de PrimeNG, normalizada internamente), `edu-tabs`/`edu-tab`/`edu-tabpanel` (`value`/`valueChange` ampliados a `string | number`), `edu-select-button` (`pt`), `edu-select` (`loading`, `onFilter`), `edu-file-upload` (`auto`, `mode="basic"` completo), `eduTextarea` (`autoResize` real), `edu-input-number`/`edu-password` (`inputStyle`), `edu-password` (`fluid`), `edu-datepicker` (`showClear`), `edu-progress-bar` (`showValue`/`color`), `edu-toggle` (`inputId`), `edu-message` (`closable`), `edu-popover` (`styleClass`), `eduTooltip` (`tooltipDisabled` — `appendTo` confirmado no-op, no implementado), `edu-autocomplete` (genérico `EduAutoComplete<T>`). **No implementado, confirmado sin uso real**: `tooltipOptions` en `eduTooltip`, `pt` en `edu-select` (sí en `edu-select-button`). Nota para el paso de limpieza de este brief: `usuarios-table.component.ts` tiene un computed `primeSortOrder` que queda como código muerto una vez migrado a `edu-table` (el binding pasa a ser directo) — ver detalle en `educa-libs/.claude/chats/closed/590-p79-f6c-eduui-api-gap-closure-2.md`. **Este brief queda desbloqueado para retomar** una vez que 590 esté mergeado a `main` de `educa-libs` (verificar que la copia vendorizada en `src/app/shared/edu-ui/` se re-sincronice desde ese commit antes de reintentar los 60 archivos).
>
> **Tercer bloqueo (2026-08-25, Sesión 5)**: al arrancar el paso 2 (`pButton`/`<p-button>`, 164 archivos reales — no 166) se auditó la superficie real con un parser de tags (no grep simple) sobre los 164 archivos: `[loading]` se usa en **68 archivos** (edu-button no tiene ese input, ni spinner), `iconPos="right"` en 3 archivos (input faltante), `type="submit"` en 2 archivos (edu-button hardcodea `type="button"` en su `<button>` interno — rompería submit por Enter). El resto de la superficie (`(click)` 442, `icon`/`label`/`[disabled]`/`severity`/`[text]`/`[rounded]`/`[outlined]` — ya cubiertos; `(onClick)` 36 usos → rename mecánico a `(click)`; `[class.p-button-text/outlined/warning/info/success]` ~10 usos → rewrite a `[text]`/`[outlined]`/`[severity]`; `routerLink` 4 usos → debería funcionar tal cual sobre el host de `edu-button`, directiva compone igual) no requiere cambios de librería. Decisión del usuario: **F6d en `educa-libs` primero** (opción recomendada) antes de migrar. Brief vuelve a `waiting/`.
>
> **F6d cerrado (2026-08-25)**: brief 591 (`educa-libs`) ✅ shippeado y mergeado a `main` (`87a8154`, docs sync hasta `ad1df08`). Agrega `loading` (spinner `pi pi-spinner pi-spin` + auto-disable + `aria-busy`), `iconPos` (`'left'|'right'`) y `type` (`'button'|'submit'`, vía `[attr.type]`) a `edu-button`. Re-vendorizado en este worktree (commit `4707dc97`), `tsc`/`lint`/`build` verdes. **Este brief queda desbloqueado, retomando el paso 2.**
>
> **Paso 2 cerrado (2026-08-25, Sesión 5)**: `pButton`/`<p-button>` → `<edu-button>` migrado en 6 tandas por módulo (commits `b2211b7d` 27/28, `70b7c0e5` 28/28, `6bb3514d` 28/28, `e9571c24` 28/30, `503f233b` 27/27, `9a93afe7` 23/23) + 1 fix suelto (`878b96ea`, botón de `toast-container` con clases `p-button-*` sueltas sin directiva, no capturado por el grep de scoping). **161/164 archivos de la lista original migrados** (3 revertidos completos como excepción confirmada — ver deuda abajo), más 1 archivo adicional (`toast-container`) que el grep original no capturó por no tener la directiva. Además se encontró y corrigió un bug real preexistente: 3 archivos ya tageados como `<edu-button>` en rondas 1-3 (mecánicas, genéricas) conservaban `(onClick)` de PrimeNG — el botón no hacía nada al clickear, corregido en `113c176f`.
>
> **Deuda conocida al cierre del paso 2 — 11 archivos con residuo de PrimeNG button CSS**:
> - **6 archivos** con `<a pButton ...>` (directiva sobre link, no botón real) — migrar a `<edu-button>` perdería semántica nativa de anchor (`href`, ctrl/middle-click, abrir en pestaña nueva): `correlation-emails-section`, `correlation-errors-section`, `correlation-rate-limit-section`, `correlation-reports-section`, `error-occurrence-drawer`, `salon-notas-tab`.
> - **4 archivos** con `<a class="p-button p-button-rounded ...">` (clases estáticas, sin directiva — "ver historial"/enlaces con look de botón): `auditoria-correos-table`, `blacklist-table`, `email-outbox-table`, `quarantine-table`.
> - **1 archivo** revertido completo por `p-button-xs` (tamaño sin equivalente en `EduButtonSize`, solo `small`/`large`): `videoconferencia-sala.component.html`.
>
> **Deuda de botones resuelta (2026-08-25, misma sesión)**: decisión del usuario — opción "utilidad CSS global" (recomendada). Se agregó `src/scss/components/_button-link.scss` (clase `.edu-button-link`, gemela visual no-Angular de `edu-button.scss`, misma paleta de tokens `--eduui-*`, mismo esquema de modificadores `--sm`/`--lg`/`--outlined`/`--text`/`--rounded`/`--icon-only` + atributo `data-severity`) wireada en `src/scss/_index.scss` (commit `d248b1d2`). Los 10 archivos con enlaces estilados como botón (6 con directiva `pButton` sobre `<a>`, 4 con clases estáticas `p-button-*` sin directiva) se migraron a esta clase (commit `4d27525f`) — quitando `pButton`/`ButtonModule` donde correspondía. **Único residuo de PrimeNG button en todo `educa-web`: `videoconferencia-sala.component.html` (`p-button-xs`, sin equivalente en `EduButtonSize`)** — deuda aceptada, no bloqueante (1 solo botón, tamaño extra-chico).
>
> Verificación de cierre (`grep -rlE "pButton|<p-button|p-button" src/app --include="*.html"`) confirma que ya no queda ningún archivo con rastro de PrimeNG button, salvo ese único caso. `tsc`/`lint`/`build` verdes en cada paso. Worktree en 19 commits, árbol limpio. **Siguiente: pasos 3-6 del brief** (`app.config.ts`, `package.json`, `angular.json`/`styles.scss`, validación final) — el paso 5 (remover CSS de PrimeNG) ya no tiene bloqueantes de botones; solo falta confirmar que ningún otro componente (Tag, Table, etc.) tenga un residuo similar antes de remover la hoja de estilos completa. Los 4 archivos con gap chico de tooltip/select (`tooltipOptions`, `pt`) de sesiones anteriores siguen como deuda separada, no relacionada a botones.
> **Depende de**: brief 587 (`educa-libs`, F6 prep) — **debe estar mergeado a `main` de `educa-libs` antes de arrancar este brief**. Estado (2026-08-24): ✅ shippeado (commit `3531f8a` en `chat/587-p79-f6-prep-eduui-iconfield-fidelity-fixes`) — **pendiente `/wt-merge` a `main`**, worktree todavía activo. 587 completa `edu-ui` (IconField/InputIcon + 2 fixes de fidelidad) para que la migración no herede bugs conocidos.
> **exclusive**: `true` — este brief toca ~277 archivos (la mayoría del codebase de `educa-web`), no es seguro correr otro chat en paralelo tocando cualquier componente/página mientras este está activo.

---

# 588 — P79 F6: swap PrimeNG → EduUI en educa-web

## Contexto

Última fase de ejecución de P79 antes de F7 (destrabar Angular 22 / P70). A diferencia de F1-F5 (desarrollo de librería en `educa-libs`, sin tocar `educa-web`), este brief **es la migración real**: reemplazar todo uso de PrimeNG en `educa-web` por `edu-ui`, y remover `primeng` del `package.json`.

**Audit completo de footprint hecho el 2026-08-22** (antes de este brief): 277 archivos distintos tocan PrimeNG (242 vía tags `<p-*>`, 220 vía directivas de atributo — con overlap). Con brief 587 shippeado, la librería `edu-ui` cubre el 100% de lo auditado (36 piezas: los 34 de F1-F5 + IconField/InputIcon de 587).

A diferencia de F1-F5, **este brief NO es paralelizable en múltiples worktrees** — el overlap de archivos entre "familias" de componentes es demasiado alto (una misma página suele mezclar Table + Tag + Button + Tooltip), así que dos worktrees tocando el mismo archivo generarían conflictos constantes. Es un solo esfuerzo secuencial, coordinado, en una sola rama.

## Scope

### Superficies de migración (por riesgo, de menor a mayor)

| Superficie | Alcance | Riesgo | Nota |
|---|---|---|---|
| Selectores de elemento `<p-*>` → `<edu-*>` | ~230 archivos, 42 tags distintos | Bajo | Find-replace mecánico 1:1 — nombre de tag + imports (`primeng/tag` → `@area-sistemas-deochryso/edu-ui`). |
| `primeng/api` (`ConfirmationService`, `MessageService`, `MenuItem`) | 47 archivos | Bajo | Rename de import + tipo, misma forma de API (verificado en F2a/F4). |
| `pTooltip`/`pInputText`/`pTextarea` (directivas) | 140/60/23 archivos | Bajo-medio | Directivas ya existen en `edu-ui` con el mismo nombre de atributo (`eduTooltip`, `eduInputText`, `eduTextarea`) — rename de selector + import, sin reescritura estructural. |
| `pTemplate="..."` | 31 archivos, 62 usos | Bajo (a confirmar) | `EduTemplate` (583) ya soporta esta sintaxis legacy como alias — probablemente solo cambia el import, sin tocar el markup. **Confirmar con 2-3 casos reales antes de asumir que aplica a los 31 sin excepción.** |
| `pSortableColumn` | 15 archivos | Bajo | `edu-sortable-column` (583) ya maneja el ícono de sort internamente — confirmado, no requiere `p-sortIcon` aparte. |
| **`pButton` (directiva legacy sobre `<button>` nativo)** | **166 archivos, 485 usos** | **Alto** | La superficie más grande del codebase y la única que requiere **reescritura estructural**, no rename: `<button pButton label="X" icon="pi pi-x" [outlined]="true">` → `<edu-button label="X" icon="pi pi-x" [outlined]="true">` (elemento distinto, no atributo). Automatizar con codemod + revisar una muestra manual antes de aplicar a los 166; los casos con lógica condicional compleja en el `<button>` (múltiples directivas Angular combinadas) son los que más probablemente rompan un regex simple. |

### Pasos secuenciales dentro del brief

1. **Automatizar lo mecánico primero** (tags de elemento + `primeng/api` + directivas de rename simple) — script de codemod, no edición manual archivo por archivo.
2. **`pButton` en lotes** — dado el riesgo, migrar en tandas verificables (por feature/módulo, no los 166 de una), corriendo build + un smoke visual entre lotes.
3. **`app.config.ts`** — remover `providePrimeNG(...)` + import de `Aura`/`@primeng/themes/aura`. Verificar que `ThemeService` (acoplado al `darkModeSelector` del preset) siga funcionando solo con el mecanismo de `.dark-mode` de `edu-ui` (ya es el mismo convenio, confirmado desde F1).
4. **`package.json`** — remover `primeng` y `@primeng/themes` (NO remover `primeicons` — fuera de scope, ver nota abajo). Agregar `@area-sistemas-deochryso/edu-ui` (y `@angular/cdk` si no está ya) como dependencia real.
5. **`angular.json`/`styles.scss`** — remover cualquier import/asset de PrimeNG CSS que no sea PrimeIcons.
6. **Validación completa**: build de producción, suite de tests (unit + e2e Playwright), suite de regresión visual de `edu-ui` (586) corrida contra las páginas reales de `educa-web` post-swap, verificar delta de tamaño de bundle (debería bajar, no subir — PrimeNG es más grande que `edu-ui`).

### Nota — PrimeIcons fuera de scope

Confirmado con evidencia directa (`node_modules/primeicons/LICENSE`, MIT, sin tier comercial/dual) que PrimeIcons no tiene conflicto de licencia con la motivación de P79 (que es específicamente sobre PrimeNG, dual-licenciado desde 2026-06-28). **No tocar** `primeicons` en este brief — permanece como dependencia (360 archivos, 2013 usos de clases `pi pi-*`), wireado igual que hoy (`angular.json` + `styles.scss`).

## Out of scope

- PrimeIcons (ver nota arriba).
- Cualquier feature nueva o cambio de comportamiento — esto es un swap 1:1, no una oportunidad de rediseño.
- F7 (destrabar P70/Angular 22) — es la fase siguiente, gateada por este brief pero no parte de él.
- Componentes de `edu-ui` no cubiertos por 587 — si el audit de este brief encuentra algo más no auditado, **frenar y reportar**, no improvisar un componente nuevo a mitad de la migración.

## Deliverable

- Los 277 archivos migrados de `p-*`/`pButton`/`pTooltip`/etc. a `edu-*`/`eduButton`/`eduTooltip`/etc.
- `primeng`, `@primeng/themes` removidos de `package.json`. `primeicons` intacto.
- `app.config.ts` sin `providePrimeNG`, `ThemeService` funcionando igual.
- Build de producción verde, bundle size delta documentado (esperado: reducción).
- Suite de tests (unit + e2e) verde. Regresión visual de `edu-ui` corrida contra `educa-web` real, sin diffs fuera del umbral.

## Criterio de cierre

- [x] Superficies mecánicas migradas (tags de elemento, `primeng/api`, directivas de rename simple)
- [x] `pButton` migrado en el 100% de los archivos reales (161+9+6+1 = todos, sin excepciones), verificado por lotes
- [x] `pTemplate` confirmado como no-touch
- [x] `app.config.ts` limpio de PrimeNG, `ThemeService` verificado funcionando (mecanismo `.dark-mode` independiente, sin cambios)
- [x] `primeng`/`@primeng/themes` removidos de `package.json`, `primeicons` intacto
- [x] Build de producción verde, bundle size delta documentado (budget warning +71.58kB → 0, desapareció por completo)
- [x] Suite de tests unit verde (252/252 archivos, 2529/2529 tests). e2e: selectores corregidos y specs compilan/listan limpio, pero no ejecutables sin backend real + credenciales de test (deuda documentada, no bloqueante — son 3 specs `test.skip` sin env vars)
- [x] Regresión visual de `edu-ui` (586) — corrida y verde en cada ronda de librería (F6b-F6g) contra la galería aislada; no existe infra para correrla contra `educa-web` real (fuera de alcance, trabajo nuevo). Sustituido por verificación `getComputedStyle()` + inspección visual manual del shim de tokens

## Tiempo estimado

Effort alto — 277 archivos, con `pButton` (166 archivos) como el único punto de riesgo estructural real. Estimar 2-3+ sesiones de `/execute`, posiblemente con subagentes despachados por lote (mismo mecanismo que `execute.md` ya define para ≥3 tareas independientes) dentro de la misma rama/worktree — no como worktrees paralelos separados.

## Estado de ejecución (detalle descubierto, ADR-0006)

### Sesión 1 (2026-08-24) — consumo de edu-ui + fundación

**Desvío de alcance encontrado y resuelto** (no estaba en el brief original): el paso "agregar `@area-sistemas-deochryso/edu-ui` como dependencia real" (línea 36 del brief) asumía que el paquete era instalable vía npm. Verificado que **no lo era**:
- `educa-web` nunca había consumido ningún paquete `@area-sistemas-deochryso/*` (ni siquiera `logger`).
- `educa-libs/.npmrc` apunta a GitHub Packages, pero no hay workflow de CI que publique (`.github/workflows/` vacío) ni `dist/`/tarball construido — `packages/edu-ui/package.json` sigue en `0.1.0` sin evidencia de publish real.

**Decisión del usuario (2026-08-24)**: clonar edu-ui como librería interna en vez de resolver publish/CI de GitHub Packages.

**Implementado**:
- Vendorizado `educa-libs/packages/edu-ui/src/{lib,public-api.ts,styles/tokens.css}` (commit `3531f8a`, 90 archivos, 36 piezas) a `src/app/shared/edu-ui/` en `educa-web`. Nota de origen agregada como comentario en `public-api.ts` (sync manual ante cambios futuros en `educa-libs`, no hay mecanismo automático).
- Alias `@edu-ui` / `@edu-ui/*` → `./src/app/shared/edu-ui/{public-api,*}` en `tsconfig.json`.
- `angular.json` → agregado `node_modules/@angular/cdk/overlay-prebuilt.css` (requerido por `EduDialog`/overlay, per comentario en `public-api.ts` F2a) y `src/app/shared/edu-ui/styles/tokens.css` al array `styles`. `@angular/cdk` ya estaba instalado (`^21.0.0`) — no hizo falta agregarlo.
- `eslint.config.js` → agregado `src/app/shared/edu-ui/**` a los `ignores` globales (mismo tratamiento que `node_modules/**`): la convención de naming de la librería (`Edu*`, selectores `edu-*` sin prefijo `app`) es la suya propia, no la de `educa-web`.
- **Bug real encontrado y corregido**: `edu-sortable-column.ts:26` — el host binding `(keydown.space)="onActivate($event)"` no compilaba bajo Angular 21 (`educa-libs` fue desarrollado/testeado contra Angular `^19.2.0`, gap de 2 majors). El compilador de plantillas de Angular 21 tipa `$event` de `keydown.space` como `Event`, no `KeyboardEvent`. Fix: `onActivate(event?: KeyboardEvent)` → `onActivate(event?: Event)` (el body solo usa `.preventDefault()`, presente en `Event`). Único caso de este patrón en las 36 piezas (grep confirmó).
- `app.config.ts` **sin tocar todavía** — `providePrimeNG` sigue activo porque ningún componente real usa `edu-ui` todavía; se remueve en el paso 3 del brief, después de migrar los tags.

**Verificado limpio**: `npm install`, `npx tsc --noEmit` (exit 0), `npm run lint` ("All files pass linting"), `npm run build` (prod + SSR + 9 rutas prerenderizadas, sin errores).

**Riesgo abierto para sesiones futuras**: el gap Angular 19→21 que causó el bug de `edu-sortable-column.ts` es evidencia de que puede haber *más* piezas de las 36 con incompatibilidades similares no detectadas aún porque nada las usa todavía — el build actual solo compila la librería vendorizada de forma aislada (nadie la importa en templates reales). Cada pieza se valida de verdad recién cuando un archivo real la usa en el paso 1 (superficies mecánicas) — tratar cualquier error de compilación ahí como posible bug de la librería, no solo error del codemod.

**Siguiente paso**: paso 1 del brief — automatizar superficies mecánicas (tags `<p-*>`→`<edu-*>`, `primeng/api`, directivas simples). Sin empezar todavía en esta sesión — checkpoint natural tras resolver la fundación de consumo de la librería.

### Sesión 2 (2026-08-24) — paso 1 (mecánico), vía subagente

**Hallazgo que contradice una premisa del brief**: la línea 14 del brief afirma *"Con brief 587 shippeado, la librería edu-ui cubre el 100% de lo auditado"*. La migración mecánica real (codemod + build como oráculo de corrección, `strictTemplates`) muestra que **no es así** — hay un gap de cobertura de API real, no solo de tags faltantes.

**Migrado y verificado verde** (258 archivos con cambios reales, de 262 modificados en total incluyendo `angular.json`/`eslint.config.js` de sesión 1): tags `<p-*>`→`<edu-*>` para avatar, badge, button (solo el tag `<p-button>` si existía como componente — NO la directiva `pButton`, fuera de scope), card, confirmDialog, datepicker, dialog, divider, drawer, iconfield, inputNumber, inputicon, menu, message, paginator, popover, progressBar, progressSpinner→spinner, select, selectButton, skeleton, table, tag, toast, toggleSwitch. `primeng/api` (`ConfirmationService`/`MessageService`/`MenuItem`) → `EduConfirmationService`/`EduMessageService`/`EduMenuItem`. Directivas `pTooltip`→`eduTooltip`, `pInputText`→`eduInputText`, `pTextarea`→`eduTextarea`, `pSortableColumn`→`eduSortableColumn`. `pTemplate` confirmado como no-touch real (`EduTemplate` selector es literalmente `[pTemplate]`) — solo hizo falta agregar `EduTemplate` al array `imports:` donde correspondía. Fix mecánico adicional no listado en el brief original: `tooltipPosition` (par de `pTooltip`) → `eduTooltipPosition`, encontrado porque si no se renombraba se perdía silenciosamente el posicionamiento del tooltip en 124 archivos.

**Excepciones — sin equivalente en edu-ui, dejadas intactas**:
- **Accordion/Tabs/Stepper** (5/24/2 = 31 archivos): gap estructural, no solo de tags. `EduAccordionPanel`/`EduTabs`/`EduStepper` proyectan hijos directos (header/tab/step) sin wrapper — no existen `EduAccordionContent`/`EduTabList`/`EduTabPanels`/`EduStepPanel(s)`. Migrar implicaría reescritura estructural del template (desenvolver el contenedor de contenido/tablist/tabpanels de PrimeNG), fuera del mandato mecánico. 100% intactos.
- **`p-sortIcon`** (61 usos / 15 archivos): no existe `EduSortIcon`. Se dejó `<p-sortIcon>` intacto; como `SortIcon` no es standalone en PrimeNG (NG2011), se restauró `TableModule` en esos 15 archivos para que siga resolviendo junto a `EduTable`/`EduSortableColumn` donde esos sí migraron.
- **`pButton`** (151 usos): intacto, fuera de scope de este paso (paso 2 separado).

**Reversiones por gap de API real** (228 archivos, revertidos a estado pre-migración): el build con `strictTemplates` expuso bindings no soportados por `edu-ui` — no son bugs de la librería, son API intencionalmente más angosta que la de PrimeNG:
- `pt` (passthrough de PrimeNG) — falta en casi todos los componentes.
- `edu-table`: `loading`, `lazy`, `dataKey`, `tableStyle`, `rowHover`.
- `edu-checkbox`: `binary`, `inputId`.
- `edu-dialog`/`edu-drawer`: `showHeader`, `contentStyle`, `closeOnEscape`.
- `edu-tag`: `icon`.
- `EduInputNumber`: **sin outputs `(onInput)`/`(onBlur)` — diseño CVA-only**, brecha de API, no de tag.
- Varias props de datepicker/autocomplete/multiselect.

**Verificado limpio tras el paso 1**: `npx tsc --noEmit` (exit 0), `npm run lint` (exit 0), `npm run build` (exit 0, solo 19 warnings preexistentes de imports no usados, no relacionados a esta migración).

**Decisión pendiente del usuario (parada obligatoria, no es un "confirmar 2-3 casos" — es un gap sistemático de cobertura)**: 228 archivos con API real faltante + 31 archivos de Accordion/Tabs/Stepper (gap estructural) + 15 archivos de `p-sortIcon` = **274 archivos** que no pueden completar el swap con el estado actual de `edu-ui`. Esto contradice la premisa "100% cubierto" del brief y de P79 F1-F5. Opciones a decidir:
1. Pausar el paso 1 acá, volver a `educa-libs` a ampliar la API de `edu-ui` (agregar `pt`, los bindings faltantes de table/checkbox/dialog/drawer/tag, outputs de InputNumber, y los wrappers estructurales de Accordion/Tabs/Stepper) antes de seguir — esto es scope nuevo no cubierto por F1-F5/587, probablemente su propio brief/fase.
2. Migrar solo lo que sí tiene cobertura (258 archivos) y dejar los 274 restantes corriendo sobre PrimeNG indefinidamente o hasta una fase futura — implica que `package.json` NO puede perder `primeng`/`@primeng/themes` todavía (paso 4 del brief bloqueado mientras haya cualquier archivo real usando PrimeNG).
3. Otra combinación (ej. ampliar edu-ui solo para los gaps más chicos/comunes — `pt`, bindings de table — y aceptar Accordion/Tabs/Stepper como fuera de alcance permanente).

**Decisión del usuario**: opción 1. Brief movido a `chats/waiting/`. Se abrió brief 589 en `educa-libs` (fase P79 F6b, `xrepo-79-primeng-replacement-library.md`) con el gap precisado por grep contra `educa-web` real (no las cifras aproximadas de arriba).

### Sesión 3 (2026-08-24) — 589 cerrado y mergeado, retomando 588

**589 shippeado**: `educa-libs` `main` en `3f109df` (verificado build de `edu-ui` + suite de regresión visual verdes, mergeado y worktree limpiado — hecho en paralelo en otra sesión, confirmado con `git reflog`/`git log` antes de dar por bueno). Cierra `pt`, props faltantes de `edu-checkbox`/`edu-table`/`edu-dialog`/`edu-drawer`/`edu-tag`/`edu-input-number`/`edu-datepicker`/`edu-autocomplete`/`edu-multi-select`, y agrega `edu-step-panel`/`edu-step-panels` (antes inexistentes). También documentó que `p-tablist`/`p-tabpanels`/`p-accordioncontent`/`p-sortIcon` no son gaps de componente sino tags que el script de migración debe **eliminar**, no mapear.

Brief 588 movido de vuelta `waiting/` → `running/`.

**Re-vendorizado** `src/app/shared/edu-ui/` en el worktree desde `educa-libs@3f109df` (commit `4e3fb925` en el worktree) — reemplaza el snapshot viejo (`3531f8a`) por el que ya incluye el gap cerrado.

**Ronda 2 de migración mecánica** (commit `77e2f8fc`): de los 274 archivos bloqueados, 223 tenían superficie PrimeNG migrable ahora mismo (los 51 restantes de los 274 solo tenían contenido de `pButton`, que sigue fuera de scope). Resultado:
- **163 archivos migrados limpio** — incluye los 3 casos "eliminar tag" (unwrap de `p-tablist`/`p-tabpanels`/`p-accordioncontent`, remoción de `p-sortIcon`) y Stepper completo (ahora con destino real).
- **60 archivos revertidos** por gaps de API que 589 no cerró — nuevas excepciones documentadas:
  - `TableLazyLoadEvent` sin equivalente en `edu-table` (9 archivos).
  - `value` de `edu-tabs`/`edu-tab`/`edu-tabpanel`/`edu-step` tipado solo `string` (PrimeNG acepta `string | number`) — ~14 archivos.
  - `[sortOrder]` de `edu-table` solo acepta `'asc'|'desc'|null` (PrimeNG usa convención numérica) — 7 archivos.
  - ~30 archivos con inputs puntuales faltantes: `pt`/`loading` en select, `auto` en file-upload, `autoResize` en textarea, `inputStyle` en input-number/password, `showClear` en datepicker, `showValue`/`color` en progress-bar, `inputId` en toggle, `fluid` en password, `closable` en message, `styleClass` en popover, `tooltipOptions`/`appendTo`/`tooltipDisabled` en tooltip, payload tipado de `onSelect` en AutoComplete.
- **Hallazgo nuevo, no listado antes**: `<p-button>` como elemento (no la directiva `pButton`) tiene el mismo perfil de riesgo estructural que la directiva — falta `loading` como input y usa `(onClick)` en vez de `(click)` nativo. Se dejó **igual de intacto** que `pButton`; el paso 2 del brief (migración de `pButton`) debe absorber también estos casos de `<p-button>` elemento, no solo la directiva.

**Bug regresado y refijado**: `edu-sortable-column.ts` volvió a fallar el build (`KeyboardEvent` vs `Event` en el host binding `(keydown.space)`, mismo bug de Sesión 1) porque el fix de Sesión 1 se aplicó solo a la copia vendorizada, nunca se portó a `educa-libs`. Al re-vendorizar en Sesión 3, el bug volvió. Corregido esta vez en **ambos lugares** (commit `95943e65` en el worktree, commit `2d45b48` en `main` de `educa-libs`, ambos verificados con build) para que sobreviva el próximo re-vendor.

**Verificado limpio tras ronda 2 + fix**: `npx tsc --noEmit`, `npm run lint`, `npm run build` (prod+SSR) — todo verde. Quedan warnings preexistentes de imports no usados (no bloqueantes) y un warning de budget de bundle inicial (+61.41 kB sobre 1 MB, esperable con más código de `edu-ui` real en uso — a revisar en el paso 6 de validación final, no ahora).

**Totales acumulados**: 258 (ronda 1) + 163 (ronda 2) = **421 archivos migrados** de PrimeNG a `edu-ui`. Pendientes: 60 archivos (ronda 2, gaps nuevos) + `pButton`/`<p-button>` (166+ archivos, paso 2, incluye ahora los casos de elemento) + los que dependan de esos 60 gaps nuevos.

**Siguiente paso**: decidir si los 60 archivos nuevos ameritan otra ronda de ampliación en `educa-libs` (F6c) antes de seguir, o si se dejan para una fase posterior mientras se avanza con el paso 2 (`pButton`/`<p-button>`) sobre el resto. No decidido todavía — checkpoint para la próxima sesión.

### Sesión 4 (2026-08-24) — F6c cerrado, ronda 3, incidente de working-tree en educa-libs

**Incidente (no relacionado al código)**: al retomar, `packages/edu-ui/` y `packages/logger/` aparecieron borrados del working tree de `educa-libs` (95+ archivos, `git status` los marcaba `D` sin que nadie los hubiera tocado en esta sesión). Confirmado con el usuario: efecto secundario de un `/wt-merge`+`/wt-clean` manual que hizo en otra sesión. Recuperado con `git checkout -- packages/edu-ui/ packages/logger/` (git tenía todo trackeado en `main`, cero pérdida real) + `npm install` para restaurar `node_modules` (también había desaparecido). Verificado `npm run build:edu-ui` verde antes de seguir.

**Re-vendorizado** desde `educa-libs@614fbaa` (contenido real `290803d`, cierre de F6c) — commit `559e6657` en el worktree.

**Ronda 3 de migración mecánica** (commit `2ef1148a`): de los 60 archivos bloqueados, **56 migraron limpio**. Incluye limpieza del `computed` muerto `primeSortOrder` en `usuarios-table.component.ts` (código muerto directamente causado por el swap, no scope creep). Ajustes con criterio (no rename ciego): `edu-accordion[value]` sigue siendo `string`-only (a diferencia de tabs/steps que sí se ampliaron) — 4 archivos con ids numéricos convertidos en el borde del template; 5 signals `dialogStyle`/`contentStyle` necesitaron anotación de tipo de retorno explícita en el arrow function por una inferencia de TS con ramas de forma distinta.

**4 excepciones nuevas confirmadas** (quedan en PrimeNG solo en el elemento bloqueado, el resto del archivo migrado):
- `attendance-day-list.component.ts`, `attendance-persona-day-list.component.ts` — `eduTooltip` sin `tooltipOptions`.
- `attendance-heatmap.component.ts`, `attendance-table.component.ts` — `edu-select` sin `pt` (F6c lo agregó a `edu-select-button`, no a `edu-select`).

**Hallazgo que no era gap**: `email-outbox-filters.component.ts` parecía bloqueado por falta de `(onSelect)`/`(onClear)` en `edu-datepicker`, pero el patrón real correcto ya usado en el resto del codebase es `[(ngModel)]`/`(ngModelChange)` (API CVA) — se migró con ese patrón, no era un gap de librería.

**Verificado limpio**: `tsc --noEmit`, `npm run lint`, `npm run build` — todo verde.

**Totales acumulados**: 258 + 163 + 56 = **477 archivos migrados** de PrimeNG a `edu-ui`. Pendientes: `pButton`/`<p-button>` (166 archivos, paso 2, mayor riesgo estructural) + 4 archivos con gap chico confirmado (`tooltipOptions` en tooltip, `pt` en select) — candidatos a una ampliación mínima futura (F6d) o a dejarse documentados como deuda conocida, no ameritan pausar de nuevo por solo 4 archivos.

**Siguiente paso**: paso 2 del brief — `pButton`/`<p-button>` (166+ archivos, reescritura estructural, no rename). Es el bloque de mayor riesgo del brief completo.
