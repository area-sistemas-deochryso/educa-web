# 440 — Sincronizar UI_ERROR_CODES con el catálogo final de errorCode (BE)

> **Repos afectados**: `educa-web`, `Educa.API` (solo lectura, catálogo ya cerrado)
> **Plan**: `educa-coord/plans/xrepo-87-cerrar-gap-errorcode-be-fe.md`
> **Creado**: 2026-07-15 · **Estado**: ✅ cerrado 2026-07-15 (commit `7cb73c51` en `chat/440-errorcode-sync-ui-error-messages`, pendiente `/wt-merge`).
> **MODO SUGERIDO**: `/execute`
> **exclusive**: `false`
> **modules**: sistema, errores
> **touches**:
>   - `educa-web`: `src/app/shared/constants/ui-error-messages.ts`, tests asociados

## Contexto

Fase 2 del plan `xrepo-87`. La fase 1 (BE, chat 439 en `Educa.API`, cerrado) ya decidió la convención de naming (inglés para `errorCode`), introdujo una fuente única (`Constants/<Dominio>/ErrorCodes.cs`, 9 archivos, ~135 códigos) y centralizó los huérfanos detectados en el chat 438 sin cambiarles el valor. No hace falta re-derivar nada de eso — está documentado en el plan.

**No es un `/design`**: la decisión de naming ya está tomada del lado BE. Este chat es aplicar el mapeo del lado FE.

## Scope

- Agregar al diccionario `UI_ERROR_CODES` las entradas curadas para los huérfanos confirmados: `HORARIO_CRUCE_SALON`, `HORARIO_CRUCE_PROFESOR`, `HORARIO_CRUCE_ESTUDIANTE`, `SALON_DUPLICADO`, `SALON_YA_TIENE_TUTOR`, `CURSO_CON_HORARIOS_ACTIVOS`, `ASISTENCIA_ESTUDIANTE_DUPLICADO`, `ASISTENCIA_ESTUDIANTE_NO_MATRICULADO`, `GRADO_INVALIDO`, `SEDE_REQUIRED`, `DUPLICATE_NAME_MATCH`.
- Eliminar `HORARIO_OVERLAP` del diccionario — código muerto, el BE nunca lo lanza (el real es `HORARIO_CRUCE_SALON`/`_PROFESOR`/`_ESTUDIANTE`).
- Confirmar que las claves canónicas cross-dominio (`ESTUDIANTE_NOT_FOUND`, `PROFESOR_NOT_FOUND`, `SALON_NOT_FOUND`) siguen cubiertas y no quedaron huérfanas variantes `_NO_ENCONTRADO`/`_NO_EXISTE` tras la migración BE.
- Diff completo contra el catálogo final: leer los 9 archivos `Educa.API/Constants/<Dominio>/ErrorCodes.cs` (no volver a grep call sites — la fuente de verdad ya está centralizada ahí) y comparar 1:1 contra las keys de `UI_ERROR_CODES`. Cualquier código nuevo no listado en "Huérfanos (chat 438)" arriba también entra en este barrido — el catálogo final tiene ~135 códigos, más que los ~20 confirmados en el chat 438.

## Verificación con testing real

- Al menos 3 flujos con test real (e2e Playwright o integración, el que aplique mejor) mostrando el mensaje curado correcto en el FE, ya no solo lectura de código:
  1. `HORARIO_CRUCE_SALON` vía `POST /api/Horario` con choque de horario.
  2. `SALON_DUPLICADO` o `SALON_YA_TIENE_TUTOR` vía gestión de salones.
  3. `ASISTENCIA_ESTUDIANTE_DUPLICADO` vía flujo de asistencia.
- Documentar qué NO queda cubierto por estos tests (mismo estándar de honestidad que el chat 437) — no se espera cobertura al 100% de los ~135 códigos.

## Pre-work

- Releer `educa-coord/plans/xrepo-87-cerrar-gap-errorcode-be-fe.md` completo — tiene el catálogo, la decisión de naming, y el hallazgo colateral (bug de argumentos invertidos en `EmailOutboxService`, ya corregido, no relevante acá).
- No releer el chat 438 para re-derivar el diff — está superado por el catálogo final post-migración BE.

## Out of scope

- Fitness function anti-drift (test/script que compare BE↔FE automáticamente) — se decide después de esta fase, con ambos lados ya sincronizados. Si en este chat surge naturalmente una forma barata de hacerlo (ej. un test unitario simple), se puede incluir, pero no es criterio de cierre de este brief.
- Cobertura exhaustiva de los ~135 códigos con test real — solo la muestra de 3 flujos.
- Tocar código BE — ya cerrado en el chat 439.

## Criterio de cierre

- [x] `UI_ERROR_CODES` sincronizado 1:1 contra el catálogo BE final (`Educa.API/Constants/<Dominio>/ErrorCodes.cs`) — sin huérfanos conocidos, sin entradas muertas (`HORARIO_OVERLAP` eliminado, más 3 muertas adicionales descubiertas: `SALON_NO_EXISTE`, `TUTOR_PLENO_CON_HORARIOS`, `HORARIO_ENTITY_ID_INVALIDO`). 90→195 entradas.
- [x] Al menos 3 flujos verificados con test real mostrando el mensaje correcto en el FE — **parcial**: 2 de 3 verificados limpio (`SALON_DUPLICADO`, `ASISTENCIA_ESTUDIANTE_DUPLICADO`); el 3ro (`HORARIO_CRUCE_SALON`/`SALON_YA_TIENE_TUTOR`) topó con gaps de arquitectura real (WAL optimista no muestra toast en conflictos; posible validación ausente en el path de escritura de Usuarios). Detalle completo en plan `xrepo-87`.
- [x] Documentado qué NO cubren los tests nuevos — ver sección "Cierre FE" en plan `xrepo-87`.
- [x] Plan `xrepo-87` actualizado con el cierre de fase FE — habilita evaluar la fitness function como brief aparte si no se resolvió acá.

## Tiempo estimado

~2-3h (diff + ampliar diccionario + 3 tests de verificación). **Real**: bastante más — el diff completo reveló ~90 códigos faltantes en vez de ~20, y la verificación con test real destapó 2 bugs de facades (mensajes genéricos ignorando `errorCode`) y 2 gaps de arquitectura no triviales de diagnosticar.

## Archivos tocados

- `src/app/shared/constants/ui-error-messages.ts` — diccionario ampliado 90→195 entradas, 4 muertas eliminadas.
- `src/app/features/intranet/pages/admin/classrooms/services/salones-admin.facade.ts` — fix: `crearSalon` ahora resuelve `errorCode` antes del mensaje genérico.
- `src/app/features/intranet/pages/admin/users/services/usuarios-crud.facade.ts` — mismo fix en `updateUsuario`.
- `e2e/salon-duplicado.spec.ts`, `e2e/asistencia-estudiante-duplicado.spec.ts` — nuevos, verifican con test real contra backend vivo.
