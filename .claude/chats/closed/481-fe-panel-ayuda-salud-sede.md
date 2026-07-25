# 481 — FE: sección Salud de sede del panel de ayuda

> **Repo**: `educa-web`
> **Creado**: 2026-07-25 · **Estado**: ⏳ pendiente arrancar
> **Modo sugerido**: `/design` acotado a esta fase → `/execute` → `/validate`
> **Plan**: `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` § F6
> **Origen**: sesión de definición + diseño del panel de ayuda de la intranet (educa-coord, 2026-07-24/25). F4 (shell + QA) ya shipped en `main`. F3 (Salud de sede, BE) ya shipped en `Educa.API`, incluida una corrección post-cierre de la sub-jerarquía de roles — ver `contracts/api-catalog.md` § Ayuda y `contracts/auth.md` § Alerta de salud crítica en `educa-coord`.

## OBJETIVO
Implementar la sección "Reportar salud de sede": formulario de reporte por dimensión con selector de severidad, vista del estado vigente por dimensión (mensaje genérico cuando todo está bien), y la alerta en sesión (con sonido) para roles del tier Administrativo cuando el login/refresh indica una dimensión en Crítico. El shell de navegación ya existe (F4) — esta fase reemplaza el placeholder de la ruta `salud-sede`.

## PRE-WORK OBLIGATORIO
- Leer `../educa-coord/contracts/api-catalog.md` § Ayuda para el shape de `POST /api/salud-sede/reportes` y `GET /api/salud-sede/estado`.
- Leer `../educa-coord/contracts/auth.md` § Alerta de salud crítica — ahí está el campo agregado al payload de login/refresh (`DimensionesSaludCritica` o el nombre real que haya quedado) y el mapeo completo de qué roles caen en el tier Administrativo (Director, Asistente Administrativo, Promotor, Coordinador Académico, Administrador — confirmar contra el contrato, no memorizar esta lista).
- Investigar cómo se resuelve hoy en el FE el objeto de usuario/sesión post-login (dónde vive el response de `/api/auth/login` una vez logueado) para saber dónde enganchar la lectura de la alerta — probablemente ya existe un store/servicio de sesión.
- Investigar el patrón de F4/F5 (facade + servicio + componentes por sección) para replicarlo.

## DECISIONES YA TOMADAS (no rediscutir)
- Cualquier usuario autenticado de cualquier rol puede reportar — sin gate de capability para el formulario de reporte.
- Todos los roles ven el mismo estado vigente por dimensión al consultar — no hay lectura personalizada por rol.
- Sin historial completo visible — solo el estado vigente por dimensión.
- La alerta es solo para el tier Administrativo, se evalúa en login/refresh (no tiempo real, no SignalR/WebSocket), y se muestra en cada login/refresh mientras la dimensión siga Crítica (sin tracking de "ya la vio").
- "Con sonido" — la alerta debe incluir un indicador sonoro además del visual (investigar si ya hay un patrón de notificación con sonido en el proyecto antes de agregar un audio nuevo).

## ALCANCE
- Formulario de reporte: selector de dimensión, selector de severidad/rating, submit contra `POST /api/salud-sede/reportes`.
- Vista de estado vigente: por cada dimensión, mostrar el rating actual; si todo está bien, mostrar el mensaje genérico confirmado en la definición ("todo está bien", sin detalle por dimensión).
- Alerta de sesión: al detectar (en el response de login/refresh ya existente en el store de sesión del FE) que alguna dimensión de la sede del usuario está en Crítico, y el usuario es de tier Administrativo, mostrar una alerta visual + sonora. Investigar si el store de sesión del FE necesita extenderse para exponer este campo nuevo del payload de login, o si ya se propaga automáticamente.
- Reemplazar el placeholder de la ruta `salud-sede` en `ayuda.routes.ts`.

## TESTS MÍNIMOS
- El formulario de reporte envía dimensión + severidad correctamente.
- La vista de estado vigente muestra el rating real de cada dimensión desde `GET /api/salud-sede/estado`.
- Cuando ninguna dimensión está en mal estado, se muestra el mensaje genérico (no un estado vacío ni un error).
- Un usuario de tier Administrativo con una dimensión Crítica en su sede ve la alerta al cargar la sesión.
- Un usuario que NO es de tier Administrativo (ej. Profesor, Estudiante) NO ve la alerta, aunque haya una dimensión Crítica en su sede.
- El formulario de reporte es accesible para cualquier rol (sin gate de capability).

