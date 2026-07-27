# 485 — FE: correcciones del panel de ayuda tras auditoría de usuario

> **Repo**: `educa-web`
> **Creado**: 2026-07-25 · **Estado**: ⏳ pendiente arrancar
> **Modo sugerido**: `/investigate` (punto 2) → `/design` acotado → `/execute` → `/validate`
> **Plan**: `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` (F1-F7 ya shipped) — este brief es correctivo, no agrega fases nuevas al plan.
> **Origen**: auditoría de UX en vivo hecha por un agente con contexto limpio (solo conocía el plan original, no la implementación), actuando como usuario real de la intranet contra `Educa.API` + `educa-web` corriendo en TEST DB. Ver hallazgos completos abajo.

## OBJETIVO
Cerrar las brechas de UX y los bugs encontrados en la auditoría post-cierre del panel de ayuda: la sección "Ayuda" es prácticamente invisible para roles no-administrativos, la alerta de sesión por salud crítica (prometida en F6) no dispara en absoluto, y hay dos bugs de UI reproducibles en los selectores de formulario.

## PRE-WORK OBLIGATORIO
- Leer `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` completo (F4/F5/F6 en particular) para el diseño original de navegación y de la alerta de salud crítica.
- Leer `contracts/auth.md` § Alerta de salud crítica en `educa-coord` — el campo `dimensionesSaludCritica` en el payload de login/refresh y el mapeo de roles del tier Administrativo.
- Leer los briefs cerrados `educa-web/.claude/chats/closed/{479,480,481}-fe-panel-ayuda-*.md` — tienen el detalle de implementación real (facades, servicios, dónde vive cada pieza) necesario para diagnosticar los puntos 1 y 2 sin adivinar.
- Reproducir cada hallazgo en vivo antes de tocar código (ver pasos de reproducción en cada punto abajo) — no asumas la causa raíz sin confirmarla.

## HALLAZGOS DE LA AUDITORÍA (fuente de este brief)

### 1. Navegación a "Ayuda" invisible para roles no-admin (CRÍTICO)
Un usuario Profesor (y por extensión cualquier rol no-administrativo) no tiene ningún ítem de navegación visible hacia "Ayuda": no aparece en la barra superior (solo "Inicio"), no está en el menú de perfil, y el botón "Menú" (hamburguesa) no respondía visualmente al clic durante la auditoría. La única forma de llegar era el buscador `Ctrl+K`, que un usuario promedio de intranet no conoce. El botón flotante "Reportar" (`Ctrl+Alt+F`) abre un mini-modal de ticket standalone, distinto de la página "Ayuda" completa — no da acceso a QA ni a Salud de sede.

Esto contradice directamente la decisión ya tomada en F4: *"La página es visible a todo usuario logueado — sin gate de capability para acceder a la página en sí"* y el objetivo de que fuera fácil de encontrar.

### 2. Alerta de sesión por salud crítica no dispara (CRÍTICO)
Con una dimensión (Infraestructura) confirmada en estado "Crítico", el agente auditor inició sesión como Directora (tier Administrativo, tiene la capability y el gap del switcher de sesiones ya fue corregido en F6 — ver brief 481 § VERIFICACIÓN EN VIVO) y también refrescó `/intranet`: no apareció ninguna alerta visual ni sonora. Revisando la consola y las network requests no hay ninguna llamada relacionada con la alerta al cargar la sesión.

Esto es una regresión o un gap real sobre una funcionalidad que F6 (brief 481) declaró verificada en vivo end-to-end (ver § VERIFICACIÓN EN VIVO de ese brief) — investigar si cambió algo después (ej. al mergear F7) o si la verificación original tenía un hueco no detectado (ej. probó solo con el usuario `CODE CLAUDE` en un escenario específico).

### 3. Dropdowns que no cierran (bug de UI, reproducible)
En "Generar ticket" → selector "Tipo de problema", y en "Reportar salud de sede" → selectores "Dimensión" y "Severidad": al elegir una opción, el listado desplegado queda flotando superpuesto sobre el contenido siguiente hasta hacer clic en otro lugar de la página.

**Pasos**: Ayuda → Generar ticket → clic en "Tipo de problema" → seleccionar cualquier opción → el listado permanece visible sobre "Descripción".

### 4. Sin confirmación visual al crear un ticket
A diferencia de "Salud de sede" (que muestra "Reporte enviado correctamente."), crear un ticket desde "Generar ticket" limpia el formulario y el ticket aparece en la lista de abajo, pero no hay ningún toast/mensaje de éxito. Inconsistente con el patrón ya usado en el resto de la sección.

