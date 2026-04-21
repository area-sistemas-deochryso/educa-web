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

### 1.0 Modelo polimórfico (Plan 21, 2026-04-20)

> **"La asistencia vive en `AsistenciaPersona`, no en `Asistencia`. El tipo de persona (E/P) es un discriminador, no un campo accesorio."**

La tabla histórica `Asistencia` (FK exclusiva a `Estudiante`) fue reemplazada por `AsistenciaPersona` con discriminador polimórfico. Un mismo webhook de CrossChex, un mismo flujo admin, registran tanto estudiantes como profesores.

| Campo clave | Valor | Significado |
|-------------|-------|-------------|
| `ASP_TipoPersona` | `'E'` \| `'P'` | Discriminador obligatorio (CHECK constraint en BD) |
| `ASP_PersonaCodID` | `INT` | FK **polimórfica** — validada en service, no en BD (apunta a `Estudiante.EST_CodID` si `E`, a `Profesor.PRO_CodID` si `P`) |

**Dispatch del webhook**: orden `Profesor → Estudiante → rechazar`. Justificación: hay menos profesores (lookup más barato) y el invariante `DNI_COLISION_CROSS_TABLE` garantiza que un DNI no puede existir simultáneamente en ambas tablas activas (validado por query SQL 2026-04-18: 0 colisiones históricas).

**Migración histórica**: `Asistencia` renombrada a `Asistencia_deprecated_2026_04` tras repoint de FKs (`JustificacionSaludDia.JSD_ASI_CodID` y `PermisoSaludSalida.PSS_ASI_CodID` → `AsistenciaPersona.ASP_CodID`). DROP definitivo a los 60 días si no hay issues.

**Reglas comunes** (INV-C01/C09/C10, INV-AD01-06): aplican indistintamente a estudiantes y profesores salvo donde se indique explícitamente "solo estudiante" o "solo profesor".

### 1.1 Ventanas horarias

El estado de asistencia de **ingreso** se calcula automáticamente según la hora de marcación biométrica. **En periodo regular los umbrales son absolutos y dependen del tipo persona** (Plan 24 Chat 1, 2026-04-20). En verano se mantiene la fórmula "inicio + delta".

| Periodo | Tipo persona | Meses | Asistió (A) | Tardanza (T) | Falta (F) |
|---------|--------------|-------|-------------|-------------|-----------|
| **Regular** | Estudiante (E) | Mar-Dic | `[05:00, 07:46)` | `[07:46, 09:30)` | `≥ 09:30` o sin marcación |
| **Regular** | Profesor (P)   | Mar-Dic | `[05:00, 07:31)` | `[07:31, 09:30)` | `≥ 09:30` o sin marcación |
| **Verano**  | Ambos (E/P)    | Ene-Feb | `08:30 – 09:20` (inicio + 50min) | `09:20 – 10:30` (inicio + 2h) | `> 10:30` o sin marcación |

**Apertura de ingreso regular (INV-C10)**: Marcaciones de entrada **antes de 05:00** se descartan silenciosamente por el validador de coherencia horaria (solo periodo regular, ambos tipos persona). Se loggean como `Information` y no crean registro.

**Ventana mínima de salida para estudiantes (INV-C09)**: Marcaciones de salida de estudiantes **antes de 13:55** se descartan silenciosamente (solo periodo regular). Profesores no tienen ventana mínima de salida — pueden salir tarde sin restricción. Verano no aplica guard de salida temprana.

**Ingreso después del umbral de falta**: Se registra la marcación pero el estado es `F` (Falta) igualmente.

**Salida simplificada**: No se clasifica por ventana horaria en el cálculo de estado (salvo los guards INV-C09). Al registrar salida, la asistencia pasa de `Incompleta` a `Completa`. No afecta el estado del ingreso.

**Regla**: Estas ventanas son las únicas fuentes de verdad para el cálculo de estado y su clasificación se hace en `AsistenciaRules` + `EstadoAsistenciaCalculator` (Domain). Si cambian los horarios del colegio, se actualizan allí, no en múltiples servicios.

### 1.2 Códigos de estado

| Código | Significado | Cuándo se asigna |
|--------|-------------|-----------------|
| `A` | Asistió | Ingreso dentro de la ventana de "a tiempo" (ver §1.1, depende de tipo persona en regular) |
| `T` | Tardanza | Ingreso en la ventana entre umbral de tardanza y umbral de falta |
| `F` | Falta | Ingreso pasado el umbral de falta, o sin marcación al final del día |
| `J` | Justificado | Justificación manual con prefijo `"Justificado:"` |
| `-` | Pendiente | Día aún no terminó |
| `X` | Antes del registro | Fecha anterior a `FECHA_INICIO_REGISTRO` (26-ene-2026) |

### 1.3 Precedencia de justificación

**Regla**: La justificación tiene precedencia ABSOLUTA sobre cualquier cálculo por hora. Si el campo observación empieza con `"Justificado:"`, el estado es `J` sin importar las horas de entrada/salida.

### 1.4 Estado combinado entrada + salida

El estado final de asistencia lo determina **solo el ingreso**. La salida solo afecta la completitud (`Completa`/`Incompleta`), no el código de estado.

**Prioridad de severidad** (usada cuando se resuelven conflictos):

```
F (4) > J (3) > T (2) > A (1) > Pendiente/X (0)
```

**Ejemplo**: Ingreso a las 8:15 en periodo regular → `A` (Asistió). Salida a las 14:00 → estado sigue siendo `A`, asistencia pasa a `Completa`.

### 1.5 Coherencia horaria y anti-duplicación biométrica

**Umbral de coherencia**: Las **12:00** separan horario de entrada (antes) y horario de salida (desde). Una marcación es "coherente" si ocurre en el horario que corresponde a su tipo (entrada antes de 12:00, salida desde 12:00).

**Guards de apertura (solo periodo regular, evaluados ANTES del resto de reglas)**:

| Guard | Condición | Acción |
|-------|-----------|--------|
| INV-C10 | Entrada `<05:00` (ambos tipos persona) | Ignorar silenciosamente (no se crea registro) |
| INV-C09 | Salida `<13:55` de **estudiante** (`TipoPersona='E'`) | Ignorar silenciosamente |

Los guards NO aplican en verano (Ene-Feb) — en verano cualquier marcación se procesa con las reglas tradicionales.

**Regla de clasificación con múltiples biométricos**:

| Registro existente hoy | Nueva marca en horario de entrada (<12:00) | Nueva marca en horario de salida (≥12:00) |
|-------------------------|---------------------------------------------|---------------------------------------------|
| **No existe** | Crear ENTRADA | Crear SALIDA (sin entrada) |
| **Entrada coherente** (<12:00) | IGNORAR (duplicado de otro biométrico) | Completar SALIDA |
| **Entrada incoherente** (≥12:00) | REEMPLAZAR entrada con marca coherente | REEMPLAZAR: limpiar entrada, registrar como salida |
| **Entrada + salida completas** | IGNORAR | IGNORAR |

**Principio**: Una marca coherente siempre tiene prioridad sobre una incoherente del mismo día y persona.

**Anti-duplicación**: Ventana mínima de **30 minutos** entre entrada y salida al completar salida. Aplica solo cuando ya hay entrada coherente y se registra salida. Los dispositivos CrossChex pueden enviar duplicados o el estudiante puede marcar en múltiples biométricos.

**Por qué**: Un colegio puede tener múltiples dispositivos biométricos (puerta principal, pasillo, etc.). Sin coherencia horaria, una segunda marcación a las 09:32 en otro dispositivo se registraba como "salida" cuando claramente es horario de entrada.

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

### 1.8 Vías válidas de mutación (INV-AD01)

Toda mutación sobre la tabla `Asistencia` debe pasar por una de estas dos vías:

| Vía | Servicio | Origen | Correo |
|-----|----------|--------|--------|
| **Biométrica** | `IAsistenciaService` | Webhook CrossChex o registro manual interno | Correo de marcación en tiempo real |
| **Admin/Director** | `IAsistenciaAdminService` | UI formal `intranet/admin/asistencias` | Correo diferenciado "Corrección de asistencia" (INV-AD05) |

**Edición directa en BD (SSMS, Azure Portal) está prohibida en producción.** Si se detecta, los correos al apoderado no se envían y no hay auditoría.