## REGLAS OBLIGATORIAS
- No implementar tiempo real (SignalR/WebSocket) para la alerta — se lee del payload existente de login/refresh.
- No mostrar historial completo de reportes — solo el estado vigente.
- No tocar el shell ni las secciones QA (F4) o Ticket (F5) más allá de reemplazar el placeholder de `salud-sede`.
- No implementar vista de administración (F7, si aplicara a este dominio — el plan no la prevé para Salud de sede, confirmar contra el plan si hay dudas).
- Seguir las convenciones ya establecidas por F4/F5 (Angular Signals, patrón facade, estructura de carpetas por sección).

## IMPLEMENTATION DETAIL
Implementado en worktree `chat/481-fe-panel-ayuda-salud-sede`, commit `00ce6936`.
- **Files touched**: `ayuda.routes.ts` (ruta `salud-sede` apunta al componente real), nuevo
  `sections/ayuda-salud-sede/` (models + service + facade + component, con specs), eliminado
  `sections/ayuda-salud-sede-placeholder/`. Alerta de sesión: `auth.models.ts` (+
  `dimensionesSaludCritica?` en `LoginResponse`), `auth-api.service.ts` (+ campo en el tipo de
  retorno de `refresh()`), `auth.service.ts` (+ signal `dimensionesSaludCritica` y método
  `setDimensionesSaludCritica()`), `session-refresh.service.ts` (+ inyecta `AuthService`, llama al
  setter tras cada refresh exitoso), `session-activity.service.ts` (+ inyecta el nuevo
  `SaludSedeAlertService` para instanciarlo temprano), nuevo `core/services/salud-sede/` (el
  service de la alerta, no featured — cross-cutting).
- **Interfaces/signatures created or modified**: `SaludSedeDimension`, `SaludSedeRating`,
  `CrearReporteSaludDto`, `EstadoSaludSedeDto` (`models/salud-sede.models.ts`);
  `SaludSedeService.crearReporte()/getEstadoVigente()`; `AyudaSaludSedeFacade` (facade con signals,
  mismo patrón que `AyudaQaFacade`/`AyudaTicketFacade`); `AyudaSaludSedeComponent`;
  `AuthService.dimensionesSaludCritica` (signal readonly) + `setDimensionesSaludCritica()`;
  `SaludSedeAlertService` (nuevo, `core/services/salud-sede/`).
- **Architectural observations**: `AyudaSaludSedeFacade.reportar()` usa `WalFacadeHelper.execute({
  consistencyLevel: 'server-confirmed' })` — misma regla de lint `wal/no-direct-mutation-subscribe`
  que F5, mismo patrón de solución (sin estado optimista: el reporte no agrega un item a una lista
  local). La alerta no necesitó gate de rol en el FE — el BE ya filtra `dimensionesSaludCritica`
  por tier Administrativo (lista vacía para cualquier otro rol). `SessionRefreshService` llama a
  `AuthApiService.refresh()` directo (no pasa por `AuthService.login()`), así que hubo que inyectar
  `AuthService` ahí también para propagar el campo tras cada refresh. `SaludSedeAlertService` usa un
  `effect()` en su constructor que reacciona al signal — se instancia inyectándolo desde
  `SessionActivityService` (arranca con el resto del ciclo de vida de sesión) para que el `effect()`
  capture, en su primera corrida, el valor ya seteado por el login que precede a la entrada a la
  intranet.
- **Current state**: lint/build/test verdes (234 test files, 2390 tests). Verificación en vivo
  diferida a la sesión conjunta F5+F6.

