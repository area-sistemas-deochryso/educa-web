# 479 — FE: página del panel de ayuda (shell + sección QA)

> **Repo**: `educa-web`
> **Creado**: 2026-07-25 · **Estado**: ⏳ pendiente arrancar
> **Modo sugerido**: `/design` acotado a esta fase → `/execute` → `/validate`
> **Plan**: `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` § F4
> **Origen**: sesión de definición + diseño del panel de ayuda de la intranet (educa-coord, 2026-07-24/25). Las 3 fases BE (F1 FAQ+Wizard, F2 Ticket, F3 Salud de sede) ya están shipped en `Educa.API` — ver `contracts/api-catalog.md` § Ayuda y `contracts/auth.md` § Alerta de salud crítica en el repo `educa-coord`.

## OBJETIVO
Construir la página de consulta del panel de ayuda: visible a todo usuario logueado, con el shell de navegación de 3 secciones (QA, Ticket, Salud de sede — NO 4, el wizard vive embebido dentro de QA, no es una entrada de menú propia) y la implementación completa de la sección QA: listado de FAQ filtrado server-side por capability, filtro de categoría opcional + búsqueda de texto libre, y el botón "ir→" que dispara el wizard embebido cuando una FAQ tiene uno asociado. F5 (Ticket) y F6 (Salud de sede) son fases hermanas que llenan las otras 2 secciones del shell — no las implementes acá, pero el shell debe dejar el lugar para que esas fases se enchufen sin rehacer la navegación.

## PRE-WORK OBLIGATORIO
- Leer `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` completo — tiene la tabla de Decisiones con toda la lógica de negocio ya cerrada (incluidas dos correcciones post-cierre de F3 que no afectan a esta fase pero dan contexto del dominio).
- Leer `../educa-coord/contracts/api-catalog.md` § Ayuda — ahí están documentados los endpoints de `GET /api/faq` con sus query params (`categoria`, `q`) y el shape de la respuesta (FAQ + wizard opcional embebido).
- Investigar en el código actual de `educa-web` cómo están armadas otras páginas de la intranet con navegación por secciones/tabs (para reusar el patrón, no inventar uno nuevo) y cómo se resuelve `hasCapability()` en el FE hoy (patrón shipped en xrepo-57) — aunque esta página es visible a todo usuario, el filtrado de contenido de FAQ ya viene resuelto del lado del BE (el endpoint ya filtra), así que el FE no necesita repetir el chequeo de capability para las FAQ individuales.

## DECISIONES YA TOMADAS (no rediscutir)
- La página es visible a todo usuario logueado — sin gate de capability para acceder a la página en sí.
- 3 entradas de menú: QA, Generar ticket, Reportar salud de sede. El wizard NO es una 4ta entrada.
- El wizard se dispara solo desde un botón "ir→" dentro de una respuesta de FAQ que tiene wizard asociado (relación 1:1 opcional) — no hay una lista de wizards independiente.
- Filtro por categoría es opcional en la UI (si no se usa, se muestran todas las categorías); búsqueda por texto libre.
- El filtrado de FAQ por capability del usuario ya lo hace el BE — el FE solo consume el endpoint, no reimplementa lógica de permisos sobre las FAQ individuales.

## ALCANCE
- Shell de la página con navegación entre las 3 secciones (componente/layout reusable para que F5/F6 solo agreguen su contenido).
- Sección QA: listado de FAQ (pregunta + respuesta), filtro de categoría (opcional, "todas" por default), input de búsqueda de texto libre — ambos conectados a los query params del endpoint `GET /api/faq`.
- Botón "ir→" visible solo en FAQ que tienen wizard asociado (el endpoint ya indica esto en el shape de la respuesta — confirmar el campo exacto al investigar el contrato).
- Componente de wizard: renderiza los pasos (texto+imagen) del wizard de la FAQ seleccionada, con navegación entre pasos (siguiente/anterior o similar — no hay un patrón de UX prescrito, usar criterio consistente con otros wizards/onboardings ya existentes en el proyecto si los hay).
- Entrada de menú/navegación hacia esta página nueva desde donde corresponda en la intranet (investigar el patrón de navegación existente — sidebar, menú, etc.).