**INV-AD05 ampliado a profesores (Plan 23 Chat 4, 2026-04-20)**: cuando la persona editada tiene `TipoPersona = 'P'`, el correo de corrección se envía al propio **profesor** (`Profesor.PRO_Correo`) como destinatario único; nunca al apoderado. El outbox se etiqueta como `"ASISTENCIA_CORRECCION_PROFESOR"` / `TipoEntidadOrigen = "AsistenciaProfesor"` para separar bandejas admin. Misma plantilla azul administrativa que para estudiante, con saludo "Estimado/a profesor/a".

### 1.9 Precedencia manual sobre biométrica (INV-AD02)

Si ya existe un registro con `ASI_OrigenManual = true` para un estudiante en una fecha, el webhook de CrossChex **descarta silenciosamente** la marcación biométrica de ese día. La validación está en `AsistenciaService.RegistrarAsistencia()`.

### 1.10 Cierre mensual (INV-AD03, INV-AD04)

- **Tabla**: `CierreAsistenciaMensual` — un registro por (Sede, Año, Mes) activo.
- **Efecto**: Mientras el cierre esté activo (`CAM_Estado = true`), ninguna operación de `AsistenciaAdminService` puede mutar registros de asistencia cuya fecha caiga en ese mes/año/sede. Lanza `BusinessRuleException("ASISTENCIA_MES_CERRADO")`.
- **Reversión (INV-AD04)**: Solo el Director puede revertir un cierre (`POST /api/cierre-asistencia/{id}/revertir`). Requiere observación de mínimo 10 caracteres y queda auditado en el campo `CAM_Observacion`.

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

### 4.5 Flujo completo vacacional (referencia a salón original)

> **"La sección V es un paréntesis, no un destino permanente."**

Cuando un estudiante entra a sección "V", el sistema **debe** guardar una referencia al salón de origen (`AE_SalonOrigenId`) para que la progresión post-vacacional sepa a dónde volver.

**Campo requerido**: `AprobacionEstudiante.AE_SalonOrigenId` (FK nullable a Salon) — se llena SOLO cuando el destino es sección "V". Contiene el ID del salón regular del que vino el estudiante.

#### Flujo: Regular → Vacacional → Regular

```
Estudiante en 4B (Salón origen)
  │
  ├─ DESAPROBADO (esVacacional=true)
  │   → Destino: 4V
  │   → AE_SalonOrigenId = ID del salón 4B  ← GUARDAR REFERENCIA
  │
  └─ En 4V (verano):
      │
      ├─ APROBADO en 4V
      │   → Buscar AE_SalonOrigenId del salón 4V → encuentra salón 4B
      │   → Sección original = "B", grado original = 4
      │   → Destino: 5B (GRA_Orden + 1 + sección original + siguiente año)
      │
      └─ DESAPROBADO en 4V
          │
          ├─ esVacacional = false (repite)
          │   → Buscar AE_SalonOrigenId → encuentra salón 4B
          │   → Destino: 4B (mismo grado + sección original + siguiente año)
          │
          └─ esVacacional = true (otro verano — caso raro)
              → Destino: 4V (mismo grado + sección "V" + siguiente año)
              → AE_SalonOrigenId = PRESERVAR el original (4B, no 4V)
```

#### Regla de resolución de sección para estudiantes en "V"

```
Si salonOrigen.Seccion == "V":
  1. Buscar AE_SalonOrigenId en la AprobacionEstudiante que lo envió a "V"
  2. Extraer la sección del salón original (ej: "B")
  3. Usar esa sección para el cálculo de destino
Si salonOrigen.Seccion != "V":
  Usar salonOrigen.Seccion (flujo normal, sin cambios)
```

#### Invariante

| ID | Invariante |
|----|-----------|
| `INV-V01` | Un estudiante en sección "V" SIEMPRE tiene `AE_SalonOrigenId` apuntando a su salón regular de origen |
| `INV-V02` | La progresión desde "V" SIEMPRE usa la sección del salón original, nunca la sección "V" |
| `INV-V03` | Si un estudiante va de "V" a "V" consecutivamente, `AE_SalonOrigenId` preserva el **primer** salón regular (no el "V" intermedio) |

#### Tabla de progresión completa

| Origen | Estado | esVacacional | Destino | AE_SalonOrigenId |
|--------|--------|-------------|---------|-----------------|
| 4B | APROBADO | — | 5B | `null` |
| 4B | DESAPROBADO | `false` | 4B (siguiente año) | `null` |
| 4B | DESAPROBADO | `true` | 4V | **ID de 4B** |
| 4V | APROBADO | — | 5B (sección de origen) | `null` |
| 4V | DESAPROBADO | `false` | 4B (sección de origen) | `null` |
| 4V | DESAPROBADO | `true` | 4V (siguiente año) | **Preservar ID de 4B** |
| 5toSec | APROBADO | — | `null` (egresa) | `null` |

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

### 5.4 Modelo de asignación profesor-salón-curso

> **"La forma en que un profesor se asigna depende del grado del salón, no de una política uniforme."**

El colegio opera con dos modelos de asignación distintos según el nivel/grado. Cualquier cambio que toque asignaciones de profesores, permisos de calificación o asistencia por curso **debe** respetar esta distinción.

| Rango | `GRA_Orden` | Modelo | Relación natural |
|-------|-------------|--------|------------------|
| Inicial (3 grados) → 3ro Primaria | 1 – 7 | **Tutor pleno** — un profesor por salón dicta TODOS los cursos | Profesor ↔ Salón |
| 4to Primaria → 5to Secundaria | 8 – 14 | **Por curso** — un profesor puede dictar uno o más cursos; un salón tiene múltiples profesores | Profesor ↔ Curso (tabla `ProfesorCurso`, validado en Horario) |
| Sección "V" (cualquier grado) | cualquiera | **Flexible** — sin validación de modo (verano/recuperación) | Sin restricción |

**Consecuencias**:

- En modo **tutor pleno**, el profesor del horario **debe** coincidir con el `ProfesorSalon` tutor del salón. No se permiten horarios con profesores distintos al tutor.
- En modo **por curso**, cualquier profesor asignado al curso puede dictarlo. La relación pasa por Horario (no hay tabla `ProfesorCurso` directa hoy).
- Los flujos de UI (asignación masiva, creación de horarios, permisos de calificación/asistencia) **deben** ramificar según `GRA_Orden` del salón.

**Estado actual del back (implementado — Plan 6, 2026-04-16)**:

- `ModoAsignacionResolver` calcula el modo a partir de `GRA_Orden` + sección (función pura, sin columna en BD).
- `TutorPlenoValidator` y `ProfesorCursoValidator` se ejecutan en `HorarioAsignacionService` (crear) y `HorarioService.UpdateAsync` (editar).
- Tabla `ProfesorCurso` implementada para 4to Primaria en adelante (`GRA_Orden ≥ 8`), con CRUD completo.
- Frontend diferencia modos con badges en salones, horarios y edición de profesor.

**Invariantes** (implementados — Plan 6, 2026-04-16):

| ID | Invariante | Enforcement |
|----|-----------|-------------|
| `INV-AS01` | Salones con `GRA_Orden ≤ 7` (excluye sección V) operan en modo tutor pleno: todo horario del salón debe tener como profesor al `ProfesorSalon` tutor (`PRS_EsTutor = true`) | `TutorPlenoValidator` + `HorarioAsignacionService` + `HorarioService.UpdateAsync` |
| `INV-AS02` | Salones con `GRA_Orden ≥ 8` (excluye sección V) operan en modo por curso: el profesor de un horario debe tener entrada activa en `ProfesorCurso` para ese curso y año. Co-docencia permitida (múltiples profesores por curso-salón) | `ProfesorCursoValidator` + `HorarioAsignacionService` + `HorarioService.UpdateAsync` |
| `INV-AS03` | Un profesor en modo tutor pleno dicta obligatoriamente todos los cursos asignados al grado del salón vía `CursoGrado` | Convención de asignación (no enforced en runtime aún) |

**Resolución de modo** (`ModoAsignacionResolver`): Si la sección es "V" → `Flexible` (sin validación de modo). Si `GRA_Orden ≤ 7` → `TutorPleno`. Si `GRA_Orden ≥ 8` → `PorCurso`. Umbral constante: `UMBRAL_TUTOR_PLENO = 7`.

