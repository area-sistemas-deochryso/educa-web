---
exclusive: false
isolation: worktree
touches: [src/app/features/intranet/pages/admin/, src/app/features/intranet/shared/components/view-as-picker/, src/app/features/intranet/pages/admin/calendario/]
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: — · **Chat**: — · **Fase**: — · **Creado**: 2026-08-08 · **Estado**: ✅ cerrado 2026-08-08. Commit `1a878173` en `chat/531-fe-audit-alineacion-admin-estudiante-profesor`, pendiente `/wt-merge`.

---

# Audit de alineación visual — Administrador / Estudiante / Profesor

## OBJETIVO

Corregir 7 hallazgos de alineación/consistencia visual confirmados en vivo (browser, dev server local `ng serve`, backend con `UseTestEnv=true`) recorriendo las ~25 páginas del rol Administrador, las 8 de Estudiante y las 8 de Profesor (vía "Ver como"). El módulo Estudiante y Profesor no tuvieron hallazgos — el foco de este chat es el listado de abajo, todo dentro de Administrador salvo el ítem 3.

## MODO SUGERIDO

`/investigate` primero para localizar los componentes/archivos exactos de cada hallazgo (este brief los describe por comportamiento observado en pantalla, no por archivo — no se leyó código durante el audit) → `/design` si algún fix implica decisión de layout no trivial (p. ej. #2 y #3) → `/execute` → `/validate` visual en vivo (no solo build/lint, dado que son bugs visuales).

## PRE-WORK OBLIGATORIO

Ninguno. El repro de cada hallazgo es simplemente navegar a la URL indicada logueado como admin.

## ALCANCE — 7 hallazgos confirmados

### 1. FAB "Acciones" tapa el botón de usuario tras un toast de error — `/intranet/admin/campus`
Al fallar una request (repro: abrir `/admin/campus`, dispara un 400 en `/api/campus/pisos`), el toast de error rojo (esquina superior derecha) se superpone completamente al botón de usuario "CODE CLAUDE / Administrador" del navbar, tapándolo por completo mientras el toast está visible.
- Fix: revisar z-index / posición del contenedor de toasts para que no se solape con el navbar, o mover el toast unos px abajo.

### 2. Banner blanco rompe el tema oscuro — `/admin/usuarios` y `/admin/monitoreo`
Dos casos del mismo patrón:
- `/admin/usuarios`: al volver de un "Ver como", aparece un banner blanco ("Hay contraseñas en texto plano que pueden migrarse al campo encriptado") con fondo claro sobre una app en tema oscuro. Coincide en el tiempo con el toast "Ver como finalizado" (esquina sup-derecha) — ambos se superponen visualmente a la fila de stats (277 total / 245 estudiantes) durante ese instante.
- `/admin/monitoreo`: el panel "Requieren atención" y la barra inferior de "Correos" usan fondo claro/blanco fijo, mientras el resto de la página está en tema oscuro.
- Fix: estos componentes de alerta/banner parecen no estar usando los tokens de color del tema (hardcoded a fondo claro). Aplicar el mismo patrón de theming que el resto de banners de la app (ver `app-salud-sede-banner` u otro banner ya themed como referencia).

### 3. Dropdown de resultados se superpone al panel de curso — `/intranet/ver-como/estudiante` (y probablemente `/ver-como/profesor`, mismo componente)
El dropdown de resultados de "Buscar estudiante por nombre o DNI..." se abre flotando y tapa parcialmente el panel de "Buscar curso" que está arriba de él en el layout, en vez de empujarlo o cerrarlo primero. Ver `view-as-picker.component` (`src/app/features/intranet/shared/components/view-as-picker/`).
- Fix: el dropdown debería tener z-index/posicionamiento absoluto correcto respecto al contenedor scrolleable, o el panel de curso debería colapsar/ocultarse mientras el dropdown de estudiante está abierto.

### 4. Copy incoherente — `/admin/salones`
El subtítulo del header dice "Administración de periodos, calificaciones y promoción de estudiantes", pero la página es de gestión de Salones (aulas). Parece texto copiado de otra página (posiblemente del módulo de rendimiento/calificaciones).
- Fix: cambiar el subtítulo a algo descriptivo de Salones, ej. "Administra los salones y periodos académicos del colegio" (a definir el texto final).

### 5. Ícono de header distinto — `/intranet/calendario`
El ícono de cabecera es un cuadrado grande con gradiente azul (fondo degradado, esquinas redondeadas grandes), mientras que en el resto de páginas admin (usuarios, cursos, horarios, salones, etc.) el ícono de cabecera es un cuadrado chico gris oscuro plano.
- Fix: unificar el ícono de `/calendario` al mismo patrón visual (tamaño + estilo) del resto de headers admin.

### 6. Headers sin ícono y/o sin subtítulo — 4 páginas admin
El patrón dominante en el resto de páginas admin es: [ícono en caja] + Título H1 grande + línea de subtítulo gris descriptiva debajo. Excepciones:
- `/admin/rendimiento` ("Rendimiento Institucional") — tiene ícono pero SIN subtítulo.
- `/admin/permisos-salud` ("Permisos de Salud") — tiene ícono pero SIN subtítulo.
- `/admin/ayuda/faq` ("Gestión de FAQ") — SIN ícono y SIN subtítulo.
- `/admin/explicaciones` ("Gestión del modo informativo") — SIN ícono y SIN subtítulo.
- Fix: agregar ícono + subtítulo a las 4 páginas siguiendo el patrón del resto (ver `/admin/cursos` o `/admin/usuarios` como referencia de estructura de header).

### 7. Íconos del navbar superior no cargan — `/admin/asistencias`
Los íconos de los items del navbar superior (Administrador / Académico / Asistencia / Ayuda / Más) no se renderizan en esta página específica, aunque sí aparecen en `/admin/usuarios`, `/admin/cursos`, `/admin/horarios`, `/admin/salones` y el resto de páginas visitadas.
- Investigar primero si es reproducible de forma consistente (podría ser un glitch de timing de carga, no necesariamente un bug de código) antes de tocar nada.

## FUERA DE ALCANCE

- El botón flotante "Acciones" (FAB) tapando controles al ser arrastrado/posicionado por el usuario — es comportamiento esperado (arrastrable/ocultable), NO es un bug, no tocar.
- Cualquier hallazgo funcional que no sea de alineación/consistencia visual (ej. el error 400 real de `/api/campus/pisos` en `/admin/campus` — se detectó de paso pero excede el alcance de este chat, evaluar si amerita brief propio).
- Módulos Estudiante y Profesor — auditados sin hallazgos, no tocar.

## VALIDACIÓN FINAL

- Los 7 hallazgos verificados visualmente en vivo (screenshot antes/después), no solo por lectura de código.
- `bun run lint` — 0 errores.
- `bun run build` — sin errores.

## CRITERIOS DE CIERRE

- [x] Hallazgo 1 corregido y verificado. Fix: `.p-toast.p-toast-top-right { top: ... !important }` en `styles.scss` — PrimeNG fija `top` vía inline style, necesitaba `!important` para bajar el toast debajo del navbar sticky.
- [x] Hallazgo 2 corregido y verificado (ambos casos: `/admin/usuarios` y `/admin/monitoreo`). Causa real: `usuarios.component.scss` usaba `var(--white-color)`/`var(--text-color)` fijos → tokens `--tint-warning-*`/`--tint-success-*`. `monitoreo-hub.component.scss` usaba `var(--surface-0)`/`var(--surface-300)`, que NO se remapean en `.dark-mode` (confirmado con `getComputedStyle`, quedan en `#ffffff`/`#d4d4d8` siempre) → cambiados a `var(--surface-card)`/`var(--surface-border)`, que sí están remapeados.
- [x] Hallazgo 3 corregido y verificado. El overlay del autocomplete (`appendTo="body"`) se abría hacia arriba por falta de espacio y tapaba el panel de filtros. Fix: `view-as-picker.component.ts/html` — nuevo signal `resultsOpen` + `(onShow)`/`(onHide)` que colapsa `.view-as-picker__filters` mientras el dropdown está abierto.
- [x] Hallazgo 4 corregido y verificado. Subtítulo de `/admin/salones` cambiado a "Administra los salones y su capacidad para el periodo académico".
- [x] Hallazgo 5 corregido y verificado. `/intranet/calendario` usa un componente propio (`calendar-header`), no `app-page-header` — se quitó la caja 56px con gradiente y se igualó al ícono plano (1.5rem, sin caja) del resto de headers admin.
- [x] Hallazgo 6 corregido y verificado (las 4 páginas). Rendimiento y Permisos de Salud: agregado `subtitle` a `app-page-header` ya existente. FAQ y Explicaciones: reemplazado el `<h2>` custom por `app-page-header` con ícono + subtítulo, preservando la toolbar existente vía `ng-content`.
- [x] Hallazgo 7 investigado — no reproducible. 4 intentos (reload directo, SPA nav desde home, deep-link, doble reload) en `/admin/asistencias`: los íconos del navbar cargaron correctamente en todos los casos. Sin cambio de código.
- [x] Validación final pasa. Los 7 hallazgos verificados visualmente en vivo (dev server del worktree + backend `UseTestEnv=true` levantado para esto). `bun run lint` — 0 errores. `bun run build` — sin errores (build de producción completo, incluye prerender).
- [ ] Brief movido `running/` → `closed/` (lo hace `/end`).

## CIERRE

Chat de alcance acotado (7 fixes puntuales de CSS/copy/z-index) — ninguno requirió decisión de arquitectura nueva; el hallazgo 3 se resolvió con el patrón ya sugerido en el brief (colapsar el panel de curso) y el hallazgo 2 reusó tokens `--tint-*` ya existentes en `_tokens.scss`.

Nota no prevista: durante hallazgo 2 se descubrió que `--surface-0`/`--surface-200/300/400/500/900` (a diferencia de `--surface-100/-card/-ground/-dialog`) NO están remapeados en `.dark-mode` pese al comentario en `_tokens.scss` líneas 181-186 que sugiere lo contrario para toda la familia `--surface-*`. Quedan otros usos de `--surface-300` como color de *borde* (no fondo) en `monitoreo-hub.component.scss` sin tocar — impacto visual menor (borde gris claro sobre fondo oscuro) y fuera del alcance puntual de este brief, pero podría ameritar un brief de limpieza si aparece en más componentes.
