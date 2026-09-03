# 621 — P107 F2 FE: trigger de simulación CrossChex + enlace a Email Outbox

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` (Fase F2)
> **Creado**: 2026-09-03 · **Estado**: 🟢 libre — sin bloqueos.
> **MODO SUGERIDO**: `/design` (contrato del trigger + ubicación del enlace) → `/execute`
> **exclusive**: `false`
> **modules**: `dev-tooling`
> **touches**:
>   - `educa-web`: nueva sección dentro de "herramientas de prueba" (F1 FE, brief 618) — trigger de simulación + enlace a la página existente de Email Outbox (`pages/admin/email-outbox/`)

## OBJETIVO

Desde "herramientas de prueba" (`/intranet/herramientas-prueba`, F1), exponer un disparador que llame al endpoint de registro manual de asistencia ya existente en el BE (`POST api/asistencia/registrar`) sin tocar CrossChex real, más un enlace directo a la página admin de Email Outbox (P52) para que el tester confirme el resultado del correo de confirmación.

## PRE-WORK OBLIGATORIO

- Confirmar el contrato exacto de `POST api/asistencia/registrar` (`FacialAsistenciaDto`) contra el código actual del BE.
- Confirmar el path real de la página Email Outbox hoy (`pages/admin/email-outbox/`) y su capability de acceso, para enlazar correctamente sin asumir que Administrador siempre tiene acceso sin verificarlo.
- Coordinar con 620 (BE, hermano) si el dry-run sender todavía no cerró — el trigger funciona igual (dispara el flujo), pero el correo quedará `PENDING` hasta que 620 esté implementado. No es bloqueante para arrancar este brief.

## ALCANCE

- Formulario simple para elegir un estudiante/persona de prueba (por DNI o selector) y disparar una marcación simulada (entrada/salida) vía el endpoint existente.
- Enlace visible desde "herramientas de prueba" hacia la página de Email Outbox.
- Feedback claro de que la acción se ejecutó (no necesita mostrar el resultado del correo — eso lo hace la página enlazada).

## FUERA DE ALCANCE

- Construir una vista de inspección de correo propia — decisión ya tomada de reusar la página existente (P52).
- El dry-run sender en sí (BE, brief 620).
- Cualquier cambio a la página de Email Outbox existente.

## VALIDACIÓN FINAL

- Disparo del trigger genera una marcación real (verificable en la pantalla de asistencia normal) y una fila en Email Outbox.
- Con 620 ya cerrado: la fila se ve resuelta (dry-run) en la página de Email Outbox, sin correo real enviado.
- Build + tests unit verdes.

## CRITERIOS DE CIERRE

- [x] Trigger de simulación funcional desde "herramientas de prueba" — implementado y **verificado en vivo** (búsqueda por nombre y por DNI, selección de sede, POST real contra el BE, clasificación correcta de mensajes de éxito/rechazo).
- [x] Enlace a Email Outbox funcional — corregido a la ruta real (`admin/monitoreo/correos/bandeja`; `admin/email-outbox` es redirect legacy del Plan 35) y **verificado en vivo**.
- [x] Verificado en vivo extremo a extremo — parcial, ver nota de cierre (el trigger FE está confirmado; el encolado del correo dry-run no se pudo confirmar y quedó como hallazgo separado).
- [x] `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` actualizado (F2 FE marcado).
- [x] `educa-web/.claude/plan/maestro.md` actualizado (fila `xP107`).
- [x] Brief movido `open/` → `closed/`.

## COMMIT MESSAGE sugerido

```
feat(dev-tooling): add CrossChex attendance simulation trigger + outbox link (P107 F2 FE)
```

## CIERRE (2026-09-03)

Verificación en vivo (FE :4201 + BE :5139 local, `BusinessTestMode=true`), como Administrador (`CODE CLAUDE`), sobre "herramientas de prueba":

- Búsqueda de persona por nombre y por DNI: ✅.
- Selector de sede: ✅.
- `POST /api/asistencia/registrar`: ✅ 200 OK. Primera llamada → `"Entrada registrada"` (éxito), segunda → `"Salida registrada"` (éxito), tercera (repetida a propósito) → `"Registro ya completo de entrada y salida"` — clasificada correctamente como *warning*, no como falso éxito.
- Enlace a Email Outbox: ✅ navega a la ruta real, filtro por tipo "Asistencia" funciona.

**Hallazgo no atribuible a este brief**: ninguna de las marcaciones exitosas encoló una fila nueva en Email Outbox (confirmado vía `GET /api/sistema/email-outbox/listar`). Investigado hasta donde alcanza el código de notificación BE (`AsistenciaNotificationDispatcher` + `EmailNotificationService`) sin acceso a la consola del proceso corriendo. Documentado y derivado a brief nuevo: [624 (`Educa.API`)](../../../../Educa.API/.claude/chats/open/624-be-asistencia-email-no-encolado-silencioso.md) — no bloquea el cierre de 621 porque el trigger FE está confirmado correcto a nivel HTTP/UI; el gap es de encolado de correo en el BE, fuera del alcance de este brief.

Diseño ejecutado: reuso de `PermissionsService.searchUsers()` (búsqueda de persona) y `SedesApiService` (dropdown de sede) vía un nuevo `CrosschexTriggerFacade` — el facade se agregó durante `/execute` porque el lint (`layer-enforcement/imports-error`, regla G1) bloquea inyectar `*-api.service.ts` directo en un componente.