**Tabla ProfesorCurso**: Relación profesor-curso-año con unique index filtrado `(PCU_PRO_CodID, PCU_CUR_CodID, PCU_Anio) WHERE PCU_Estado = 1`. Endpoints CRUD en `ProfesorCursoController`.

**Impacto transversal**: Esta regla afecta BD (`ProfesorCurso` table), backend (validaciones de horarios, servicios de asignación) y frontend (UI de asignación diferenciada por grado). Los tres están implementados.

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

Esta fórmula detecta los **5 casos** de superposición de intervalos (dentro del mismo día de la semana):

```
Caso 1: Exacta (A == B)               Caso 2: Contención (A contiene B)
I1━━━━━━━━━━━F1                       I1━━━━━━━━━━━F1
I2━━━━━━━━━━━F2                            I2━━━━F2
I1<F2 ✓ AND F1>I2 ✓ → OVERLAP        I1<F2 ✓ AND F1>I2 ✓ → OVERLAP

Caso 3: Contención inversa            Caso 4: Parcial (A empieza antes)
     I2━━━━━━━━━━━F2                  I1━━━━━━━F1
     I1━━━━F1                              I2━━━━━━━F2
I1<F2 ✓ AND F1>I2 ✓ → OVERLAP        I1<F2 ✓ AND F1>I2 ✓ → OVERLAP

Caso 5: Parcial (B empieza antes)
          I1━━━━━━━F1
     I2━━━━━━━F2
I1<F2 ✓ AND F1>I2 ✓ → OVERLAP

--- NO overlap ---

Caso 6: Separados (A antes de B)
I1━━━F1
          I2━━━F2
I1<F2 ✓ AND F1>I2 ✗ → NO OVERLAP

Caso 7: Adyacentes (F1 == I2) — clases consecutivas permitidas
I1━━━F1
     I2━━━F2
I1<F2 ✓ AND F1>I2 ✗ (F1==I2, no es >) → NO OVERLAP
```

**Nota**: Los operadores son estrictos (`<`, `>`), no `<=`/`>=`. Esto permite clases consecutivas (8:00-9:00 y 9:00-10:00) sin conflicto. La superposición exacta (caso 1) funciona porque INV-C07 garantiza `HoraInicio < HoraFin`, por lo tanto `I1 < F2` y `F1 > I2` siempre se cumplen cuando los intervalos son idénticos.

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
| `ABIERTO` | En curso, calificaciones y asistencia por curso editables | → `CERRADO` |
| `CERRADO` | Finalizado, calificaciones y asistencia por curso congeladas | Estado final (no se reabre) |

**Regla**: El cierre de un periodo es **irreversible**. Una vez cerrado:
- Las **calificaciones** de ese periodo no se pueden modificar
- La **asistencia por curso** de ese periodo no se puede modificar (los registros de P/T/F quedan inmutables)
- Se habilita la **aprobación** de estudiantes

**Nota**: La asistencia **diaria** (CrossChex) NO se congela con el periodo — opera a nivel sede, no periodo. Solo la asistencia por curso (que depende de horarios asignados al salón) se congela.

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
| 8 | **Un profesor puede ser tutor de múltiples salones** — `PRS_EsTutor = true` por cada `ProfesorSalon` |

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

## 14. Máquinas de Estado (State Machines)

> **"Si una entidad tiene estados, las transiciones válidas deben estar escritas. Lo que no está escrito, no se puede verificar."**

Cada entidad con ciclo de vida tiene un diagrama de estados explícito. Las transiciones no listadas están **prohibidas**. El backend **debe** validar la transición antes de ejecutarla — si el estado actual no permite la transición solicitada, lanzar `BusinessRuleException`.

---

### 14.1 Estudiante

```
                    ┌─────────────────────────┐
                    │                         ▼
MATRICULADO ──→ ACTIVO ──→ EGRESADO ──→ (fin)
                  │  ▲
                  │  │
                  ▼  │
              INACTIVO
```

| Estado | `EST_Estado` | Significado | Transiciones permitidas |
|--------|-------------|-------------|------------------------|
| `MATRICULADO` | `true` | Asignado a salón, año aún no inicia | → `ACTIVO` (inicio de clases) |
| `ACTIVO` | `true` | Cursando el año académico | → `EGRESADO` (aprobación en 5to Sec) · → `INACTIVO` (retiro/baja) |
| `INACTIVO` | `false` | Retirado, transferido o dado de baja | → `ACTIVO` (reincorporación manual) |
| `EGRESADO` | `false` | Completó 5to Secundaria | Estado terminal — no hay retorno |

**Precondiciones**:
- `ACTIVO → EGRESADO`: Solo si `GRA_Orden = 14` (5to Sec) AND `AprobacionEstado = APROBADO`
- `ACTIVO → INACTIVO`: Requiere motivo registrado en observaciones
- `INACTIVO → ACTIVO`: Solo por Director/Admin, requiere reasignación a salón

**Invariante**: Un estudiante `INACTIVO` o `EGRESADO` **no aparece** en listados operativos (asistencia, calificaciones, horarios). Solo en consultas históricas (kardex, certificados).

---

### 14.2 Matrícula (EstudianteSalón)

```
                                ┌─────────────────────────────────────────────┐
                                │          Flujo de Pago                      │
                                │                                             │
PREASIGNADO ──→ PENDIENTE_PAGO ──→ PAGADO ──→ CONFIRMADO ──→ CURSANDO ──→ FINALIZADO
                     │                                           │
                     ▼                                           ▼
                  ANULADO                                    RETIRADO
```

| Estado | `ESS_EstadoMatricula` | Significado | Transiciones permitidas |
|--------|-----------------------|-------------|------------------------|
| `PREASIGNADO` | `"PREASIGNADO"` | Asignado por progresión automática o por admin. Pendiente de iniciar proceso de matrícula | → `PENDIENTE_PAGO` (admin inicia proceso de matrícula) |
| `PENDIENTE_PAGO` | `"PENDIENTE_PAGO"` | Matrícula iniciada, esperando registro de pago | → `PAGADO` (admin registra pago) · → `ANULADO` (admin cancela) |
| `PAGADO` | `"PAGADO"` | Pago registrado, pendiente de confirmación académica | → `CONFIRMADO` (admin confirma matrícula) |
| `CONFIRMADO` | `"CONFIRMADO"` | Matrícula oficial, estudiante listo para inicio de clases | → `CURSANDO` (inicio de clases) |
| `CURSANDO` | `"CURSANDO"` | Año académico en curso | → `FINALIZADO` (todos los periodos cerrados + aprobación) · → `RETIRADO` (baja durante el año) |
| `FINALIZADO` | `"FINALIZADO"` | Año académico completado (aprobado o desaprobado) | Estado terminal |
| `RETIRADO` | `"RETIRADO"` | Retirado durante el año | Estado terminal |
| `ANULADO` | `"ANULADO"` | Matrícula cancelada antes de confirmar | Estado terminal |

**Precondiciones**:

| Transición | Precondiciones | Quién |
|-----------|---------------|-------|
| `PREASIGNADO → PENDIENTE_PAGO` | Estudiante activo, salón tiene capacidad | Director/Admin |
| `PENDIENTE_PAGO → PAGADO` | Pago registrado con monto, método y comprobante | Director/Admin |
| `PENDIENTE_PAGO → ANULADO` | Motivo de anulación registrado | Director/Admin |
| `PAGADO → CONFIRMADO` | Verificación académica completada (datos del estudiante correctos) | Director/Admin |
| `CONFIRMADO → CURSANDO` | Fecha actual ≥ fecha de inicio de clases del año | Automático o Director/Admin |
| `CURSANDO → FINALIZADO` | TODOS los periodos del año `CERRADO` + aprobación registrada | Sistema (tras aprobación) |
| `CURSANDO → RETIRADO` | Motivo de retiro registrado. Calificaciones permanecen para historial | Director/Admin |

**Invariantes**:

| ID | Invariante |
|----|-----------|
| `INV-M01` | Un estudiante solo puede tener **una matrícula activa** (no `ANULADO`/`RETIRADO`/`FINALIZADO`) por año |
| `INV-M02` | `ANULADO`, `FINALIZADO` y `RETIRADO` son estados terminales — no hay retorno |
| `INV-M03` | Un pago registrado NO puede eliminarse — solo puede anularse la matrícula completa |
| `INV-M04` | La transición `CONFIRMADO → CURSANDO` puede ser automática (batch al inicio del año) o manual |

