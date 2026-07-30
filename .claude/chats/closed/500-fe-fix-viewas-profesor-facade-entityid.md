# 500 — Fix: `ProfesorFacade` ignora el contexto "ver como" (gap post-F2, P92)

> **Coord ref**: `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md` § F2 (gap post-shipment)
> **Plan**: `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md`
> **Creado**: 2026-07-30 · **Estado**: ✅ cerrado -- fix aplicado, verificado en vivo.
> **MODO SUGERIDO**: `/execute` directo — causa raíz ya identificada, no requiere diseño.
> **exclusive**: false
> **modules**: intranet-academico (profesor) — salones, horarios, cursos, calificaciones, asistencia, foro, mensajería
> **touches**: `src/app/features/intranet/pages/profesor/services/profesor.facade.ts` (y cualquier otro caller del mismo patrón que aparezca en la investigación)

## Contexto

Verificación en vivo de P92 F2 (brief 499, ya shipped y mergeado a `main`) encontró que el flujo "ver como Profesor" no funciona: al elegir un profesor real (Mendo Calderón, con salones/cursos reales confirmados en la verificación de P91/chat 496) y navegar a `/intranet/profesor/salones`, la app siguió pidiendo los datos del **admin logueado**, no del profesor elegido.

## Causa raíz confirmada

`ProfesorFacade` (`src/app/features/intranet/pages/profesor/services/profesor.facade.ts:44`) obtiene el id así:

```
const profesorId = this.userProfile.entityId();
```

`UserProfileService.entityId()` siempre devuelve la identidad del usuario **realmente logueado** — no consulta `ViewAsContextService`. Esto alimenta llamadas que llevan el id **en la URL** (`ProfesorSalonesApiService.getHorarios(profesorId)` → `GET /api/Horario/profesor/{profesorId}`, `getSalonTutoria(profesorId)` → `GET /api/ProfesorSalon/profesor/{profesorId}`), a diferencia del patrón `mis-*` (sin id en la URL) que el interceptor de F2 sí cubre correctamente vía headers `X-View-As-Entity-Id`/`X-View-As-Rol`.

Confirmado en vivo (sesión coord 2026-07-30): con el admin (`entityId: 10`) "viendo como" Mendo Calderón, la request real fue `GET /api/Horario/profesor/10` (10 = admin, no el profesor elegido) → "No tienes salones asignados" (falso negativo, no dato real).

`ProfesorFacade` es usado por **todo el módulo profesor**: `profesor-salones`, `profesor-horarios` (confirmar si llama las mismas rutas), `profesor-cursos`, `profesor-calificaciones`, `teacher-attendance`, `profesor-foro`, `profesor-mensajeria` — el alcance real de este bug puede ser más amplio que solo salones/horarios, hay que confirmarlo leyendo el resto de `profesor.facade.ts` durante la ejecución, no asumir que son solo esos 2 métodos.

**El lado estudiante no tiene este problema** — no se encontró ningún caller de `UserProfileService.entityId()` fuera de `profesor.facade.ts` (grep verificado), y el único endpoint probado (`mis-horarios`) no lleva id en la URL.

## Fix propuesto (confirmar durante la ejecución si sigue siendo el mejor enfoque)

`ProfesorFacade` debería resolver un "id efectivo": si `ViewAsContextService.hasContextForRol('Profesor')` está activo, usar el `entityId` de ese contexto; si no, comportamiento actual (`UserProfileService.entityId()`). Mismo criterio que ya aplica el interceptor (`view-as.interceptor.ts`) para decidir cuándo agregar los headers — no inventar un mecanismo nuevo, replicar ese.

Antes de aplicar el fix, grepear el resto del código por el mismo patrón (`userProfile.entityId()` o equivalente sourced directo de `AuthService`/`UserProfileService` sin pasar por `ViewAsContextService`) para no dejar otro caller con el mismo bug — no asumir que `ProfesorFacade` es el único lugar.

## Alcance

### IN

- Corregir `ProfesorFacade` (y cualquier otro caller con el mismo patrón que aparezca en la investigación) para que respete el contexto "ver como" activo.
- Test unitario que cubra: con contexto ver-como activo, se usa el id del contexto; sin contexto, comportamiento actual sin cambios.
- Verificación en vivo: elegir a Mendo Calderón como profesor vía el gate, confirmar que `/intranet/profesor/salones` y al menos `/intranet/profesor/horarios` muestran sus datos reales (no vacío, no el id del admin en la request).

### OUT

- Cambios de backend — el mecanismo de F1 (498) ya es correcto y no se toca.
- Cualquier gap nuevo que no sea "el FE sigue usando la identidad del usuario real en vez de la elegida" — si aparece algo distinto, es un brief aparte.

## Criterio de cierre

