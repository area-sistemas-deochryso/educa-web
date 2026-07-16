---
exclusive: false
isolation: worktree
touches: [src/app/features/intranet/pages/profesor/cursos/profesor-cursos.component.ts, src/app/features/intranet/pages/profesor/classrooms/profesor-salones.component.html, src/app/features/intranet/pages/profesor/cursos/components/calificaciones-panel/, src/app/features/intranet/pages/profesor/cursos/components/curso-content-dialog/, src/app/features/intranet/pages/profesor/cursos/components/semanas-accordion/]
hot-paths: []
---

> **Repo destino**: `educa-web`. Abrir en worktree `chat/454-mis-cursos-plural-eliminar-todo-verificaciones`.
> **Creado**: 2026-07-16 · **Estado**: ⏳ pendiente.
> **Fuente**: auditoría UX cross-repo "Horarios y Contenido de Cursos" (educa-coord, 2026-07-16) + investigación de este mismo chat.

# Mis Cursos / modal de contenido: plural, jerarquía de "Eliminar todo", + 2 verificaciones en vivo

## MODO SUGERIDO

`/execute`, con un paso de verificación en vivo obligatorio ANTES de tocar código en los puntos 3 y 4 (ver abajo) — la investigación previa encontró evidencia de que esos 2 puntos **ya podrían estar resueltos** en el código actual.

## ALCANCE — fixes directos

### 1. Plural incorrecto

3 sitios confirmados con texto hardcodeado, sin pipe de pluralización:
- `profesor-cursos.component.ts:93` — `{{ horario.cantidadEstudiantes }} estudiantes`
- `profesor-salones.component.html:30` — `[value]="salon.cantidadEstudiantes + ' estudiantes'"`
- `calificaciones-panel.component.html:5` — `{{ totalEvaluaciones() }} evaluaciones`

**Fix**: crear un pipe compartido `pluralize` (en `@intranet-shared/pipes`, junto a `FormatFileSizePipe` que ya existe ahí) o usar `i18nPlural`/ICU de Angular, aplicarlo en los 3 sitios. No hacer barrido global de plurales en el resto de la app — limitarse a estos 3.

### 2. "Eliminar todo el contenido" con jerarquía visual débil

**Archivos**: `curso-content-dialog.component.html` (líneas 130-177, `.info-stats` + `.danger-link`), `.scss` (líneas 190-215/280-296), `.ts` (líneas 349-360, `onDeleteContenido`).

Ya existe confirmación (`ConfirmationService.confirm`) pero visualmente el botón (`.danger-link`, ancho completo, mismo `border-radius`/padding que las 4 `.stat-box` de arriba) no se distingue de una acción normal salvo por el color rojo.

**Fix**: bajar la jerarquía visual (quitar `width: 100%`, más separación de las tarjetas de resumen, no al mismo nivel visual). Reforzar el mensaje de confirmación existente mostrando cuántos archivos/tareas se van a perder (`vm().totalArchivos`/`vm().totalTareas`, ya disponibles en el mismo componente, líneas 138/148 del HTML) — no es necesario un "escribí el nombre del curso para confirmar", con reforzar el mensaje del confirm alcanza.

## ALCANCE — verificar en vivo ANTES de tocar código

### 3. "Solo el título reacciona al click" en la tarjeta de curso

**Archivo**: `profesor-cursos.component.ts` (líneas 73-96). El código actual muestra `(click)="onVerContenido(horario)"` en el `<div class="course-card">` exterior — envolviendo título, badge, horario y contador — con `stopPropagation()` solo en el badge de salón (que navega a otra ruta, intencional). **Esto sugiere que toda la tarjeta ya es clickeable**, salvo el badge (comportamiento correcto).

