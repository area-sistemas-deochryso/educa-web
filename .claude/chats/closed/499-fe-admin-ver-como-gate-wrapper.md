# 499 — P92 F2: gate de selección + wrapper de módulo "ver como"

> **Coord ref**: `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md` § F2
> **Plan**: `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md`
> **Creado**: 2026-07-30 · **Estado**: ✅ desbloqueado — F1 shipped en `Educa.API` (brief 498, `chat/498-be-admin-ver-como-capability`, commit `c06f73e7`).
> **MODO SUGERIDO**: `/execute` directo (diseño ya cerrado en coord).
> **exclusive**: false
> **modules**: intranet-academico (cursos, salones, horarios) — estudiante y profesor
> **touches**: nuevas rutas/gate de admin, wrapper a nivel de módulo sobre `estudiante/*` y `profesor/*`, interceptor HTTP nuevo

## Contrato real que dejó F1 (no re-investigar, ya está shipped así)

- **Capability**: `ADMIN_VER_COMO` (`AccessLevel.Read`), asignada solo al rol Administrador (rol 8) — ningún otro rol admin-like (Director, Coordinador, etc.) la tiene por ahora.
- **Transporte**: headers HTTP, no query param — `X-View-As-Entity-Id` (id del usuario elegido) + `X-View-As-Rol` (rol elegido, se valida contra el rol que el endpoint espera). Hacen falta los dos.
- **Gate duro de solo lectura en el backend**: cualquier request con esos headers que NO sea `GET` devuelve 403 `ADMIN_VER_COMO_SOLO_LECTURA` — no hace falta que el FE evite mandar los headers en mutaciones, el backend ya lo rechaza, pero el interceptor de este brief solo debería agregarlos a `GET` de todos modos (no generar 403 esperables a propósito).
- **Otros 403 posibles**: `ADMIN_VER_COMO_NO_AUTORIZADO` (caller sin la capability) y `ADMIN_VER_COMO_ROL_NO_COINCIDE` (el rol del header no es el que el endpoint espera) — el interceptor/servicio de FE no debería poder disparar estos si el picker ya filtra correctamente por rol, pero conviene loguear si aparecen (bug de integración, no de uso normal).
- Endpoints cubiertos: todos los que ya usaban `RequireProfesorId()`/`RequireEstudianteId()` en `Educa.API` (cursos, salones, horarios de profesor/estudiante, incluido `mi-horario-hoy`) — no hace falta pedir nada nuevo al backend para el scope de este brief.

## Contexto

Confirmado en vivo (sesión coord 2026-07-30) que un admin puede navegar a rutas de estudiante/profesor pero las ve vacías, porque el backend resuelve la identidad exclusivamente desde el JWT. F1 (498) agrega el mecanismo del lado backend (capability admin-only + id explícito validado por rol). Este brief es la contraparte de frontend: dejar que el admin elija un usuario y ver esas páginas con sus datos reales.

## Decisiones ya resueltas en coord (no re-abrir sin motivo nuevo)

1. **Alcance a nivel de módulo completo** — un solo wrapper cubre todo el subárbol de rutas `estudiante/*` o `profesor/*` (cursos, salones, horarios), no página por página.
2. **Restricción de usuario elegible** — en páginas de profesor solo se puede elegir un profesor; en páginas de estudiante solo un estudiante. Sin cruce.
3. **Punto de entrada: pantalla gate dedicada** — antes de entrar a `estudiante/*` o `profesor/*` como admin, se obliga a elegir usuario; recién ahí redirige a la ruta real. Un banner dentro del módulo permite reabrir el mismo picker para cambiar de usuario sin volver a la pantalla gate.
4. **Búsqueda de usuario**: reutilizar el mecanismo de búsqueda por nombre+rol que ya existe en la página de Permisos y Usuarios del admin (`PermisosUsuariosDataFacade.searchUsers(termino, rol)` → `api.searchUsers`) — no crear un buscador nuevo.
5. **Threading del id hacia el backend**: interceptor HTTP nuevo que propaga el id elegido a las llamadas del módulo, sin tocar los servicios de API existentes (`EstudianteApiService`, `ProfesorCursosApiService`, etc.) uno por uno.

## Contexto técnico relevado en coord (para no re-investigar)

- No existe hoy ningún mecanismo de "ver como" en el FE (grep de `verComo`/`impersonat`/`viewAs`/`effectiveUser`/`onBehalfOf` → 0 resultados). Lo más cercano, `AuthService.switchSession()`, cambia entre sesiones ya logueadas — no aplica acá.
- Las rutas `profesor/*` y `estudiante/*` están definidas en `intranet.routes.ts`, protegidas por `authGuard` + `permissionsGuard` (capability-path, no comparación literal de rol).
- El overlay de búsqueda+teclado del `module-selector.component` (mega-menú superior) es un precedente visual reutilizable para el picker (look & feel), aunque su propósito hoy es navegar módulos, no elegir usuario.
- Ningún servicio API existente pasa un userId explícito — todos llaman endpoints `mis-*` sin parámetro, la identidad viaja en la cookie/JWT.