## DECISIONES YA TOMADAS (no rediscutir)
- No se agregan fases nuevas al plan — este es un brief correctivo sobre F4/F5/F6, el plan permanece cerrado.
- La navegación a "Ayuda" debe quedar accesible por un camino descubrible sin atajos de teclado (menú, sidebar, o equivalente ya usado por otras páginas visibles a todo rol como "Inicio").
- El botón flotante "Reportar" no se elimina ni se reemplaza — es una funcionalidad aparte, coexiste con la navegación a "Ayuda".
- El punto 2 (alerta crítica) requiere diagnóstico antes de fix — no asumir la causa; puede ser un bug de regresión, un problema de timing del `effect()`, o una condición de datos que la verificación original de F6 no cubrió.

## ALCANCE
- **Punto 1**: agregar un ítem de navegación a "Ayuda" descubierto por cualquier rol logueado, en el lugar consistente con el resto del menú de la intranet (investigar dónde vive hoy "Inicio" y replicar ese patrón, no inventar uno nuevo).
- **Punto 2**: investigar (`/investigate`) por qué `SaludSedeAlertService` no dispara la alerta en el flujo real de login/refresh a pesar de que F6 lo dio por verificado; corregir la causa raíz.
- **Punto 3**: corregir el comportamiento de cierre de los dropdowns PrimeNG usados en "Tipo de problema", "Dimensión" y "Severidad" (confirmar si es un problema de configuración del componente o un conflicto de z-index/overlay compartido).
- **Punto 4**: agregar el mismo patrón de toast de éxito que ya usa "Salud de sede" al crear un ticket exitosamente.

## TESTS MÍNIMOS
- Un usuario de cualquier rol logueado puede llegar a "Ayuda" navegando por UI visible, sin atajos de teclado ni URL directa.
- Con una dimensión en estado Crítico y un usuario de tier Administrativo, la alerta visual+sonora aparece tanto en login como en refresh de sesión (test que reproduzca el escenario real, no solo unitario de la lógica del signal).
- Un usuario de tier NO Administrativo no ve la alerta aunque haya una dimensión Crítica (no romper el comportamiento ya correcto).
- Seleccionar una opción en "Tipo de problema" (ticket) cierra el dropdown sin necesidad de un clic adicional fuera del componente.
- Ídem para "Dimensión" y "Severidad" (salud de sede).
- Crear un ticket exitosamente muestra un mensaje de confirmación visible.

## REGLAS OBLIGATORIAS
- No tocar el alcance funcional ya shippeado de F1-F7 más allá de lo necesario para corregir estos 4 puntos.
- No introducir un gate de capability nuevo para acceder a "Ayuda" — sigue siendo visible a todo usuario logueado (decisión de F4, no rediscutir).
- Para el punto 2: no volver a implementar tiempo real (SignalR/WebSocket) — la alerta sigue leyéndose del payload de login/refresh, según la decisión original de F6.
- Seguir las convenciones ya establecidas (Angular Signals, patrón facade, `WalFacadeHelper.execute` para mutaciones).

## FUERA DE ALCANCE
- Sembrar contenido real de FAQ para que la sección QA no se vea vacía por defecto (hallazgo 5 de la auditoría) — es un tema de datos/contenido, no de código; queda para quien gestione el rollout a producción.
- El error transitorio de compilación TS2322 sobre `AYUDA_TICKET_MANAGE` visto durante la auditoría — no fue reproducido de forma consistente y se atribuye a edición concurrente de otro worktree en ese momento, no a un bug real del código shippeado.
- Cualquier fase de administración nueva — F7 (admin de FAQ/tickets) ya shipped y no tuvo hallazgos negativos en la auditoría.

## VALIDACIÓN FINAL
- `npm run lint` limpio.
- `npm run build` limpio.
- `npm run test` — tests mínimos de arriba pasando, sin romper la suite existente.
- Verificación en vivo obligatoria antes de cerrar (no diferir): repetir el escenario exacto de la auditoría — usuario Profesor busca y encuentra "Ayuda" sin atajos, usuario Administrativo con una dimensión Crítica ve la alerta en login y en refresh, dropdowns cierran solos, toast de éxito aparece al crear ticket.