---

#### Pago de Matrícula (simulado desde admin)

> **"El pago es un registro administrativo, no una pasarela de pagos."**

El sistema NO integra con pasarelas de pago. El Director/Admin registra manualmente que el apoderado realizó el pago. El sistema solo almacena el registro para trazabilidad.

**Modelo: `PagoMatricula`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `PAM_CodID` | `INT IDENTITY` | PK |
| `PAM_ESS_CodID` | `INT` | FK a EstudianteSalon (matrícula) |
| `PAM_Monto` | `DECIMAL(10,2)` | Monto pagado |
| `PAM_MetodoPago` | `NVARCHAR(50)` | `"EFECTIVO"`, `"TRANSFERENCIA"`, `"YAPE"`, `"PLIN"`, `"OTRO"` |
| `PAM_NumeroComprobante` | `NVARCHAR(100)` | Referencia del pago (boleta, N° operación, etc.) |
| `PAM_FechaPago` | `DATETIME2` | Fecha en que se realizó el pago |
| `PAM_Observaciones` | `NVARCHAR(500)` | Notas adicionales |
| `PAM_Estado` | `BIT` | `true` = activo, `false` = anulado |
| `PAM_UsuarioReg` | `NVARCHAR(50)` | Quién registró el pago |
| `PAM_FechaReg` | `DATETIME2` | Cuándo se registró |

**Métodos de pago**:

```csharp
public static class MetodosPago
{
    public const string Efectivo = "EFECTIVO";
    public const string Transferencia = "TRANSFERENCIA";
    public const string Yape = "YAPE";
    public const string Plin = "PLIN";
    public const string Otro = "OTRO";

    public static readonly string[] Validos = { Efectivo, Transferencia, Yape, Plin, Otro };
}
```

**Flujo desde la UI (admin)**:

```
1. Admin selecciona estudiante preasignado → clic "Iniciar Matrícula"
   → PREASIGNADO → PENDIENTE_PAGO

2. Admin registra pago: monto, método, comprobante → clic "Registrar Pago"
   → Crea PagoMatricula
   → PENDIENTE_PAGO → PAGADO

3. Admin verifica datos → clic "Confirmar Matrícula"
   → PAGADO → CONFIRMADO

4. Al iniciar clases (manual o batch):
   → CONFIRMADO → CURSANDO
```

**Reglas de negocio del pago**:

| Regla | Descripción |
|-------|-------------|
| Monto > 0 | No se permiten pagos de monto cero o negativo |
| Comprobante requerido | Siempre debe tener referencia (excepto efectivo donde puede ser "S/N") |
| Sin doble pago | Una matrícula solo puede tener UN pago activo. Para corregir, anular el anterior |
| Historial inmutable | Los pagos no se editan — se anulan y se crea uno nuevo si es necesario |
| Anulación no borra | `PAM_Estado = false`, no DELETE físico (INV-D03) |

---

#### Cambios requeridos en `EstudianteSalon`

```csharp
// Nuevo campo en EstudianteSalon
[StringLength(20)]
public string ESS_EstadoMatricula { get; set; } = "PREASIGNADO";
```

**Migración**: El campo nuevo requiere un script SQL para la tabla existente. Registros existentes con `ESS_Estado = true` se migran a `"CURSANDO"`. Registros con `ESS_Estado = false` se migran a `"FINALIZADO"`.

```sql
-- Migración: agregar campo ESS_EstadoMatricula
ALTER TABLE EstudianteSalon
ADD ESS_EstadoMatricula NVARCHAR(20) NOT NULL DEFAULT 'PREASIGNADO';

-- Migrar datos existentes
UPDATE EstudianteSalon SET ESS_EstadoMatricula = 'CURSANDO' WHERE ESS_Estado = 1;
UPDATE EstudianteSalon SET ESS_EstadoMatricula = 'FINALIZADO' WHERE ESS_Estado = 0;
```

---

### 14.3 Calificación (Evaluación)

```
BORRADOR ──→ PUBLICADA ──→ BLOQUEADA
                │
                ▼
            EDITADA (→ vuelve a PUBLICADA)
```

| Estado | Significado | Transiciones permitidas |
|--------|-------------|------------------------|
| `BORRADOR` | Creada pero sin notas asignadas | → `PUBLICADA` (profesor asigna notas) |
| `PUBLICADA` | Notas visibles, dentro de ventana de edición (2 meses) | → `EDITADA` (modificación dentro de ventana) · → `BLOQUEADA` (ventana expirada o periodo cerrado) |
| `EDITADA` | Modificada después de publicación inicial | → `PUBLICADA` (se mantiene visible) · → `BLOQUEADA` |
| `BLOQUEADA` | Inmutable — ventana expirada o periodo cerrado | Estado terminal |

**Precondiciones**:
- `PUBLICADA → EDITADA`: Solo dentro de los 2 meses posteriores a `FechaEvaluacion` AND periodo `ABIERTO`
- `* → BLOQUEADA`: Automático cuando `FechaActual > FechaEvaluacion + 2 meses` OR periodo cambia a `CERRADO`
- Evaluación grupal editada individualmente: `CN_EsOverride = true`

**Invariante**: Una calificación `BLOQUEADA` **nunca** puede volver a ser editable. El bloqueo es irreversible.

> **Nota**: Actualmente el bloqueo se calcula dinámicamente (ventana de 2 meses). Esta máquina formaliza cuándo la evaluación deja de ser editable y por qué.

---

### 14.4 Periodo Académico (ya existente, formalizado)

```
ABIERTO ──→ CERRADO ──→ (fin)
```

| Estado | Significado | Transiciones permitidas |
|--------|-------------|------------------------|
| `ABIERTO` | Calificaciones y asistencia por curso editables, aprobaciones no permitidas | → `CERRADO` |
| `CERRADO` | Calificaciones y asistencia por curso congeladas, aprobaciones habilitadas | Estado terminal — **irreversible** |

**Precondiciones**:
- `ABIERTO → CERRADO`: Solo Director/Admin. No requiere que todas las evaluaciones tengan notas (decision del colegio).

**Efectos colaterales del cierre**:
1. Todas las calificaciones del periodo → `BLOQUEADA`
2. Asistencia por curso del periodo → congelada (no editable)
3. Se habilita la aprobación de estudiantes para este periodo
4. Se recalculan promedios finales del periodo

**Nota**: Asistencia diaria (CrossChex) NO se congela — opera a nivel sede, independiente del periodo académico.

---

### 14.5 Aprobación (ya existente, formalizado)

```
PENDIENTE ──→ APROBADO ──→ (fin)
    │
    └──→ DESAPROBADO ──→ (fin)
```

| Estado | Significado | Transiciones permitidas |
|--------|-------------|------------------------|
| `PENDIENTE` | Default al cerrar periodo | → `APROBADO` · → `DESAPROBADO` |
| `APROBADO` | Progresa al siguiente grado | Estado terminal |
| `DESAPROBADO` | Repite o va a vacacional | Estado terminal |

**Precondiciones**:
- `PENDIENTE → APROBADO/DESAPROBADO`: Solo con periodo `CERRADO`. Solo Director/Admin.

**Efectos colaterales**:
- `APROBADO` en 5to Sec → Estudiante cambia a `EGRESADO`
- `APROBADO` en otro grado → Crea/asigna salón de `GRA_Orden + 1`
- `DESAPROBADO` con vacacional → Crea/asigna salón sección "V"
- `DESAPROBADO` sin vacacional → Crea/asigna mismo grado, siguiente año

---

### 14.6 Asistencia Diaria (stateless, derivado)

La asistencia diaria **no es una máquina de estados** en el sentido clásico. Es un **valor derivado** calculado a partir de las marcaciones biométricas y la hora del día.

```
Sin marcación ──→ Entrada registrada ──→ Entrada + Salida registradas
   (Pendiente)      (Incompleta)              (Completa)
```

El "estado" (`T`, `A`, `F`, `N`, `J`, `-`, `X`) se **calcula**, no se transiciona. Ver sección 1 para reglas de cálculo.

**Excepción**: La justificación (`J`) es la única transición manual — un admin puede cambiar cualquier estado calculado a `J` agregando prefijo `"Justificado:"` en observaciones.

---

### 14.7 Horario

```
ACTIVO ──→ INACTIVO
  ▲            │
  └────────────┘
```

