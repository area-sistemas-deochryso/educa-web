---
exclusive: false
isolation: worktree
touches: [src/app/features/intranet/pages/profesor/cursos/components/calificar-dialog/, src/app/features/intranet/pages/profesor/cursos/services/calificaciones.facade.ts, src/app/features/intranet/pages/profesor/cursos/services/calificaciones.store.ts, src/app/features/intranet/pages/profesor/cursos/components/curso-content-dialog/, src/app/features/intranet/pages/profesor/grades/profesor-calificaciones.component.html, src/app/features/intranet/pages/profesor/classrooms/components/salon-notas-tab/]
hot-paths: []
---

> **Repo destino**: `educa-web`. Abrir en worktree `chat/449-calificar-flow-umbral-relacion-general`.
> **Creado**: 2026-07-16 · **Estado**: ✅ resuelto, awaiting-prod.
> **Fuente**: auditoría UX cross-repo "Horarios y Contenido de Cursos" (educa-coord, 2026-07-16) + investigación de este mismo chat (agente dedicado, hallazgos citados abajo).

# Flujo Calificar: umbral de aprobación no wireado + relación nota/"General" sin explicar

## MODO SUGERIDO

`/execute` directo — causa raíz ya confirmada por investigación previa, citada abajo con archivos y líneas exactas.

## ALCANCE

### 1. Umbral de aprobación no wireado

`calificar-dialog.component` (`.ts` líneas 55-58, 227-229) recibe `input<ConfiguracionCalificacionListDto | null>(null)` como `calificacionConfig` y lo usa para clasificar aprobado/desaprobado y colorear la nota. Ninguno de sus 2 puntos de uso se lo pasa:
- `curso-content-dialog.component.html` (líneas 247-256, `<app-calificar-dialog>`) — sin `[calificacionConfig]`.
- `profesor-calificaciones.component.html` (líneas 67-76) — misma omisión.
- Tampoco `<app-calificaciones-panel>` (usado en `curso-content-dialog.component.html` líneas 81-93) lo recibe.

**Causa raíz real, más profunda de lo que parece**: `calificaciones.facade.ts` **nunca fetchea** `ConfiguracionCalificacionListDto` — no es solo un binding faltante, el dato no existe en el `vm()` de este facade. Contraste: el patrón correcto ya existe en `final-classrooms/services/profesor-final-salones.facade.ts` (línea 51: `configuraciones: this.api.getConfiguracionesPorAnio(anio)`), consumido en `salon-notas-tab.component.ts` — ese flujo ya funciona bien, no tocarlo.

Default actual cuando `config === null`: `VigesimalScale` con `passingGrade = 11` (`shared/utils/calificacion-config.utils.ts` → `data/adapters/grade/vigesimal-scale.adapter.ts` línea 21) — confirma el "11/20" reportado en la auditoría.

**Implementación**: `calificaciones.facade.ts` debe fetchear la `ConfiguracionCalificacionListDto` correspondiente al nivel del curso/salón (mismo mecanismo que `profesor-final-salones.facade.ts`), exponerla en su `vm()`, y bindearla a `app-calificaciones-panel` y `app-calificar-dialog` en ambos puntos de uso (`curso-content-dialog`, `profesor-calificaciones`).

**Antes de fijar el tamaño del fix**: revisar `calificaciones.store.ts`/`calificaciones.facade.ts` completos para confirmar si el contexto de curso/salón en ese facade ya tiene un `nivelId` disponible para llamar al mismo endpoint que usa `profesor-final-salones.facade.ts`, o si hace falta agregar ese dato a la carga inicial — el investigador previo no pudo confirmar esto sin ver el archivo completo.

### 2. Relación entre nota cruda y "General" no se explica

Componente: `ClassroomGradesTabComponent` (`salon-notas-tab.component.html`, headers "General" en líneas 77/106/131; celda de valor líneas 185-194). El valor "General" **llega ya calculado del backend** (`est.promedios` en `SalonNotasResumenDto`), no se calcula en FE — no tocar la fórmula, es responsabilidad de Educa.API.

**Fix**: agregar tooltip (usar `TooltipModule`, ya importado líneas 11/47) en el header "General" explicando que es un promedio ponderado por peso de evaluación, no la nota cruda. Texto sugerido: "Promedio ponderado por el peso de cada evaluación — no es un promedio simple de las notas." Colocar solo en el header (no repetir en cada celda).

## OUT OF SCOPE

- Negativo en input de nota (ej. "-10" → PrimeNG le saca el signo y queda "10"): **decisión del usuario — se deja como está, comportamiento nativo de PrimeNG, no se toca en este brief.**
- Cambiar la lógica de clasificación (`VigesimalScale`/`LiteralScale`/`clasificarNota`) o el default histórico 11/20.
- Tocar `salon-notas-tab`/`final-classrooms` para el punto 1 (ya está bien wireado, es la referencia a copiar, no a modificar).
- Cambiar la fórmula de cálculo de "General" (es backend).
- Calificación Literal (tiene su propio brief de diseño: `445` en `educa-coord`, en curso aparte).

