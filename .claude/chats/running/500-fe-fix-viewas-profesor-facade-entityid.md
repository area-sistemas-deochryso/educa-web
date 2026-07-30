# 500 — Fix: `ProfesorFacade` ignora el contexto "ver como" (gap post-F2, P92)

> **Coord ref**: `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md` § F2 (gap post-shipment)
> **Plan**: `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md`
> **Creado**: 2026-07-30 · **Estado**: ⏳ pendiente arrancar.
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

- [ ] Grep confirmado: no queda ningún caller de `entityId()`/`AuthService.currentUser` en el módulo profesor (ni estudiante) que debería respetar "ver como" y no lo hace.
- [ ] Fix aplicado, build + lint + tests OK.
- [ ] Verificación en vivo: elegir Mendo Calderón, `/intranet/profesor/salones` y `/intranet/profesor/horarios` muestran datos reales de ella (confirmar con la request de red, no solo con que la pantalla no esté vacía).
- [ ] `educa-coord/`: plan P92 actualizado con la nota del gap encontrado y su cierre.

## Tiempo estimado

Sin estimar — causa raíz ya identificada, alcance a confirmar durante la investigación.

## Referencias

- Plan: `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md`
- F2 original (shipped con este gap): `educa-web/.claude/chats/closed/499-fe-admin-ver-como-gate-wrapper.md`
- F1 (backend, sin cambios necesarios): `Educa.API/.claude/chats/closed/498-be-admin-ver-como-capability.md`