## TESTS MÍNIMOS
- La página carga y muestra las 3 secciones del menú, sin la sección Ticket ni Salud de sede implementadas todavía muestran un placeholder o quedan ocultas hasta F5/F6 (a definir en `/design` — no bloquear esta fase por eso).
- Cambiar el filtro de categoría actualiza el listado de FAQ mostrado.
- Escribir en el buscador filtra el listado por texto.
- Una FAQ sin wizard asociado no muestra el botón "ir→".
- Una FAQ con wizard asociado muestra el botón, y al hacer clic se abre el wizard con sus pasos en el orden correcto.
- La página es accesible para cualquier usuario logueado (no hay guard de capability bloqueando el acceso).

## REGLAS OBLIGATORIAS
- No implementar contenido de Ticket ni Salud de sede en esta fase — solo el shell que las va a alojar.
- No reimplementar el filtrado de capability sobre las FAQ en el FE — el BE ya lo resuelve.
- Seguir las convenciones de estilo/componentes ya vigentes en `educa-web` (Angular Signals, según el perfil del proyecto).

## IMPLEMENTATION DETAIL
- **Files touched**: `src/app/features/intranet/intranet.routes.ts` (ruta `ayuda` + `loadChildren`),
  `src/app/features/intranet/shared/config/intranet-menu.config.ts` (entrada de menú "Ayuda",
  capability `INTRANET`, modulo `inicio`, sin `soloParaRol`), y todo lo nuevo bajo
  `src/app/features/intranet/pages/cross-role/ayuda/` (shell, rutas hijas, modelos, servicio HTTP,
  sección QA con facade + componentes `faq-list` y `faq-wizard-dialog`, placeholders de
  `ticket`/`salud-sede`).
- **Interfaces/signatures created or modified**:
  - `FaqDto` / `FaqWizardDto` / `FaqPasoDto` (`models/faq.models.ts`) — mapean 1:1 el DTO real del BE
    (`Educa.API/DTOs/Ayuda/FaqDto.cs`), no lo documentado en el catálogo (que no listaba shape exacto).
  - `FaqService.getFaqs(categoria?, q?)` — GET `/api/faq`, unwrap automático vía
    `apiResponseInterceptor` (no manual).
  - `AyudaQaFacade` — scoped al componente (no `providedIn: 'root'`), signals + debounce 300ms vía
    `Subject` (mismo patrón que `UsersDataFacade`), categorías derivadas client-side de un fetch
    inicial sin filtros.
- **Architectural observations**:
  - Shell (`AyudaShellComponent`) replica el patrón `MonitoreoShellComponent` (PrimeNG `p-tabs` +
    `router-outlet`, tab activo derivado de la URL) — 3 tabs fijos, `qa`/`ticket`/`salud-sede` como
    router children vía `ayuda.routes.ts`. F5/F6 solo reemplazan el `loadComponent` de sus rutas.
  - Acceso a la página: `data: { permissionPath: 'intranet' }` en la ruta `ayuda` — alias el
    permission-check al mismo path que Home (capability `INTRANET`, que todo rol ya tiene), igual
    truco que ya usa la ruta `admin/correlation/:id`. Sin esto, `permissionsGuard` (heredado del
    shell vía `canActivateChild`) bloquearía la página a falta de una capability propia — el BE de
    F1 no creó ninguna para esto (a propósito, según brief).
  - Wizard: PrimeNG `Stepper` embebido en un `p-dialog` modal (mismo stepper que `CTestK6Component`),
    disparado solo desde el botón dentro de una FAQ — nunca ruta propia.
