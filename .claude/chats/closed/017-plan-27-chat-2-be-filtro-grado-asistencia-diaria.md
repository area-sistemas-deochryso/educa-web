> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 27 · **Chat**: 2 · **Fase**: `/execute` BE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 27 Chat 2 — `/execute` BE — Filtro asistencia diaria por grado (webhook + admin + correos)

## PLAN FILE

**Maestro**: `educa-web/.claude/plan/maestro.md` § "🔴 Plan 27 — Filtro temporal de asistencia diaria por grado (5to Primaria en adelante)".

Path desde el repo destino:

- Desde `Educa.API`: `../../educa-web/.claude/plan/maestro.md`

Secciones relevantes del maestro:

- "Decisiones tomadas en Chat 1 (`/design` ✅ 2026-04-22)" — las 10 decisiones que ya cerró el diseño
- "Plan de ejecución (confirmado post-Chat 1)" — fila Chat 2 (este chat)
- "Invariantes a formalizar en Chat 5" — `INV-C11` (este chat lo implementa, Chat 5 lo documenta formalmente en `business-rules.md`)
- "Checklist pre-inicio Chat 2 `/execute` BE"

Chat anterior (Chat 1 `/design`): `educa-web/.claude/chats/closed/016-plan-27-chat-1-design-asistencia-filtro-grado.md`.

Referencias de dominio:

- `business-rules.md` §1.5 (Coherencia horaria + `CoherenciaHorariaValidator`) — patrón molde para `MarcacionAccion.IgnorarGradoFueraAlcance`
- `business-rules.md` §5.1 (niveles y `GRA_Orden`) — **5to Primaria = `GRA_Orden = 8`**
- `business-rules.md` §5.4 + `INV-AS01` — `UMBRAL_TUTOR_PLENO = 7` existente en `Constants/Asistencias/`; coexistirá con `UMBRAL_GRADO_ASISTENCIA_DIARIA = 8`
- `business-rules.md` `INV-AD05` (correo diferenciado admin vs biométrica) — el early-return de correos debe cubrir ambos canales

## OBJETIVO

Implementar en backend el filtro temporal que excluye estudiantes con `GRA_Orden < 8` (Inicial a 4to Primaria) del flujo de asistencia diaria CrossChex y de los correos relacionados. Tres frentes en el mismo chat: webhook (guard silencioso), queries admin (filtrar listados de lectura) y correos (early-return a nivel negocio).

**NO** se tocan reportes PDF/Excel (Chat 3) ni FE (Chat 4). Admin sigue pudiendo editar registros históricos (decisión 6 de Chat 1 = A, sin `INV-AD07`).

## PRE-WORK OBLIGATORIO

### 1. Mostrar al usuario — Query de baseline post-filtro (para validar impacto pre-deploy)

**NO ejecutar tú**. Mostrar al usuario y pedirle los resultados antes de codificar:

```sql
-- Baseline 1: universo afectado vs no afectado (hoy)
SELECT
  CASE WHEN g.GRA_Orden <= 7 THEN 'AFECTADO (<=7)' ELSE 'FUERA_ALCANCE (>=8)' END AS grupo,
  g.GRA_Orden,
  g.GRA_Nombre,
  COUNT(DISTINCT e.EST_CodID) AS estudiantes_activos
FROM Estudiante e
INNER JOIN EstudianteSalon es ON es.ESS_EST_CodID = e.EST_CodID AND es.ESS_Estado = 1
INNER JOIN Salon s ON s.SAL_CodID = es.ESS_SAL_CodID AND s.SAL_Estado = 1
INNER JOIN Grado g ON g.GRA_CodID = s.SAL_GRA_CodID
WHERE e.EST_Estado = 1
GROUP BY g.GRA_Orden, g.GRA_Nombre
ORDER BY g.GRA_Orden;
```