| Estado | Significado | Transiciones permitidas |
|--------|-------------|------------------------|
| `ACTIVO` | Horario vigente, visible en calendarios y asistencia | → `INACTIVO` (desactivación) |
| `INACTIVO` | Horario desactivado, no aparece en operación diaria | → `ACTIVO` (reactivación) |

**Precondiciones**:
- `→ ACTIVO` (crear o reactivar): Debe pasar las 3 validaciones de conflicto (salón, profesor, estudiantes). Ver sección 6.2.
- `→ INACTIVO`: Si tiene asistencia de curso registrada, las calificaciones asociadas permanecen (historial).

---

### 14.8 Reglas Generales de State Machines

| Regla | Descripción |
|-------|-------------|
| **Transición no listada = prohibida** | Si no está en la tabla, el backend DEBE lanzar `BusinessRuleException` |
| **Validar estado actual antes de transicionar** | Leer el estado de BD (no confiar en lo que envía el frontend) |
| **Efectos colaterales son transaccionales** | Si la transición tiene side effects, todo en una transacción |
| **Log de transiciones críticas** | Estudiante, Aprobación y Periodo deben logear: `estado anterior → estado nuevo + quién + cuándo` |
| **Idempotencia**: Transicionar al mismo estado = no-op | `APROBADO → APROBADO` no falla, simplemente no hace nada |

---

## 15. Registro de Invariantes

> **"Una invariante es una promesa que el sistema hace. Si se rompe, hay un bug — no una excepción."**

Este registro consolida TODAS las invariantes del sistema en una tabla indexable. Cada invariante tiene un ID estable para referencia en code reviews, tickets y logs de error.

---

### 15.1 Invariantes Estructurales (Datos)

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-D01` | DNI | Todo DNI tiene exactamente 8 dígitos, padding con ceros | `DniHelper.Normalizar()` + constraint BD | 7.2, 12.1 |
| `INV-D02` | Entidad | Toda entidad tiene campos de auditoría (`UsuarioReg`, `FechaReg`, `UsuarioMod`, `FechaMod`) | Middleware/base entity | 12.2 |
| `INV-D03` | Entidad | Soft delete — `Estado = false`, nunca DELETE físico | Convention + code review | 12.3, 12.5 |
| `INV-D04` | Fecha | Toda fecha se almacena en hora Perú (UTC-5) | Punto de entrada (controller/webhook) | 12.4 |
| `INV-D05` | Query | Toda query read-only usa `AsNoTracking()` | Code review | 12.6 |
| `INV-D06` | Salón | Unicidad: solo uno por (Grado, Sección, Sede, Año) | Unique index BD + validación en service | 5.2 |
| `INV-D07` | CursoGrado | Un curso se asigna una sola vez por grado | Unique constraint BD | 5.3 |
| `INV-D08` | API Response | Todo endpoint retorna `ApiResponse<T>` | Convention + code review | backend.md |
| `INV-D09` | Tabla de relación | Toda query de lectura sobre una tabla de relación (ProfesorSalon, EstudianteSalon, CursoGrado, etc.) que derive datos para la UI debe filtrar por `_Estado = true`. Sin este filtro, `FirstOrDefault/Any/Where` retorna registros soft-deleted como si fueran actuales | Code review + naming explícito (`ListarTodas*` solo para reconciliación) | backend.md — "Soft-delete en tablas de relación" |

---

### 15.2 Invariantes de Unicidad y Exclusividad

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-U01` | EstudianteSalón | Un estudiante solo puede estar en UN salón activo por año | Unique constraint BD | 12.7 |
| `INV-U02` | ProfesorSalón | Un profesor puede ser tutor de múltiples salones (un tutor por salón) | EF Config + validación en service | 12.8 |
| `INV-U03` | Horario (salón) | Un salón no puede tener dos clases superpuestas en el mismo día | Validación pre-create/update | 6.2 |
| `INV-U04` | Horario (profesor) | Un profesor no puede estar en dos clases superpuestas en el mismo día | Validación pre-create/update | 6.2 |
| `INV-U05` | Horario (estudiante) | Un estudiante no puede tener dos clases superpuestas en el mismo día | Validación pre-create/update | 6.2 |
| `INV-U06` | Calificación (tipo) | No se mezclan sistemas (NUMERICO/LITERAL) dentro del mismo nivel/año | Configuración por nivel + validación | 3.1 |

---

### 15.3 Invariantes de Transición de Estado

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-T01` | Periodo | El cierre es irreversible (`ABIERTO → CERRADO`, nunca al revés) | Service + no endpoint de reapertura | 9.1, 14.4 |
| `INV-T02` | Aprobación | Solo se puede aprobar/desaprobar con periodo `CERRADO` | Service valida estado del periodo | 4.1, 14.5 |
| `INV-T03` | Aprobación | `APROBADO` y `DESAPROBADO` son estados terminales | Service rechaza transiciones desde terminal | 4.1, 14.5 |
| `INV-T04` | Calificación | No editable después de 2 meses o con periodo `CERRADO` | Service calcula ventana + estado periodo | 3.4, 14.3 |
| `INV-T05` | Estudiante | `EGRESADO` es estado terminal (solo desde 5to Sec + APROBADO) | Service valida `GRA_Orden = 14` | 14.1 |
| `INV-T06` | Estudiante | `INACTIVO → ACTIVO` requiere reasignación a salón | Service valida salón destino | 14.1 |

---

### 15.4 Invariantes de Cálculo

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-C01` | Asistencia | Estado final lo determina el ingreso. En regular los umbrales son **absolutos** y dependen de `TipoPersona` (E: 7:46 tardanza / 9:30 falta; P: 7:31 tardanza / 9:30 falta). Verano mantiene fórmula inicio+delta. Severidad: `F(4) > J(3) > T(2) > A(1)` | `EstadoAsistenciaCalculator` (Domain) | 1.1, 1.4 |
| `INV-C02` | Asistencia | Justificación (`"Justificado:"`) tiene precedencia absoluta sobre cálculo por hora | `EstadoAsistenciaCalculator` | 1.3 |
| `INV-C03` | Asistencia | Coherencia horaria: umbral 12:00 separa entrada/salida. Marca coherente reemplaza incoherente. Anti-duplicación 30 min al completar salida | `CoherenciaHorariaValidator` | 1.5 |
| `INV-C04` | Calificación | `Promedio = Σ(nota × peso)`, redondeado a 1 decimal. Pesos NO se normalizan | `CalificacionHelper` | 3.2 |
| `INV-C05` | Progresión | Siguiente grado = `GRA_Orden + 1`. Último grado (14) = egreso | Service de aprobación | 5.1, 4.2 |
| `INV-C06` | Horario | Superposición: `Inicio1 < Fin2 AND Fin1 > Inicio2` | Service de horarios | 6.2 |
| `INV-C07` | Horario | `HoraInicio < HoraFin` siempre (duración > 0) | Service + constraint BD | 6.1 |
| `INV-C08` | DiaSemana | C# `DayOfWeek.Sunday=0` → BD `7`. Fórmula: `(dow == 0) ? 7 : dow` | Helper/converter | 6.3 |
| `INV-C09` | Asistencia | Salida de **estudiante** antes de `13:55` en periodo regular se descarta silenciosamente (log `Information`, no crea registro). Profesores y verano no aplican | `CoherenciaHorariaValidator.Clasificar` → `MarcacionAccion.IgnorarSalidaTemprana` | 1.1, 1.5 |
| `INV-C10` | Asistencia | Entrada antes de `05:00` en periodo regular se descarta silenciosamente (ambos tipos persona). Verano no aplica | `CoherenciaHorariaValidator.Clasificar` → `MarcacionAccion.IgnorarAntesDeApertura` | 1.1, 1.5 |

---

