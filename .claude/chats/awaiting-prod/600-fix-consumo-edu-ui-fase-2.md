> **Validación prod**: ⏳ pendiente desde 2026-08-27
> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: `educa-coord/plans/xrepo-79-primeng-replacement-library.md` (P79, F9) · **Creado**: 2026-08-26 · **Estado**: ⏳ abierto.
> **Hermano**: brief 599 en `educa-libs/.claude/chats/open/` (hallazgos de librería — no depende de este, alcance disjunto).
> **⚠️ Prioridad**: el hallazgo 2 (`edu-popover`) rompe funcionalidad real (no se puede cerrar sesión ni ver "Información" desde el menú de perfil), no es solo cosmético. Considerar priorizarlo si el volumen del resto no permite hacer todo junto.

---

# 600 — P79 F9: fix de consumo edu-ui, fase 2 (íconos de acciones, edu-popover, dropdowns)

## Contexto

Segunda ronda de verificación en vivo tras el cierre de F8 (`educa-web` local vs. `educa.com.pe/intranet` real, cuenta Administrador) encontró 3 gaps adicionales de consumo, con causa raíz confirmada en cada caso.

## Hallazgos a corregir

### 1. Íconos de la columna "Acciones" pierden su color semántico

En `/admin/usuarios`, los 4 íconos de acciones (ver/editar/desactivar/copiar) se ven todos del mismo color teal en vez de gris/verde/naranja/gris como en PrimeNG real.

- Archivo: `src/app/features/intranet/pages/admin/users/components/usuarios-table/usuarios-table.component.html:84-127` (columna `actions-cell`) + `usuarios-table.component.scss:91-116` (`.action-icon`, `.action-edit`, `.action-deactivate`, `.action-activate`).
- Causa raíz: mismo patrón de encapsulación host≠interno que "grados-button" (brief 589, hallazgo 2) — no cubierto ahí porque ese brief solo tocó `cursos.component`. `<edu-button class="action-icon action-edit">` pone la clase en el elemento **host**; `edu-button.ts:24-38` renderiza el `<button class="edu-button" [attr.data-severity]="severity()">` real **dentro** de su propio template. La regla `.edu-button.edu-button--text[data-severity='primary'] { color: var(--eduui-primary-color); }` (`edu-button.scss:127`) se declara **directamente** sobre ese botón interno — una declaración directa siempre gana sobre lo heredado del host, con o sin `!important` en la clase del consumidor. Como ningún `<edu-button>` de esta tabla pasa `[severity]`, todos caen al default `'primary'` → mismo teal.
- Fix recomendado (mismo criterio que 589 hallazgo 2, opción b): reemplazar las clases CSS custom por la prop `[severity]` semántica real de `edu-button` (`severity="secondary"` para ver/copiar, `severity="success"` para editar, `severity="warn"` para desactivar, `severity="info"` o `"success"` para activar), en vez de intentar que `.action-edit`/`.action-deactivate` lleguen al botón interno.
- **Sweep obligatorio**: este mismo patrón (`class="action-*"` sobre `<edu-button>` esperando que el color llegue al ícono interno) probablemente se repite en otras tablas admin (grep `action-icon\|action-edit\|action-deactivate\|action-activate` en `src/app/**/*.scss`). Corregir todas las instancias encontradas, no solo Usuarios.

### 2. `edu-popover` pierde casi todo su contenido — rompe el menú de perfil y el popover de horarios

**Severidad alta**: en el menú de perfil (esquina superior derecha), solo se ve el botón "Notificaciones" — el avatar, nombre, toggle "Modo oscuro", "Información" y "Cerrar sesión" no se renderizan. No hay forma de cerrar sesión desde ese menú en local.

- Causa raíz: `packages/edu-ui/src/lib/popover/edu-popover.ts:35-36` documenta explícitamente que el contenido de `<edu-popover>` debe envolverse en `<ng-template>` para que `contentChild(TemplateRef)` pueda capturarlo (`TemplatePortal`). **Ninguno de los 2 usos reales de `edu-popover` en el repo sigue esa convención** — ambos pasan un `<div>` plano (opcionalmente envuelto en `@if`) en vez de `<ng-template>`:
  - `src/app/features/intranet/shared/components/layout/intranet-layout/components/user-profile-menu/user-profile-menu.component.html:23-78`
  - `src/app/features/intranet/pages/profesor/schedules/profesor-horarios.component.html:181-222`
