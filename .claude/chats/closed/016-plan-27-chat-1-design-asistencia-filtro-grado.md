> **Repo destino**: cualquiera — es un chat de `/design` puro (sin código). Recomendado abrir en `Educa.API` (backend, branch `master`) porque el 70% del alcance toca BE; FE solo entra en Chat 4.
> **Plan**: 27 · **Chat**: 1 · **Fase**: Diseño · **Estado**: ⏳ pendiente arrancar — 🔴 **MÁXIMA PRIORIDAD**, congela otros frentes hasta cerrarlo.

---

# Plan 27 Chat 1 — /design — Filtro temporal de asistencia diaria por grado

## PLAN FILE

**Maestro**: `educa-web/.claude/plan/maestro.md` § "🔴 Plan 27 — Filtro temporal de asistencia diaria por grado (5to Primaria en adelante)" (líneas 101-229 aprox del maestro al 2026-04-22).

Path desde el repo destino:
- Desde `Educa.API`: `../../educa-web/.claude/plan/maestro.md`
- Desde `educa-web`: `.claude/plan/maestro.md`

Referencias de dominio usadas:
- `business-rules.md` §0 ("El Salón es el núcleo") — Salón es nodo gravitacional, matrícula lo ancla a un grado
- `business-rules.md` §1 (Asistencia Diaria CrossChex) — flujo base que se filtra
- `business-rules.md` §5.1 (Niveles y `GRA_Orden`) — **Inicial 1-3, Primaria 4-9, Secundaria 10-14**. 4to Primaria = `GRA_Orden = 7`, 5to Primaria = `GRA_Orden = 8`
- `business-rules.md` §5.4 (Modos de asignación profesor-salón-curso) — `UMBRAL_TUTOR_PLENO = 7` coincide con este filtro
- `business-rules.md` INV-AD05 (correos diferenciados admin vs biométrica), INV-C10 (descarte silencioso `<05:00`) — patrón para INV-C11 propuesto

## OBJETIVO

Iniciar diseño (`/design` puro — **sin código**) del filtro temporal que excluye estudiantes con `GRA_Orden ≤ 7` (Inicial a 4to Primaria) del flujo de asistencia diaria CrossChex y correos relacionados. La medida es temporal, sin fecha de reversión definida, y responde al hecho de que esos estudiantes no tienen biométrico asignado — generan faltas falsas en el widget "Asistencia de Hoy" (47% de estudiantes "presentes" hoy es engañoso: 111/122 = 91% entre los que sí usan CrossChex).

Salida del chat: decisiones escritas en las 7 preguntas del maestro + confirmación del checklist pre-inicio + acuerdo sobre cuántos chats de `/execute` vienen después (estimado 3-4, pero Chat 1 define la granularidad final).

## PRE-WORK OBLIGATORIO

Antes de codificar nada (no aplica a este Chat 1 que es diseño, pero las queries sirven como baseline para validar el diseño):

```sql
-- Baseline: universo afectado vs no afectado
SELECT
  CASE WHEN g.GRA_Orden <= 7 THEN 'AFECTADO (<=7)' ELSE 'FUERA_ALCANCE (>=8)' END AS grupo,
  g.GRA_Nivel,
  g.GRA_Nombre,
  g.GRA_Orden,
  COUNT(DISTINCT e.EST_CodID) AS estudiantes_activos
FROM Estudiante e
INNER JOIN EstudianteSalon es ON es.ESS_EST_CodID = e.EST_CodID AND es.ESS_Estado = 1
INNER JOIN Salon s ON s.SAL_CodID = es.ESS_SAL_CodID AND s.SAL_Estado = 1
INNER JOIN Grado g ON g.GRA_CodID = s.SAL_GRA_CodID
WHERE e.EST_Estado = 1
  AND YEAR(GETDATE()) = s.SAL_Anio  -- ajustar si el campo difiere
GROUP BY g.GRA_Orden, g.GRA_Nivel, g.GRA_Nombre
ORDER BY g.GRA_Orden;
```

