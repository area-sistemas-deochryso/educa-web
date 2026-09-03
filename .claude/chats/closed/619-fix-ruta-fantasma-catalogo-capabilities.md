# 619 — Fix: campo "Ruta" fantasma en el diálogo de Catálogo de Capabilities

> **Repos afectados**: `educa-web`
> **Origen**: hallado durante verificación en vivo de P107 F1 (2026-09-03) — ver `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md`
> **Creado**: 2026-09-03 · **Estado**: 🟢 libre — sin bloqueos, sin dependencia de P107.
> **MODO SUGERIDO**: `/investigate` → `/design` → `/execute` (bug autocontenido, corre su propio ciclo completo)
> **exclusive**: `false`
> **modules**: `permisos`
> **touches**:
>   - `educa-web`: diálogo Nueva/Editar Capability en `pages/admin/vistas/` (`vistas.component.html`, posiblemente `vistas.store.ts`/`vistas.facade.ts` si el investigate encuentra algo más)

## OBJETIVO

El diálogo "Nueva/Editar Capability" (pestaña Catálogo de `/intranet/admin/permisos/roles`) no tiene un input para el campo `ruta`, pese a que el store (`vistas.store.ts`), el facade (`vistas.facade.ts`) y el DTO del BE (`CapabilityAdminService.cs`) lo soportan de punta a punta — es un campo fantasma: existe en el modelo, falta en el template. Sin poder setear `ruta` desde la UI, cualquier capability nueva que debería gatear una ruta queda inalcanzable hasta que alguien escriba una migración SQL manual para setear `CAP_Ruta`.

Esto no es hipotético — ya pasó al menos dos veces antes (brief 404; migración `Educa.API/Migrations/Manual/20260817_SetJustificacionAsistenciaAprobarRuta.sql`, cuyo comentario documenta el mismo bug con otra capability) y se repitió una tercera vez el 2026-09-03 al verificar P107 F1 (`Educa.API/Migrations/Manual/20260903_SetTestToolsCapabilityRuta.sql`).

## PRE-WORK OBLIGATORIO (arranca con `/investigate`)

- Confirmar en el código actual (puede haber cambiado desde este hallazgo) que el campo sigue faltando en el template.
- Revisar si hay alguna razón deliberada para omitirlo (ej. validación especial, formato esperado, plan de deprecar el campo) antes de asumir que es un simple descuido.
- Revisar cómo se muestra hoy `ruta` en la tabla de listado (columna "RUTA / DESCRIPCIÓN", `vistas.component.html:124-149`) para mantener consistencia de formato (se guarda sin `/` inicial, se antepone visualmente al mostrar).
- Confirmar el formato exacto que espera el guard (`user-permisos.service.ts: tienePermiso()` — match exacto, case-insensitive, normaliza `/` inicial) para dimensionar la validación del input.

## ALCANCE

- Agregar el input de `ruta` al formulario de creación y edición de capability.
- Validación razonable de formato (a definir en `/design` contra lo que el guard realmente matchea).
- A criterio del `/design`: el campo debe quedar explícitamente opcional — hay capabilities legítimas sin ruta (gatean una acción, no una vista).

## FUERA DE ALCANCE

- Cambiar el mecanismo de matching del guard (exact-match contra `ruta`) — decisión de arquitectura aparte, no se toca acá.
- Backfill de capabilities existentes sin ruta que deberían tenerla — cada caso pasado se resolvió con su propia migración puntual, no es parte de este fix.
- Cualquier cambio en `Educa.API` — el BE ya soporta el campo completo, no hace falta tocarlo.

## VALIDACIÓN FINAL

- Crear una capability nueva desde la UI, setearle una ruta, asignarla a un rol, cerrar/reabrir sesión y confirmar que la ruta correspondiente ya NO da "Acceso denegado" — sin necesitar una migración SQL manual.
- Editar una capability existente y confirmar que el campo ruta se puede modificar/limpiar correctamente.
- Tests unit relevantes (`vistas.store.spec.ts`, `vistas.facade.spec.ts`, y el spec del componente si existe) en verde.

## CRITERIOS DE CIERRE

- [x] Campo Ruta visible y funcional en "Nueva Capability".
- [x] Campo Ruta visible y funcional en "Editar Capability".
- [x] Verificado en vivo (crear → asignar → relogin → acceso concedido, sin SQL manual).
- [x] `educa-web/.claude/plan/maestro.md` actualizado.
- [x] Brief movido `open/` → `closed/`.

## NOTA DE IMPLEMENTACIÓN (2026-09-03)

- Input `ruta` agregado al diálogo (`vistas.component.html`), opcional, con hint de formato (sin `/` inicial, match exacto case-insensitive contra el guard).
- Normalización agregada en `vistas.facade.ts::saveCapability` (trim + strip de `/` inicial redundante) antes de armar el payload — mismo idiom que `user-permisos.service.ts`/`ui-mapping.service.ts`.
- De paso se encontró y corrigió un gap de tipos real: `VistasComponent.updateFormField` (vistas.component.ts) no incluía `'ruta'` en su unión de tipos — el template ya llamaba `updateFormField('ruta', $event)`, lo cual rompía la compilación AOT.
- Verificado: unit tests 36/36 verdes (`vistas.store.spec.ts`, `vistas.facade.spec.ts`), lint limpio, compilación AOT sin errores.
- **Verificación en vivo completa** (Educa.API levantado local contra `TestConnection`, FE en `:4201` desde este worktree):
  1. Creada capability `CLAUDE_VERIFY_RUTA_619` desde la UI con ruta `/intranet/admin/permisos/roles` (con `/` inicial a propósito) → se guardó normalizada como `intranet/admin/permisos/roles` (sin doble slash), confirmado en la tabla del catálogo (ID 101, sin necesitar SQL manual).
  2. Editar capability: el campo Ruta precarga correctamente el valor guardado.
  3. Asignada la capability al rol Estudiante (14→15 capabilities).
  4. Relogin como usuario Estudiante (Albines Mendieta Jeremy): la ruta `intranet/admin/permisos/roles` ya NO da "Acceso denegado" (el guard FE deja pasar; el 403 de datos que sí aparece es del backend protegiendo el endpoint administrativo, capa correcta y separada, fuera de alcance).
  5. Control negativo: `intranet/admin/usuarios` (no asignada) sigue mostrando el diálogo "Acceso denegado" — confirma que el guard sigue funcionando para rutas no autorizadas.
  6. Cleanup: capability desasignada del rol Estudiante y eliminada del catálogo. Estado final confirmado idéntico al inicial (100 capabilities, 12 módulos, Estudiante 14).

## COMMIT MESSAGE sugerido

```
fix(permisos): add missing ruta field to capability catalog dialog
```

## CIERRE

Sin dependencias con P107 — puede ejecutarse en cualquier momento, en paralelo o después, sin coordinación especial.
