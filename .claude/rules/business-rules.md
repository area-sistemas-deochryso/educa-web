# Reglas de Negocio — Backend

> **"Corregir lo que duele es un fix. Crear una regla que evite problemas similares es arquitectura."**

Este documento define las reglas de negocio que el sistema **debe** cumplir. No son convenciones de código (eso está en `backend.md`) — son invariantes del dominio educativo que, si se violan, producen datos incorrectos o comportamiento inválido.

---

## 0. Núcleo de la Aplicación: El Salón

> **"Si el Salón está mal, todo lo demás está mal."**

El Salón es el nodo gravitacional del sistema. No es un aula física — es el **contenedor lógico** que une estudiantes, profesores, cursos, horarios, calificaciones y aprobaciones dentro de un año académico.

### Por qué es el núcleo

```
Sede → Grado → Sección → *** SALÓN *** → Estudiantes + Profesor + Cursos
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
            Horarios    Calificaciones   Aprobación
                 │             │             │
         Asistencia curso  Promedios    Progresión
                                        (→ siguiente Salón)
```

| Relación | Qué conecta |
|----------|-------------|
| Salón ← Grado + Sección + Sede + Año | Identidad única del grupo |
| Salón → EstudianteSalón | Quiénes están matriculados |
| Salón → ProfesorSalón (tutor) | Quién es responsable |
| Salón → Horarios → CursoContenido | Qué se enseña y cuándo |
| Horario → AsistenciaCurso | Control de presencia en clase |
| Horario → Calificaciones → Notas | Evaluaciones y promedios |
| Salón + Periodo → Aprobación | Decisión de progresión |
| Aprobación → Salón destino | Cierre del ciclo, inicio del siguiente |

### Ciclo académico completo

```
Matrícula ──→ Asistencia ──→ Calificación ──→ Aprobación ──→ Progresión
  (Salón)    (diaria+curso)    (evaluaciones)   (periodo cerrado)  (→ siguiente Salón)
     │                                                                    │
     └────────────────────── siguiente año ◄──────────────────────────────┘
```

### Consecuencias para el desarrollo

1. **Un bug en la asignación Estudiante-Salón corrompe todo**: calificaciones van al lugar equivocado, aprobación opera sobre datos erróneos, progresión mueve al estudiante al salón incorrecto
2. **Cualquier cambio que toque Salón, EstudianteSalón o ProfesorSalón requiere revisión extra** — son las relaciones más críticas del sistema
3. **La progresión (crear salones del siguiente año, mover estudiantes) es la operación más delicada** — crea datos que serán la estructura base de todo un año académico
4. **La asistencia diaria (CrossChex) es un satélite** — opera a nivel Sede, no Salón. Es independiente del núcleo académico

### Prioridad de robustez

```
Salón/Matrícula > Aprobación/Progresión > Calificaciones > Horarios > Asistencia > Pagos*
```

*Pagos (si se implementan) son consecuencia de la matrícula, no del Salón. El ciclo académico no depende del estado del pago.

---

## 1. Asistencia Diaria (CrossChex)

### 1.1 Ventanas horarias

El estado de asistencia se calcula automáticamente según la hora de marcación biométrica.

| Periodo | Meses | Entrada Temprana | Entrada A Tiempo | Entrada Tardía |
|---------|-------|-----------------|-----------------|----------------|
| **Regular** | Mar-Dic | < 7:30 | 7:30 - 8:00 | > 8:00 |
| **Verano** | Ene-Feb | < 8:30 | 8:30 - 9:30 | > 9:30 |

| Periodo | Salida Tardía | Salida Temprana | Salida A Tiempo |
|---------|--------------|----------------|----------------|
| **Regular** | < 14:00 | 14:00 - 14:30 | > 14:30 |
| **Verano** | < 12:45 | 12:45 - 13:15 | > 13:15 |

**Regla**: Estas ventanas son las únicas fuentes de verdad para el cálculo de estado. Si cambian los horarios del colegio, se actualizan en `AsistenciaEstadoCalculador`, no en múltiples servicios.

### 1.2 Códigos de estado