```sql
-- Baseline 2: marcaciones CrossChex últimos 7 días de estudiantes GRA_Orden <= 7
-- (dimensiona cuánto ruido se elimina a diario)
SELECT
  CAST(ap.ASP_Fecha AS DATE) AS fecha,
  COUNT(*) AS marcaciones_grados_bajos
FROM AsistenciaPersona ap
INNER JOIN Estudiante e ON e.EST_CodID = ap.ASP_PersonaCodID
INNER JOIN EstudianteSalon es ON es.ESS_EST_CodID = e.EST_CodID AND es.ESS_Estado = 1
INNER JOIN Salon s ON s.SAL_CodID = es.ESS_SAL_CodID
INNER JOIN Grado g ON g.GRA_CodID = s.SAL_GRA_CodID
WHERE ap.ASP_TipoPersona = 'E'
  AND g.GRA_Orden <= 7
  AND ap.ASP_Fecha >= DATEADD(DAY, -7, SYSDATETIME())
GROUP BY CAST(ap.ASP_Fecha AS DATE)
ORDER BY fecha DESC;
```

```sql
-- Baseline 3: correos ASISTENCIA de grados afectados últimos 7 días
-- (cuantifica el alivio esperado para Plan 22 cuota SMTP)
SELECT
  CAST(eo.EO_FechaReg AS DATE) AS fecha,
  COUNT(*) AS correos
FROM EmailOutbox eo
INNER JOIN AsistenciaPersona ap ON ap.ASP_CodID = eo.EO_EntidadId
INNER JOIN Estudiante e ON e.EST_CodID = ap.ASP_PersonaCodID
INNER JOIN EstudianteSalon es ON es.ESS_EST_CodID = e.EST_CodID AND es.ESS_Estado = 1
INNER JOIN Salon s ON s.SAL_CodID = es.ESS_SAL_CodID
INNER JOIN Grado g ON g.GRA_CodID = s.SAL_GRA_CodID
WHERE eo.EO_EntidadOrigen = 'Asistencia'
  AND eo.EO_Tipo IN ('ASISTENCIA', 'ASISTENCIA_CORRECCION')
  AND g.GRA_Orden <= 7
  AND eo.EO_FechaReg >= DATEADD(DAY, -7, SYSDATETIME())
GROUP BY CAST(eo.EO_FechaReg AS DATE)
ORDER BY fecha DESC;
```

Los 3 queries son **baseline informativo**, no bloqueantes. Si el usuario prefiere avanzar sin ellos, proceder y anotarlos como smoke test post-deploy.

### 2. Confirmar con el usuario antes de empezar

```text
[ ] Usuario confirmó: Chat 2 arranca ahora (o pidió pausa por validación del jefe)
[ ] Usuario compartió resultados de las 3 queries baseline (o aceptó saltárselos)
[ ] Git status limpio en Educa.API (sin WIP de otros chats)
[ ] Branch: master (trabajo directo, NO crear branch feature salvo pedido explícito)
```

## ALCANCE

### Archivos a modificar/crear (BE)

| Archivo | Acción | Líneas estimadas |
|---------|--------|------------------|
| `Educa.API/Constants/Asistencias/AsistenciaConstants.cs` | Agregar `UMBRAL_GRADO_ASISTENCIA_DIARIA = 8` con comentario obligatorio | +15 |
| `Educa.API/Services/Asistencias/Domain/CoherenciaHorariaValidator.cs` (ubicación aproximada — confirmar al abrir) | Agregar `MarcacionAccion.IgnorarGradoFueraAlcance` al enum + rama en `Clasificar` | +10-15 |
| `Educa.API/Services/Asistencias/AsistenciaService.cs` | Consultar `GRA_Orden` del estudiante tras `DispatchByDni` rama `E`, aplicar guard pre-validador. Log `Information` con `DniHelper.Mask()` + `GRA_Orden` | +20-30 |
| `Educa.API/Repositories/Asistencias/ConsultaAsistenciaRepository.cs` | Agregar filtro `GRA_Orden >= UMBRAL` en queries de listado admin (join con `Grado` vía `Salon`, respetando `INV-D09` — filtrar `_Estado = 1` en `EstudianteSalon` y `Salon`) | +30-50 |
| `Educa.API/Services/Asistencias/AsistenciaAdminService.cs` (o el service que use) | **Solo queries de lectura** — NO bloquear writes (decisión 6 = A). Si hay método `ListarDia*` o similar, filtrar por grado | +15-25 |
| `Educa.API/Services/Email/EmailNotificationService.cs` | Early-return en `EnviarNotificacionAsistencia` y `EnviarNotificacionAsistenciaCorreccion` si `Estudiante.Grado.GRA_Orden < UMBRAL`. NO tocar `IEmailOutboxService` (outbox queda genérico) | +20-30 |

