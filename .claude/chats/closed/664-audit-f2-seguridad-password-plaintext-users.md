# 664 — Audit F2: Seguridad — exposición de password en `users/`

> **Repo destino**: `educa-web` (posible contraparte BE si el endpoint de detalle de usuario devuelve la password — confirmar con `/investigate` antes de fix).
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F2)
> **Creado**: 2026-09-12 · **Estado**: ✅ FE cerrado (lint/build/test verdes).
> **Validación prod**: ✅ verificada 2026-09-17 — smoke del form con password manual y autogenerada OK.
> **MODO SUGERIDO**: `/investigate` primero (confirmar si el BE devuelve la password en el detalle) → `/execute`
> **touches**:
>   - `src/app/features/intranet/pages/admin/users/usuarios.store.ts`
>   - `src/app/features/intranet/pages/admin/users/services/usuarios.service.ts`
>   - `src/app/features/intranet/pages/admin/users/models/usuarios.models.ts`
>   - `src/app/features/intranet/pages/admin/users/helpers/usuario-form-policies.utils.ts`
>   - `src/app/features/intranet/pages/admin/users/usuarios.component.ts`
>   - `src/app/features/intranet/pages/admin/users/components/usuario-form-dialog/usuario-form-dialog.component.ts`
>   - `src/app/features/intranet/pages/admin/users/components/usuarios-header/usuarios-header.component.ts`

## Origen

Hallazgos de `/audit` (2026-09-12), categoría "Riesgo" — el hallazgo de seguridad más serio de todo el audit FE, 5 puntos agrupados por ser todos del mismo módulo (`users/`) y la misma superficie de riesgo (exposición de credenciales).

## Scope

1. **`usuarios.store.ts:328` + `usuarios.service.ts:75-77` + `models/usuarios.models.ts:72`** — el GET de detalle de usuario devuelve `contrasena` en texto plano y el store la precarga en el form de edición. Cualquiera con acceso a Network tab (o una XSS) puede leer contraseñas ajenas. **Requiere confirmar primero si el problema es del BE** (el endpoint no debería devolver la password en el detalle) — si es así, este brief coordina con `Educa.API` vía brief propio o se promueve a `educa-coord` si amerita cross-repo.
2. **`usuario-form-dialog.component.ts:134-150` + `html:123`** — el input de password fuerza `.toUpperCase()` en cada cambio, pero la regla de validación exige minúscula (`contrasenaHasLowercase`). La validación **nunca puede pasar** — bloquea crear/editar usuarios con esa regla activa. Fix: no forzar mayúsculas, o quitar el requisito de minúscula (decidir cuál es la intención real).
3. **`helpers/usuario-form-policies.utils.ts:21-28`** — password autogenerada determinística (apellidos + DNI, datos cuasi-públicos), trivialmente adivinable. Fix: agregar componente aleatoria real y/o forzar cambio obligatorio en primer login (confirmar si el BE ya lo hace).
4. **`usuarios.component.ts:265-309`** — export de credenciales en texto plano a `.xlsx` descargable, artefacto persistente sin cifrado. Fix: evaluar si el export debe incluir la password en absoluto, o solo un link de "primer acceso"/reseteo.
5. **`usuarios-header.component.ts:34`** — botón "Migrar Contraseñas" gateado solo por `!environment.production`, no por rol/autorización real. Fix: gatear también por capability/rol si la acción es sensible.

## Pre-work

- Punto 1 es el más crítico — antes de tocar código, confirmar con `/investigate` si el BE (`Educa.API`) devuelve la password en el endpoint de detalle o si es el FE quien la persiste/muestra de una respuesta que ya no debería traerla. Si el problema nace en el BE, coordinar (puede requerir brief en `Educa.API` o promoción a `educa-coord` si el fix cruza ambos repos).
- Puntos 2-5 son fixes acotados de FE, pero punto 2 requiere confirmar con el usuario cuál es la intención real de la regla de password (¿se quiere permitir minúsculas y el bug es el `.toUpperCase()`, o se quiere forzar mayúsculas y la regla de validación está mal?) antes de aplicar el fix.

## Out of scope

- El resto de hallazgos del audit (ver plan).
- No es un audit del BE — si punto 1 confirma que el problema es del backend, este brief solo documenta el hallazgo y coordina, no lo arregla directamente en `Educa.API`.

## Criterio de cierre

- [x] Punto 1: origen confirmado — es del BE (`UsuarioDetalleDto.Contrasena` descifra deliberadamente). Documentado y coordinado vía handoff cross-repo `Educa.API` brief [667](../../../Educa.API/.claude/chats/open/667-be-handoff-audit-fe-664-password-plaintext.md). No se corrige en este repo (fuera de scope FE-only).
- [x] Punto 2: confirmado con el usuario (permitir minúsculas). Fix aplicado (`usuario-form-dialog.component.html:123`, quitado `.toUpperCase()` forzado). Verificado que ninguna otra regla dependía del forzado.
- [x] Punto 3: generación de password mejorada — `password.utils.ts` ahora agrega 3 letras minúsculas + 1 carácter especial vía `crypto.getRandomValues` (componente aleatorio real, no más 100% derivable de datos públicos). Test nuevo `password.utils.spec.ts` (8 tests, verde).
- [x] Punto 4: decisión tomada (sacar la contraseña del export xlsx) y aplicada en `usuarios.component.ts` (`generateExcel`). Gate `hasCapability('USUARIOS_EXPORT_CREDENCIALES_MANAGE')` agregado al botón — seed de la capability documentado en el handoff 667 (Sección C), fail-closed hasta entonces.
- [x] Punto 5: gate de autorización agregado — `hasCapability('USUARIOS_MIGRAR_CONTRASENAS_MANAGE')` combinado con el flag de dev existente, en `usuarios.component.ts`/`.html`. Seed de la capability documentado en el handoff 667 (Sección B), fail-closed hasta entonces.
- [x] Build + lint + tests OK (`ng lint` limpio, `ng build` sin errores, 8 tests nuevos + 82 tests existentes relacionados en verde).
- [x] Plan actualizado: F2 → 🟡 FE ✅, BE handoff pendiente (no se puede marcar ✅ completo hasta que `Educa.API` cierre brief 667).
- [x] Maestro actualizado (`educa-web` y `Educa.API`).

## Tiempo estimado

~2h (incluye investigación del punto 1 y posible coordinación cross-repo).