### 15.5 Invariantes de Seguridad y Concurrencia

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-S01` | Auth | Cuenta inactiva (`Estado = false`) → login bloqueado | AuthService | 7.1 |
| `INV-S02` | Auth | Contraseña legacy se rehashea a BCrypt en login exitoso | `TryRehashAsync` transparente | 7.3 |
| `INV-S03` | Permisos | Permisos personalizados REEMPLAZAN (no se suman a) permisos del rol | `PermisosService` | 8.1 |
| `INV-S04` | Permisos | Permiso a ruta padre NO implica permiso a rutas hijas | Comparación exacta | 8.2 |
| `INV-S05` | Concurrencia | Conflicto de RowVersion → reintentar hasta 3 veces, luego propagar | `DbUpdateConcurrencyException` handler | 10.1 |
| `INV-S06` | Idempotencia | `X-Idempotency-Key` duplicado → 409 Conflict (no reprocesar) | `IdempotencyMiddleware` | 10.3 |
| `INV-S07` | Notificación | Error en notificación NUNCA falla la operación principal | Fire-and-forget pattern | 11.1 |
| `INV-S08` | Timezone | CrossChex webhook UTC+0 → convertir a UTC-5 antes de almacenar | `DateTimeOffset.Parse().ToOffset()` | 1.7 |

---

### 15.6 Invariantes de Asistencia por Curso

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-AC01` | AsistenciaCurso | Independiente de asistencia diaria — un estudiante presente en el colegio puede faltar a un curso | Modelo separado | 2.1 |
| `INV-AC02` | AsistenciaCurso | Profesor solo marca en cursos/horarios donde está asignado | Service valida ProfesorSalón + Horario | 2.2 |
| `INV-AC03` | AsistenciaCurso | No editable cuando el periodo está `CERRADO` | Service valida estado del periodo | 9.1 |

---

### 15.7 Invariantes de Vacacional

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-V01` | AprobacionEstudiante | Estudiante en sección "V" SIEMPRE tiene `AE_SalonOrigenId` apuntando a salón regular | Service de aprobación | 4.5 |
| `INV-V02` | Progresión | Progresión desde "V" SIEMPRE usa sección del salón original, nunca "V" | SalonCreationService | 4.5 |
| `INV-V03` | AprobacionEstudiante | Si V→V consecutivo, `AE_SalonOrigenId` preserva el primer salón regular | Service de aprobación | 4.5 |

---

### 15.8 Invariantes de Matrícula y Pago

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-M01` | EstudianteSalon | Un estudiante solo puede tener una matrícula activa por año | Unique filtered index + service | 14.2 |
| `INV-M02` | EstudianteSalon | `ANULADO`, `FINALIZADO` y `RETIRADO` son estados terminales | Service rechaza transiciones desde terminal | 14.2 |
| `INV-M03` | PagoMatricula | Un pago registrado NO puede eliminarse — solo anular matrícula | Convention + service | 14.2 |
| `INV-M04` | EstudianteSalon | `CONFIRMADO → CURSANDO` puede ser automática (batch) o manual | Service + job opcional | 14.2 |

---

### 15.9 Invariantes de Asistencia Admin (Edición Formal)

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-AD01` | Asistencia | Toda mutación sobre tabla `Asistencia` debe pasar por `IAsistenciaService` (webhook) o `IAsistenciaAdminService` (admin). Edición directa en BD prohibida en producción | Convention + code review | 1.8 |
| `INV-AD02` | Asistencia | Un registro con `ASI_OrigenManual = true` no puede ser sobrescrito por el webhook de CrossChex — se descarta silenciosamente | `AsistenciaService.RegistrarAsistencia()` | 1.9 |
| `INV-AD03` | CierreAsistenciaMensual | Operaciones de `AsistenciaAdminService` sobre fechas dentro de un mes con cierre activo lanzan `BusinessRuleException("ASISTENCIA_MES_CERRADO")` | `CierreAsistenciaService.EnsureFechaNoCerradaAsync()` | 1.10 |
| `INV-AD04` | CierreAsistenciaMensual | Un cierre mensual solo se desactiva por intervención explícita del Director con observación obligatoria (mín 10 chars) y queda auditado | `CierreAsistenciaService.RevertirCierreAsync()` + `[Authorize(Roles = "Director")]` | 1.10 |
| `INV-AD05` | Asistencia | `AsistenciaAdminService` envía correo diferenciado en cada operación, distinto del correo de marcación en tiempo real. Destinatarios polimórficos por `TipoPersona`: **E** → apoderado (`EST_CorreoApoderado`); **P** → profesor (`PRO_Correo`). Destinatario único (sin BCC). Sin correo del destinatario → se omite silenciosamente. | `EmailNotificationService.EnviarNotificacionAsistenciaCorreccion()` + `EnviarNotificacionAsistenciaCorreccionProfesor()`, vía `IAsistenciaAdminEmailNotifier`. Fire-and-forget (INV-S07). | 1.8 |
| `INV-AD06` | Asistencia | Un profesor no puede autojustificarse ni justificar/corregir asistencia de un colega profesor. Toda mutación sobre `AsistenciaPersona` con `TipoPersona = 'P'` requiere rol administrativo (Director, Asistente Administrativo, Promotor o Coordinador Académico). | `AsistenciaAdminController` con `[Authorize(Roles = Roles.Administrativos)]` (4 roles). Verificado por `AsistenciaAdminControllerAuthorizationTests` (6 tests por reflection). | 1.8 |

---

### 15.10 Invariantes de Reportes de Usuario

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-RU01` | ReporteUsuario | Un reporte en estado `RESUELTO` se conserva indefinidamente. La purga automática nunca lo elimina — es memoria institucional de fixes entregados | `ReporteUsuarioRepository.PurgarAntiguosAsync()` filtra `estado != RESUELTO` | 16 |
| `INV-RU02` | ReporteUsuario | Los reportes NO resueltos se purgan automáticamente a los 180 días vía Hangfire job diario (3:15 AM) | `ReporteUsuarioPurgeJob` + `HangfireExtensions` | 16 |
| `INV-RU03` | ReporteUsuario | El `REU_CorrelationId` adjunto a un reporte manual corresponde a la última request HTTP vista por el trace interceptor ANTES del submit — NUNCA incluye el id del POST del propio reporte | `RequestTraceFacade.trackLastRequestId()` + guard en `requestTraceInterceptor` sobre `/api/sistema/reportes-usuario` | 16 |
| `INV-RU04` | ReporteUsuario | Un submit duplicado del mismo usuario durante la misma apertura del dialog reusa la respuesta cacheada por `IdempotencyMiddleware` (TTL 24h). La key se regenera al cerrar y reabrir el dialog | `FeedbackReportFacade.currentIdempotencyKey` + `IdempotencyMiddleware` con scope `route:user:key` | 16 |
| `INV-RU05` | ReporteUsuario | El endpoint `POST /api/sistema/reportes-usuario` permite usuarios anónimos (pre-login). Si hay sesión, extrae DNI/rol/nombre de claims; si no, persiste `null` en esos campos y `REU_UsuarioReg = "Anónimo"` | `[AllowAnonymous]` + `ReportesUsuarioController.Crear()` + rate limit `"feedback"` (5/min por userId o IP) | 16 |
| `INV-RU06` | ReporteUsuario | Transiciones desde estado `RESUELTO` solo permiten volver a `NUEVO` (reapertura explícita) o mantenerse en `RESUELTO`. No se puede pasar directo `RESUELTO → EN_PROGRESO` | `ReporteUsuarioService.ActualizarEstadoAsync()` lanza `ConflictException("REPORTE_ESTADO_TERMINAL")` | 16 |
| `INV-RU07` | ReporteUsuario | El DNI del usuario se almacena enmascarado (`***1234`) en el DTO que el frontend consume. El valor crudo NUNCA se expone fuera del backend — solo se usa para logging enmascarado | `MaskDni()` helper aplicado en `ToListaDto` y `ToDetalleDto` | 16 |
| `INV-RU08` | ReporteUsuario | La notificación por correo al Director es fire-and-forget: un error al encolar NUNCA falla el insert del reporte | `ReporteUsuarioService.CrearAsync()` con try/catch alrededor de `EnviarNotificacionDirectoresAsync` + `IEmailOutboxService` | 16 |

---