**Verificación obligatoria al abrir el chat**:

- Confirmar la ubicación exacta de `CoherenciaHorariaValidator.cs` (puede estar en `Services/Asistencias/` o `Domain/Asistencia/`).
- Confirmar el nombre exacto del método en `EmailNotificationService` — el maestro menciona `EnviarNotificacionAsistencia*` pero la nomenclatura real puede variar.
- Confirmar si `ConsultaAsistenciaRepository` es el único repository con listados admin o si hay uno adicional.

### Tests a agregar (BE)

| Archivo (ubicación aproximada) | Tests |
|--------------------------------|-------|
| `Educa.API.Tests/Services/Asistencias/CoherenciaHorariaValidatorTests.cs` | +3 tests: `Clasificar` con `GRA_Orden=5` → `IgnorarGradoFueraAlcance`; con `GRA_Orden=8` → sigue flujo normal; con `GRA_Orden=null/0` → **confirmar comportamiento con el usuario** (descartar o procesar — por seguridad recomendar descartar) |
| `Educa.API.Tests/Services/Asistencias/AsistenciaServiceTests.cs` | +3 tests: webhook estudiante `GRA_Orden=5` → HTTP 200 + log + sin registro + sin correo; webhook estudiante `GRA_Orden=8` → registro + correo encolado; webhook profesor `TipoPersona='P'` → flujo intacto (Plan 21 no afectado) |
| `Educa.API.Tests/Services/Email/EmailNotificationServiceTests.cs` | +2 tests: `EnviarNotificacionAsistencia` con estudiante `GRA_Orden=4` → no encola; con `GRA_Orden=10` → encola normal |
| `Educa.API.Tests/Repositories/Asistencias/ConsultaAsistenciaRepositoryTests.cs` (si existe, si no crearlo) | +2 tests: listar día con mix de grados → solo retorna `GRA_Orden >= 8`; respeta `INV-D09` (soft-delete en `EstudianteSalon`) |

**Total estimado**: +10 tests BE. Baseline actual declarado en maestro Plan 26 F2 Chat 1: `1097 tests verdes`. Target post-Chat 2: **~1107 tests verdes**.

## TESTS MÍNIMOS (casos input → output)