- [x] Grep confirmado: no queda ningún caller de `entityId()`/`AuthService.currentUser` en el módulo profesor (ni estudiante) que debería respetar "ver como" y no lo hace.
- [x] Fix aplicado, build + lint + tests OK.
- [x] Verificación en vivo: elegir Mendo Calderón, `/intranet/profesor/salones` y `/intranet/profesor/horarios` muestran datos reales de ella (confirmar con la request de red, no solo con que la pantalla no esté vacía).
- [x] `educa-coord/`: plan P92 actualizado con la nota del gap encontrado y su cierre.

## Cierre (2026-07-30)

### Fix aplicado

`ProfesorFacade.loadData()` (`src/app/features/intranet/pages/profesor/services/profesor.facade.ts`) ahora resuelve el id vía un nuevo helper privado `getEffectiveProfesorId()`:

```ts
private getEffectiveProfesorId(): number | null {
	if (this.viewAsContext.hasContextForRol('Profesor')) {
		return this.viewAsContext.activeContext()?.entityId ?? null;
	}
	return this.userProfile.entityId();
}
```

Mismo criterio (`ViewAsContextService.hasContextForRol`) que ya usa `viewAsInterceptor` para decidir cuándo aplica "ver como" -- no se inventó un mecanismo nuevo.

### Grep de otros callers (confirmado)

Único otro caller de `.entityId()` en todo `src/`: `VideoconferenciasFacade.getHorariosByRole()` (`src/app/features/intranet/pages/cross-role/videoconferencias/services/videoconferencias.facade.ts:115`), mismo patrón (`GET /api/Horario/profesor/{entityId}`). **Fuera de alcance real, no fue tocado**: su ruta (`/intranet/videoconferencias`, definida en `experimentalRoutes` de `intranet.routes.ts`) no está bajo `withViewAsGate` ni bajo el prefijo `/intranet/profesor/*` -- `ViewAsContextService.clearIfOutsideModule` limpia el contexto activo apenas la navegación sale de `/intranet/{rol}`, así que un admin nunca puede llegar a esa página con un contexto "ver como" todavía activo. No hay ningún otro caller en `profesor/*` ni `estudiante/*`.

### Build / lint / tests

- `npm run lint`: OK, "All files pass linting."
- `npm run build`: OK (SSR + prerender de 9 rutas estáticas, sin errores).
- `npx vitest run`: **249 test files, 2469 tests, todos pasando** (incluye los 2 tests nuevos en `profesor.facade.spec.ts` cubriendo contexto activo para rol Profesor y contexto activo para otro rol -- Estudiante -- que debe ignorarse).

### Verificación en vivo (sandbox `402-verify-pattern`, fast-forward merge de `chat/500-...`)

Login ya activo como Administrador ("CODE CLAUDE"). Elegida "MARIELA MENDO CALDERON" (DNI 42724344) vía el picker "Ver como Profesor":

- `/intranet/profesor/salones`: pantalla "Mis Salones" muestra 2 salones reales (1RO PRIMARIA A - 2026 / 20 estudiantes / QA E2E Curso Prueba; INICIAL 3 AÑOS B - 2026 / 2 estudiantes / Arte). Requests de red confirmadas: `GET /api/Horario/profesor/15` (200), `GET /api/ProfesorSalon/profesor/15` (200) -- **15 = id de Mendo Calderón, no 10 (admin)**.
- `/intranet/profesor/horarios`: pantalla "Mi Horario" muestra el grid con los mismos 2 cursos (QA E2E Curso Prueba lunes 07:00-08:00, Arte miércoles 07:00-08:00). Requests confirmadas: `GET /api/Horario/profesor/15` (200), `GET /api/ProfesorSalon/profesor/15` (200) -- misma id 15.

Nota metodológica: la navegación directa por URL (browser `navigate`) resetea el contexto "ver como" en memoria (comportamiento esperado, documentado en `ViewAsContextService`) -- la segunda verificación (`/horarios`) requirió re-elegir a Mendo Calderón desde el picker y navegar dentro de la app (no por URL bar) para mantener el contexto activo.

### Commits

- `educa-web` (branch `chat/500-fe-fix-viewas-profesor-facade-entityid`): `89e0e3ca` -- `fix(profesor): resolve profesorId from active view-as context when present`.
- `educa-coord`: plan `xrepo-92-admin-ver-como-wrapper.md` actualizado con el cierre del gap.

## Tiempo estimado

Sin estimar — causa raíz ya identificada, alcance a confirmar durante la investigación.

## Referencias

- Plan: `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md`
- F2 original (shipped con este gap): `educa-web/.claude/chats/closed/499-fe-admin-ver-como-gate-wrapper.md`
- F1 (backend, sin cambios necesarios): `Educa.API/.claude/chats/closed/498-be-admin-ver-como-capability.md`