| Código | Significado | Cuándo se asigna |
|--------|-------------|-----------------|
| `T` | Temprano | Entrada antes de la ventana "a tiempo" |
| `A` | A tiempo | Dentro de la ventana de puntualidad |
| `F` | Fuera de hora (tardanza) | Después de la ventana de puntualidad |
| `N` | No asistió | Sin marcación al final del día |
| `J` | Justificado | Justificación manual con prefijo `"Justificado:"` |
| `-` | Pendiente | Día aún no terminó |
| `X` | Antes del registro | Fecha anterior a `FECHA_INICIO_REGISTRO` (26-ene-2026) |

### 1.3 Precedencia de justificación

**Regla**: La justificación tiene precedencia ABSOLUTA sobre cualquier cálculo por hora. Si el campo observación empieza con `"Justificado:"`, el estado es `J` sin importar las horas de entrada/salida.

### 1.4 Estado combinado entrada + salida

Cuando existen ambas marcaciones, el estado final es el de **mayor severidad**:

```
F (5) > N (4) > J (3) > T (2) > A (1) > Pendiente/X (0)
```

**Ejemplo**: Entrada=A (a tiempo), Salida=F (salió antes) → Estado final = `F`.

### 1.5 Anti-duplicación biométrica

**Regla**: Ventana mínima de **30 minutos** entre entrada y salida. Una marcación dentro de los 30 minutos posteriores a la anterior se ignora silenciosamente ("Marcación ignorada").

**Por qué**: Los dispositivos CrossChex pueden enviar duplicados o el estudiante puede marcar accidentalmente dos veces.

### 1.6 Estado de completitud

| Condición | Estado |
|-----------|--------|
| Solo entrada registrada | `Incompleta` |
| Solo salida registrada | `Incompleta` |
| Entrada + salida registradas | `Completa` |

### 1.7 Zona horaria

**Regla**: El webhook de CrossChex envía timestamps en UTC+0. El backend **debe** convertir a hora Perú (UTC-5) antes de almacenar.

```csharp
DateTimeOffset.Parse(check_time).ToOffset(TimeSpan.FromHours(-5)).DateTime
```

**NUNCA** usar `DateTime.ParseExact` (no maneja offset) ni `.UtcDateTime` (almacena UTC, muestra hora incorrecta).

---

## 2. Asistencia por Curso (en clase)

### 2.1 Códigos de estado

| Código | Significado |
|--------|-------------|
| `P` | Presente |
| `T` | Tarde |
| `F` | Faltó |

**Regla**: La asistencia por curso es independiente de la asistencia diaria. Un estudiante puede estar `Completa` en asistencia diaria (entró y salió del colegio) pero `F` en un curso específico (no entró al aula).

### 2.2 Quién puede marcar

- **Profesor**: Solo en cursos/horarios donde está asignado
- **Director/Admin**: En cualquier curso

---

## 3. Calificaciones

### 3.1 Escala de notas

| Configuración | Rango | Ejemplo |
|--------------|-------|---------|
| Numérico | 0 - 20 (vigesimal) | 15.5 |
| Literal | Configurable por nivel | A, B, C, D |

**Regla**: El tipo de calificación (`NUMERICO` o `LITERAL`) se configura **por nivel educativo y por año**. No se mezclan sistemas dentro del mismo nivel/año.

### 3.2 Pesos de evaluación

- Rango permitido: **0.01** (1%) a **1.00** (100%)
- Son fracciones absolutas, **NO se normalizan** dividiendo entre la suma de pesos
- Fórmula: `Promedio = Σ(nota × peso)`, redondeado a 1 decimal

**Regla**: Si los pesos de las evaluaciones de un curso no suman ~1.0, el promedio será incorrecto. Esta es responsabilidad del profesor al crear evaluaciones, no del sistema.

### 3.3 Tipos de evaluación

| Tipo | Descripción |
|------|-------------|
| `Tarea` | Trabajo asignado |
| `Examen` | Evaluación formal |
| `Exposicion` | Presentación oral |
| `Participacion` | Participación en clase |
| `Otro` | Cualquier otro tipo |

### 3.4 Ventana de edición