| Caso | Input | Resultado esperado |
|------|-------|---------------------|
| Webhook CrossChex estudiante 3ro Primaria (`GRA_Orden=6`) | `POST /api/asistencias/webhook-crosschex` con DNI válido | HTTP 200, log `Information` con DNI enmascarado + `GRA_Orden=6`, **NO** registro en `AsistenciaPersona`, **NO** correo encolado |
| Webhook CrossChex estudiante 5to Primaria (`GRA_Orden=8`) | Mismo endpoint | HTTP 200, registro creado, correo encolado al apoderado |
| Webhook CrossChex estudiante 5to Secundaria (`GRA_Orden=14`) | Mismo endpoint | Flujo normal — registro + correo |
| Webhook CrossChex profesor | Mismo endpoint con DNI de profesor | HTTP 200, registro creado, correo al profesor (flujo Plan 21 intacto — INV-AD05 profesor) |
| Webhook con DNI no encontrado en ninguna tabla | Mismo endpoint con DNI fake | Rechazo según lógica Plan 21 existente — **NO CAMBIAR** |
| Admin lista asistencia del día | `GET /api/consultaasistencia/dia-estudiantes?fecha=hoy` | Solo registros de `GRA_Orden >= 8` + **profesores intactos** |
| Admin edita registro manual histórico de 2do Primaria (`GRA_Orden=5`) | `PUT /api/asistencias/admin/{id}` con registro existente | **Permitido** (decisión 6 = A). Se actualiza. Correo de corrección **NO se envía** (early-return en `EmailNotificationService`) |
| Admin crea registro nuevo para 3ro Primaria | `POST /api/asistencias/admin` con DNI `GRA_Orden=6` | **Permitido** (decisión 6 = A) — admin tiene control sobre writes históricos. Pero correo no se envía |
| `EmailNotificationService.EnviarNotificacionAsistencia` para `GRA_Orden=4` | Invocación directa | Early-return, no llama a `IEmailOutboxService.EnqueueAsync` |
| `ConsultaAsistenciaRepository` con student soft-deleted (`ESS_Estado=0`) | Query de día | No aparece en resultados (INV-D09) |

## REGLAS OBLIGATORIAS

Backend — aplicables al código generado:

- **INV-D09** (soft-delete en tablas de relación) — los JOINs con `EstudianteSalon` y `Salon` deben filtrar `_Estado = 1`. Ver `backend.md` sección "Soft-delete en tablas de relación".
- **INV-C11** (nuevo, este chat lo implementa) — el guard va en `CoherenciaHorariaValidator.Clasificar` como nuevo enum `MarcacionAccion.IgnorarGradoFueraAlcance`. Evaluado ANTES de reglas existentes, similar a INV-C10.
- **INV-AD03** (cierre mensual inmutable) — NO debe alterarse por este chat. El filtro opera sobre reads/writes nuevos, no toca registros cerrados.
- **INV-S07** (fire-and-forget notificaciones) — un error en el early-return de correos NUNCA falla la operación principal. El guard es síncrono puro (no IO).
- **INV-D03** (soft-delete absoluto) — filtrar NO borra. Los registros de `AsistenciaPersona` existentes de grados afectados permanecen.
- **Cap 300 líneas por archivo** (`backend.md`) — si al agregar el filtro un service supera 300 líneas, dividir por responsabilidad ANTES de cerrar (ver "Cómo dividir un service > 300 líneas" en `backend.md`).
- **Un archivo = una clase** — el nuevo enum value va en el archivo existente de `MarcacionAccion`, no en archivo nuevo.
- **ApiResponse<T>** en todos los endpoints modificados (no debería haber cambios de contrato, pero verificar).
- **AsNoTracking()** en queries read-only de `ConsultaAsistenciaRepository`.
- **`DniHelper.Mask()` obligatorio en logs** — nunca DNI completo en `ILogger`.
- **Structured logging** — placeholders `{Dni}`, `{GraOrden}`, no string interpolation.
- **IEmailOutboxService obligatorio** — NO tocar. El early-return va en `EmailNotificationService` (nivel negocio, decisión 4 = A).
- **Tests deben correr verdes antes de commit** — `dotnet test` limpio.

## APRENDIZAJES TRANSFERIBLES (del Chat 1 `/design`)

### 1. Mapeo `GRA_Orden` confirmado con BD real

```
GRA_Orden | Grado                 | Estado
1-3       | Inicial 3/4/5 años    | ❌ Excluido
4         | 1ro Primaria          | ❌ Excluido
5         | 2do Primaria          | ❌ Excluido
6         | 3ro Primaria          | ❌ Excluido
7         | 4to Primaria          | ❌ Excluido
8         | 5to Primaria          | ✅ LÍMITE INFERIOR
9         | 6to Primaria          | ✅ Incluido
10-14     | 1ro-5to Secundaria    | ✅ Incluido
```

**Importante**: Primaria tiene **6 grados** (orden 4-9), NO 5. La documentación previa implicaba 5; el Chat 1 lo corrigió con query real a la tabla `Grado`.

