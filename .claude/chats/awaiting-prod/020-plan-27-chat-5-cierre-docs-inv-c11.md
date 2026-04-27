> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Validación prod**: ⏳ pendiente desde 2026-04-27 (backfill — cierre original anterior, ver git log)
> **Plan**: 27 · **Chat**: 5 · **Fase**: `/design` + documentación · **Estado**: ⏳ pendiente arrancar (no cierra hasta validación del jefe post-deploy).

---

# Plan 27 Chat 5 — Cierre + formalización `INV-C11` en `business-rules.md`

## PLAN FILE

**Maestro**: `../../educa-web/.claude/plan/maestro.md` § "🔴 Plan 27 — Filtro temporal de asistencia diaria por grado (5to Primaria en adelante)".

Secciones relevantes del maestro:

- "Plan de ejecución (confirmado post-Chat 1)" — fila **Chat 5** (este chat).
- "Invariantes a formalizar en Chat 5" — `INV-C11` (definición que este chat escribe en `business-rules.md`).
- "Reversibilidad" — plan de revertir (bajar el umbral) que también se documenta formalmente.
- "Decisiones tomadas en Chat 1" — las 10 decisiones acordadas, que son la base del texto normativo.

**Reglas BE a consultar**:

- `Educa.API/.claude/rules/business-rules.md` — documento destino del cambio. §1 "Asistencia Diaria (CrossChex)" + §15.4 "Invariantes de Cálculo" son donde entra `INV-C11`.
- `Educa.API/.claude/rules/backend.md` — convenciones generales (script SQL, migraciones, etc.).

Chats anteriores (todos ✅ cerrados 2026-04-22):

- Chat 1 `/design`: `.claude/chats/closed/016-plan-27-chat-1-design-asistencia-filtro-grado.md` (educa-web)
- Chat 2 `/execute` BE: `.claude/chats/closed/017-plan-27-chat-2-be-filtro-grado-asistencia-diaria.md` (educa-web) — commit `2738eaf` + filtros en `AsistenciaService` y `AsistenciaAdminQueryRepository`.
- Chat 3 `/execute` BE: `.claude/chats/closed/018-plan-27-chat-3-be-reportes-filtro-grado.md` (educa-web) — commit `19e74d5` + nota en reportes.
- Chat 4 `/execute` FE + BE mínimo: `.claude/chats/closed/019-plan-27-chat-4-fe-banner-self-service-widget.md` (educa-web) — commits BE `a967e21` + FE `3c5061e`.

## OBJETIVO

Cerrar formalmente Plan 27 documentando el filtro temporal como regla de negocio explícita. El código ya existe y está desplegable; este chat convierte las decisiones dispersas en tres lugares (maestro, constantes, tests) en **una sola fuente de verdad** en `business-rules.md` que un desarrollador nuevo pueda leer y entender sin arqueología.

Alcance dual:

1. **Normativo**: agregar el invariante `INV-C11` al registro formal en `business-rules.md §15.4` + nueva subsección §1.11 "Filtro temporal por grado".
2. **Operativo**: plan de reversión explícito + movimiento de chat files a `closed/` + actualización del maestro marcando Plan 27 como cerrado (pendiente solo validación post-deploy).

## PRE-WORK OBLIGATORIO

### 1. Verificar que todos los commits del Plan 27 estén mergeados

```bash
# En Educa.API
git log --oneline master | head -10 | grep -E "Plan 27|a967e21|19e74d5|2738eaf"

# En educa-web
git log --oneline main | head -10 | grep -E "Plan 27|3c5061e"
```

Si algún commit todavía está solo local y no pushed, avisar al usuario antes de arrancar — la documentación refleja estado de producción.

### 2. Confirmar con el usuario el timing de cierre

```text
[ ] ¿El jefe ya validó el comportamiento post-deploy? (banner + self-service + widget)
[ ] Si NO validado todavía → el chat documenta igualmente, pero el maestro queda "🟢 cerrado pendiente validación"
[ ] Si YA validado → el maestro queda "🟢 cerrado + validado"
```

El plan original (Chat 1 decisión 10) dice que Chat 5 NO cierra hasta la validación del jefe. Este chat igual documenta en código; el estado del maestro se ajusta al final según la respuesta del usuario.

### 3. Leer el estado actual de `business-rules.md` para no romper contexto

```bash
# Desde Educa.API
grep -n "INV-C10\|INV-C09\|INV-C08" Educa.API/.claude/rules/business-rules.md
```

Ubicación esperada: §15.4 "Invariantes de Cálculo". `INV-C11` se inserta **después** de `INV-C10` (manteniendo orden numérico).

