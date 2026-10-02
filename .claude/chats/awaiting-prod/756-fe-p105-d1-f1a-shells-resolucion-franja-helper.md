# 756 — FE: P105 D1 F1a — Shells por rol, resolución de par y franja, selector, encabezado y helper

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1-F1a · **Creado**: 2026-10-02 · **Estado**: ✅ implementado y validado local (lint/build/test); ⏳ verificación en vivo pendiente
> **Origen**: brief 755 (validación D1, cerrado) · diseño en brief 753
> **Validación prod**: ⏳ pendiente desde 2026-10-02 (verificación en vivo del hub: par 24/34 y 14/25 en TEST, deep link con F5, par y franja inválidos, selector; ver sección VERIFICACIÓN EN VIVO)
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso"
> **depends_on**: 752 (integrado en `main`, commit `bfbfc967`; re-confirmar al arrancar)
> **MODO SUGERIDO**: `/investigate` corto → `/execute` → `/validate`
> **exclusive**: `false`
> **isolation**: `worktree`
> **touches**: `educa-web` — `intranet.routes.ts`, `pages/{profesor,estudiante}/cursos/**` (shell nuevo, sin tocar los modales), capa compartida de intranet (helper)

## OBJETIVO

Dejar funcionando el **esqueleto del hub** para profesor y estudiante, sin pestañas reales todavía (la pestaña Contenido llega en F1b): ruta con URL propia por par (curso, salón), resolución de la franja, selector, avisos de par/franja inválidos, encabezado del par y helper único de enlaces. Los modales actuales **siguen intactos** (se retiran en F6).

## DECISIONES VALIDADAS (no re-preguntar; ver el plan)

| Tema | Resultado |
|---|---|
| Ruta | Par en el path, franja en query **opcional**. **Un shell por rol** (profesor, estudiante), cada uno con `permissionPath` hacia su página de Cursos; sin seed BE. Solo profesor y estudiante. |
| Preselección | Query válido → única franja con contenido → franja en curso → siguiente futura (nunca una ya terminada). Selector oculto con 1 franja; cada usuario ve solo las suyas. |
| Encabezado | Curso y Salón van en el encabezado del hub (son del par). |
| Navegación | Las pestañas navegan con reemplazo de URL; el query de franja **sobrevive** al cambio de pestaña. |
| Par inválido | Redirige a Cursos con toast informativo (ej. "No se encontró este curso para tu usuario."), sin datos técnicos. |
| Franja inválida (par válido) | Se ignora, se aplica la preselección y toast de advertencia (ej. "La franja indicada no corresponde a este curso. Se muestra la franja que corresponde por horario."). Sin la palabra "id". |
| Helper | Un solo helper que construye el destino del hub desde un horario. Vive en la capa compartida de intranet (`features/intranet/shared`), no en el `@shared` global. |

## PRE-WORK (verificado el 2026-10-02; re-verificar, el código puede haber cambiado)

- Rutas planas por rol (`PROFESOR_ROUTES_RAW`, `ESTUDIANTE_ROUTES_RAW`) envueltas por `withViewAsGate`, que añade `viewAsGateGuard` a cada ruta del arreglo. Poner las rutas nuevas en esos arreglos hereda el gate sin tocar el guard.
- `permissionsGuard` está como `canActivateChild` del layout y usa `data.permissionPath` subiendo por los padres; el valor se compara contra las vistas permitidas del usuario. Capabilities de Cursos: profesor `CURSOS_PROFESOR_PAGE_VIEW`, estudiante `CURSOS_ESTUDIANTE_PAGE_API_VIEW`. Convención en `.claude/reference/route-permission-sharing.md`.
- Una ruta sin hijos exige consumir todo el path, así que `profesor/cursos` y `profesor/cursos/:cursoId/:salonId` **no** compiten por el orden; verificarlo con un test de ruteo igualmente.
- `HorarioProfesorDto` trae `id`, `cursoId`, `salonId`, `diaSemana`, `horaInicio`, `horaFin`, `cursoNombre`, `salonDescripcion`. Confirmar el equivalente del lado estudiante (el listado de cursos usa `horario.cursoId`).
- Hoy `?horarioId=` entra por `profesor-cursos.component.ts` y `estudiante-cursos.component.ts` (`handleHorarioQueryParam`). Nota: el del profesor busca el horario en `facade.vm().horarios` sin esperar la carga (el condicionante "esperar horarios" ya se manifiesta ahí). **No tocar esos handlers en F1a**: el redirect legacy es de F5a.
- Cachés por usuario bajo "ver como": revisar INV-VIEWAS01 (`educa-coord/invariants/permisos.md`) antes de introducir estado o caché nuevo.

## CRITERIOS DE ACEPTACIÓN