- **Current state**: F4 implementada y validada localmente (build + lint + tests). Falta
  verificación en vivo contra BE real (ver VALIDACIÓN FINAL) — por eso el brief cierra a
  `awaiting-prod/`, no `closed/`.

## APRENDIZAJES TRANSFERIBLES
- Las 3 fases BE (F1/F2/F3) están shipped y documentadas en `educa-coord/contracts/api-catalog.md` § Ayuda — leer ese contrato antes de asumir cualquier shape de request/response.
- F3 (Salud de sede) dejó dos correcciones post-cierre importantes para cuando F6 se ataque: la alerta de Crítico solo es relevante para el tier Administrativo (ver `contracts/auth.md` § Alerta de salud crítica para el mapeo completo de roles), y hay una sub-jerarquía dentro de ese tier — no afecta a esta fase F4, pero da contexto de que el dominio de "ayuda" tiene reglas de negocio no triviales, vale la pena leer el plan completo antes de asumir simplicidad en F5/F6.

## FUERA DE ALCANCE
- Sección Ticket completa (F5 — brief separada).
- Sección Salud de sede completa, incluida la alerta visual/sonora en sesión (F6 — brief separada).
- Vistas de administración (F7 — depende de F1+F2, no de esta fase).

## VALIDACIÓN FINAL
- [x] Build de `educa-web` sin errores (`ng build --configuration production`, dev build también OK).
- [x] Lint sin errores (`ng lint` — 0 problemas tras fix de imports relativos profundos).
- [x] Tests: suite completa 231/231 archivos · 2379/2379 tests OK, incluidos 12 tests nuevos
  (`AyudaQaFacade`, `FaqListComponent`, `FaqWizardDialogComponent`) que cubren los TESTS MÍNIMOS de
  arriba (filtro categoría, búsqueda con debounce, botón "ir→" condicional, navegación de pasos del
  wizard, manejo de error).
- [ ] Verificación en vivo: login con un usuario, navegar a la página, confirmar que el listado de
  FAQ, el filtro, la búsqueda y el wizard embebido funcionan contra el BE real — **pendiente**, no
  se levantó el entorno local (BE + FE + SQL de F1/F2/F3 aplicado) durante esta sesión.

## VERIFICACIÓN EN VIVO (post `awaiting-prod`)
Hecha con `Educa.API` + `educa-web` corriendo contra TEST DB, usuario `CODE CLAUDE` (Administrador),
vía el switcher de sesiones guardadas de `/intranet/login`. Sección QA: listado carga, filtro y
búsqueda responden, sin errores de consola/red. No había FAQ seedeadas en TEST DB (esperado — F1 no
seedea contenido, es admin-managed) así que el wizard no se probó con datos reales en esta pasada.

## CRITERIOS DE CIERRE
- [x] Validación final pasa, incluida verificación en vivo (ver arriba).
- [x] `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` actualizado marcando F4 como shipped.
- [x] Brief movido `awaiting-prod/` → `closed/`.
- [x] Commit del código en la branch del worktree (`chat/479-fe-panel-ayuda-qa-shell`); el commit del
  plan coord queda separado (repo git distinto) atado por referencia al mismo brief.

## COMMIT MESSAGE sugerido
```
feat(educa-web): add help panel page shell + FAQ section with wizard

Adds the 3-section help panel page (QA, Ticket, Salud de sede shell)
visible to any logged-in user. Implements QA: capability-filtered FAQ
list (server-side), optional category filter, free-text search, and
an embedded step wizard triggered from FAQs that have one. Part of
xrepo-panel-ayuda-intranet F4.
```

## CIERRE
Al cerrar, pedir feedback sobre: si el shell de navegación quedó lo suficientemente desacoplado para que F5/F6 solo agreguen contenido sin tocar la estructura, y si hubo fricción consumiendo el contrato de `GET /api/faq` tal como está documentado en `api-catalog.md`.
