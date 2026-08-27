> **Validación prod**: ⏳ pendiente desde 2026-08-27 — bloqueada hasta que 588 (swap PrimeNG→edu-ui) se despliegue.
> **Repo destino**: `educa-web` (frontend, branch `main`, commit base `3b846017` — Angular 22 + F8/F9 ya mergeados).
> **Plan**: `educa-coord/plans/xrepo-79-primeng-replacement-library.md` (P79, post-F9) · **Creado**: 2026-08-27 · **Estado**: ⏳ abierto.
> **Modo**: `/execute` — 3 fixes puntuales de `educa-web`/`edu-ui`, sin scope creep.

---

# 605 — Contraste de toggle, posicionamiento de edu-popover, y toast de error recurrente

## Contexto

El usuario verificó en vivo `localhost:4201` (commit `3b846017`, ya con Angular 22 + todas las fixes de F8/F9) contra `educa.com.pe/intranet` real y encontró 3 problemas nuevos, no cubiertos por ninguna ronda anterior. A diferencia de F8/F9 (fondo, paginador, dropdowns), estos 3 son casos puntuales — el usuario los prefiere resueltos directo en `educa-web`, sin escalar a diseño.

## Hallazgos

### 1. Toggle (`edu-toggle`) casi invisible sin hover — bug de contraste

Confirmado en 2 instancias: "Recordar sesión" (login) y "Modo oscuro" (menú de perfil). El thumb blanco sobre el track gris claro es casi indistinguible del fondo de la página hasta hacer hover (que oscurece el track y lo hace visible).

- Archivo: `src/app/shared/edu-ui/lib/toggle/edu-toggle.scss:1-49`.
- Causa raíz: el track en estado apagado usa `background: var(--eduui-surface-300)` (`#cbd5e1`, `tokens.css:93`) y el thumb (`&__handle`, línea 36-42) usa `background: var(--eduui-surface-0)` (blanco puro) **sin borde ni sombra**. Sobre el fondo de página (gris muy claro, similar en tono a `surface-300`), el contraste entre thumb y track es insuficiente en el estado normal (no-hover) — recién al hacer hover el track pasa a `--eduui-surface-400` (`#94a3b8`) y se vuelve legible.
- Fix sugerido: agregar un `box-shadow` sutil (o borde de 1px) al `&__handle` para que tenga profundidad/contraste propio independiente del color del track (patrón común en toggles — PrimeNG Aura usa `box-shadow: 0 2px 4px 0 rgba(0,0,0,.15)` en su slider), y/o subir el contraste del track en reposo (evaluar si `--eduui-surface-300` es el token correcto para el estado "apagado" o si debería ser uno con más contraste contra `--eduui-content-background`).
- **Sweep obligatorio**: buscar otros usos de `edu-toggle` en el repo — si el patrón se repite es el mismo bug en cada instancia, no hace falta re-descubrirlo.

### 2. `edu-popover` se posiciona mal en el menú de perfil — se abre hacia la izquierda y se superpone con la nav

En `/admin/cursos` (y presumiblemente cualquier página con la nav completa visible), al abrir el menú de perfil (ícono arriba a la derecha) el panel se renderiza corrido hacia la izquierda, solapándose con el dropdown "Ayuda" de la barra de navegación — en prod el panel se ve limpio, alineado por el borde derecho con el avatar, sin tocar la nav.

- Archivo: `src/app/shared/edu-ui/lib/popover/edu-popover.ts:8-11` — `POPUP_POSITIONS` solo define 2 posiciones, ambas ancladas por el borde **izquierdo** (`originX: 'start'`, `overlayX: 'start'`): abre hacia abajo-derecha o arriba-derecha desde el borde izquierdo del trigger. Como el trigger (avatar del usuario) está pegado al borde derecho del viewport, CDK Overlay no tiene espacio a la derecha y cae a un fallback de posicionamiento que termina solapando la nav a la izquierda.
- Fix sugerido: agregar posiciones alternativas ancladas por el borde **derecho** (`originX: 'end', overlayX: 'end'`) — igual que hace `originX/overlayX: 'start'` pero espejado — para que cuando el trigger esté cerca del borde derecho del viewport, el panel se abra hacia la izquierda desde el borde derecho del trigger (comportamiento de PrimeNG/prod). El popover de `profesor-horarios` (el otro consumidor real de `edu-popover`, ver brief 600) puede no verse afectado por estar más centrado — revisar igual por consistencia.

### 3. Toast "Error de aplicación" recurrente al abrir el menú de perfil — reproducible, causa raíz sin confirmar

Ya documentado como hallazgo no-bloqueante en brief 602 (~50% de las veces, causa raíz no confirmada); esta sesión lo reprodujo de nuevo al abrir el popover en `/admin/cursos`. El mensaje (`src/app/shared/constants/ui-error-messages.ts:14`, `application: 'Error de aplicacion'`) se dispara desde `error.interceptor.ts` — es decir, **hay un request HTTP real fallando**, no un error de renderizado del popover en sí.

- Investigar: abrir DevTools → Network al reproducirlo, identificar qué request falla (status, URL) justo al hacer click en el avatar/abrir el popover. Candidatos a revisar: alguna llamada de notificaciones/salud de sede que se dispare en el mismo ciclo de detección de cambios que abre el overlay, o una carrera entre el overlay del CDK y algún polling en background.
- Si no se logra reproducir de forma consistente en este brief, documentar el intento y dejarlo como hallazgo abierto (no bloquea nada, es cosmético — un toast que desaparece solo, el contenido del popover igual renderiza bien).