**Regla**: Una calificación solo puede modificarse dentro de los **2 meses** posteriores a su fecha de evaluación. Después de ese plazo, el sistema rechaza la edición con `EVALUACION_EDIT_WINDOW_EXCEEDED`.

**Por qué**: Evita modificaciones retroactivas que alteren promedios ya comunicados a apoderados.

### 3.5 Evaluaciones grupales

**Regla**: Si una evaluación es grupal (`CAL_EsGrupal = true`) y un profesor edita la nota de un estudiante individual, esa nota se marca como `CN_EsOverride = true`. Esto permite auditar qué notas fueron ajustadas manualmente respecto al grupo.

### 3.6 Jerarquía de promedios

```
Nota individual (por evaluación)
  → Promedio por semana (ponderado por peso)
    → Promedio por periodo (semanas dentro del periodo)
      → Promedio por curso (media aritmética de periodos)
        → Promedio general del estudiante (media aritmética de cursos, 1 decimal)
```

---

## 4. Aprobación y Progresión

### 4.1 Estados de aprobación

| Estado | Significado | Transiciones permitidas |
|--------|-------------|------------------------|
| `PENDIENTE` | Aún no evaluado (default) | → `APROBADO` o `DESAPROBADO` |
| `APROBADO` | Estudiante aprobó | Estado final |
| `DESAPROBADO` | Estudiante desaprobó | Estado final |

**Regla**: Solo se puede aprobar/desaprobar cuando el `PeriodoAcademico` tiene `EstadoCierre = "CERRADO"`. No se permiten aprobaciones con el periodo abierto.

### 4.2 Progresión de estudiantes aprobados

| Condición | Destino |
|-----------|---------|
| Grado actual < 5to Secundaria | Siguiente grado + misma sección + misma sede + siguiente año |
| Grado actual = 5to Secundaria (`GRA_Orden = 14`) | `NULL` — el estudiante **egresa**. No se le asigna salón destino. Su estado (`EST_Estado`) se cambia a `false` (inactivo) y no aparece en listados del siguiente año. El registro permanece para consultas históricas (kardex, certificados). |

### 4.3 Progresión de estudiantes desaprobados

| Condición | Destino |
|-----------|---------|
| `esVacacional = true` | Mismo grado + sección "V" (verano) + siguiente año |
| `esVacacional = false` | Mismo grado + misma sección + siguiente año (repite) |

**Regla**: Si el salón destino no existe, el sistema lo crea automáticamente con `SAL_Estado = true`.

### 4.4 Periodo vacacional

- **Meses 1-2** (enero-febrero) = Periodo de verano
- **Meses 3-12** (marzo-diciembre) = Periodo regular
- La sección `"V"` está reservada exclusivamente para clases de verano/recuperación
- El periodo regular **excluye** la sección "V"

---

## 5. Estructura Académica

### 5.1 Niveles educativos y orden de grados

| Nivel | Grados | `GRA_Orden` |
|-------|--------|-------------|
| **Inicial** | 3 grados | 1 - 3 |
| **Primaria** | 6 grados | 4 - 9 |
| **Secundaria** | 5 grados | 10 - 14 |

**Regla**: `GRA_Orden` es la fuente de verdad para determinar el siguiente grado. La progresión es siempre `Orden + 1`, excepto en el último grado de secundaria (14).

### 5.2 Unicidad de salón

**Regla**: Solo puede existir **un salón** por combinación de (Grado, Sección, Sede, Año). El unique index lo garantiza, pero la lógica de negocio debe validar antes de crear.

### 5.3 Relación curso-grado

Un curso puede enseñarse en múltiples grados (tabla `CursoGrado`), pero cada asignación curso-grado es única. No se puede asignar "Matemáticas" dos veces al mismo grado.

---

## 6. Horarios

### 6.1 Validación de tiempos

**Regla**: `HoraInicio` debe ser estrictamente menor que `HoraFin`. No se permiten horarios de duración cero.

### 6.2 Detección de conflictos (las 3 restricciones)

Antes de crear o actualizar un horario, el sistema **debe** verificar:

| Restricción | Descripción |
|------------|-------------|
| **Sin doble reserva de salón** | Un salón no puede tener dos clases en el mismo día y horario superpuesto |
| **Sin doble reserva de profesor** | Un profesor no puede estar en dos clases en el mismo día y horario superpuesto |
| **Sin doble reserva de estudiante** | Ningún estudiante inscrito puede tener otra clase en el mismo día y horario superpuesto |

**Fórmula de superposición**: `Inicio1 < Fin2 AND Fin1 > Inicio2`

**Regla**: Las 3 validaciones se aplican tanto en creación como en actualización (excluyendo el propio horario en update).

### 6.3 Día de la semana

- Rango válido: 1-7 (1=Lunes, 7=Domingo)
- **Conversión desde C#**: `DayOfWeek.Sunday = 0` → BD = `7`. Fórmula: `((int)DateTime.Now.DayOfWeek == 0) ? 7 : (int)DateTime.Now.DayOfWeek`

---

## 7. Autenticación y Seguridad

### 7.1 Login por rol

El DNI es el identificador universal. El usuario selecciona su rol en el frontend y el backend despacha directamente a la tabla correspondiente (dispatch por rol, no búsqueda secuencial):

```
DNI + Rol seleccionado → switch(rol) → query directa a tabla del rol
```

| Rol seleccionado | Tabla consultada |
|-----------------|-----------------|
| `"estudiante"` | `Estudiante` |
| `"apoderado"` | `Apoderado` |
| `"profesor"` | `Profesor` |
| `"director"` o `"asistente administrativo"` | `Director` |

**Regla**: La cuenta debe estar activa (`Estado = true`) para permitir el login. Cuenta inactiva → login bloqueado con mensaje explicativo.

**Regla**: Si en el futuro se implementa login sin selección de rol (auto-detect por DNI), el orden de búsqueda **debe** ser de menor a mayor volumen: Director → Profesor → Apoderado → Estudiante. Buscar primero en tablas chicas (decenas) evita queries innecesarias a la tabla más grande (miles).

### 7.2 Normalización de DNI

**Regla**: Todo DNI se normaliza via `DniHelper.Normalizar()` antes de cualquier operación. DNI siempre 8 dígitos, padding con ceros a la izquierda.

### 7.3 Migración transparente de contraseñas

**Regla**: En login exitoso, si la contraseña está en texto plano (legacy), se rehashea automáticamente a BCrypt (`TryRehashAsync`). Esto es transparente para el usuario.

### 7.4 Encriptación de datos sensibles

- DNI: AES-256 en reposo, SHA256 hash para búsquedas
- Contraseñas: AES-256 para el campo de texto plano (admin query), BCrypt para verificación

---

## 8. Permisos

### 8.1 Resolución de permisos (2 capas)

```
1. ¿Tiene permisos personalizados (ColegioVistaPermiso)?
   → SÍ: Usar permisos personalizados (override total)
   → NO: Usar permisos del rol (RolVistaPermiso)
```

**Regla**: Los permisos personalizados **reemplazan completamente** los del rol, no se suman. Si un usuario tiene permisos personalizados, los del rol se ignoran.

### 8.2 Granularidad por ruta

**Regla**: Tener permiso a `intranet` **NO** da acceso a `intranet/admin`. Cada ruta es un permiso independiente. La verificación es por coincidencia exacta.

### 8.3 Roles del sistema

| Rol | Tabla de usuarios | Alcance |
|-----|-------------------|---------|
| Director | `Director` | Acceso total administración |
| Asistente Administrativo | `Director` (mismo login) | Administración limitada |
| Profesor | `Profesor` | Sus salones y cursos |
| Apoderado | `Apoderado` | Información de sus hijos |
| Estudiante | `Estudiante` | Su propia información |

---

## 9. Periodos Académicos

### 9.1 Estados del periodo

| Estado | Significado | Transición |
|--------|-------------|-----------|
| `ABIERTO` | En curso, calificaciones editables | → `CERRADO` |
| `CERRADO` | Finalizado, calificaciones congeladas | Estado final (no se reabre) |

**Regla**: El cierre de un periodo es **irreversible**. Una vez cerrado, las calificaciones de ese periodo no se pueden modificar y se habilita la aprobación de estudiantes.

### 9.2 Relación periodo-aprobación