### 2. Comentario obligatorio de la constante

```csharp
// Plan 27 — 2026-04-22 — Filtro temporal de asistencia diaria CrossChex.
// Solo estudiantes con GRA_Orden >= UMBRAL_GRADO_ASISTENCIA_DIARIA (8 = 5to Primaria) se registran.
// Los grados inferiores no tienen biométrico asignado.
// Revertir: bajar a 1 cuando el colegio reincorpore grados bajos.
// Ver: business-rules.md §1 + INV-C11.
// NO consolidar con UMBRAL_TUTOR_PLENO (7): conceptos distintos, coincidencia circunstancial.
public const int UMBRAL_GRADO_ASISTENCIA_DIARIA = 8;
```

### 3. `UMBRAL_TUTOR_PLENO = 7` ya existe en `Constants/Asistencias/`

Coincide circunstancialmente con el umbral de Plan 27 (ambos discriminan en `GRA_Orden = 7` vs `8`). **NO consolidar** — son conceptos distintos (decisión 10 de Chat 1):

- `UMBRAL_TUTOR_PLENO = 7` → modo de asignación profesor-salón (INV-AS01)
- `UMBRAL_GRADO_ASISTENCIA_DIARIA = 8` → qué estudiantes usan CrossChex (INV-C11)

Si el colegio mañana reincorpora 4to Primaria al CrossChex, solo `UMBRAL_GRADO_ASISTENCIA_DIARIA` baja.

### 4. Patrón validador molde (no reinventar)

`CoherenciaHorariaValidator` (sección 1.5 de business-rules) ya tiene el patrón correcto: clase Domain pura, sin IO, con enum `MarcacionAccion.Ignorar*`. Plan 27 solo agrega un valor al enum:

```csharp
// Antes (ya existente):
public enum MarcacionAccion {
    Procesar,
    IgnorarAntesDeApertura,        // INV-C10
    IgnorarSalidaTemprana,          // INV-C09
    // ...
}

// Después (agregar):
public enum MarcacionAccion {
    Procesar,
    IgnorarAntesDeApertura,
    IgnorarSalidaTemprana,
    IgnorarGradoFueraAlcance,       // INV-C11 (Plan 27)
}
```

La rama en `Clasificar` va **antes** de las reglas de hora (igual que INV-C10) — si el grado está fuera, no importa la hora.

### 5. Diagnóstico numérico del widget (referencia pre-deploy)

Datos del 2026-04-22 (pre-Plan 27):

- **235 estudiantes activos** total, **15 profesores activos**.
- **122 registros CrossChex** hoy (111 estudiantes + 11 profesores).
- **47.23% en widget "Asistencia de Hoy"** = `111/235` — engañoso.
- **Post-Plan 27 esperado**: denominador baja a ~122 (solo `GRA_Orden ≥ 8`) → métrica sube a **>90%**.
- **44 estudiantes (18.7%)** sin correo apoderado — problema ortogonal a Plan 27, anotado en backlog.
- Plan 27 reduce presión SMTP: de 94 correos ASISTENCIA/día a ~70-80 (depende de cuántos de los 94 son `GRA_Orden ≤ 7`).

### 6. Flujo polimórfico Plan 21 — el dispatch ya separa E/P

`AsistenciaService.RegistrarAsistencia` (ver Plan 21 archivado en `history/planes-cerrados.md`) tiene:

```
DispatchByDni(dni)
  → rama 'P' (profesor): flujo intacto
  → rama 'E' (estudiante): APLICAR GUARD AQUÍ ← Plan 27 Chat 2
  → rechazar si no existe
```

El guard de Plan 27 va **solo en la rama E**. La rama P queda intacta — los profesores no tienen restricción de grado (no son estudiantes).

### 7. Regresión lateral conocida (NO TOCAR)