## Pre-work

- Leer `calificaciones.store.ts` y `calificaciones.facade.ts` completos antes de implementar el punto 1.
- Confirmar contra `final-classrooms/services/profesor-final-salones.facade.ts:51` el patrón exacto de fetch de configuración a reusar.

## Criterio de cierre

- [~] Umbral de aprobación real (no 11/20 hardcoded) visible en `calificar-dialog` desde ambos puntos de uso — implementado y verificado por lectura de código + build/tests; **no se verificó en vivo con browser** dentro de esta ejecución (ver nota abajo).
- [x] Tooltip visible en header "General" de `salon-notas-tab` (verificado por lectura de template, no en vivo).
- [x] Lint + build + tests OK.
- [x] Commit en la rama del worktree — sin merge (se integra después).

## Resumen de cierre (2026-07-16)

**Punto 1 — Umbral de aprobación wireado**:

- Investigación de pre-work confirmó lo que el brief dejaba abierto: `calificaciones.facade.ts` NO tenía `nivelId` disponible en su contexto (ni `HorarioProfesorDto` ni `CursoContenidoDetalleDto` traen nivel/grado). Pero el propio `loadCalificaciones()` ya llamaba a `api.getEstudiantesSalon(salonId)`, cuya respuesta (`ProfesorSalonConEstudiantesDto`) sí trae `grado: string` (ej. "1ro Primaria") — solo se usaba `estudiantes` y se descartaba `grado`.
- Fix: se resuelve el nivel con `detectarNivel(grado)` (util ya existente en `@core/helpers`, no se creó lógica nueva) y se fetchea la config con `CalificacionConfigService.getConfig(nivel)` (servicio compartido ya existente en `@intranet-shared/services/calificacion-config`, con cache — se prefirió sobre replicar el patrón `forkJoin` de `profesor-final-salones.facade.ts` porque ya resuelve nivel→config con menos código).
- `CalificacionesStore`: nuevo campo `calificacionConfig: ConfiguracionCalificacionListDto | null` en el state, computed, setter `setCalificacionConfig`, y expuesto en `vm()`. Se resetea a `null` junto con el resto del state en `reset()`.
- `CalificacionesFacade`: nuevo método privado `loadCalificacionConfig(grado)`, invocado desde `loadCalificaciones()` cuando hay `result.salon`.
- Bindeado `[calificacionConfig]="calVm().calificacionConfig"` en los 2 puntos de uso reales: `curso-content-dialog.component.html` (`app-calificaciones-panel` y `app-calificar-dialog`) y `profesor-calificaciones.component.html` (mismos 2 componentes). Los 3 componentes consumidores (`CalificacionesPanelComponent`, `CalificarDialogComponent`) ya tenían el input `calificacionConfig` declarado — solo faltaba el binding.

**Punto 2 — Tooltip en "General"**:

- Se agregó `pTooltip` al `<th class="general-header">` en las 3 vistas de `salon-notas-tab.component.html` (semana, periodo, anual — líneas originales 77/106/131), con el texto sugerido por el brief. `TooltipModule` ya estaba importado, sin cambios de imports.

**Desviaciones del brief**: el criterio de cierre pedía verificación en vivo con un nivel de config distinta al default — no se hizo browser/E2E en esta ejecución (agente delegado, alcance limitado a lint+build+test según instrucción recibida). Queda pendiente como parte del ciclo `awaiting-prod` / `/verify-prod`. El resto no tiene desviaciones: el punto abierto en el pre-work ("¿tiene el facade nivelId disponible?") se resolvió — no lo tenía como campo dedicado, pero el dato ya viajaba dentro de una respuesta que el facade ya consumía (`grado` en `getEstudiantesSalon`), así que no hizo falta agregar ningún fetch nuevo a la carga inicial ni tocar backend.

**Verificación**: `bun run lint` limpio, `bun run build` OK (SSR + prerender de 9 rutas), `bun run test` 2347/2349 tests OK — las 2 fallas (`email-outbox-diagnostico.component.spec.ts`, `eslint-config-guards.spec.ts`) son timeouts de infraestructura bajo carga paralela, no relacionados con este cambio; ambos pasan en ejecución aislada.

**Archivos tocados**:
- `src/app/features/intranet/pages/profesor/cursos/services/calificaciones.store.ts`
- `src/app/features/intranet/pages/profesor/cursos/services/calificaciones.facade.ts`
- `src/app/features/intranet/pages/profesor/cursos/components/curso-content-dialog/curso-content-dialog.component.html`
- `src/app/features/intranet/pages/profesor/grades/profesor-calificaciones.component.html`
- `src/app/features/intranet/pages/profesor/classrooms/components/salon-notas-tab/salon-notas-tab.component.html`