- Aprobaciones solo se registran con periodo `CERRADO`
- Un periodo tiene orden (`PA_Orden`: 1, 2, 3, 4) dentro de un año y nivel

---

## 10. Concurrencia y Consistencia

### 10.1 Optimistic concurrency (RowVersion)

**Regla**: Todas las entidades principales tienen `RowVersion`. En conflicto de concurrencia:
1. Detectar `DbUpdateConcurrencyException`
2. Reintentar hasta **3 veces** (con reload de datos)
3. Si falla después de 3 intentos, propagar el error

### 10.2 Operaciones transaccionales

Las siguientes operaciones **deben** ejecutarse en una sola transacción:
- Aprobación + asignación de salón destino
- Registro de entrada/salida de asistencia
- Rollback completo en caso de error

### 10.3 Idempotencia

**Regla**: Mutaciones desde el frontend incluyen `X-Idempotency-Key`. El backend **debe** rechazar duplicados con 409 Conflict en lugar de procesar dos veces.

---

## 11. Notificaciones y Comunicación

### 11.1 Fire-and-forget

**Regla**: Las notificaciones (email, push, SignalR) son fire-and-forget. Un error al enviar notificación **nunca** debe fallar la operación principal.

### 11.2 SignalR en asistencia

Al registrar una entrada/salida exitosamente, se envía un mensaje `"AsistenciaRegistrada"` a todos los clientes conectados con `{dni, nombre, tipo, hora, sede}`.

---

## 12. Invariantes Globales

Estas reglas aplican a todo el sistema:

| # | Invariante |
|---|-----------|
| 1 | **Todo DNI es de 8 dígitos** — normalizar con padding de ceros antes de cualquier operación |
| 2 | **Toda entidad tiene auditoría** — `UsuarioReg`, `FechaReg` en creación; `UsuarioMod`, `FechaMod` en actualización |
| 3 | **Estado booleano = activo/inactivo** — `true` = activo, `false` = inactivo. No hay "eliminación" real (soft delete) |
| 4 | **Toda fecha se almacena en hora Perú** (UTC-5) — las conversiones se hacen en el punto de entrada, no en capas internas |
| 5 | **Delete = toggle de estado** — no se eliminan registros físicamente, se desactivan |
| 6 | **Queries read-only usan AsNoTracking()** — performance obligatorio |
| 7 | **Un estudiante solo puede estar en un salón activo por año** — validado por unique constraint |
| 8 | **Un profesor puede ser tutor de un solo salón** — `PRS_EsTutor = true` es exclusivo |

---

## 13. Operaciones Batch (Command Pattern)

### 13.1 Arquitectura

Las operaciones batch usan el patrón Command con audit granular:

```
Controller → Service.OperacionMasivaAsync
  → BatchCommandExecutor.ExecuteAsync
    → Fase 1: ValidateAsync (todos los ítems antes de ejecutar)
    → Fase 2: ExecuteAsync (solo válidos, transacción por ítem)
    → Fase 3: PersistAuditAsync (CommandAuditLog, fire-and-forget)
  → BatchCommandResult con detalle por ítem
```

| Componente | Ubicación | Responsabilidad |
|------------|-----------|-----------------|
| `IBatchCommand` | `Interfaces/Services/` | Contrato: un comando individual con `ItemId` |
| `IBatchCommandHandler<T>` | `Interfaces/Services/` | Validar + ejecutar un tipo de comando |
| `BatchCommandExecutor` | `Services/Common/` | Orquestar: validate all → execute each → audit each |
| `CommandAuditLog` | `Models/Sistema/` | Registro granular por ítem en BD |