### 15.12 Invariantes de Error Tracing

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-ET01` | ErrorLog | Todo error HTTP ≥ 400 (excepto 401/403) se persiste en `ErrorLog` con CorrelationId, URL, método, status code, DNI y rol | `GlobalExceptionMiddleware.PersistErrorFireAndForget()` filtra por status code | — |
| `INV-ET02` | ErrorLog | La persistencia de errores en `ErrorLog` es **fire-and-forget**: un fallo al persistir NUNCA falla la respuesta HTTP al cliente ni la operación principal. Aplica tanto a errores backend (middleware) como a errores frontend (endpoint `POST /api/sistema/errors`) y reportes de usuario | `GlobalExceptionMiddleware` + `ErrorLogController.ReportarError()` + `ReportesUsuarioController.Crear()` — todos con try/catch que loguean `LogWarning` y continúan | — |

---

### 15.13 Invariantes de Asignación Profesor-Salón-Curso

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-AS01` | Horario | Salones con `GRA_Orden ≤ 7` (excluye sección V): el profesor del horario debe ser el `ProfesorSalon` tutor (`PRS_EsTutor = true`) del salón | `TutorPlenoValidator` en `HorarioAsignacionService` + `HorarioService.UpdateAsync`. Error: `INV_AS01_TUTOR_PLENO` | 5.4 |
| `INV-AS02` | Horario | Salones con `GRA_Orden ≥ 8` (excluye sección V): el profesor del horario debe tener entrada activa en `ProfesorCurso` para ese curso y año | `ProfesorCursoValidator` en `HorarioAsignacionService` + `HorarioService.UpdateAsync`. Error: `INV_AS02_PROFESOR_CURSO` | 5.4 |
| `INV-AS03` | ProfesorSalon | En modo tutor pleno, el profesor dicta todos los cursos del grado vía `CursoGrado` | Convención (no enforced en runtime). Deuda técnica menor | 5.4 |
| `INV-AS04` | ProfesorSalon | Un tutor activo de un salón tutor pleno con horarios activos no puede desactivarse sin reemplazo | `ProfesorStrategy.CambiarEstadoAsync`. Error: `TUTOR_PLENO_CON_HORARIOS` | 5.4 |
| `INV-AS05` | Salon | Un salón tutor pleno con horarios activos no puede eliminarse | `SalonesService.EliminarAsync`. Error: `SALON_TUTOR_PLENO_CON_HORARIOS` | 5.4 |

**Auditoría** (2026-04-16): Queries ejecutadas en ambas BDs (test + producción). **0 violaciones** INV-AS01/AS02. Los datos existentes cumplen los invariantes.

---

### 15.11 Cómo Usar Este Registro

**En code reviews**: Verificar que el código no viola ningún `INV-*`. Si una PR introduce una operación sobre Horarios, revisar `INV-U03`, `INV-U04`, `INV-U05`, `INV-C06`, `INV-C07`.

**En bug reports**: Referenciar el ID de la invariante violada. Ejemplo: "Bug: se creó horario superpuesto, violando `INV-U03`".

**En nuevas features**: Antes de implementar, listar qué invariantes aplican y verificar que el diseño las respeta.

**En logs de error**: Cuando el backend rechaza una operación por invariante, incluir el ID: `BusinessRuleException("INV-T02: No se puede aprobar con periodo ABIERTO")`.

---

## 16. Reportes de Usuario (Feedback Manual)

> **"El usuario tiene la última palabra sobre lo que funciona y lo que no."**

Los reportes de usuario son un canal **manual** y **complementario** al sistema automático de trazabilidad de errores (sección "Trazabilidad de Errores" + tabla `ErrorLog`). Mientras la trazabilidad captura lo que el sistema detecta como fallo, los reportes de usuario capturan lo que el usuario **vive** — problemas de UX, datos incoherentes, propuestas de mejora, frustraciones que el código nunca va a saber que existen.

### 16.1 Arquitectura

```
Usuario → FAB (Ctrl+Alt+F o botón flotante persistente)
       ↓
   FeedbackReportDialog (global en intranet-layout)
       ↓ POST /api/sistema/reportes-usuario + X-Idempotency-Key
   ReportesUsuarioController [AllowAnonymous] [RateLimit "feedback"]
       ↓
   ReporteUsuarioService
       ├─ Validar tipo contra ReporteUsuarioTipos.Validos
       ├─ Persistir en REU_ReporteUsuario (enmascarando DNI)
       └─ Fire-and-forget: EmailOutbox → Directores activos
```

### 16.2 Tipos de reporte (17 categorías)

Agrupados por concepto de usuario, no por módulo técnico:

| Grupo | Tipos |
|-------|-------|
| **Rendimiento** | `PAGINA_LENTA`, `WEB_LENTA`, `FALLO_ACTUALIZAR` |
| **Datos** | `INCONSISTENCIA_DATOS`, `DATOS_INVALIDOS`, `DATOS_VIEJOS` |
| **Recursos/archivos** | `ENLACE_ROTO`, `PDF_NO_GENERA`, `EXCEL_MAL_GENERADO`, `RECURSOS_NO_VISIBLES` |
| **Visual** | `ERROR_VISUAL_PC`, `ERROR_VISUAL_MOVIL` |
| **UX** | `FORMULARIO_INEFICIENTE`, `NAVEGACION_CONFUSA`, `CONTENIDO_DESORDENADO`, `EXCESO_MODALES` |
| **Servidor** | `ERROR_SERVIDOR` |

**Fuente única de verdad**: `Educa.API/Constants/Sistema/ReporteUsuarioTipos.cs`. El frontend replica el catálogo con labels amigables en `core/services/feedback/feedback-report.tipos.ts`. Si se agrega un tipo nuevo, se actualizan ambos archivos en el mismo PR.

### 16.3 Máquina de estados

```
NUEVO ──→ REVISADO ──→ EN_PROGRESO ──→ RESUELTO (terminal salvo reapertura)
   │          │             │
   └──────────┴─────────────┴──→ DESCARTADO (terminal)
                                        ↑
                            RESUELTO ──→ NUEVO (reapertura explícita)
```

| Estado | Significado | Transiciones permitidas |
|--------|-------------|------------------------|
| `NUEVO` | Default al crear | → `REVISADO` · → `EN_PROGRESO` · → `RESUELTO` · → `DESCARTADO` |
| `REVISADO` | El admin lo vio y confirmó que es válido | → `EN_PROGRESO` · → `RESUELTO` · → `DESCARTADO` |
| `EN_PROGRESO` | Hay un fix en camino | → `RESUELTO` · → `DESCARTADO` |
| `RESUELTO` | Fix entregado | → `NUEVO` (reapertura manual del admin — regreso del infierno permitido una sola vez) |
| `DESCARTADO` | No aplica, duplicado, fuera de alcance | Estado terminal |

**Precondiciones**:
- Cualquier cambio de estado requiere rol `Administrativos` (Director o Asistente Administrativo).
- `ActualizarEstadoAsync` valida `RowVersion` para prevenir conflictos de concurrencia con optimistic locking.

### 16.4 Correlación con trazabilidad automática

Un reporte manual puede opcionalmente llevar un `correlationId` que apunta a la última request HTTP vista por el cliente **justo antes** del envío del reporte. Esto permite cruzar:

1. **Reporte de usuario** ("los datos no cargan") → `REU_CorrelationId`
2. **Request HTTP del cliente** (headers `X-Request-Id`) → logs del `CorrelationIdMiddleware`
3. **Error automático** (si lo hubo) → `ErrorLog.ERL_CorrelationId`

Con los tres IDs iguales, el desarrollador puede reconstruir qué vio el usuario, qué hizo el backend y qué salió mal en menos de un minuto.

**Regla**: El trace interceptor (frontend) llama `RequestTraceFacade.trackLastRequestId()` en todas las requests **excepto** las del propio endpoint `/api/sistema/reportes-usuario` — si no, el id del POST del reporte pisaría el id de la request que el usuario quería reportar.

### 16.5 Idempotencia

El dialog genera un `X-Idempotency-Key` (UUID) al abrirse y lo reusa en todos los submits mientras el dialog esté abierto. El `IdempotencyMiddleware` global lo atrapa y cachea la respuesta por 24h con scope `route:user:key`.

**Resultado**: doble clic, reintento de red o submit mientras el primero está en vuelo → el backend devuelve la respuesta del primer submit sin crear un duplicado.

**Regeneración**: al cerrar el dialog (`close()`) la key se descarta. La siguiente apertura genera una nueva — el usuario puede legítimamente enviar dos reportes distintos en dos aperturas distintas.

### 16.6 Retención y purga

| Estado | Retención |
|--------|-----------|
| `RESUELTO` | **Indefinida** — memoria institucional de fixes entregados |
| `NUEVO`, `REVISADO`, `EN_PROGRESO`, `DESCARTADO` | **180 días** desde `FechaReg` |

El job `ReporteUsuarioPurgeJob` corre diariamente a las 3:15 AM (zona Lima) y ejecuta `DELETE WHERE FechaReg < cutoff AND Estado != 'RESUELTO'`. No hay soft-delete — a diferencia del resto del sistema, aquí sí borramos físicamente porque no hay FK ni dependientes.