La nueva subsección §1.11 "Filtro temporal por grado" se agrega **al final de §1** (Asistencia Diaria), no en medio, para no renumerar subsecciones existentes.

## ALCANCE

### Archivos a modificar (BE)

| Archivo | Acción | Líneas estimadas |
|---------|--------|------------------|
| `Educa.API/.claude/rules/business-rules.md` — §1 nueva subsección **1.11 Filtro temporal por grado** | Agregar (después de §1.10 "Cierre mensual") | +55 |
| `Educa.API/.claude/rules/business-rules.md` — §15.4 tabla "Invariantes de Cálculo" | Agregar fila `INV-C11` después de `INV-C10` | +1 |

### Archivos a modificar (FE)

| Archivo | Acción | Líneas estimadas |
|---------|--------|------------------|
| `educa-web/.claude/plan/maestro.md` — "🔴 Plan 27" entry | Cambiar encabezado a 🟢 + marcar Plan 27 como cerrado; mover de la sección "En progreso" al archivo o sección de "Cerrados" si aplica | ~5-10 |
| `educa-web/.claude/chats/020-plan-27-chat-5-cierre-docs-inv-c11.md` | Mover a `closed/` al cerrar | 0 (mv) |

### Estructura del texto normativo (§1.11)

El texto debe cubrir:

1. **Qué** — umbral `GRA_Orden >= 8` para asistencia diaria biométrica (5to Primaria en adelante).
2. **Por qué** — el CrossChex del colegio solo cubre esos grados en el plan actual; los grados inferiores usan cuaderno físico del salón.
3. **Dónde se aplica** (lista exhaustiva):
   - Webhook CrossChex: descarta marcación silenciosamente con log `Information`.
   - Consultas admin (listar día + estadísticas del día + reportes filtrados).
   - Reportes PDF/Excel: excluyen filas + nota en header.
   - Correos de asistencia: early-return cuando grado está fuera de alcance.
   - Self-service estudiante/apoderado: muestran mensaje "aún no usa biométrica".
   - Banner fijo en admin/asistencias.
4. **Dónde NO se aplica** — profesores (`TipoPersona='P'`), búsqueda de estudiantes del home (universo completo), kardex/historia académica.
5. **Fuente de verdad**: `Educa.API.Constants.Asistencias.AsistenciaGrados.UmbralGradoAsistenciaDiaria = 8` (BE) + mirror `UMBRAL_GRADO_ASISTENCIA_DIARIA` en `educa-web/src/app/shared/constants/attendance-scope.ts` (FE).
6. **Plan de reversión**: bajar la constante BE → deploy → (opcional) job de catch-up si el colegio quiere regenerar estados `F` históricos → el FE se reconfigura al siguiente deploy (o al pasar la constante FE al mismo valor). No hay data loss.

### Texto nuevo de fila en §15.4

```markdown
| `INV-C11` | Marcaciones CrossChex de estudiantes con `GRA_Orden < UmbralGradoAsistenciaDiaria` se descartan silenciosamente (log `Information`, sin registro). Consultas admin, reportes y correos aplican el mismo filtro. Profesores (`TipoPersona='P'`) no están sujetos a este filtro. Revertir = bajar el umbral en `AsistenciaGrados` | `CoherenciaHorariaValidator.Clasificar` → `MarcacionAccion.IgnorarGradoFueraAlcance`; filtros en `ConsultaAsistenciaRepository` (3 queries), `AsistenciaAdminQueryRepository` (2 queries), `ReporteAsistenciaRepository` (3 queries); early-return en `EmailNotificationService` | 1.11, 15.4 |
```

### Posibles tareas menores (validar durante el chat, no asumir)

- Ver si hay algún `TODO` o `// FIXME` en el código con referencia a `Plan 27` o `INV-C11` que deba limpiarse ahora que el invariante está formalizado.
- Ver si algún test spec tiene comentarios "Plan 27 Chat X" que deban apuntar a la sección de business-rules en su lugar.

## TESTS MÍNIMOS

Este chat es de documentación, NO agrega tests nuevos al código. Pero **debe correr la suite completa** para confirmar que la baseline sigue verde después del cierre:

| Suite | Comando | Baseline esperada |
|-------|---------|-------------------|
| BE (Educa.API) | `dotnet test --nologo` | 1155 verdes (post-Chat 4) |
| FE (educa-web) | `npx vitest run` | 1507 verdes (post-Chat 4) |

Si alguna baseline difiere (porque hubo commits paralelos entre Chat 4 y Chat 5), actualizar el texto del maestro con el número real al cerrar.

## REGLAS OBLIGATORIAS

