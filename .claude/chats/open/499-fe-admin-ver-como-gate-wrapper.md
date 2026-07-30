# 499 — P92 F2: gate de selección + wrapper de módulo "ver como"

> **Coord ref**: `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md` § F2
> **Plan**: `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md`
> **Creado**: 2026-07-30 · **Estado**: 🔒 bloqueado — depende de F1 (`Educa.API` brief 498, capability admin-only + resolución centralizada de identidad, sin arrancar todavía).
> **MODO SUGERIDO**: no arrancar hasta que 498 cierre. Cuando cierre, `/execute` directo (diseño ya cerrado en coord).
> **exclusive**: false
> **modules**: intranet-academico (cursos, salones, horarios) — estudiante y profesor
> **touches**: nuevas rutas/gate de admin, wrapper a nivel de módulo sobre `estudiante/*` y `profesor/*`, interceptor HTTP nuevo

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

- [ ] Lint + build OK.
- [ ] Un admin puede elegir un profesor y ver cursos/salones/horarios de ese profesor con datos reales (no vacío).
- [ ] Un admin puede elegir un estudiante y ver cursos/salones/horarios de ese estudiante con datos reales.
- [ ] El picker de profesor no ofrece estudiantes y viceversa.
- [ ] Cambiar de usuario sin salir del módulo funciona (banner → picker → nueva selección).
- [ ] `educa-coord/`: plan P92 actualizado marcando F2 como shipped.

## Tiempo estimado

Sin estimar — bloqueado por F1, no arranca todavía.

## Referencias

- Plan: `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md`
- F1 (backend, bloqueante): `Educa.API/.claude/chats/open/498-be-admin-ver-como-capability.md`
