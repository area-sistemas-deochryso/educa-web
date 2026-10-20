# 847 — Bucle de POST `/vista` al fallar `marcarVista` (estudiante, hub de curso)

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-110-qa-exploratorio-feedback-profesor-estudiante.md` (corrige un defecto de P110 F14 / H11, ya cerrado)
> **Creado**: 2026-10-20 · **Estado**: ✅ cerrado 2026-10-20.
> **MODO SUGERIDO**: `/execute` (fix + test), luego `/audit` (búsqueda del mismo patrón)
> **Prioridad**: alta. Afecta a estudiantes y degrada otras pantallas mientras dura.
> **exclusive**: `false`
> **modules**: estudiante / cursos (hub), servicio compartido `tareas-pendientes`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/estudiante/cursos/curso-hub/estudiante-curso-hub-contenido.component.ts`, `src/app/features/intranet/shared/services/tareas-pendientes/**`, `.claude/reference/optimistic-ui.md`

## Bug

En el hub de curso del estudiante, cuando el `POST /api/estudiantecurso/tarea/{id}/vista` falla, la app repite el POST en bucle, a unas 8 llamadas por segundo, hasta que se cierra la tarea o el estudiante navega.

**Evidencia** (tabla `RateLimitEvent`, base de prueba, `::1`, DNI de un estudiante de prueba):

| Día | Endpoint | Rechazos | Duración |
|---|---|---|---|
| 2026-10-12 | `POST /tarea/1016/vista` | 276 | 33 s |
| 2026-10-17 | `POST /tarea/1017/vista` | 275 | 35 s |
| ambos | `GET mis-tareas-pendientes`, `GET conversaciones/listar` | 196 + 196 | daño colateral por cuota `global:r` agotada |

**Causa probable** (leída en el código, **no reproducida**):

1. Un `effect` en `estudiante-curso-hub-contenido.component.ts` (~líneas 167-178) lee `openPanels`, `nuevasIds` y `vm().semanas`, y llama `marcarVista(id)` por cada tarea nueva de una semana expandida.
2. `marcarVista` (`tareas-pendientes.service.ts` ~línea 50) apaga `esNueva` de forma optimista y hace el POST.
3. Si el POST falla, el `error` hace `this._tareas.set(previous)`, que vuelve a poner `esNueva = true`.
4. `nuevasIds` cambia, el `effect` se dispara otra vez y el filtro no excluye lo ya intentado (`vistasEstaVisita` se actualiza pero no se usa para filtrar). Vuelve al paso 2.

Incumple la política de retry del proyecto: un 4xx/429 nunca se reintenta.

**Qué no sabemos**: qué falla inició el primer POST en cada día. No cambia el arreglo, porque cualquier falla (429, 5xx, red) arma el bucle.

## Scope

### educa-web
- **Reproducir primero** en local contra la BBDD de prueba, en un worktree de `educa-web` con el junction de `node_modules`: entrar como estudiante con una tarea nueva, forzar que el POST falle (interceptar o devolver 5xx) y contar las llamadas. Confirmar la causa antes de arreglar.
- Que el `effect` no vuelva a intentar una tarea ya intentada en la visita (`vistasEstaVisita` como filtro real).
- Que una falla del POST haga el rollback visual **una sola vez** y no reintente. Un 4xx/429 no se reintenta nunca; un 5xx puede, como máximo, un reintento lento según la política del proyecto.
- Test que fije el comportamiento: si el POST falla, se hace **exactamente una** llamada y `esNueva` vuelve a `true` sin disparar otra.
- Test de no regresión del caso feliz: el POST exitoso apaga `esNueva` y no se repite.

### Auditoría del patrón (solo lectura, sin corregir)
- Buscar en `educa-web/src/app` otros `effect()` que lean un signal que una mutación con rollback vuelve a escribir. Señales de búsqueda: `effect(` cuyo cuerpo llama a un método que hace `.set(previous)` / `.set(snapshot)` en el `error`, o que llama a `http.post|put|delete` sin guardia de "ya intentado".
- Entregar la lista (archivo, línea, riesgo) como informe en este brief. **Cada hallazgo real se corrige en su propio brief**, no acá.