```sql
-- Marcaciones CrossChex de estudiantes GRA_Orden <= 7 en los últimos 7 días
-- (para dimensionar cuánto ruido se elimina)
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
-- Correos ASISTENCIA encolados en los últimos 7 días para apoderados de grados afectados
-- (dimensiona la presión SMTP que Plan 27 elimina → efecto positivo Plan 22)
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

**NO ejecutes los scripts tú**: muéstralos al usuario, pídele los resultados, valida con ellos que las cifras son razonables antes de cerrar decisiones de diseño. Las 3 queries son **baseline informativo**, no requisito de arranque — si el usuario prefiere arrancar sin ellas, el diseño igual se puede cerrar con lo que ya está en el maestro.

## ALCANCE DEL CHAT

Este chat es `/design` puro — **no toca código ni BD**. La salida es texto de diseño: actualización del Plan 27 en el maestro con las decisiones tomadas, plus (si Chat 1 crece) promoverlo a `Educa.API/.claude/plan/asistencia-filtro-grado.md`.

Archivos que este chat **podría** tocar:

| Archivo | Qué se actualiza |
|---------|-------------------|
| `educa-web/.claude/plan/maestro.md` | Marcar decisiones tomadas en § Plan 27, actualizar estado Chat 1 → ✅ cerrado |
| `Educa.API/.claude/plan/asistencia-filtro-grado.md` | **Solo si** el diseño crece >1 chat de `/design` — promover contenido del maestro aquí |
| `educa-web/.claude/rules/business-rules.md` | **Solo si** queda claro el texto de `INV-C11` (y opcionalmente `INV-AD07`) — agregar en §15 Registro de Invariantes. Si el texto aún no es definitivo, dejarlo al Chat de Cierre (Chat 5) |

Ningún cambio en `src/**` ni `Educa.API/**` fuera de `.claude/`.

## DECISIONES A CERRAR (las 7 preguntas del maestro)

El chat **no puede cerrarse** sin respuesta del usuario a cada una. Usar estos formatos de respuesta:

### 1. Mecanismo de gating

**Opciones** (del maestro):
- A. Constante en código (`UMBRAL_GRADO_ASISTENCIA_DIARIA = 8` en `Educa.API/Constants/Asistencias/`)
- B. AppSetting (`Asistencia:UmbralGradoMinimo = 8` en `appsettings.json`)
- C. Flag en tabla `Configuracion` (consulta BD por cada webhook)

**Recomendación preliminar del maestro**: **A**. Presentarla al usuario + preguntar si el colegio necesita tunear sin redeploy (→ entonces B).

### 2. Comportamiento del webhook CrossChex

**Propuesta del maestro**: descartar silencioso (log `Information`, sin registro) — análogo a INV-C10 con entradas `<05:00`.

Validar con el usuario:
- ¿OK con log `Information` o prefiere que no se loguee nada?
- ¿El log debería contar con `DniHelper.Mask()` o dejar el DNI completo en servidor (no llega al cliente)?

### 3. Comportamiento en admin UI

**Propuesta del maestro**: filtro por query + banner informativo en `/intranet/admin/asistencias`.

Validar:
- ¿El banner debe ser fijo o dismissible?
- ¿Texto sugerido: "Asistencia diaria temporalmente limitada a estudiantes de 5to Primaria en adelante"?
- ¿En reportes PDF/Excel agregar una línea de nota similar?

### 4. Correos

**Propuesta del maestro**: early-return en `EmailNotificationService.EnviarNotificacionAsistencia*` + validación pre-enqueue en `IEmailOutboxService` para no ensuciar outbox con filas descartadas.

Validar:
- ¿El early-return va en `EmailNotificationService` (nivel negocio) o en `IEmailOutboxService.EnqueueAsync` (nivel infra)?
- Preferencia: **negocio**. El outbox no debería saber de reglas de grado; es responsabilidad de `EmailNotificationService`.

### 5. Self-service estudiante/apoderado

**Opciones**:
- A. Ocultar ítem del menú para grados afectados
- B. Mostrar ruta con mensaje explícito ("Asistencia diaria suspendida temporalmente para este grado")

**Recomendación preliminar**: B. Validar.

Consideración adicional: **Apoderado** — un apoderado puede tener varios hijos, algunos afectados y otros no. El mensaje debe ser por-hijo, no por-apoderado.

### 6. Correcciones formales admin sobre registros históricos

**Opciones**:
- A. Admin sigue editando/justificando registros existentes de grados afectados
- B. Bloqueo con `BusinessRuleException("ASISTENCIA_GRADO_FUERA_ALCANCE")`

**Recomendación preliminar**: A. Los registros existentes son auditoría histórica. Si se decide A, no se introduce INV-AD07.

### 7. Reportes PDF/Excel históricos

**Propuesta del maestro**: filtrar en el presente, no re-escribir historia. Si se pide histórico completo, consulta SQL directa.

Validar:
- ¿OK con esto o el colegio prefiere que TODOS los reportes (incluidos los de periodos cerrados) oculten grados afectados?
- Si se elige ocultar siempre: precaución con INV-AD03 / INV-AD04 (cierre mensual inmutable).

---

### Decisiones complementarias (no en el maestro pero necesarias)

### 8. Alcance del filtro dentro del admin

El maestro lista:
- Webhook CrossChex
- Admin `/intranet/admin/asistencias`
- Reportes asistencia diaria
- Correos
- Self-service

Validar si también aplica a:
- **Widget "Asistencia de Hoy"** del home (denominador y numerador deben coincidir con el nuevo universo)
- **Búsqueda de estudiantes** en el admin (¿sigue apareciendo en búsqueda pero sin data de asistencia?)
- **Reportes consolidados cross-módulo** (ej: un reporte de rendimiento que incluye asistencia — ¿se deja tal cual o se nota que la asistencia está filtrada?)

### 9. Nombre final de la constante

El maestro propone `UMBRAL_GRADO_ASISTENCIA_DIARIA`. Alternativas para validar:
- `ASISTENCIA_DIARIA_GRADO_MINIMO` (más declarativo)
- `GRADO_MIN_CROSSCHEX` (corto, menciona el origen del requerimiento)

Importa que el comentario adjunto diga explícitamente:
```csharp
// Plan 27 — 2026-04-22 — Filtro temporal. Revertir a 1 cuando el colegio reincorpore grados bajos.
// Ver business-rules.md §1 "Filtro temporal por grado" y INV-C11.
public const int UMBRAL_GRADO_ASISTENCIA_DIARIA = 8;
```

### 10. ¿Consolidar con `UMBRAL_TUTOR_PLENO`?

Ambas constantes valen `7` (strictly less than) u `8` (greater or equal), dependiendo de cómo se escriba la comparación. Pero son **conceptualmente distintas**:
- `UMBRAL_TUTOR_PLENO = 7` → salones con `GRA_Orden ≤ 7` tienen tutor pleno (INV-AS01)
- `UMBRAL_GRADO_ASISTENCIA_DIARIA = 8` → estudiantes con `GRA_Orden ≥ 8` sí usan CrossChex

**Que coincidan hoy es accidente**: si el colegio mañana reincorpora 4to Primaria (GRA_Orden=7) al CrossChex, las dos constantes divergen.

**Propuesta**: mantenerlas **separadas** con comentarios que documenten que hoy coinciden por coincidencia del modelo educativo del colegio.

## TESTS MÍNIMOS (para Chat 2+3 de ejecución, no aplica a este chat)

Cuando se ejecute Chat 2 (webhook + admin), el diseño debería garantizar estos tests:

| Caso | Input | Resultado esperado |
|------|-------|---------------------|
| Webhook CrossChex estudiante 3ro Primaria (`GRA_Orden=6`) | `POST /api/asistencias/webhook-crosschex` con DNI de estudiante `GRA_Orden=6` | HTTP 200, log `Information`, **NO** registro en `AsistenciaPersona`, **NO** correo encolado |
| Webhook CrossChex estudiante 5to Primaria (`GRA_Orden=8`) | Mismo endpoint con DNI de estudiante `GRA_Orden=8` | HTTP 200, registro creado, correo encolado al apoderado |
| Webhook CrossChex profesor | Mismo endpoint con DNI de profesor | HTTP 200, registro creado (flujo profesor intacto — Plan 21/23) |
| Admin lista asistencia del día | `GET /api/asistencias/admin?fecha=hoy` | Solo registros de estudiantes `GRA_Orden ≥ 8` + profesores |
| Admin intenta crear registro manual de 2do Primaria | `POST /api/asistencias/admin` con DNI `GRA_Orden=5` | **Según decisión 6**: A=permitido (crea), B=rechaza con `BusinessRuleException` |
| `ConsultaAsistenciaService.DiaEstudiantes` | llamada con fecha hoy | Solo `GRA_Orden ≥ 8` |
| `EmailNotificationService.EnviarNotificacionAsistencia` para `GRA_Orden=4` | invocación directa | Early-return, no enqueue en outbox |

## REGLAS OBLIGATORIAS

Aplicables al diseño (para que Chat 2+3 las cumplan):

- **INV-D09** (soft-delete en tablas de relación) — al filtrar por grado, la query debe hacer JOIN con `EstudianteSalon` filtrando `ESS_Estado = 1` y con `Salon` filtrando `SAL_Estado = 1`. No confiar solo en la tabla `Grado`.
- **INV-AD03** (cierre mensual inmutable) — el filtro NO debe alterar registros cerrados. Si un mes ya cerró con datos de grados bajos, quedan ahí.
- **INV-S07** (fire-and-forget notificaciones) — un error al descartar/no-encolar correos nunca falla la operación principal.
- **Soft-delete absoluto** (INV-D03) — filtrar no borra. Los registros de `AsistenciaPersona` existentes de grados afectados permanecen en BD.
- **Cap 300 líneas por archivo** — si `AsistenciaService` o `ConsultaAsistenciaService` ya están cerca del cap, el filtro puede empujarlos — prever en Chat 2 si se extrae a un `AsistenciaGradoFilter` helper.
- **Un archivo = una clase** (regla backend).
- **ApiResponse<T>** en todos los endpoints nuevos/modificados.
- **AsNoTracking()** en queries read-only.

## APRENDIZAJES TRANSFERIBLES (del chat anterior)

### Diagnóstico del widget que originó Plan 27 (este mismo chat, 2026-04-22)

- Universo hoy (2026-04-22): **235 estudiantes activos** vs **15 profesores activos**
- Asistencia CrossChex hoy: 111 estudiantes con entrada + 11 profesores con entrada = **122 registros**
- De los 122, **94 estudiantes + 10 profesores = 104 deberían encolar correo** (con destinatario válido)
- Outbox real: **94 correos ASISTENCIA tipo `EO_EntidadOrigen = 'Asistencia'`**. Ningún `ASISTENCIA_PROFESOR` hoy (regresión en curso, no relacionada con Plan 27 — se tratará aparte).
- El 47.23% del widget sale de `111 / 235 = 47.23%`. Plan 27 corrige: el nuevo denominador será `~122` (solo `GRA_Orden ≥ 8`) → la métrica pasa de 47% a >90%.

### Estudiantes activos sin correo apoderado

- **44 de 235 estudiantes (18.7%) no tienen correo** de apoderado cargado. De los 111 que entraron hoy, 17 cayeron en ese grupo. Plan 27 no resuelve esto (es dato ausente), pero al reducir el universo puede concentrar el problema en los grados altos.
- Recomendación transversal (no para este chat, para otro): campaña de completitud de datos.

### Patrón validador a reusar

- `CoherenciaHorariaValidator` (INV-C03, INV-C09, INV-C10) es el molde correcto para `INV-C11`. Es una clase Domain pura, sin IO, con `MarcacionAccion.Ignorar*` enum. Plan 27 agrega `MarcacionAccion.IgnorarGradoFueraAlcance`.

### Senders SMTP del Plan 22

- 7 remitentes activos: `sistemas@laazulitasac.com` hasta `sistemas7@laazulitasac.com`.
- Distribución round-robin uniforme (13-14 por sender hoy).
- **Plan 27 reduce presión SMTP**: si hoy el volumen es 94, mañana con Plan 27 aplicado podría ser ~70-80 (depende de cuántos de los 94 son de estudiantes `GRA_Orden ≤ 7`, la query 3 del PRE-WORK lo dimensiona).

### Columna schema EmailOutbox (referencia para diseño)

```
EO_CodID (bigint PK), EO_Tipo (nvarchar 30), EO_Estado (nvarchar 20),
EO_Destinatario (nvarchar 200), EO_Asunto (nvarchar 500), EO_CuerpoHtml (nvarchar MAX),
EO_Bcc (nvarchar 500), EO_EntidadOrigen (nvarchar 50), EO_EntidadId (int),
EO_Intentos (int), EO_MaxIntentos (int), EO_ProximoIntento (datetime2),
EO_UltimoError (nvarchar 1000), EO_FechaEnvio (datetime2), EO_DuracionMs (int),
EO_UsuarioReg (nvarchar 50), EO_FechaReg (datetime2), EO_RowVersion (timestamp),
EO_TipoFallo (nvarchar 50), EO_Remitente (nvarchar 200), EO_IntentosPorCuota (int)
```

Útil para decidir decisión 4 (early-return en service vs en outbox): el outbox ya tiene `EO_EntidadOrigen` + `EO_EntidadId`, así que NO hay que agregar columnas.

## FUERA DE ALCANCE (este chat)

- **Código**: ningún `.cs`, `.ts`, `.html`, `.scss` se toca en este chat. Solo `.md` en `.claude/`.
- **Bases de datos**: no se ejecuta script. No se migra nada. Los datos históricos se preservan.
- **Otros planes**: NO abrir discusión sobre Plan 22 (F4 BE y F5.6 BE pendientes), Plan 26 F2 Chat 2, Plan 23 (regresión de correos profesor hoy), Design System F5.3 ni Carril D. Esos están congelados hasta cerrar Plan 27 Chat 1.
- **Regresión `ASISTENCIA_PROFESOR` de hoy**: aparecerá como dato en los queries baseline pero NO es parte de Plan 27. Anotarlo para tratar en otro chat (backlog: "regresión feature profesor después de commit `42adccd`").
- **Self-service del apoderado con múltiples hijos mixtos**: el diseño lo debe contemplar conceptualmente (decisión 5), pero la implementación detallada se cierra en Chat 4 (FE).
- **Dashboard home widget**: el cálculo del 47.23% se arregla como consecuencia natural del filtro, pero si requiere UI dedicada va en Chat 4.

## CRITERIOS DE CIERRE

```
[ ] Usuario respondió las 7 decisiones de diseño del maestro (§ Plan 27 líneas 132-167)
[ ] Usuario respondió las 3 decisiones complementarias (§ 8-10 de este chat)
[ ] Usuario confirmó checklist pre-inicio del maestro (§ líneas 218-227)
[ ] Usuario confirmó umbral exacto (GRA_Orden >= 8) o ajustó (ej: solo secundaria GRA_Orden >= 10)
[ ] Usuario confirmó duración estimada (meses / año / indefinido) — define si se queda constante o migra a AppSetting
[ ] Usuario confirmó comunicación UI (banner sí/no, texto exacto)
[ ] Decisión sobre INV-AD07 (se crea o no) — depende de decisión 6
[ ] Decisión sobre cantidad final de chats de /execute (estimado 3-4 del maestro vs plan final)
[ ] Decisión sobre mover plan inline (en maestro.md) vs archivo propio (asistencia-filtro-grado.md)
[ ] Actualizar § Plan 27 del maestro con las decisiones tomadas
[ ] Marcar Plan 27 Chat 1 como ✅ en el maestro
[ ] Abrir descongelamiento de otros frentes (maestro § línea 209-216)
[ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat
```

## COMMIT MESSAGE sugerido

Solo hay commit en `educa-web` (frontend) — el backend no se toca en este chat. Si la actualización del maestro es el único cambio:

```
docs(maestro): close Plan 27 Chat 1 /design — attendance grade filter decisions
```

Si además se actualiza `business-rules.md` con INV-C11 (y opcionalmente INV-AD07):

```
docs(maestro): close Plan 27 Chat 1 + document INV-C11 for attendance grade filter
```

Si el diseño creció y se promueve a archivo dedicado:

```
docs(plan): add asistencia-filtro-grado.md for Plan 27 + close Chat 1 /design
```

**Recordatorios de la skill `commit`**:
- Mensajes en inglés. Español solo entre `"..."` si hay términos de dominio (no aplica aquí porque es doc).
- NUNCA agregar `Co-Authored-By`.
- Subject ≤ 72 caracteres.

## CIERRE

Al cerrar el chat, pedir al usuario feedback sobre:

1. **¿El diseño resuelve el requerimiento original?** Releer la captura del mensaje WhatsApp ("quita a los alumnos de inicial hasta 4to de primaria, ellos no van a tener reloj") y verificar que Chat 1 la refleja.
2. **¿Falta algún escenario edge que el diseño no cubre?** Ej: estudiante que se matriculó tarde en grado bajo, apoderado con hijos en ambos rangos, etc.
3. **¿La granularidad de 4 chats `/execute` es correcta o necesita más/menos?** — input a la planificación inmediata siguiente.
4. **Reversibilidad** — ¿el usuario quedó claro que cambiar `UMBRAL_GRADO_ASISTENCIA_DIARIA` de `8` a `1` revierte todo el comportamiento?
5. **Orden de ejecución**: ¿Chat 2 (BE webhook+admin+correos) arranca en seguida o hay pausa para deploy?

Si al terminar Chat 1 queda claro que las decisiones requieren validación por el colegio (no solo el usuario), congelar apertura de Chat 2 hasta obtener confirmación.