## APRENDIZAJES TRANSFERIBLES
- De F4: patrón de facade con signals + servicio HTTP ya establecido — replicar en `sections/ayuda-salud-sede/`.
- De F3 (BE): la jerarquía de resolución de conflictos y el tier Administrativo tuvieron dos correcciones post-cierre (sub-jerarquía Administrador > Director > resto, y el rol Apoderado cae en tier Estudiante) — no afectan directamente a esta fase FE (el FE solo consume el estado ya resuelto por el BE), pero confirman que el dominio tiene reglas de negocio no triviales; si algo del contrato de `auth.md` no queda claro, no asumir, leer el código real de `AuthFacadeService`/`SaludSedeRolTierMapper` en `Educa.API` si hace falta.
- El campo de alerta viaja en el payload de login/refresh — probablemente ya existe un lugar central en el FE donde se procesa ese response (store de auth/sesión); extenderlo ahí es más consistente que leer el campo de forma ad-hoc en el componente de la sección.

## FUERA DE ALCANCE
- Shell de navegación, sección QA (F4) y sección Ticket (F5) — ya shipped/en curso, no tocar más allá de lo indicado.
- Historial completo de reportes de salud.
- Notificación en tiempo real.
- Regla de desempate por "más reciente" (fuera de alcance también en el BE).
- Vistas de administración del catálogo de dimensiones (no previstas en el plan).

## VALIDACIÓN FINAL
- `npm run lint` limpio.
- `npm run build` limpio.
- `npm run test` — tests mínimos de arriba pasando, sin romper la suite existente.
- Verificación en vivo diferida: por pedido explícito del usuario, la verificación en vivo de F4+F5+F6 se hace junta al final, después de que esta fase cierre — no hace falta levantar servidores acá.

## VERIFICACIÓN EN VIVO (post `awaiting-prod`)
Hecha con `Educa.API` + `educa-web` corriendo contra TEST DB (usuario `CODE CLAUDE`, Administrador).
Reportar dimensión + severidad funcionó; el estado vigente pasó correctamente de "Todo está bien" a
mostrar "Infraestructura: Crítico" tras el reporte. La alerta de sesión (visual+sonora) se confirmó
end-to-end vía login real (`AuthService.login()` → `router.navigate`, no reload duro) — el efecto de
`SaludSedeAlertService` reacciona correctamente al signal poblado por el BE.

Dos gaps reales encontrados y corregidos en esta pasada:
1. El switcher de sesiones guardadas (dev-only, `POST /switch-session`) nunca pasaba por
   `PopulateSaludCriticaAsync` — `StoredSessionDto` no llevaba el campo. Corregido en BE
   (`AuthFacadeService.SwitchSessionAsync`) y FE (`AuthService.switchSession()`), commits `15801a77`
   (`Educa.API`) y `c9a94651` (`educa-web`).
2. Confirmado (no un bug, documentado para quien retome F7/futuro): el switcher hace
   `window.location.href = '/intranet'` (hard reload) tras el switch, lo que descarta cualquier toast
   en vuelo antes de que se pinte — por eso la alerta no se veía usando el switcher aun con el gap #1
   corregido. El login real usa `router.navigate` (SPA, sin reload) y sí muestra la alerta
   correctamente — confirmado con el mismo pipeline que ya renderiza otros toasts (ej. "Ticket
   creado"). No se tocó el hard-reload del switcher: es una herramienta de dev, no afecta producción.

## CRITERIOS DE CIERRE
- [x] Validación final (lint/build/test) pasa, incluida verificación en vivo (ver arriba).
- [x] `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` actualizado marcando F6 como shipped.
- [x] Brief movido `awaiting-prod/` → `closed/`.
- [x] Commit final único: código + move del brief + update del plan en coord (si el flujo del repo lo permite en un solo commit; si no, dos commits atados por referencia, uno por repo).

## COMMIT MESSAGE sugerido
```
feat(educa-web): add sede health section + critical alert to help panel

Implements "Reportar salud de sede": report form by dimension +
severity, current-state view (generic "all good" message when
nothing's critical), and a visual+sound session alert for
Administrativo-tier users when login/refresh flags a Crítico
dimension for their sede. Part of xrepo-panel-ayuda-intranet F6.
```

## CIERRE
Al cerrar, pedir feedback sobre: si hubo que extender el store de sesión del FE para propagar el campo nuevo de alerta, y si el patrón de sonido para notificaciones ya existía en el proyecto o hubo que agregarlo desde cero.