1. `profesor/cursos/:cursoId/:salonId` y `estudiante/cursos/:cursoId/:salonId` existen, con título, gate de "ver como" y autorización heredada de su página de Cursos. Un administrador sin usuario elegido es redirigido al selector.
2. El hub **no valida ni redirige hasta que los horarios hayan cargado**: recargar la URL (F5) con un par válido nunca expulsa al usuario.
3. Par que no pertenece al usuario o no existe → redirige a la lista de Cursos del rol con toast informativo.
4. Resolución de franja: query válido → única con contenido → en curso → siguiente futura. Con una sola franja el selector no se muestra. Con co-docencia cada profesor ve solo las suyas.
5. `horarioId` que no pertenece al par → se ignora, se aplica la preselección y sale la advertencia.
6. El encabezado muestra Curso y Salón. Cambiar de franja con el selector actualiza el query con reemplazo de URL.
7. La resolución de la franja con contenido no bloquea el primer pintado.
8. El helper tiene tests y es la única fuente de la URL del hub. Ningún consumidor existente se migra todavía (F5b).
9. Los modales actuales y sus rutas no cambian de comportamiento. `lint`, `build` y `test` en verde.

## VERIFICACIÓN EN VIVO

- Par curso 24 / salón 34 (2 franjas, contenidos 8 y 11) y par 14 / salón 25 (3 franjas, sin contenido) en TEST (`UseTestEnv: true`).
- **No hay estudiante de prueba confirmado en un par multi-franja**: confirmar antes de prometer verificación como estudiante; si no existe, verificar solo como profesor y usar "ver como".
- Probar: recarga con deep link, par inválido, franja inválida, una franja vs varias, y que el query sobrevive al cambio de pestaña (cuando F1b lo permita; en F1a, al cambiar de franja).
- Chrome visible (ocluida, `captureScreenshot` se cuelga). Login con el switcher, sin tipear credenciales. En prod solo lectura.

## FUERA DE ALCANCE

- Pestañas reales y contenido (F1b), Calificaciones/Información (F2), Asistencia (F3), Salón (F4).
- Tarjeta por par, redirect legacy (F5a), migración de consumidores y `returnTo` (F5b), retirada de modales (F6).
- Cualquier cambio de BE. Admin y apoderado.

## REGLAS OBLIGATORIAS

- Código en inglés, UI en español. Standalone + OnPush, `inject()`, `logger`, alias de imports.
- Ante contradicción con lo documentado o con el código, detener y consultar.
- Push a `main` de `educa-web` = deploy a prod: este chat no pushea sin autorización.

## HALLAZGOS /investigate (2026-10-02, worktree `WT/educa-web/756-...`, branch `chat/756-...`)

- **Worktree**: creado desde `main` @ `6820c6f0`; manifest registrado. Existe además un worktree ajeno `709-be-p107-...` (limpio, sin commits ahead, NO está en el manifest) — no tocar.
- **752** integrado en `main` (`bfbfc967`). `educa-coord/chats/running/` vacío (sin chat cross-repo activo).
- **Rutas**: `PROFESOR_ROUTES_RAW` / `ESTUDIANTE_ROUTES_RAW` en `intranet.routes.ts`; agregar ahí hereda `viewAsGateGuard`. `permissionPath` = `'intranet/profesor/cursos'` / `'intranet/estudiante/cursos'` (formato sin `/` inicial, igual que los precedentes).
- **Riesgo criterio 2**: `ProfesorStore` y `EstudianteCursosStore` arrancan con `loading: false` + `horarios: []`. Un guard ingenuo ve "vacío y sin carga" en F5 y expulsa. Además `ProfesorFacade.loadData()` retorna sin tocar `loading` si `entityId` es null. → el shell lleva su propio `settled` (carga vista de verdad) y, ante duda, muestra spinner, nunca redirige.
- **Horarios**: ambos roles usan `HorarioProfesorDto` (`id`, `cursoId`, `salonId`, `diaSemana` 1-5 = lun-vie, `horaInicio/Fin` "HH:mm", `cursoNombre`, `salonDescripcion`). Sin flag de "tiene contenido": se sonda con `getContenido(horarioId)` (`null` = sin contenido) — profesor vía `ProfesorFacade.getContenido`, estudiante vía `EstudianteApiService.getContenido`.
- **Hora del servidor**: `WalClockService.adjustedNow` (skew por header Date) evita un fetch a `/api/ServerTime`.
- **INV-VIEWAS01**: `EstudianteApiService.getMisHorarios` ya keyea su caché por `activeContext().entityId`; el hub no agrega caché propia.
- **Helpers reutilizables**: `todayDia()` en `shared/helpers/horario-block.helpers.ts`. Toasts: `ErrorHandlerService.showInfo/showWarning`.
