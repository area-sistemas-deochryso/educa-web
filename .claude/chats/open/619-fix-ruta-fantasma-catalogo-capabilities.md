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

- [ ] Campo Ruta visible y funcional en "Nueva Capability".
- [ ] Campo Ruta visible y funcional en "Editar Capability".
- [ ] Verificado en vivo (crear → asignar → relogin → acceso concedido, sin SQL manual).
- [ ] `educa-web/.claude/plan/maestro.md` actualizado.
- [ ] Brief movido `open/` → `closed/`.

## COMMIT MESSAGE sugerido

```
fix(permisos): add missing ruta field to capability catalog dialog
```

## CIERRE

Sin dependencias con P107 — puede ejecutarse en cualquier momento, en paralelo o después, sin coordinación especial.