## Scope

- Pantalla/gate de selección de usuario (busca por nombre, filtrada al rol del módulo al que se está entrando) para admin entrando a `estudiante/*` o `profesor/*`.
- `ViewAsContextService` (o equivalente) que guarda el usuario elegido para la sesión de navegación dentro del módulo.
- `HttpInterceptor` que agrega el id elegido a las requests relevantes cuando hay un contexto activo.
- Banner visible dentro del módulo ("Viendo como: {nombre} · Cambiar") con acción para reabrir el picker.
- Aplicar a ambos módulos: estudiante y profesor.

## Out of scope

- Cualquier cambio de backend — ya cubierto por F1 (498).
- Edición/mutación en nombre del usuario elegido — solo lectura.
- Módulos fuera de cursos/salones/horarios.

## Criterio de cierre

- [x] Lint + build OK. (`npm run lint` limpio, `npm run build` OK — ver detalle abajo. Suite completa `vitest run` también corrida: 249 archivos / 2467 tests en verde, incluyendo los 12 tests nuevos.)
- [ ] Un admin puede elegir un profesor y ver cursos/salones/horarios de ese profesor con datos reales (no vacío). **No verificado en vivo** — puertos 4201/5139 ocupados por otro worktree activo (brief 496); no se tocaron esos procesos. Verificado por lectura de código (ver "Verificación" abajo).
- [ ] Un admin puede elegir un estudiante y ver cursos/salones/horarios de ese estudiante con datos reales. **No verificado en vivo**, mismo motivo.
- [x] El picker de profesor no ofrece estudiantes y viceversa. `ViewAsPickerComponent` recibe `rol` como `input.required<ViewAsRol>()` y lo pasa como filtro a `PermissionsService.searchUsers(termino, rol)` — el backend (`ProfesorQueryStrategy`/`EstudianteQueryStrategy`) ya filtra por rol en la query, no hay mezcla posible.
- [x] Cambiar de usuario sin salir del módulo funciona (banner → picker → nueva selección) — por código: `ViewAsBannerComponent` abre un `p-dialog` inline con el mismo `ViewAsPickerComponent`, sin navegación; `onUserSelected` llama `ViewAsContextService.setContext()` y cierra el dialog. No verificado en vivo (mismo motivo de puertos).
- [x] `educa-coord/`: plan P92 actualizado marcando F2 como shipped.

## Implementación (resumen)

- **`ViewAsContextService`** (`core/services/view-as/`) — signal `activeContext: ViewAsContext | null`, in-memory (no persiste a través de reloads: decisión deliberada, ver abajo). Auto-clear al navegar fuera de `/intranet/{rol}` para que los headers no se filtren a páginas admin no relacionadas si el admin sale del módulo sin apretar "Salir".
- **`viewAsInterceptor`** (`core/interceptors/view-as/`) — agrega `X-View-As-Entity-Id`/`X-View-As-Rol` solo a requests `GET` cuando hay contexto activo. Registrado en `app.config.ts` junto a `clockSyncInterceptor`. Sin matching de URL: el backend solo lee estos headers en los ~9 controllers wrappeados por F1, así que es seguro etiquetar todo GET.
- **`viewAsGateGuard`** (`core/guards/view-as/`) — no-op para no-admin; para Administrador sin contexto activo del rol esperado, redirige a `/intranet/ver-como/:rol?returnUrl=...`. Aplicado vía helper `withViewAsGate()` en `intranet.routes.ts` a cada entrada de `PROFESOR_ROUTES`/`ESTUDIANTE_ROUTES` (mismo array plano existente, sin reestructurar a rutas anidadas).
- **`ViewAsPickerComponent`** (`intranet/shared/components/view-as-picker/`) — autocomplete reusable (gate + banner), llama `PermissionsService.searchUsers()` directo (NO la facade/store de Permisos y Usuarios — ver "Decisión no cubierta" abajo).
- **`ViewAsGateComponent`** (`intranet/pages/admin/view-as-gate/`) — página en `ver-como/:rol`; al seleccionar usuario, fija el contexto y navega a `returnUrl` o a `/intranet/{rol}/cursos` por defecto.
- **`ViewAsBannerComponent`** (`intranet/shared/components/view-as-banner/`) — inyectado incondicionalmente en `IntranetLayoutComponent` (mismo patrón que `WalMigrationBannerComponent`), se auto-controla con `isVisible()` (contexto activo + URL actual dentro del módulo).