## CRITERIOS DE CIERRE
- [ ] Validación final (lint/build/test) pasa, incluida verificación en vivo de los 4 puntos.
- [ ] Brief movido a `closed/` (o `awaiting-prod/` si la verificación en vivo se difiere por decisión explícita del usuario).
- [ ] Commit final con referencia a este brief (485).

## COMMIT MESSAGE sugerido
```
fix(educa-web): address help panel UX gaps found in user audit

Adds discoverable navigation to the help panel for all roles, fixes
the critical-health session alert not firing on login/refresh,
closes dangling dropdown overlays in ticket/salud-sede selectors,
and adds a success toast on ticket creation. Follow-up to
xrepo-panel-ayuda-intranet (F4/F5/F6), based on a live UX audit.
```

## CIERRE
Al cerrar, pedir feedback sobre: cuál resultó ser la causa raíz real de que la alerta crítica no disparara (regresión vs. hueco de verificación original en F6), y si el patrón de navegación elegido para "Ayuda" quedó consistente con el resto del menú.

## IMPLEMENTATION DETAIL (post-cierre)

**Punto 1 — navegación a "Ayuda"**: `MENU_ITEMS` (`intranet-menu.config.ts`) ya declaraba el item "Ayuda" (modulo `'inicio'`, capability `INTRANET`, sin `soloParaRol`) desde F4 — el dato existía. La causa raíz real era que `IntranetLayoutComponent._allItems()` (`intranet-layout.component.ts`) retorna `[]` a propósito cuando el módulo activo es `'inicio'`, así que `.nav-links` nunca renderiza nada para ese módulo — "Inicio" mismo solo se alcanza clickeando el logo, nunca como pill de texto. Fix: se agregó un link fijo "Ayuda" (`intranet-layout.component.html`/`.scss`), siempre visible junto al logo en desktop y mobile, independiente del módulo activo — mismo nivel de "siempre visible" que el logo/Inicio, sin tocar la arquitectura de `_allItems()`/módulo `'inicio'`.

**Punto 2 — alerta de salud crítica**: no fue una regresión de F7 — fue un hueco real en la verificación original de F6. `SessionRefreshService.verifySession()` (`session-refresh.service.ts`) llama primero a `GET /api/auth/perfil`, que solo resuelve claims del JWT y **nunca** incluyó `dimensionesSaludCritica` (confirmado en `contracts/auth.md`: ese campo solo viaja en login/refresh/mobile-login, a propósito — perfil no es "un endpoint de chequeo de sesión"). Si el perfil era válido, el código saltaba directo a `scheduleRefresh()` sin llamar a `refresh()` — así que un simple F5 con sesión ya válida nunca hidrataba la alerta. F6 solo probó login real (dispara) y el switcher dev (hard-reload, gap ya conocido) — nunca probó "F5 con sesión ya válida", que es justo el escenario que reprodujo el auditor. Fix (decisión de diseño confirmada con el usuario): `refreshAfterValidProfile()` — cuando el perfil es válido, se llama a `refresh()` de todas formas para hidratar el signal, siguiendo leyendo el dato exclusivamente del payload de refresh (sin agregar un endpoint/canal nuevo). Tests actualizados en `session-refresh.service.spec.ts` (21 tests, todos verdes). Verificado en vivo contra `TEST DB` (usuario Director, dimensión Infraestructura en Crítico preexistente): la alerta dispara en login y se confirmó repetidas veces en F5 (logs del backend muestran `POST /api/Auth/refresh` + query a `SLS_EstadosVigentes` en cada reload).

**Punto 3 — dropdowns que no cierran**: los 3 `p-select` (`ayuda-ticket.component.html` "Tipo de problema", `ayuda-salud-sede.component.html` "Dimensión"/"Severidad") no tenían `appendTo="body"`, a diferencia de la convención ya usada en otras vistas admin del mismo dominio (ej. `ticket-bandeja.component.html`). Sin `appendTo="body"` el overlay se renderiza dentro del flujo del contenido de la sección (bajo `p-tabs`/router-outlet) en vez de portalarse a `body`, quedando flotando. Fix: `appendTo="body"` agregado a los 3 selects. Verificado en vivo — cierran solos tras seleccionar una opción.

**Punto 4 — toast de éxito al crear ticket**: el hallazgo #4 de la auditoría estaba desactualizado — `ayuda-ticket.component.ts` ya mostraba el toast ("Ticket creado — Tu ticket fue registrado correctamente.") desde el commit original de la sección (`f6dec518`, 2026-07-25), antes de esta auditoría. No se tocó código. Verificado en vivo — el toast aparece correctamente al crear un ticket.