### 13.2 Tabla `CommandAuditLog`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Id` | `BIGINT IDENTITY` | PK |
| `BatchId` | `NVARCHAR(12)` | Agrupa commands del mismo batch |
| `CommandType` | `NVARCHAR(50)` | Tipo de comando (`AprobarEstudiante`, `CalificarLote`) |
| `EntityType` | `NVARCHAR(50)` | Entidad afectada (`AprobacionEstudiante`) |
| `EntityId` | `INT` | ID de la entidad afectada |
| `Payload` | `NVARCHAR(MAX)` | JSON del command ejecutado |
| `Success` | `BIT` | Si el comando fue exitoso |
| `ErrorCode` | `NVARCHAR(50)` | Código de error (null si exitoso) |
| `ErrorMessage` | `NVARCHAR(500)` | Mensaje de error (null si exitoso) |
| `DurationMs` | `INT` | Tiempo de ejecución del ítem en ms |
| `Usuario` | `NVARCHAR(100)` | Quién ejecutó el comando |
| `Fecha` | `DATETIME2` | Cuándo se ejecutó |

**Índices**: `BatchId`, `(CommandType, Fecha)`, `(EntityType, EntityId)`.

### 13.3 Reglas de ejecución

| Regla | Descripción |
|-------|-------------|
| **Validar primero, ejecutar después** | Fase 1 valida TODOS los ítems. Solo los válidos pasan a ejecución |
| **Transacción por ítem** | Cada comando tiene su propia transacción. Si el #17 falla, los 16 anteriores ya están committed |
| **Audit siempre persiste** | Cada audit se guarda independientemente. Si un ítem falla, su audit (con error) se guarda igual |
| **Audit es fire-and-forget** | Un error al persistir audit **nunca** falla la operación principal |
| **Progreso parcial** | El `BatchCommandResult` reporta `succeeded`, `failed` y detalle por ítem |

### 13.4 Respuesta del batch (`BatchCommandResult`)

```json
{
  "batchId": "a1b2c3d4e5f6",
  "total": 22,
  "succeeded": 20,
  "failed": 2,
  "durationMs": 3400,
  "items": [
    { "itemId": 101, "success": true, "message": "Estudiante aprobado correctamente" },
    { "itemId": 102, "success": false, "message": "Periodo no cerrado", "errorCode": "PERIODO_NO_CERRADO" }
  ]
}
```

### 13.5 Cómo agregar un nuevo batch

1. Crear `MiCommand` que implemente `IBatchCommand` (con `ItemId`)
2. Crear `MiCommandHandler` que implemente `IBatchCommandHandler<MiCommand>` (con `ValidateAsync` + `ExecuteAsync`)
3. Registrar en DI: `builder.Services.AddScoped<IBatchCommandHandler<MiCommand>, MiCommandHandler>()`
4. En el service, mapear DTOs a commands y llamar `_executor.ExecuteAsync(...)`

### 13.6 Operaciones batch existentes

| Operación | Command | Handler | Endpoint |
|-----------|---------|---------|----------|
| Aprobación masiva | `AprobacionCommand` | `AprobacionCommandHandler` | `POST /api/AprobacionEstudiante/masivo` |

---

## Checklist: Antes de Implementar una Feature de Backend

```
REGLAS DE NEGOCIO
[ ] ¿Qué estados puede tener la entidad? ¿Qué transiciones son válidas?
[ ] ¿Hay ventanas de tiempo o plazos que limiten operaciones?
[ ] ¿Quién puede ejecutar esta operación? (rol + permisos)
[ ] ¿Hay conflictos posibles? (concurrencia, doble reserva, duplicados)
[ ] ¿La operación afecta otras entidades? (transacción necesaria)
[ ] ¿Hay cálculos con fórmulas definidas? (promedios, estados)

CONSISTENCIA
[ ] ¿Se respeta soft-delete? (toggle estado, no DELETE)
[ ] ¿Se audita? (UsuarioReg/Mod, FechaReg/Mod)
[ ] ¿Se maneja concurrencia? (RowVersion, retry)
[ ] ¿Es idempotente? (X-Idempotency-Key)

BATCH
[ ] ¿La operación procesa múltiples ítems? → Usar BatchCommandExecutor
[ ] ¿Cada ítem necesita su propia transacción? (progreso parcial)
[ ] ¿Se requiere audit granular por ítem? → CommandAuditLog
[ ] ¿Se creó Command + Handler + registro en DI?

NOTIFICACIONES
[ ] ¿Debe notificar en tiempo real? (SignalR)
[ ] ¿Debe enviar email? (fire-and-forget)
[ ] ¿La notificación es NO bloqueante?
```