- Mecanismo del bug: al no haber un `<ng-template>` explícito, `contentChild(TemplateRef)` engancha por casualidad el template implícito del primer bloque `@if` que encuentra anidado (en `user-profile-menu`, el `@if (showNotifications())` de la línea 50-59) en vez del contenido completo — por eso sobrevive justo "Notificaciones" y nada más.
- Fix: envolver el `<div class="popover-content">...</div>` completo de cada uno de los 2 archivos en `<ng-template>...</ng-template>`. Verificar en vivo que el menú de perfil completo (avatar, nombre, modo oscuro, notificaciones, información, cerrar sesión) y el popover de detalle de horario rendericen entero.

### 3. Dropdowns con opciones-objeto muestran `[object Object]`

El filtro "Salón" en `/admin/usuarios` muestra literalmente `[object Object]` en cada opción del dropdown, en vez del nombre del salón.

- Archivo: `src/app/features/intranet/pages/admin/users/components/usuarios-filters/usuarios-filters.component.html:26-32` (segundo `<edu-select>`, filtro Salón) — falta `[optionLabel]` y `[optionValue]`.
- Causa raíz: `usuarios-filters.component.ts:40-54` arma `salonOptions()` como `{ label, value, gradoOrden }` — la convención `SelectItem` que PrimeNG reconocía automáticamente sin configuración. `edu-select` no tiene ese fallback: `resolveOptionLabel()` (`packages/edu-ui/src/lib/select/select-option-utils.ts:1-6`) cuando `optionLabel` es `undefined` cae a `String(option)`, produciendo `"[object Object]"` para cualquier opción no-primitiva.
- Fix puntual: agregar `[optionLabel]="'label'"` `[optionValue]="'value'"` al `<edu-select>` de Salón.
- **Sweep obligatorio**: grep `<edu-select` y `<edu-multi-select` y `<edu-autocomplete` en todo `src/app/**/*.html` buscando instancias sin `optionLabel`/`optionValue` cuyas opciones sean objetos (no strings) — este gap es sistémico, cualquier dropdown migrado que dependía del auto-reconocimiento `label`/`value` de PrimeNG se rompe igual. Documentar cuántas instancias se encontraron y corregir todas.

## Qué NO hacer

- No tocar `educa-libs` desde este brief — los 3 hallazgos de arriba son 100% de este repo (consumo). Los hallazgos de librería (fondo de inputs/tabla, paginador) están en el brief hermano 599.
- No re-litigar F1-F8/589 ya cerrados.

## Done-when

- [x] Íconos de acciones en `/admin/usuarios` con color semántico correcto (sweep: único archivo con el patrón, ya corregido).
- [x] Menú de perfil completo (avatar, nombre, modo oscuro, notificaciones, información, cerrar sesión) visible y funcional, verificado en vivo (local, cuenta Administrador).
- [x] Popover de detalle de horario (`profesor-horarios`) visible y funcional, verificado en vivo (local, cuenta Profesor).
- [x] Filtro "Salón" en `/admin/usuarios` muestra nombres reales, no `[object Object]` (sweep amplió a 33 instancias reales en 17 archivos adicionales, todas corregidas — ver detalle abajo).
- [x] `npm run build` verde.
- [x] Barrido en vivo contra servidor local (backend + frontend levantados) con cuentas Administrador y Profesor — pendiente confirmación contra `educa.com.pe/intranet` real post-deploy (ver nota de Validación prod arriba).

## Ampliación de scope (sweep hallazgo 3)

El sweep documentado en el brief original encontró 1 instancia (Salón). El sweep real ejecutado encontró **33 instancias** de `edu-select`/`edu-multi-select` sin `optionLabel`/`optionValue` en 17 archivos, todas corregidas:

`usuarios-filters` (2), `cursos` (3), `mensajeria-tab` (2), `foro-tab` (2, incluye grupo con `optionGroupLabel`/`optionGroupChildren`), `student-attendance` (1), `vistas` (2), `usuarios-header` (1), `usuario-form-dialog` (7), `rate-limit-filters` (2), `auditoria-correos-filters` (1), `notificaciones-admin` (9), `eventos-calendario` (6), `attendances` (2), `change-group-status-dialog` (1), `error-groups` (3).

**No corregido, documentado**: `correo-header.component.html` (`edu-autocomplete`) — el valor es el objeto completo (no un par `{label,value}` escalar) con template custom; puede mostrar brevemente `[object Object]` en el input tras seleccionar una sugerencia antes de que el padre lo corrija. Caso distinto al patrón del brief, requiere decisión de diseño aparte (¿qué campo mostrar como texto del input al seleccionar?).

## Plan cross-repo

[`educa-coord/plans/xrepo-79-primeng-replacement-library.md`](../../../../EducaWeb/WD/educa-coord/plans/xrepo-79-primeng-replacement-library.md) — P79 F9.

## Origen

Segunda ronda de verificación en vivo del cierre de F8, sesión de coordinación 2026-08-26.