### 16.7 Notificación al admin

Al crear un reporte, `ReporteUsuarioService.CrearAsync()` encola un correo via `IEmailOutboxService.EnqueueAsync()` con:
- **Destinatario**: primer director activo con correo
- **BCC**: resto de directores activos con correo
- **Tipo outbox**: `"REPORTE_USUARIO"`
- **Entidad origen**: `"ReporteUsuario"` + `REU_CodID` (trazabilidad en la bandeja admin)

Un error al encolar se loguea como `LogWarning` pero NO falla el insert del reporte (fire-and-forget — INV-RU08).

### 16.8 Privacidad

- `REU_UsuarioDni` se almacena completo en BD (para auditoría admin) pero **siempre se enmascara** en DTOs que llegan al frontend (`***1234`).
- El `DniHelper.Mask()` del proyecto no se usa aquí — el service tiene su propio `MaskDni()` porque los reportes anónimos devuelven `"***"` sin los últimos 4 dígitos.
- `REU_Descripcion` y `REU_Propuesta` tienen un cap de 2000 caracteres — suficiente para contexto pero no para un data dump accidental.
- Al ser `[AllowAnonymous]`, los reportes pre-login no tienen DNI — el registro queda como `REU_UsuarioReg = "Anónimo"` y los campos de usuario en `null`.

---

## 17. Reportes exportables — paridad de formatos

> **"Todo endpoint BE o acción de UI que exporta un reporte en PDF DEBE ofrecer también la versión Excel equivalente."**

Aplica a reportes nuevos y mantiene la paridad en los 14 existentes hoy (detalle en
`.claude/plan/maestro.md` — Plan 25). Rule of thumb al agregar un reporte nuevo:

1. El controller BE agrega **2 endpoints** mirror: `/foo/pdf` y `/foo/excel`. Ambos
   consumen el mismo data service con los mismos parámetros de filtro.
2. El UI del FE agrega **un menú único** con 3 items — `Ver PDF`, `Descargar PDF`,
   `Descargar Excel` — vía el helper `buildPdfExcelMenuItems`
   (`consolidated-pdf.helper.ts`) o el equivalente por feature.
3. Los tests BE verifican que ambos endpoints retornan el content-type correcto
   (`application/pdf` vs `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
   y consumen el mismo data service con los mismos args (paridad estructural).
4. La paridad fila-a-fila se garantiza estructuralmente porque los services PDF
   y Excel reciben el mismo DTO del mismo data service.

### 17.1 Excepciones

**Excepción única**: layout puramente tipográfico sin datos tabulares (ej:
certificados, diplomas). Ningún reporte actual entra en esta excepción. Un
reporte con tablas, listas o datos repetitivos por fila queda dentro de la
regla sin ambigüedad.

### 17.2 Consecuencia de romper la regla

Director/Admin re-transcribe datos del PDF al Excel a mano — señal inequívoca
de que hay que abrir un chat para agregar el endpoint faltante.

### 17.3 Inventario actual (Plan 25, cerrado)

| Controller BE | Endpoints `/pdf` | Endpoints `/excel` |
|---------------|-----------------|-------------------|
| `ReportesAsistenciaController` | 1 | 1 |
| `BoletaNotasController` | 2 | 2 |
| `ConsultaAsistenciaController` | 11 | 11 |
| **Total** | **14** | **14** |

Las 5 páginas FE migradas en Chat 3 que exponen los 3 items del menú:

- `estadisticas-dia` (cross-role attendance)
- `attendance-director-estudiantes`
- `attendance-director-profesores`
- `attendance-profesor-estudiantes`
- `attendance-reports` (facade `exportarExcel` delega al endpoint BE, reemplazando el Excel client-side ExcelJS previo)

### 17.4 Invariantes

| ID | Invariante | Enforcement |
|----|-----------|-------------|
| `INV-RE01` | Todo endpoint controller que termina en `/pdf` tiene su mirror `/excel` (salvo excepción §17.1). El mirror consume el mismo data service con los mismos args. | Tests `*ExcelEndpointTests` en `Educa.API.Tests/Controllers/` |
| `INV-RE02` | Todo endpoint `/excel` retorna `File(bytes, ExcelHelpers.ContentTypeXlsx, "...xlsx")`. Content-type y extensión consistentes, sin variaciones. | Tests contract por endpoint + constante única en `Services/Excel/ExcelHelpers.cs` |
| `INV-RE03` | Cada acción de UI que descarga PDF expone también `Descargar Excel` en el mismo menú de 3 items. El default sigue siendo `Ver PDF` (no invertir el orden). | Smoke tests sobre el helper `buildPdfExcelMenuItems` + por componente |

---

## Checklist: Antes de Implementar una Feature de Backend

```
STATE MACHINE (Sección 14)
[ ] ¿La entidad tiene estados? → Verificar diagrama en 14.x
[ ] ¿La transición solicitada está en la tabla de transiciones válidas?
[ ] ¿Se valida el estado ACTUAL desde BD (no confiar en frontend)?
[ ] ¿Se cumplen las precondiciones de la transición?
[ ] ¿Hay efectos colaterales? → Ejecutar en transacción
[ ] ¿Se logea la transición? (estado anterior → nuevo + quién + cuándo)

INVARIANTES (Sección 15)
[ ] ¿Qué INV-* aplican a esta feature? (listar IDs)
[ ] ¿El diseño respeta cada invariante listada?
[ ] ¿Los errores por invariante incluyen el ID? (ej: "INV-T02: ...")
[ ] ¿Hay invariantes nuevas que agregar al registro?

REGLAS DE NEGOCIO
[ ] ¿Hay ventanas de tiempo o plazos que limiten operaciones?
[ ] ¿Quién puede ejecutar esta operación? (rol + permisos)
[ ] ¿Hay conflictos posibles? (concurrencia, doble reserva, duplicados)
[ ] ¿La operación afecta otras entidades? (transacción necesaria)
[ ] ¿Hay cálculos con fórmulas definidas? (promedios, estados)

CONSISTENCIA
[ ] ¿Se respeta soft-delete? (toggle estado, no DELETE) — INV-D03
[ ] ¿Se audita? (UsuarioReg/Mod, FechaReg/Mod) — INV-D02
[ ] ¿Se maneja concurrencia? (RowVersion, retry) — INV-S05
[ ] ¿Es idempotente? (X-Idempotency-Key) — INV-S06

BATCH
[ ] ¿La operación procesa múltiples ítems? → Usar BatchCommandExecutor
[ ] ¿Cada ítem necesita su propia transacción? (progreso parcial)
[ ] ¿Se requiere audit granular por ítem? → CommandAuditLog
[ ] ¿Se creó Command + Handler + registro en DI?

VACACIONAL (Sección 4.5)
[ ] ¿La operación involucra sección "V"? → Verificar INV-V01, INV-V02, INV-V03
[ ] ¿Se preserva AE_SalonOrigenId al progresar desde/hacia "V"?
[ ] ¿La progresión post-vacacional usa la sección original, no "V"?

MATRÍCULA Y PAGO (Sección 14.2)
[ ] ¿La transición de matrícula está en la tabla de estados válidos?
[ ] ¿Se valida INV-M01? (una matrícula activa por año)
[ ] ¿El pago tiene monto > 0, método y comprobante?
[ ] ¿Los pagos son inmutables? (anular, no editar) — INV-M03

NOTIFICACIONES
[ ] ¿Debe notificar en tiempo real? (SignalR)
[ ] ¿Debe enviar email? (fire-and-forget)
[ ] ¿La notificación es NO bloqueante? — INV-S07

REPORTES EXPORTABLES (Sección 17)
[ ] ¿La feature agrega un endpoint que exporta PDF? → Agregar también `/excel` mirror — INV-RE01
[ ] ¿Ambos endpoints consumen el mismo data service con los mismos args?
[ ] ¿El endpoint `/excel` retorna `File(bytes, ExcelHelpers.ContentTypeXlsx, "...xlsx")`? — INV-RE02
[ ] ¿El UI del FE expone un menú de 3 items (`Ver PDF` / `Descargar PDF` / `Descargar Excel`)? — INV-RE03
[ ] ¿Hay tests contract (`*ExcelEndpointTests.cs`) por cada endpoint nuevo?
```
