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

- [ ] Trigger de simulación funcional desde "herramientas de prueba".
- [ ] Enlace a Email Outbox funcional.
- [ ] Verificado en vivo extremo a extremo (idealmente con 620 ya cerrado).
- [ ] `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` actualizado (F2 FE marcado).
- [ ] `educa-web/.claude/plan/maestro.md` actualizado (fila `xP107`).
- [ ] Brief movido `open/` → `closed/`.

## COMMIT MESSAGE sugerido

```
feat(dev-tooling): add CrossChex attendance simulation trigger + outbox link (P107 F2 FE)
```

## CIERRE

Si 620 todavía no cerró al momento de cerrar este brief, documentar explícitamente que la verificación extremo a extremo del correo dry-run queda pendiente hasta entonces.