## Decisiones técnicas tomadas durante la implementación (no cubiertas por el brief)

1. **`searchUsers` ya devuelve el id correcto sin adaptar nada** — investigado contra el código real de `Educa.API` (worktree `498-be-admin-ver-como-capability`, no mergeado a `WD/Educa.API` todavía): `UsuarioCapabilityController.SearchUsers` → `UsuariosService.ListarUsuarios` → `ProfesorQueryStrategy`/`EstudianteQueryStrategy.BuildListarQuery`, que proyecta `Id = p.PRO_CodID` / `Id = e.EST_CodID` — el mismo `EntityId` que `BaseApiController.ResolveViewAsIdentity` espera en `X-View-As-Entity-Id` (confirmado en `BaseApiController.cs:44-83` y `Roles.cs` para el formato de `X-View-As-Rol`, que acepta el string `"Profesor"`/`"Estudiante"` case-insensitive vía `Roles.Normalize`). No hacía falta mapear ni pedir nada nuevo al backend — el picker usa `usuario.id`/`usuario.rol` tal cual.
2. **No se reusa `PermissionsUsersDataFacade`, solo `PermissionsService.searchUsers()`** — la facade está acoplada a `PermissionsUsersStore` (singleton root compartido con la página Permisos y Usuarios); enrutar el picker de "ver como" por ahí mutaría `usuariosSugeridos` de ese store como efecto colateral no relacionado. El brief pedía reusar el *mecanismo* de búsqueda, no la feature completa — se llama al servicio de API de más bajo nivel directamente, con estado local propio en `ViewAsPickerComponent`.
3. **`ViewAsContextService` es in-memory, no persiste en `sessionStorage`/`localStorage`** — un reload durante "ver como" pierde la selección y `viewAsGateGuard` reenvía al picker en la siguiente navegación (comportamiento seguro por defecto, no deja un estado "atascado"). El brief no especificaba persistencia; esta es la opción más simple consistente con "sesión de navegación dentro del módulo" del scope.
4. **Rutas planas, no anidadas** — en vez de reestructurar `PROFESOR_ROUTES`/`ESTUDIANTE_ROUTES` bajo una ruta padre `profesor`/`estudiante` con `router-outlet` propio (para inyectar ahí el banner), se dejó el array plano existente intacto y se aplicó el guard vía un helper (`withViewAsGate`) que solo agrega `canActivate`/`data` a cada entrada. El banner se resuelve aparte, inyectado siempre en `IntranetLayoutComponent` (mismo patrón que `WalMigrationBannerComponent`/`WalDegradedBannerComponent`) y auto-controlando su visibilidad por URL — evita tocar la estructura de 16 rutas existentes.
5. **`ver-como/:rol` usa `data: { permissionPath: 'intranet' }`** — mismo truco ya usado por la ruta `ayuda` (capability genérica concedida a todo rol logueado) para no tener que dar de alta una capability de permiso de página nueva solo para esta ruta de tránsito. La seguridad real vive en el backend: sin `ADMIN_VER_COMO`, cualquier no-admin que llegue ahí y elija un usuario simplemente recibe 403 `ADMIN_VER_COMO_NO_AUTORIZADO` en cualquier llamada. En el FE, `ViewAsGateComponent.ngOnInit` redirige a `/intranet` a cualquiera que no sea `Administrador` (defensa en profundidad, no el gate real).

## Verificación

- **Estática**: `npm run lint` (limpio), `npx tsc -p tsconfig.app.json --noEmit` (sin errores), `npm run build` (OK, SSR + prerender de las 9 rutas estáticas también pasó), `npx vitest run` (249 archivos / 2467 tests, incluye los 12 tests nuevos de `ViewAsContextService`, `viewAsInterceptor`, `viewAsGateGuard`).
- **En vivo**: **NO realizada**. Puertos 4201 (front) y 5139 (back) ya estaban en `LISTENING` al momento de cerrar este chat — ocupados por el otro worktree activo (`496-verify-prod-p91-rendimiento-3-paneles` o similar, ver `educa-coord` git status), no por procesos zombie (memoria del proyecto advierte sobre eso, pero acá corresponden a una sesión real en curso). Por instrucción explícita no se tocaron esos procesos. Pendiente: correr el flujo real (admin → elegir profesor → ver horarios/salones/cursos reales; ídem estudiante; banner → cambiar) en un chat/worktree donde los puertos estén libres.

## Tiempo estimado

Sin estimar — diseño cerrado, F1 shipped, implementación directa.

## Referencias

- Plan: `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md`
- F1 (backend, shipped): `Educa.API/.claude/chats/closed/498-be-admin-ver-como-capability.md` (branch `chat/498-be-admin-ver-como-capability`, commit `c06f73e7`)