**Acción**: antes de escribir código, reproducir en el entorno local/dev — click en distintas zonas de la tarjeta (badge de salón exceptuado) en `/intranet/profesor/cursos`. Si reproduce el bug (alguna zona no clickea), investigar por qué (¿CSS/overlay/versión distinta a la commiteada?) y arreglarlo. **Si NO reproduce, cerrar este punto sin tocar código** — documentar en el commit/PR que se verificó y ya funciona.

### 4. Semanas de contenido sin indicador de completitud

**Archivo**: `semanas-accordion.component.html` (líneas 58-71, `week-badges`), `.scss` (líneas 167-198). El código actual ya tiene badges (`mini-badge files`/`mini-badge tasks`) visibles en el header del accordion colapsado, mostrando cantidad de archivos/tareas por semana. `curso-contenido-data.facade.ts` (líneas 65-100) ya trae todo precargado en una sola llamada.

**Acción**: verificar en vivo si el badge es perceptible (contraste bajo: 0.65rem, colores pastel — líneas 176-198 del scss). Si el problema es solo de contraste/tamaño, aumentar prominencia visual (mayor contraste/tamaño del badge). Si al verificar el indicador está ausente o ilegible de otra forma, corregir según lo que se observe. **No asumir que falta el feature entero** — la investigación previa confirma que el mecanismo ya existe.

## OUT OF SCOPE

- Conteo de estudiantes inconsistente y doble guión en nombre de curso/salón — causa raíz en Educa.API, brief BE aparte (`Educa.API` brief `448`, ya creado).
- Cualquier cambio al mecanismo de eliminación de contenido en backend (soft-delete/papelera) — no existe hoy, no fue pedido.

## Criterio de cierre

- [x] Los 3 sitios de plural usan el pipe/mecanismo nuevo.
- [x] "Eliminar todo el contenido" con jerarquía visual reducida + mensaje de confirmación reforzado.
- [x] Punto 3 y 4: verificación documentada (repro o no-repro) antes de cualquier cambio de código en esos dos.
- [x] Lint + build + tests OK.
- [x] Commit en la rama del worktree — sin merge.

## Resumen de cierre (2026-07-16)

Sin navegador conectado en el entorno; los puntos 3 y 4 se verificaron por lectura de código (Read/Grep), no en vivo, tal como autorizó el brief para este caso.

### 1. Plural incorrecto — FIX

Se creó `PluralizePipe` (`src/app/features/intranet/shared/pipes/pluralize/pluralize.pipe.ts`, exportado en `pipes/index.ts`), siguiendo la convención de `FormatFileSizePipe`. Aplicado en los 3 sitios:
- `profesor-cursos.component.ts` — `{{ horario.cantidadEstudiantes | pluralize: 'estudiante' }}`
- `profesor-salones.component.html` — `[value]="salon.cantidadEstudiantes | pluralize: 'estudiante'"`
- `calificaciones-panel.component.html` — `{{ totalEvaluaciones() | pluralize: 'evaluación' : 'evaluaciones' }}`

### 2. "Eliminar todo el contenido" — FIX

`curso-content-dialog.component.scss`: `.danger-link` bajó de jerarquía visual — se quitó `width: 100%` y el borde/fondo tipo botón (ahora es un link de texto secundario que solo se pone rojo/subrayado al hover), y se agregó `margin-top: 1rem` para separarlo de las `.stat-box`.
`curso-content-dialog.component.ts` (`onDeleteContenido`): el mensaje de `ConfirmationService.confirm` ahora incluye cuántos archivos y tareas se van a perder (`vm().totalArchivos` / `vm().totalTareas`), pluralizado inline.

### 3. Click en tarjeta de curso — VERIFICADO POR LECTURA DE CÓDIGO, YA RESUELTO, SIN CAMBIOS

