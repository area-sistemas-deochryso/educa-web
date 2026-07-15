# 443 — Auditar cobertura real de errorCode: ¿todos los facades lo consumen?

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo-87-cerrar-gap-errorcode-be-fe.md`
> **Creado**: 2026-07-15 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/audit`
> **exclusive**: `false`
> **modules**: sistema, errores
> **touches**:
>   - `educa-web`: todos los facades/services que consumen respuestas de error HTTP (`HttpErrorResponse` o similar)

## Contexto

Derivado del chat 440 (fase FE de `xrepo-87`). El diff estático confirmó que `UI_ERROR_CODES` tiene traducción para los 195 códigos del catálogo BE — eso **no** garantiza que cada componente que consume un error del backend efectivamente mire `errorCode` y resuelva contra el diccionario. Se encontraron 2 facades (`salones-admin.facade.ts`, `usuarios-crud.facade.ts`) que ignoraban `errorCode` por completo y mostraban un mensaje estático fijo, sin importar qué tirara el backend — descubiertos **por accidente**, porque cayeron en la muestra de 3 flujos testeados en el chat 440. El resto de los ~130 códigos nunca se probó de punta a punta, así que no hay evidencia de que el mismo patrón no se repita en otros facades/services/stores.

**Por qué es un brief aparte y no parte del 441**: el 441 ya estaba corriendo cuando se identificó este punto — no conviene ampliarle el scope mid-flight. Es además una auditoría de superficie amplia (barrido de todo `educa-web`), distinta en naturaleza a las 3 investigaciones puntuales del 441.

## Objetivo

No se puede afirmar "todos los mensajes de error llegan correctamente al usuario" sin este barrido. Cerrar esa brecha entre "el diccionario está completo" (confirmado) y "el usuario ve el mensaje" (solo confirmado en la muestra de 2/3 flujos del chat 440).

## Scope

- Barrido de todos los puntos de consumo de errores HTTP en `educa-web` (facades/services que atrapan `HttpErrorResponse` o equivalente) — confirmar cuáles pasan por el interceptor central (`error.interceptor.ts` + `error-handler.service.ts`, que sí resuelve `errorCode` correctamente) vs. cuáles tienen manejo ad-hoc propio (como los 2 facades ya corregidos en el chat 440) que podría estar ignorando `errorCode`.
- Para cada facade con manejo ad-hoc encontrado: confirmar si ignora `errorCode` (bug, mismo patrón que los 2 ya corregidos) o si lo consume correctamente (falso positivo, no tocar).
- Corregir los que repiten el patrón — mismo fix mínimo que los 2 ya aplicados (extraer `errorCode`, resolver contra `UI_ERROR_CODES`, fallback al mensaje existente).
- Si el volumen de hallazgos es grande (más de ~5-6 facades rotos), documentar el catálogo completo y evaluar si conviene una corrección masiva con patrón único (ej. un helper `resolveErrorMessage(err)` reusable) en vez de fixes uno por uno.

## Pre-work

- Releer `educa-coord/plans/xrepo-87-cerrar-gap-errorcode-be-fe.md`, sección "Cierre FE (chat 440)" — tiene el patrón exacto del bug ya encontrado en los 2 facades corregidos, usarlo como plantilla de búsqueda.
- Confirmar el alcance del interceptor central antes de asumir que todo pasa por ahí — si cubre el 100% de las llamadas HTTP, este brief podría cerrar rápido con "no hay más casos"; si hay facades que interceptan la respuesta antes del pipeline central, ahí está el riesgo real.

## Out of scope

- Punto 1 (WAL sin toast) y punto 2 (bypass de tutoría) del brief 441 — no relacionados, no repetir esa investigación acá.
- Fitness function anti-drift — eso es el punto 3 del brief 441. Este brief puede alimentar esa decisión (con el catálogo real de dónde puede romperse), pero no la implementa.
- Cambiar el contenido del catálogo de `errorCode` — ya cerrado en F1/F2 de `xrepo-87`.

## Criterio de cierre

- [x] Catálogo completo de facades/services que consumen errores HTTP en `educa-web`, clasificados: interceptor central (5) / ad-hoc correcto (32) / ad-hoc roto (19).
- [x] Todos los "ad-hoc roto" corregidos con patrón único (`resolveErrorMessage` en `@core/helpers`, dado que 19 > umbral de 5-6 del brief). Incluye `base-crud.facade.ts` + 8 bloques WAL adicionales encontrados durante el fix.
- [x] Plan `xrepo-87` actualizado (sección "Cierre F4").

## Resultado

Ver sección "Cierre F4" en `educa-coord/plans/xrepo-87-cerrar-gap-errorcode-be-fe.md` para el catálogo completo y el detalle del fix. 20 archivos modificados, typecheck + lint en verde.

## Tiempo estimado

~2-3h (barrido + fixes mecánicos; escala si aparecen muchos casos ad-hoc).
