# 463 — Auditoría visual: Login + Header (transversal a toda la intranet)

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-17 · **Modo sugerido**: `/design` (hay decisiones de UI antes de ejecutar, ver Scope)
> **Plan**: —
> **exclusive**: `false`
> **isolation**: `false`
> **touches**:
>   - `src/app/features/intranet/pages/login/login-intranet.component.html`
>   - `src/app/features/intranet/pages/login/login-intranet.component.scss`
>   - `src/app/features/intranet/shared/components/layout/intranet-layout/components/module-selector/module-selector.component.html`
>   - `src/app/features/intranet/shared/components/layout/intranet-layout/components/module-selector/module-selector.component.scss`
>   - `src/app/features/intranet/shared/components/feedback-report-launcher/feedback-report-launcher.component.scss`
>   - `src/app/features/intranet/shared/components/layout/intranet-layout/components/user-profile-menu/user-profile-menu.component.html`
>   - `src/app/features/intranet/shared/components/layout/intranet-layout/intranet-layout.component.ts` (lógica de `breadcrumb()`)

## Contexto

Sesión de auditoría visual manual (navegador conectado vía Chrome DevTools) sobre las zonas más usadas de la intranet, arrancando por Login (primera pantalla que ve cualquier usuario) y Header/menú (persistente en toda sesión autenticada, cualquier rol). No se tocó ninguna página de contenido (Asistencia/Usuarios/Cursos/Horarios) — queda para un brief posterior.

Hallazgos verificados en vivo (desktop 1440×900 y mobile 375×667 vía iframe inyectado, dado que `resize_window` de la extensión no bajaba de cierto umbral en esta sesión).

## Scope

### Login — `login-intranet.component`

1. **Overflow horizontal en mobile (375px)**: la card de login (tanto "Sesiones guardadas" como el formulario) es más ancha que el viewport — aparece scrollbar horizontal en toda la pantalla. Falta `max-width: 100%` / breakpoint responsive en el contenedor de la card.
2. **Truncado agresivo de nombres en "Sesiones guardadas"** (mobile): `"RAMOS VERA DURBY ANGELICA"` se corta a `"R.."` sin ellipsis legible ni tooltip. Decidir estrategia: ¿reducir a nombre+apellido paterno, permitir 2 líneas, o mostrar tooltip con `title` attr al truncar?
3. **Solapamiento de ícono con texto** en filas de "Sesiones guardadas" (mobile): el ícono de flecha (→ ingresar) se superpone visualmente con la palabra del rol ("Profesor"/"Administrador") en varias filas — falta espacio/gap o reflow del layout de la fila en viewport angosto.
4. **Acciones de "Sesiones guardadas" dependientes de `:hover`** (desktop): el botón de ingresar (→) y eliminar (×) solo aparecen al pasar el mouse sobre la fila. Confirmar que en dispositivos táctiles con `pointer: coarse` (tablets) el fallback sea confiable — no depender solo de estado `:hover` para acciones necesarias.

### Header — `module-selector` + `feedback-report-launcher` + `user-profile-menu` + breadcrumb

5. **Glitch visual de capas al abrir el selector de módulos** (`Ctrl+K` / clic en el trigger): al abrirse el panel lateral de búsqueda, queda un residuo visual del trigger original (`"...o Ctrl+K"`) parcialmente visible/solapado justo al borde del panel nuevo. Revisar z-index / si el trigger debería ocultarse (`visibility: hidden` o similar) mientras el panel (`isOpen()`) está abierto.
6. **Color hex literal fuera de la paleta documentada** en `feedback-report-launcher.component.scss:17` — `background: #4f46e5` (indigo-600), repetido en `:hover` (línea 30, `#4338ca`) y en el `box-shadow` (rgba del mismo indigo). El `design-system.md` del proyecto (sección 8, regla D) prohíbe hex literal sobre fondo plano y define la paleta canónica como solo rojo/azul/verde/amarillo — el índigo no está en la lista de excepciones legítimas (Sass functions, Canvas, avatares decorativos). Definir: ¿se documenta el índigo como 5to token oficial (justificando por qué el FAB de reporte necesita un color distintivo del resto de acciones), o se migra a un token existente (ej. `var(--blue-800)`)?
7. **Breadcrumb duplicado "Inicio > Inicio"** en la página de inicio — revisar la lógica de `breadcrumb()` en `intranet-layout.component.ts`: cuando el módulo activo es "Inicio" y la página también es "Inicio", el breadcrumb muestra el mismo label dos veces sin aportar información. Decidir si se colapsa a un solo nivel cuando módulo===página, o se deja (puede ser intencional en otras combinaciones módulo/página con nombres distintos — confirmar antes de tocar).

### Fuera de scope (documentado, no bug — oportunidad de UX a evaluar aparte)

- El dropdown de usuario (`user-profile-menu`) solo ofrece "Información" / "Cerrar sesión" — no hay quick-switch entre cuentas guardadas desde dentro de la app, pese a que el login sí lo soporta. Si se decide implementar, es un brief aparte (toca `AuthService`/`StorageService` de sesiones guardadas, no solo el dropdown).

## Out of scope

- Páginas de contenido (Asistencia, Usuarios, Cursos, Horarios) — auditoría pendiente en brief(s) posteriores.
- Quick-switch de cuenta desde el header (ver nota arriba).
- Cambios de arquitectura del proxy dev (`proxy.conf.json` se corrigió localmente en esta sesión para apuntar a `http://localhost:5139` en vez de `https://localhost:7102` — el backend local solo escuchaba en http; no es un bug de producto, fue config de entorno de desarrollo).

## Criterio de cierre

- [x] Login: sin overflow horizontal en mobile (375px), card respeta el viewport (`.stored-sessions { width: 100% }` en el breakpoint mobile).
- [x] Login: nombres largos en "Sesiones guardadas" legibles en mobile (line-clamp 2 líneas + `title` attr como fallback, sin solapamiento con íconos de acción).
- [x] Login: acciones de "Sesiones guardadas" accesibles de forma confiable en touch (`@media (hover: none), (pointer: coarse)` en vez de depender solo de viewport width).
- [x] Header: sin residuo visual del trigger al abrir el panel de búsqueda de módulos (`visibility: hidden` en `.selector-trigger--hidden` mientras `isOpen()`).
- [x] FAB de "Reportar": color migrado a `var(--blue-800)` (token canónico), incluyendo `:hover` y `box-shadow` — sin hex literal sin justificar.
- [x] Breadcrumb: decisión tomada — se colapsa a un solo nivel cuando módulo===página y no hay grupo (evita "Inicio > Inicio").
- [x] Build + lint OK (verificado por el usuario fuera de este chat).

## Tiempo estimado

~2-3h (incluye `/design` para decisiones de truncado/tooltip y del token de color, más `/execute` de los 5 fixes).