- **Fuente única de verdad**: `INV-C11` vive formalmente solo en `business-rules.md`. Comentarios en el código pueden referenciar `// Plan 27 · INV-C11` pero **no duplicar** la definición completa del invariante.
- **No renumerar subsecciones existentes** — `INV-C11` se agrega DESPUÉS de `INV-C10`, §1.11 se agrega DESPUÉS de §1.10.
- **Cap 300 líneas por archivo** — `business-rules.md` está exento del cap (es documentación viva del dominio), pero igual mantener las subsecciones breves y escaneables.
- **Commit message en inglés** (skill `commit`), términos de dominio entre comillas (`"Plan 27"`, `"INV-C11"`, `"UmbralGradoAsistenciaDiaria"`).
- **NUNCA `Co-Authored-By`** (regla de la skill).
- **Reversibilidad como sección explícita** — el documento NO puede omitir el plan de revertir (decisión 7 del Chat 1: el filtro es temporal, no permanente).

## APRENDIZAJES TRANSFERIBLES (del Chat 4)

### 1. El BE y el FE duplican el umbral en dos archivos, pero es aceptable

`AsistenciaGrados.UmbralGradoAsistenciaDiaria = 8` (BE) y `UMBRAL_GRADO_ASISTENCIA_DIARIA = 8` (FE). Son repos independientes, no comparten código compilado. El documento normativo debe mencionar **ambas ubicaciones** como "mirror que se actualiza en el mismo despliegue". Si a futuro se consolida vía un manifiesto compartido, se actualiza el doc — por ahora esa es la realidad.

### 2. La constante `GRADO_ORDEN_MAP` del FE es solo defensiva

El BE ya envía `graOrden` directo en los DTOs self-service (`ResumenAsistenciaDto.GraOrden` + `HijoApoderadoDto.GraOrden`). El mapa nominal (`"3ro Primaria"` → 6) es fallback cuando el BE no envía el orden — útil para rendering en grid admin (donde el nombre viene en la cadena). No es la fuente de verdad canónica; si hay conflicto entre el mapa FE y el BE, gana el BE. Documentar explícitamente en §1.11.

### 3. El widget home no tiene código propio para el filtro

Pasa 100% por el endpoint `/api/ConsultaAsistencia/director/estadisticas` que ya filtra. Los tests del widget agregados en Chat 4 fijan el contrato (ambos counters vienen del mismo objeto filtrado), pero **el widget en sí no conoce el umbral**. Al documentar, no describir el widget como "aplica INV-C11"; decir "consume un endpoint filtrado por INV-C11".

### 4. Profesores están intactos

Endpoints de profesor (`/profesor/*`, `/director/profesores-asistencia-dia`) NO están filtrados por `GRA_Orden` — solo estudiantes. El tipo polimórfico `AsistenciaPersona` permite discriminar por `TipoPersona='E' vs 'P'`. Documentar explícitamente: INV-C11 aplica solo a `TipoPersona='E'`.

### 5. Existen dos implementaciones de `GetGraOrden*`

- `AsistenciaRepository.GetGraOrdenEstudianteActivoAsync` — usado por el webhook para el guard del INV-C11.
- `ConsultaAsistenciaRepository.ObtenerGraOrdenEstudianteAsync` — creado en Chat 4 para alimentar los DTOs self-service, mantenido separado para respetar la división read/write de repositorios.

Son duplicados triviales (10 líneas cada uno, mismo query). Documentar como **decisión explícita** en §1.11 o en el `business-rules.md` anti-patrón "`Corrección Sistemática`" no aplica aquí porque son dos dominios separados. Si a futuro se consolida, dejar el lugar donde migrar.

### 6. El flujo "pagada por fecha" no afecta

Plan 27 NO interactúa con el flujo de pagos/matrícula (sección 14.2 de `business-rules.md`). Los grados inferiores siguen matriculándose normalmente; solo su asistencia diaria no se registra. Clarificar para evitar la impresión de que "los grados excluidos no existen" — SÍ existen, solo no tienen biométrico.

### 7. Pendiente de la decisión 9 del Chat 1

"El reporte de asistencia del profesor pupitral (tutor pleno `GRA_Orden ≤ 7`) **igualmente se genera sin datos**, con nota". Verificar en el código actual si este flujo mantiene el comportamiento esperado o si hay algún tweak pendiente. Si hay ajuste, abrirlo como chat aparte (no mezclar con cierre).

## FUERA DE ALCANCE

- **Validación post-deploy** — la hace el jefe del colegio con datos reales. Este chat no puede cerrarla.
- **Cambios de código** — si al documentar se descubre una inconsistencia, abrir chat separado. Este chat es **solo documentación + cierre**.
- **Plan 22 / 24 / 26** — frentes paralelos, no tocar.
- **Consolidación de los dos `GetGraOrden*`** — si decidimos unificarlos, va en chat aparte después del cierre.
- **Migración del umbral a config en BD** — mencionar como deuda técnica menor (si la constante del colegio cambia el día de mañana, requeriría deploy), pero no implementar ahora.