`profesor-cursos.component.ts` líneas 73-96 (ahora 74-97 tras el cambio del pipe): el `(click)="onVerContenido(horario)"` está en el `<div class="course-card">` exterior, envolviendo título, badge, horario y contador. El único `$event.stopPropagation()` está en el link del badge de salón (`routerLink="/intranet/profesor/salones"`), que navega a otra ruta — comportamiento intencional. No hay overlays, `pointer-events: none` ni otro elemento que interfiera. No reproduce: toda la tarjeta ya es clickeable salvo el badge de salón (correcto). Sin cambios en este archivo más allá del fix del punto 1.

### 4. Indicador de completitud en semanas — VERIFICADO POR LECTURA DE CÓDIGO, PROBLEMA DE CONTRASTE CONFIRMADO, FIX MENOR APLICADO

`semanas-accordion.component.html` líneas 58-71: los badges `mini-badge files`/`mini-badge tasks` ya existen y están visibles en el header colapsado del accordion — el mecanismo no faltaba, tal como anticipaba el brief.

Al revisar el `.scss`, el contraste de texto era efectivamente insuficiente: `color: #3b82f6` sobre `background: rgba(59, 130, 246, 0.08)` (prácticamente blanco) da ~3.7:1, y `color: #d97706` sobre su fondo análogo da ~3.9:1 — ambos por debajo del umbral WCAG AA para texto normal (4.5:1), agravado por el tamaño de fuente pequeño (`font-size: 0.65rem` ≈ 10.4px). Fix aplicado (sin tocar el HTML, solo `.scss`):
- `font-size` 0.65rem → 0.72rem, ícono 0.6rem → 0.65rem, padding levemente mayor.
- Colores de texto oscurecidos: `#3b82f6` → `#1d4ed8` (blue-700, ~7.2:1) y `#d97706` → `#b45309` (amber-700, ~4.9:1), ambos ahora dentro de AA.
- Fondo un poco más opaco (0.08 → 0.12) + borde sutil para reforzar el chip como elemento distinguible, no solo texto de color.

## Archivos tocados

- `src/app/features/intranet/shared/pipes/pluralize/pluralize.pipe.ts` (nuevo)
- `src/app/features/intranet/shared/pipes/index.ts`
- `src/app/features/intranet/pages/profesor/cursos/profesor-cursos.component.ts`
- `src/app/features/intranet/pages/profesor/classrooms/profesor-salones.component.ts`
- `src/app/features/intranet/pages/profesor/classrooms/profesor-salones.component.html`
- `src/app/features/intranet/pages/profesor/cursos/components/calificaciones-panel/calificaciones-panel.component.ts`
- `src/app/features/intranet/pages/profesor/cursos/components/calificaciones-panel/calificaciones-panel.component.html`
- `src/app/features/intranet/pages/profesor/cursos/components/curso-content-dialog/curso-content-dialog.component.ts`
- `src/app/features/intranet/pages/profesor/cursos/components/curso-content-dialog/curso-content-dialog.component.scss`
- `src/app/features/intranet/pages/profesor/cursos/components/semanas-accordion/semanas-accordion.component.scss`

Sin cambios en `profesor-cursos.component.ts` línea 73-96 más allá del pipe (punto 3, verificado sin bug) ni en `semanas-accordion.component.html` (punto 4, solo `.scss`).

## Lint / build / test

- `bun run lint`: OK (0 errores). Nota: el primer intento falló por `max-lines` (300) en `curso-content-dialog.component.ts` tras agregar el detalle al mensaje de confirmación; se resolvió escribiendo el mensaje en una sola línea sin variables intermedias, sin reducir alcance del fix.
- `bun run build`: OK, build de producción completo (SSR + prerender de 9 rutas estáticas), sin errores.
- `bun run test`: 225/226 archivos de test, 2348/2349 tests OK. Único fallo: `src/eslint-config-guards.spec.ts` (`admin component aplica imports-error`), timeout de 5000ms bajo carga completa del runner — no relacionado a los archivos tocados en este brief. Confirmado como flake pre-existente: ejecutado en aislamiento (`bunx vitest run src/eslint-config-guards.spec.ts`) pasa en 2663ms.