Hay una regresión en curso: los correos `ASISTENCIA_PROFESOR` no se están encolando hoy (detectado 2026-04-22 por el usuario). **NO es parte de Plan 27** — se trata en otro chat. Si aparece en los queries baseline o al testear, anotarlo pero **no corregirlo** en este chat.

### 8. Schema de `EmailOutbox` — NO agregar columnas

```text
EO_EntidadOrigen (nvarchar 50), EO_EntidadId (int), EO_Tipo (nvarchar 30)
```

Estas columnas ya permiten identificar que un correo es de asistencia. **NO agregar** `EO_GradoOrden` ni similar — el early-return en `EmailNotificationService` lo resuelve sin schema changes.

## FUERA DE ALCANCE

Explícitamente NO se toca en Chat 2:

- **Reportes PDF/Excel** — Chat 3 (6 services `ReporteAsistencia*` + nota en header + tests).
- **FE** — Chat 4 (banner admin, mensaje self-service, widget home).
- **Documentación formal en `business-rules.md`** — Chat 5 (sección nueva §1.X + `INV-C11` en §15.4).
- **Regresión `ASISTENCIA_PROFESOR`** detectada 2026-04-22 — chat aparte.
- **`INV-AD07`** — DESCARTADO en Chat 1 (decisión 6 = A).
- **Migración de DB o scripts SQL** — Plan 27 no requiere cambios de schema.
- **Profesores** — flujo Plan 21 intacto.
- **Asistencia por curso** (§2) — modelo independiente, no se toca.
- **Otras fuentes de asistencia** (si existen) — solo el webhook CrossChex.
- **Plan 22 / 24 / 26** — frentes paralelos, descongelados post-Chat 1 pero no mezclar.

## CRITERIOS DE CIERRE

```text
PRE-WORK
[ ] 3 queries baseline mostradas al usuario (resultados compartidos o saltados explícitamente)
[ ] Git status limpio en Educa.API antes de empezar
[ ] Ubicación real de CoherenciaHorariaValidator.cs confirmada
[ ] Nombres reales de métodos en EmailNotificationService confirmados

IMPLEMENTACIÓN
[ ] UMBRAL_GRADO_ASISTENCIA_DIARIA = 8 en Constants/Asistencias/AsistenciaConstants.cs con comentario obligatorio
[ ] MarcacionAccion.IgnorarGradoFueraAlcance agregado al enum
[ ] CoherenciaHorariaValidator.Clasificar con rama nueva (antes de reglas de hora)
[ ] AsistenciaService.RegistrarAsistencia consulta GRA_Orden post-dispatch rama 'E' y aplica guard con log Information + DniHelper.Mask()
[ ] ConsultaAsistenciaRepository con filtro GRA_Orden >= 8 en listados admin (respetando INV-D09)
[ ] AsistenciaAdminService queries de lectura filtradas (writes NO bloqueados — decisión 6 = A)
[ ] EmailNotificationService.EnviarNotificacionAsistencia* con early-return si GRA_Orden < 8 (ambos canales: marcación + corrección)
[ ] IEmailOutboxService NO tocado (outbox queda genérico)

TESTS
[ ] +3 tests en CoherenciaHorariaValidatorTests (Ignorar/Procesar/Borde)
[ ] +3 tests en AsistenciaServiceTests (webhook E5/E8/P intactos)
[ ] +2 tests en EmailNotificationServiceTests (early-return)
[ ] +2 tests en ConsultaAsistenciaRepositoryTests (filtro + INV-D09)
[ ] dotnet test — 100% verde (~1107 tests)
[ ] dotnet build — sin warnings nuevos
[ ] Archivos respetan cap 300 líneas (divisiones si aplica)

VALIDACIÓN MANUAL (opcional, si el usuario prefiere)
[ ] Simular webhook con DNI estudiante GRA_Orden=5 → HTTP 200 + log + sin registro
[ ] Simular webhook con DNI estudiante GRA_Orden=10 → registro + correo
[ ] GET /api/consultaasistencia/dia-estudiantes → solo GRA_Orden >= 8

CIERRE
[ ] Commit en Educa.API con mensaje sugerido abajo
[ ] Actualizar maestro Plan 27: marcar Chat 2 ✅, desmarcar [x] en checklist pre-inicio "Prompt de Chat 2 generado" → reemplazar con "Chat 2 cerrado"
[ ] Preparar Chat 3 (reportes PDF/Excel + tests) con /next-chat
[ ] Mover este archivo a educa-web/.claude/chats/closed/ al cerrar el chat
```