## CRITERIOS DE CIERRE

```text
PRE-WORK
[ ] Commits Plan 27 confirmados en master/main (pushed o ack local OK)
[ ] Usuario confirmó estado de validación post-deploy (pre o post validado)
[ ] Suite BE + FE verde antes de empezar (dotnet test + npx vitest run)

DOCUMENTACIÓN
[ ] Nueva subsección §1.11 "Filtro temporal por grado" agregada a business-rules.md
    con las 6 subsecciones (Qué, Por qué, Dónde aplica, Dónde NO aplica, Fuente de
    verdad, Reversión)
[ ] Fila INV-C11 agregada a §15.4 después de INV-C10
[ ] Ambas ubicaciones (BE + FE) del umbral mencionadas como "mirror"
[ ] Profesores documentados como exentos (TipoPersona='P')
[ ] Plan de reversión escrito (bajar umbral → deploy → job opcional catch-up)

MAESTRO
[ ] maestro.md: encabezado Plan 27 → 🟢 cerrado (o 🟢 cerrado pendiente validación)
[ ] Fila de Chat 5 en "Plan de ejecución" marcada ✅ con fecha
[ ] Sección "Foco" actualizada al siguiente plan prioritario

CIERRE
[ ] Suite BE + FE verde al final (sin regresiones)
[ ] Commit BE: "docs(asistencia): Plan 27 — formalize 'INV-C11' in business-rules"
[ ] Commit FE: "docs(maestro): Plan 27 closed — INV-C11 formalized"
[ ] Mover este archivo a educa-web/.claude/chats/closed/ al cerrar
[ ] Invocar /next-chat si hay un siguiente plan inmediato; si no, cerrar la sesión
```

## COMMIT MESSAGE sugerido

Dos commits — uno BE (donde vive el documento normativo) y uno FE (docs + mover chat file).

### Backend (`Educa.API`)

```text
docs(asistencia): Plan 27 — formalize "INV-C11" in business-rules

Consolidate the "temporary grade filter" decisions from Chats 1-4 into a
single source of truth in business-rules.md so a new contributor can
understand why 'GRA_Orden < UmbralGradoAsistenciaDiaria' students have no
biometric attendance without reading 5 chat files.

- business-rules.md §1.11 "Filtro temporal por grado" — what, why, where
  it applies (webhook guard, admin queries, reports, emails, self-service,
  admin banner), where it does NOT apply (profesores, global student
  search, kardex), canonical sources (BE "AsistenciaGrados.
  UmbralGradoAsistenciaDiaria" + FE "UMBRAL_GRADO_ASISTENCIA_DIARIA"
  mirror), and reversion plan.
- business-rules.md §15.4 — new "INV-C11" row after "INV-C10" with the
  enforcement map (validator + 3 repos + email service early-return).

No code changes. Baseline 1155 tests green (unchanged).
```

### Frontend (`educa-web`)

```text
docs(maestro): Plan 27 closed — "INV-C11" formalized

Plan 27 ("Filtro temporal de asistencia diaria por grado") shipped across
5 chats. Chat 5 formalizes the invariant in the backend
"business-rules.md" and closes the maestro entry.

- maestro.md — Plan 27 entry marked 🟢 closed (post-validación del jefe
  pendiente according to decision 10 of Chat 1).
- Chat 5 file moved to .claude/chats/closed/.

No code changes. Baseline 1507 tests green (unchanged).
```

## CIERRE

Al terminar Chat 5, pedir al usuario:

1. **¿Quedó claro el plan de reversión?** — un developer nuevo que tiene que "subir de nuevo el umbral a 1" debería poder ejecutarlo con solo leer §1.11. Si algo no está claro, ajustar.
2. **¿Hay un plan futuro para migrar el umbral a config en BD?** — para saber si la deuda técnica se convierte en ticket o queda como nota histórica.
3. **¿Validación post-deploy del jefe ya ocurrió o está pendiente?** — define si el maestro dice "🟢 cerrado" o "🟢 cerrado pendiente validación".
4. **¿Siguiente prioridad?** — Plan 22 F4 BE, Plan 26 F2 Chat 2, Design System F5.3, o Carril D son los frentes abiertos según el maestro. Ofrecer hacer `/next-chat` para el que el usuario elija.

Si cierre limpio + tests verdes + commits hechos + maestro actualizado → **Plan 27 COMPLETO** (pendiente solo la validación del jefe post-deploy si aplica). Invocar `/next-chat` para el siguiente plan que el usuario decida.
