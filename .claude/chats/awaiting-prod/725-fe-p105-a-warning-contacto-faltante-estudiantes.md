# 725 — P105-A — Warning de datos de contacto faltantes en admin/usuarios

> **Repos afectados**: `educa-web` (posible `Educa.API` si el dato no llega en el listado)
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` (idea A)
> **Created**: 2026-09-29 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/design` (el plan P105 exige diseño antes de ejecutar; luego `/execute`)
> **exclusive**: `false`
> **modules**: `users`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/users/**`
>   - `Educa.API`: posible campo derivado en el listado de usuarios (a confirmar en `/design`)

## Scope

### educa-web
- Advertir visualmente en `/intranet/admin/usuarios` cuando a un estudiante le faltan datos de contacto.
- `/design`: primera decisión = forma (badge/ícono en la fila, filtro dedicado, o tabla adicional solo con esos casos). Definir qué campos cuentan como "contacto faltante" y si el listado actual ya trae esos datos.

### Educa.API
- Solo si el listado no expone lo necesario: campo derivado mínimo (a decidir).

## Diseño (resuelto 2026-09-29, `/design`)

**Decisiones del usuario**: forma = ícono en la fila + filtro; criterio = `correoApoderado` vacío (solo estudiantes).

**Hallazgos**:
- `EstudianteQueryStrategy` ya devuelve `correoApoderado` en el listado → el ícono no requiere BE.
- Ningún contacto es obligatorio hoy (`validateCorreoApoderado` etc. devuelven `null` si vacío) → el warning es informativo, no bloquea guardado.
- Correo del apoderado es el destinatario de los correos de asistencia (INV-MAIL) → único campo con consecuencia operativa.
- Tabla `lazy` + paginación de servidor; filtros viajan como query params (`rol`, `estado`, `search`, `salonId`) en `usuarios.service.ts` → un filtro client-side daría totales falsos.

**Plan por fases**:
1. **FE ícono** (sin BE): en `usuarios-table.component.html`, junto al nombre, `pi pi-exclamation-triangle` con tooltip "Sin correo de apoderado" cuando `rol === 'Estudiante'` y `!correoApoderado?.trim()`. Helper puro `hasMissingGuardianEmail(usuario)` en `helpers/`, con spec. aria-label vía `pt`.
2. **BE param** (`Educa.API`): `sinCorreoApoderado=true` en `GET listar` → `EstudianteQueryStrategy` filtra `EST_CorreoApoderado` NULL o vacío. Solo aplica al rol Estudiante.
3. **FE filtro**: toggle "Contacto incompleto" en `usuarios-filters` (visible con tab Estudiantes), pasa el param en `usuarios.service.ts`, resetea a página 1.

## Pre-work

- Leer `educa-coord/invariants/` del dominio usuarios/contacto.
- Leer `educa-coord/contracts/api-catalog.md` si se toca el endpoint de listado.

## Out of scope

- Edición masiva de contactos. Notificaciones a apoderados.

## Criterio de cierre

- [x] `/design` resuelto y decisiones registradas en el brief antes de escribir código.
- [x] FE: lint + build + tests OK, comportamiento verificado en vivo (local + BBDD de prueba).
- [x] BE (si aplica): build + tests OK, contrato consistente con FE.
- [x] `plans/maestro.md` y fila de la idea A en el plan P105 actualizados.

> Nota: `clearFilters()` ya reseteaba `_filterRol` (comportamiento previo, no regresión): con la pestaña Estudiantes activa, limpiar filtros lista todos los roles.

## Tiempo estimado

~1.5 h (sin BE).

> **Validación prod**: ⏳ pendiente desde 2026-09-29 — desplegar BE primero (param `sinCorreoApoderado`); luego verificar en /intranet/admin/usuarios (pestaña Estudiantes): ícono de advertencia + filtro "Contacto incompleto".