### Documentación
- Dejar en `.claude/reference/optimistic-ui.md` la nota «Efecto + rollback = bucle» y su fila en la tabla de anti-patrones (ya escrita al crear este brief; revisar que siga vigente tras el fix).

## Pre-work

- Leer `.claude/reference/optimistic-ui.md` y `.claude/reference/rate-limiting.md`.
- Leer el brief de origen de H11 (P110 F14, brief 802) para no romper la lógica de «vista al expandir semana».

## Out of scope

- El rate limit en sí: P26 F4 sigue dormido, el limitador funcionó.
- Cambios de BE: el endpoint y su política `global:w` no se tocan.
- Corregir otros sitios con el mismo patrón: salen en briefs aparte.

## Patrón a vigilar en próximas ejecuciones

> **Un `effect` que dispara una mutación, más un rollback optimista que reescribe el signal que el `effect` observa, es un bucle de reintentos asegurado.**

Señales de que está pasando de nuevo:
- Muchos rechazos 429 de **un solo usuario** en pocos segundos, todos al mismo endpoint de escritura.
- Rechazos colaterales en lecturas (`global:r`) de otras pantallas en el mismo intervalo.
- Consulta de control (solo lectura) sobre `RateLimitEvent`: usuario con más de ~100 rechazos en un minuto al mismo `REL_Endpoint`.

Cuando una ejecución termine en bloqueos 429 sin causa aparente, revisar primero este patrón antes de tocar los límites.

## Criterio de cierre

- [ ] La causa probable queda confirmada con una reproducción local (o corregida en el brief si resulta ser otra).
- [ ] Una falla del POST produce una sola llamada, verificado por test.
- [ ] El caso feliz sigue apagando `esNueva` sin repetir.
- [ ] Informe de auditoría del patrón entregado, con cada hallazgo candidato a brief propio.
- [ ] `lint` + `build` + tests de los archivos tocados en verde.
- [ ] Verificación en vivo en local contra la BBDD de prueba, nada en producción.

## Tiempo estimado

~90 min (reproducción 20, fix y tests 40, auditoría 30).

## Avance (2026-10-20)

- **Reproducido** con test en `estudiante-curso-hub-contenido.component.spec.ts`: tras el rollback (`nuevasIds` vuelve a incluir la tarea) `marcarVista` se llamaba 2 veces. Causa confirmada.
- **Fix** (worktree `chat/847-…`): el `effect` filtra `!vistasEstaVisita().has(id)` dentro de `untracked`. Una tarea se intenta una vez por visita; `vistasEstaVisita` se reinicia al cambiar de franja.
- Tests: 77/77 en `curso-hub/` + `tareas-pendientes/`. `eslint` y `tsc --noEmit -p tsconfig.app.json` en verde.
- **Pendiente**: verificación en vivo local (BBDD de prueba, `UseTestEnv: true`); el 5xx con un reintento lento no se implementó (la tarea no se reintenta en la visita).

### Informe de auditoría del patrón (solo lectura)

Búsqueda: `effect()` cuyo cuerpo llama a `http.post|put|delete|patch`, `wal.execute`, o métodos `marcar*/guardar*/save*/toggle*/mark*`, más `.set(previous|snapshot|…)` en errores.

| Archivo | Línea | Riesgo |
|---|---|---|
| `estudiante-curso-hub-contenido.component.ts` | ~165 | Era el defecto; corregido acá. |
| `admin/error-groups/.../error-occurrence-timeline.component.ts` | 82 | Falso positivo (gráfico con `markers`, sin mutación). |

**Sin hallazgos adicionales.** Las ~50 coincidencias de `rollback` están en facades/stores, invocados desde handlers de usuario, no desde `effect()`. Límite de la búsqueda: un `effect` que llame a una mutación vía método con nombre distinto a los patrones no aparecería.

### Verificación en vivo (2026-10-20)

Local (FE `:4201` desde el worktree, BE `:5139` Development, `UseTestEnv: true`), sesión de estudiante de prueba, curso 7 (Personal Social). Se interceptó en el navegador: `GET mis-tareas-pendientes` con `esNueva: true` y `POST …/vista` → 500 (nada llegó al BE). Al expandir la Semana 1: **1 POST** en 18 s (antes del fix, ~8/s); la marca «Nueva» sigue visible. Servidores apagados. No se tocó producción.