## COMMIT MESSAGE sugerido

Solo hay commit en `Educa.API` — este chat no toca FE.

```text
feat(asistencia): Plan 27 Chat 2 — grade filter in CrossChex webhook + admin queries + emails

Add UMBRAL_GRADO_ASISTENCIA_DIARIA = 8 constant (5th Primaria onward) to silently
skip CrossChex markings for students with GRA_Orden < 8 — they have no biometric
device assigned. Admin keeps full control over historical writes (decision 6 = A,
no INV-AD07). Emails early-return at "EmailNotificationService" business layer,
leaving "IEmailOutboxService" generic.

- "CoherenciaHorariaValidator": new "MarcacionAccion.IgnorarGradoFueraAlcance" (INV-C11)
- "AsistenciaService.RegistrarAsistencia": grade guard on student dispatch branch
  with Information log + masked DNI
- "ConsultaAsistenciaRepository": filter GRA_Orden >= 8 in admin list queries,
  respecting INV-D09 (soft-delete on relation tables)
- "EmailNotificationService": early-return on both "ASISTENCIA" and
  "ASISTENCIA_CORRECCION" channels for students with GRA_Orden < 8
- Teacher flow (Plan 21, TipoPersona='P') intact — no changes

+10 tests (validator + service + repo + email). Baseline ~1097 → ~1107 green.
Reversible: change constant to 1 and redeploy.
```

**Reglas de la skill `commit`** aplicadas:

- Mensaje en inglés. Modo imperativo (`add`, no `added`).
- Términos de dominio en español entre comillas: `"CoherenciaHorariaValidator"`, `"MarcacionAccion.IgnorarGradoFueraAlcance"`, `"ASISTENCIA_CORRECCION"`, etc.
- NUNCA `Co-Authored-By` (prohibido por la skill).
- Subject ≤ 72 caracteres (74 actual — revisar; si es necesario acortar: `feat(asistencia): Plan 27 Chat 2 — grade filter webhook+admin+emails` queda en 65).

**Subject alternativo más corto** (recomendado):

```text
feat(asistencia): Plan 27 Chat 2 — grade filter webhook+admin+emails
```

## CIERRE

Al terminar Chat 2, pedir al usuario feedback sobre:

1. **¿Los tests cubren bien el edge case de `GRA_Orden = null/0`?** — puede existir data inconsistente en BD antigua; confirmar si el guard lo trata como "descartar por seguridad" o "procesar por no saber".
2. **¿El log `Information` es demasiado ruidoso o está bien así?** — si el dispositivo biométrico marca 50 veces/día a estudiantes de Inicial, son 50 logs/día. Alternativa: log `Debug` o agregado cada N descartes.
3. **¿La regresión `ASISTENCIA_PROFESOR` afecta los tests?** — si sí, necesita atención antes del deploy.
4. **¿Chat 3 arranca inmediatamente o hay pausa para validación intermedia con el jefe?** — según política declarada en Chat 1 (validación final post-deploy), Chat 3 puede seguir sin pausa, pero confirmar.
5. **Baseline post-deploy** — si el usuario quiere, repetir las 3 queries al día siguiente del deploy para confirmar: `0` marcaciones de `GRA_Orden ≤ 7`, `0` correos de grados afectados, widget home ~90%.

Si Chat 2 cierra limpio (tests verdes, commit hecho, maestro actualizado), invocar `/next-chat` para generar el prompt de Chat 3 (BE: reportes PDF/Excel + tests).