## Qué NO hacer

- No tocar nada de F8/F9 ya cerrado (fondo, paginador, dropdowns, `edu-table`, `edu-tag`) — este brief es 3 hallazgos nuevos, disjuntos.
- No rediseñar `edu-toggle`/`edu-popover` — ajustes puntuales de contraste/posicionamiento, no un rework de API.
- No perseguir el toast de error #3 más allá de una sesión razonable de debugging — si no se reproduce con causa clara, documentar y seguir (severidad baja, no bloqueante).

## Done-when

- [x] `edu-toggle` con contraste suficiente en estado apagado sin necesitar hover — verificado visualmente en "Recordar sesión" y "Modo oscuro".
- [x] `edu-popover` del menú de perfil abre alineado a la derecha, sin solaparse con la nav — verificado en `/admin/cursos` con nav completa.
- [x] Toast "Error de aplicación" investigado — causa raíz identificada y corregida (ver hallazgo abajo).
- [x] `npm run build` verde.
- [ ] Verificación en vivo final: local vs `educa.com.pe/intranet` real en las 3 áreas tocadas — **no aplica tal como está planteado**: prod aún no despliega `edu-ui` (588 pendiente), sigue con PrimeNG puro para toggle/popover, así que no hay componente equivalente contra el cual comparar visualmente estos 3 fixes hasta que 588 se despliegue.

## Ejecución — hallazgos y fixes

### 1. `edu-toggle` — contraste (fix aplicado)

`src/app/shared/edu-ui/lib/toggle/edu-toggle.scss` — agregado `box-shadow` sutil al `&__handle` (mismo patrón que PrimeNG Aura) para que el thumb tenga profundidad propia, independiente del color del track. Sweep: es un único componente compartido (20 consumidores), el fix se propaga automáticamente — no hace falta tocar nada más.

### 2. `edu-popover` — posicionamiento (fix aplicado)

`src/app/shared/edu-ui/lib/popover/edu-popover.ts` — agregadas 2 posiciones ancladas por el borde derecho (`originX/overlayX: 'end'`) a `POPUP_POSITIONS`, como fallback detrás de las 2 posiciones `'start'` existentes (se preserva el comportamiento actual para `profesor-horarios`, el otro consumidor real). Verificado en `/admin/cursos`: el panel ahora se alinea al borde derecho del avatar sin solaparse con la nav.

### 3. Toast "Error de aplicación" — causa raíz encontrada y corregida

**No era un problema de red** (brief 602 asumía un request HTTP fallando). Es un `DOMException` real del cliente: `edu-popover.ts` armaba `panelClass` con `.join(' ')`, produciendo un string con espacios (`'edu-popover-pane profile-popover '` — nótese el espacio final, viene de `[styleClass]="'profile-popover ' + popoverStyleClass()"` en `user-profile-menu.component.html` con `popoverStyleClass()` vacío). CDK Overlay no separa ese string por espacios — lo pasa tal cual a `classList.add()`, que rechaza tokens con espacios y tira `Failed to execute 'add' on 'DOMTokenList'`. Angular's `GlobalErrorHandler` lo capturaba silenciosamente y mostraba el toast genérico "Error de aplicación" — de ahí la apariencia de error aleatorio.

Causa raíz confirmada vía telemetría real (`GET /api/sistema/errors`, no vía consola del navegador — el logger de la app está deshabilitado en este build, ver nota operativa abajo), con el mensaje exacto reproducido 4 veces antes del fix.

**Fix**: `panelClass` ahora se arma como array con cada clase separada (`.split(' ').filter(Boolean)`), no como string unido. Se ensanchó el tipo `EduOverlayHandle.EduOverlayOpenOptions.panelClass` a `string | string[]` para soportarlo. Verificado: 6 ciclos abrir/cerrar del popover tras el fix, 0 errores nuevos en `/api/sistema/errors` (vs. reproducción confirmada en 4/6 intentos antes del fix).

### Nota operativa: dev server y logging

- El logger de la app (`logger.error`, tag `[ErrorHandler]`/`[GlobalErrorHandler]`) no aparece en consola del navegador en este entorno — investigar por qué (`isDevMode()`/`environment.production` en este build) queda fuera de este brief, pero vale la pena un hallazgo aparte: sin esto, cualquier debugging de errores de cliente depende de `/api/sistema/errors`, no de la consola.
- El proceso de `ng serve` que estaba corriendo en `:4201` al empezar este chat quedó en un estado que no reflejaba ediciones de código (posiblemente arrancado con Node 20, cuando el proyecto pide Node ≥22.22.3 — no llegó a confirmarse la causa exacta). Se reinició con `fnm exec --using=22.23.2` para verificar los fixes en limpio. Si el usuario tenía ese proceso corriendo intencionalmente desde otra terminal, avisar — quedó reemplazado por uno nuevo lanzado desde este chat.

## Plan cross-repo

[`educa-coord/plans/xrepo-79-primeng-replacement-library.md`](../../../../EducaWeb/WD/educa-coord/plans/xrepo-79-primeng-replacement-library.md) — P79, post-F9 (hallazgos nuevos tras el merge de P70 a `main`).

## Origen

Verificación en vivo del usuario tras levantar `localhost:4201` en el commit `3b846017` (Angular 22 + F8/F9 mergeados), comparando contra `educa.com.pe/intranet` real. 3 hallazgos nuevos, ninguno cubierto por rondas anteriores.
