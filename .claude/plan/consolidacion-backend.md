# Plan de Consolidacion Backend

> **Fecha**: 2026-04-13
> **Objetivo**: Limpiar la arquitectura interna sin romper la estabilidad operativa
> **Principio rector**: "Backend confiable operativamente, todavia no del todo limpio arquitectonicamente"
> **Horizonte**: 3-6 meses, trabajo incremental
> **Repo**: Educa.API — branch `master`

---

## Diagnostico Actual (datos reales)

| Metrica | Valor | Evaluacion |
|---------|-------|------------|
| Tests | 699 pasando, 47 archivos de test | Fuerte — red de seguridad real |
| Services | 141 implementaciones | Algunos concentran demasiadas responsabilidades |
| Repositories | 76 | Algunos gordos (ConsultaAsistencia 427 ln, Usuarios 425 ln, Campus 421 ln) |
| Controllers | 44 | Uno gordo: ConsultaAsistenciaController 400 ln |
| Interfaces | 120 (68 de services) | 141 impls vs 68 interfaces = ~73 services sin interfaz formal |
| Archivos >300 lineas | 15+ | Concentrados en Asistencias y Campus |
| CI backend | No existe | Frontend tiene CI, backend no |

### Los 15 archivos .cs mas grandes (>300 lineas)

| Lineas | Archivo | Tipo |
|--------|---------|------|
| 649 | Services/Asistencias/PermisoSaludService.cs | Service |
| 638 | Services/Asistencias/AsistenciaPdfComposer.cs | Service |
| 528 | Tests/AsistenciaEstadoCalculadorTests.cs | Test (OK) |
| 512 | Services/Asistencias/AsistenciaAdminService.cs | Service |
| 487 | Services/Asistencias/AsistenciaService.cs | Service |
| 441 | Services/Asistencias/ReporteFiltradoAsistenciaService.cs | Service |
| 427 | Repositories/Asistencias/ConsultaAsistenciaRepository.cs | Repository |
| 425 | Services/Asistencias/ReporteFiltradoPdfService.cs | Service |
| 425 | Repositories/Usuarios/UsuariosRepository.cs | Repository |
| 421 | Repositories/Campus/CampusRepository.cs | Repository |
| 416 | Services/Campus/CampusService.cs | Service |
| 407 | Tests/AsistenciaServiceTests.cs | Test (OK) |
| 400 | Controllers/Asistencias/ConsultaAsistenciaController.cs | Controller |
| 396 | Services/Asistencias/ReporteAsistenciaDataService.cs | Service |
| 389 | Services/Asistencias/ReporteAsistenciaConsolidadoPdfService.cs | Service |

### Observacion clave

**Asistencias domina la deuda**: 9 de los 15 archivos mas grandes son del dominio Asistencias.
Esto no es casualidad — Asistencias tiene 4 subdominios (Diaria, Curso, Admin, Reportes) con
logica compleja de ventanas horarias, coherencia biometrica, y generacion de PDFs.

---

## Fase 1 — Dividir Services Gordos (semanas 1-4)

> **Problema**: La regla propia dice max 300 lineas por archivo .cs. 8+ services la violan.
> **Objetivo**: Ningun service >300 lineas. Dividir por responsabilidad, no por tamano arbitrario.
> **Esfuerzo**: ~12-18 horas total (1-2 services por sesion)

### Estado actual

- Branch de trabajo: `refactor/split-services-fase1` en `Educa.API` (mergeable a `master`)
- Prioridades 1, 2, 3, 4 COMPLETADAS — commits `107d758`, `aaf89c8`, `30f1290`, `ed24566`
- Prioridad 5 pendiente (ReporteFiltradoAsistenciaService 441 ln)
- ~2286 líneas refactorizadas hasta ahora (649 + 638 + 512 + 487). Tests: 699/699 estable en cada commit.

### Convenciones aplicadas (seguir en los siguientes splits)

- **Patron fachada**: mantener el service original como fachada que delega. Preserva `IXxxService` -> controller y tests intactos.
- **Subcarpeta por dominio**: `Services/Asistencias/{Dominio}/` agrupa los splits. Ej: `Services/Asistencias/PermisoSalud/`.
- **Interface por servicio nuevo**: `Interfaces/Services/Asistencias/IXxx.cs`.
- **Registro DI**: orden = helpers primero, servicios especializados, fachada ultimo en `Extensions/ServiceExtensions.cs`.
- **Namespaces**: `BusinessRuleException` y `NotFoundException` viven en `Educa.API.Exceptions.Http` (no en `Educa.API.Exceptions`).
- **Un commit por service dividido**: commit message `refactor({dominio}): split N-line service into K focused services`.

### Estrategia de division por servicio

#### PermisoSaludService.cs (649 ln) — Prioridad 1 — COMPLETADO (commit 107d758)

**Division aplicada** (diferente a la propuesta original: se divide por recurso, no por validacion/query):

| Archivo | Lineas | Rol |
|---------|--------|-----|
| `Services/Asistencias/PermisoSaludService.cs` (fachada) | 54 | Delega a los 5 servicios |
| `Services/Asistencias/PermisoSalud/PermisoSaludAuthorizationHelper.cs` | 69 | Auth + helpers compartidos (ValidarAutorizacion, EsAdmin, ObtenerEstudianteConSede, ObtenerEstudianteIdsDeSalon, ObtenerNombreEmisor) |
| `Services/Asistencias/PermisoSalud/PermisoSaludEmailNotifier.cs` | 75 | Correos al apoderado (permiso salida + justificacion) |
| `Services/Asistencias/PermisoSalud/PermisoSaludQueryService.cs` | 197 | Reads: ObtenerResumen, ListarEstudiantes, ValidarFechas, ObtenerSintomas, ListarSalones |
| `Services/Asistencias/PermisoSalud/PermisoSaludSalidaService.cs` | 148 | CRUD permiso de salida (mismo dia) |
| `Services/Asistencias/PermisoSalud/JustificacionSaludService.cs` | 228 | CRUD justificacion medica (otros dias) |

Build limpio, 699/699 tests.

#### AsistenciaPdfComposer.cs (638 ln) — Prioridad 2 — COMPLETADO (commit aaf89c8)

**Analisis real**: No es un service con responsabilidades mezcladas — es un static helper class
puro (sin estado, sin DI). La division por Layout/Data no aplicaba. Se dividio por tipo de
seccion PDF usando `partial class static`, preservando la API publica (cero cambios en los 3
consumers: `ReporteFiltradoPdfService`, `ReporteAsistenciaSalonPdfService`,
`ReporteAsistenciaConsolidadoPdfService`).

**Division aplicada** en `Services/Asistencias/AsistenciaPdf/`:

| Archivo (partial) | Lineas | Contenido |
|-------------------|--------|-----------|
| `AsistenciaPdfComposer.Colors.cs` | 127 | PdfColorScheme + esquemas (Blue/Green/...) + ColorEstado/Bg + NivelAsistencia + ComposeLeyendaAsistencia |
| `AsistenciaPdfComposer.StatCards.cs` | 62 | ComposeStatCard + ComposeStatRow |
| `AsistenciaPdfComposer.StudentSections.cs` | 84 | ComposeStudentSection (tabla genérica parametrizada) |
| `AsistenciaPdfComposer.DiarioSections.cs` | 193 | SectionAsistieronATiempo + SectionLlegaronTarde + SectionJustificados + SectionNoAsistieron |
| `AsistenciaPdfComposer.RangoSections.cs` | 167 | SectionRangoSimple + SectionRangoJustificados + ComposeContentConsolidadoRango + ComposeSalonResumenRango |
| `AsistenciaPdfComposer.Footer.cs` | 35 | ComposeFooter |

Build limpio, 699/699 tests.

**Aprendizaje**: cuando un archivo grande es un helper estatico sin estado, `partial class`
es mejor que fachada porque no requiere interfaces ni DI y los callers no cambian.

#### AsistenciaAdminService.cs (512 ln) — Prioridad 3 — COMPLETADO (commit 30f1290)

**Division aplicada** (mas granular que la propuesta original — 5 services por responsabilidad):

| Archivo | Lineas | Rol |
|---------|--------|-----|
| `Services/Asistencias/AsistenciaAdminService.cs` (fachada) | 63 | Delega a los 5 services |
| `Services/Asistencias/AsistenciaAdmin/AsistenciaAdminValidator.cs` | 44 | Validar estudiante activo + sede activa (helpers compartidos) |
| `Services/Asistencias/AsistenciaAdmin/AsistenciaAdminEmailNotifier.cs` | 76 | Correos correccion/eliminacion background (INV-AD05, INV-S07) |
| `Services/Asistencias/AsistenciaAdmin/AsistenciaAdminCrudService.cs` | 280 | 5 operaciones CRUD + CargarDto + CombinarObservacion |
| `Services/Asistencias/AsistenciaAdmin/AsistenciaAdminQueryService.cs` | 32 | Lecturas (listar dia, estadisticas, estudiantes) |
| `Services/Asistencias/AsistenciaAdmin/AsistenciaAdminBulkEmailService.cs` | 89 | Envio masivo de marcacion |

Cada service con interfaz en `Interfaces/Services/Asistencias/`. DI registrada helpers -> services -> fachada.
Build limpio, 699/699 tests.

#### AsistenciaService.cs (487 ln) — Prioridad 4 — COMPLETADO (commit ed24566)

**Division aplicada** (2 sub-services + fachada; webhook se mantuvo en la fachada por tamaño pequeño y dependencia circular con `IAsistenciaService`):

| Archivo | Lineas | Rol |
|---------|--------|-----|
| `Services/Asistencias/AsistenciaService.cs` (fachada) | 289 | Orquesta `RegistrarAsistencia` (INV-AD02, INV-C03 via `CoherenciaHorariaValidator`) + webhook (INV-S08) + `ResolverSedeIdPorNombreAsync` |
| `Services/Asistencias/Registro/AsistenciaMarcacionExecutor.cs` | 166 | 5 mutaciones: CrearEntrada, CrearSalidaSinEntrada, ReemplazarEntrada, ConvertirEntradaEnSalida, CompletarSalida — con `ConcurrencyRetry` (INV-S05) |
| `Services/Asistencias/Registro/AsistenciaNotificationDispatcher.cs` | 70 | SignalR + email outbox fire-and-forget (INV-S07) |

**Nota**: subcarpeta nombrada `Registro/` (no `Asistencia/`) para evitar colisión de namespace con el tipo `Models.Asistencias.Asistencia`.
Tests actualizados: componen sub-services reales sobre los mismos mocks `repo/channel/email`. 699/699 tests pasando.

#### ReporteFiltradoAsistenciaService.cs (441 ln) — Prioridad 5

**Division propuesta**: Separar query builder de formatter.

#### Resto (ReporteFiltradoPdfService, ReporteAsistenciaDataService, ReporteAsistenciaConsolidadoPdfService)

Misma estrategia: separar data retrieval de formatting/rendering.

### Orden de ejecucion

1. PermisoSaludService — COMPLETADO (commit 107d758)
2. AsistenciaPdfComposer — COMPLETADO (commit aaf89c8)
3. AsistenciaAdminService — COMPLETADO (commit 30f1290)
4. AsistenciaService — COMPLETADO (commit ed24566)
5. ReporteFiltradoAsistenciaService (441 ln) — SIGUIENTE
6. Resto (ReporteFiltradoPdfService, ReporteAsistenciaDataService, ReporteAsistenciaConsolidadoPdfService): incremental al tocar el archivo

### Para retomar en chat nuevo

Prompt sugerido:

> Continuar Fase 1 del plan `consolidacion-backend.md`. Ya se dividieron `PermisoSaludService` (107d758), `AsistenciaPdfComposer` (aaf89c8), `AsistenciaAdminService` (30f1290) y `AsistenciaService` (ed24566) en branch `refactor/split-services-fase1`. Siguiente: dividir `Educa.API/Services/Asistencias/ReporteFiltradoAsistenciaService.cs` (441 ln) — separar query builder de formatter. Aplicar patron fachada. Verificar build + 699 tests despues.

Pasos del flujo:
1. Verificar que el repo `Educa.API` esta en branch `refactor/split-services-fase1` y limpio (`git status`)
2. Leer el archivo completo y analizar que responsabilidades mezcla
3. Proponer division (N servicios + fachada) al usuario antes de ejecutar
4. Crear interfaces en `Interfaces/Services/Asistencias/`
5. Crear implementaciones en `Services/Asistencias/AsistenciaPdf/` (subcarpeta por dominio)
6. Reducir el service original a fachada que delega
7. Registrar en `Extensions/ServiceExtensions.cs` (helpers -> servicios -> fachada)
8. `dotnet build` + `dotnet test` verde
9. Commit: `refactor({dominio}): split N-line service into K focused services`

### Reglas de la division

- **Cada nuevo servicio tiene interfaz** (IXxxService) — sin excepciones
- **Registrar en DI** inmediatamente (Program.cs)
- **Los 699 tests deben seguir pasando** despues de cada division
- **No cambiar comportamiento** — solo mover codigo entre archivos
- **Un PR por division** — facil de revisar y revertir

### Criterio de completitud

- [x] PermisoSaludService dividido (commit 107d758)
- [x] AsistenciaPdfComposer dividido (commit aaf89c8)
- [x] AsistenciaAdminService dividido (commit 30f1290)
- [x] AsistenciaService dividido (commit ed24566)
- [ ] ReporteFiltradoAsistenciaService dividido
- [ ] Ningun service de feature >300 lineas
- [ ] Cada nuevo servicio con interfaz registrada en DI
- [ ] 699 tests siguen pasando
- [ ] Archivos de test actualizados si cambian nombres de clases

---

## Fase 2 — Dividir Repositories Gordos (semanas 3-5)

> **Problema**: 3 repositories superan 300 lineas. Repositories no deben tener logica.
> **Objetivo**: Repositories <300 lineas, solo queries.
> **Esfuerzo**: ~4-6 horas

### Repositories a dividir

| Repository | Lineas | Estrategia |
|-----------|--------|------------|
| ConsultaAsistenciaRepository.cs | 427 | Dividir por tipo de consulta: diaria, reportes, estadisticas |
| UsuariosRepository.cs | 425 | Dividir por rol: queries de lista, queries de detalle, queries de busqueda |
| CampusRepository.cs | 421 | Dividir: campus-spatial (queries 3D), campus-data (CRUD basico) |

### Verificar que NO tienen logica de negocio

Al dividir, auditar que los repositories solo tengan:
- Queries LINQ
- AsNoTracking() en reads
- CRUD basico

Si se encuentra logica de negocio → moverla al service correspondiente.

### Criterio de completitud

- [ ] 3 repositories divididos
- [ ] Ninguno >300 lineas
- [ ] Sin logica de negocio en ningun repository
- [ ] Tests pasando

---

## Fase 3 — Adelgazar ConsultaAsistenciaController (semana 4)

> **Problema**: Controller de 400 lineas. "El controller es un cartero, no un ingeniero."
> **Objetivo**: Controller <150 lineas. Solo routing + auth + delegacion.
> **Esfuerzo**: ~2-3 horas

### Diagnostico probable

Un controller de 400 lineas casi seguro tiene:
- Mapping de DTOs (deberia estar en service)
- Logica de filtrado/validacion (deberia estar en service)
- Construccion de responses complejas (deberia estar en service)

### Estrategia

1. Leer el controller completo
2. Identificar todo lo que no sea routing/auth/delegacion
3. Mover a ConsultaAsistenciaService (o crear nuevos services si ya es gordo)
4. Controller queda como: recibir request → validar auth → llamar service → retornar ApiResponse

### Criterio de completitud

- [ ] Controller <150 lineas
- [ ] Solo tiene: [HttpGet/Post], obtener claims, llamar service, retornar Ok/BadRequest
- [ ] Toda logica movida a service con interfaz
- [ ] Tests pasando

---

## Fase 4 — Interfaces Faltantes (semanas 4-6)

> **Problema**: 141 implementaciones vs 68 interfaces de service = ~73 services sin contrato formal.
> **Objetivo**: Todo service con interfaz. Facilita testing y DI.
> **Esfuerzo**: ~6-8 horas (incremental)

### Estrategia

1. Listar services sin interfaz: `grep -rL "IXxx" Services/` cruzado con `ls Interfaces/Services/`
2. Priorizar por importancia: services de dominio core > services auxiliares > helpers
3. Crear interfaz + registrar en DI

### Reglas

- Interfaz va en `Interfaces/Services/{Subdominio}/`
- Nombre: `I{NombreService}`
- Solo metodos publicos en la interfaz
- Registrar como `AddScoped<IService, Service>()` en Program.cs

### Criterio de completitud

- [ ] Audit ejecutado: lista completa de services sin interfaz
- [ ] Services de dominio core (Asistencias, Academico, Auth) todos con interfaz
- [ ] Al crear service nuevo: interfaz obligatoria (code review)

---

## Fase 5 — CI Pipeline Backend (semanas 5-7)

> **Problema**: Frontend tiene CI, backend no. Codigo roto puede llegar a master.
> **Objetivo**: dotnet build + dotnet test obligatorios en PR.
> **Esfuerzo**: ~2-3 horas

### Pipeline propuesto

```yaml
# .github/workflows/ci-backend.yml
name: CI Backend
on:
  push:
    branches: [master]
    paths: ['Educa.API/**']
  pull_request:
    branches: [master]
    paths: ['Educa.API/**']

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup-dotnet (9.0)
      - dotnet restore
      - dotnet build --no-restore --configuration Release
      - dotnet test --no-build --configuration Release
```

### Consideraciones

- Trigger solo en cambios a `Educa.API/` (no en cambios de frontend)
- Sin conexion a BD real en CI — los 699 tests deben poder correr con mocks/in-memory
- Si tests requieren SQL Server → agregar service container con SQL Server en CI
- Branch protection: PR a master requiere CI verde

### Criterio de completitud

- [ ] Workflow creado y funcionando
- [ ] Build + test pasan en CI
- [ ] PR a master no mergeable sin CI verde

---

## Fase 6 — Separacion de Responsabilidades en Services (semanas 6-10)

> **Problema**: Services mezclan validacion + coordinacion + mapping + queries.
> **Objetivo**: Cada service tiene un rol claro segun la taxonomia backend.md.
> **Esfuerzo**: ~10-15 horas (incremental, 1-2 services por sesion)

### Patron a aplicar

Cuando un service gordo hace 3+ cosas:

```
Antes:
  MiService.cs (400 ln)
    - Valida DTOs
    - Llama repositories
    - Mapea entidades a DTOs
    - Coordina transacciones
    - Calcula reglas de negocio

Despues:
  MiService.cs (150 ln) — orquestacion
  MiValidationService.cs (80 ln) — validaciones de negocio
  MiMappingExtensions.cs (60 ln) — extension methods de mapping
  MiBusinessRulesService.cs (100 ln) — calculos de dominio (si aplica)
```

### Services candidatos (por audit de la Fase 1)

Los services divididos en Fase 1 probablemente necesiten refinamiento adicional.
Ademas, auditar los servicios de 200-300 lineas que esten cerca del limite:

| Dominio | Services a revisar |
|---------|-------------------|
| Academico | AprobacionEstudianteService, HorarioAsignacionService, CursosService |
| Auth | AuthService (verificar que solo coordina, no valida) |
| Usuarios | UsuariosService |
| Comunicacion | ConversacionesService |

### Criterio de completitud

- [ ] Top 10 services auditados por separacion de responsabilidades
- [ ] Mapping extraido a extension methods donde aplique
- [ ] Validaciones de negocio en services dedicados donde aplique
- [ ] Tests actualizados para nuevos services

---

## Fase 7 — Preparacion para Matricula (semanas 10-14)

> **Problema**: Matricula es la feature mas compleja del roadmap. Toca el nucleo Salon.
> **Objetivo**: Service layer de matricula implementado y testeado ANTES de la UI.
> **Esfuerzo**: ~15-20 horas

### Prerequisitos (deben estar completos)

- [ ] Fase 1: AsistenciaService y AsistenciaAdminService divididos (tocan las mismas entidades)
- [ ] Fase 4: Interfaces de services de Salon y EstudianteSalon existen
- [ ] Fase 5: CI backend activo

### Implementacion (backend first, UI despues)

#### 7.1 Modelo y BD

El modelo PagoMatricula y el campo ESS_EstadoMatricula ya estan definidos en business-rules.md (seccion 14.2).

| Paso | Que hacer |
|------|-----------|
| 1 | Crear modelo PagoMatricula.cs con campos de business-rules.md |
| 2 | Crear constantes MetodosPago.cs y EstadosMatricula.cs |
| 3 | Preparar script SQL (ALTER TABLE + nueva tabla) — MOSTRAR AL USUARIO |
| 4 | Agregar DbSet<PagoMatricula> al ApplicationDbContext |
| 5 | Configurar EF: indices, FK, constraints |

#### 7.2 Service layer con state machine

| Servicio | Responsabilidad |
|----------|-----------------|
| MatriculaService | Orquestacion de transiciones de estado |
| MatriculaValidationService | Validar precondiciones de cada transicion (INV-M01 a INV-M04) |
| PagoMatriculaService | CRUD de pagos con reglas de negocio |
| MatriculaTransitionService | State machine: validar que la transicion es permitida |

#### 7.3 Tests obligatorios ANTES de la UI

| Test | Que verifica |
|------|-------------|
| State machine completa | Cada transicion valida funciona. Cada transicion invalida lanza BusinessRuleException |
| INV-M01 | Un estudiante no puede tener 2 matriculas activas en el mismo ano |
| INV-M02 | Estados terminales rechazan transiciones |
| INV-M03 | Pago no se puede eliminar, solo anular matricula |
| Pago validaciones | Monto > 0, comprobante requerido, sin doble pago |
| Flujo completo | PREASIGNADO → PENDIENTE_PAGO → PAGADO → CONFIRMADO → CURSANDO → FINALIZADO |

### Criterio de completitud

- [ ] Modelos creados y script SQL preparado
- [ ] 4 services implementados con interfaces
- [ ] Tests de state machine completos (todas las transiciones)
- [ ] Tests de invariantes (INV-M01 a INV-M04)
- [ ] CI verde con nuevos tests

---

## Resumen de Fases

| Fase | Semanas | Esfuerzo | Impacto | Dependencia |
|------|---------|----------|---------|-------------|
| 1. Dividir services gordos | 1-4 | 12-18h | Alto — reduce riesgo de cambio en Asistencias | Ninguna |
| 2. Dividir repositories | 3-5 | 4-6h | Medio — limpia capa de datos | Ninguna |
| 3. Adelgazar controller | 4 | 2-3h | Medio — patron de controller limpio | Ninguna |
| 4. Interfaces faltantes | 4-6 | 6-8h | Medio — facilita testing y DI | Ninguna |
| 5. CI pipeline | 5-7 | 2-3h | Alto — bloquea codigo roto en master | Ninguna |
| 6. Separacion de responsabilidades | 6-10 | 10-15h | Alto — limpieza arquitectonica real | Fases 1-2 |
| 7. Matricula backend | 10-14 | 15-20h | Critico — feature mas importante del roadmap | Fases 1,4,5 |

### Metricas de exito a 6 meses

| Metrica | Hoy | Objetivo |
|---------|-----|----------|
| Services >300 lineas | 8+ | 0 (solo base classes con escape hatch) |
| Repositories >300 lineas | 3 | 0 |
| Controllers >150 lineas | 1+ (auditar) | 0 |
| Services sin interfaz | ~73 | 0 en dominio core, <20 en auxiliares |
| CI backend | No existe | Build + test obligatorio en PR |
| Tests | 699 | 750+ (matricula agrega ~50) |
| Feature matricula | Solo modelo definido | Service layer completo y testeado |

---

## Riesgos y Mitigacion

| Riesgo | Probabilidad | Mitigacion |
|--------|-------------|------------|
| Dividir service rompe tests existentes | Media | Hacer en PRs atomicos. Correr tests despues de cada division |
| 699 tests dependen de SQL Server y no corren en CI | Alta | Verificar ANTES de crear CI. Si es asi, agregar SQL container en GitHub Actions |
| Matricula requiere script SQL en produccion | Segura | Script preparado en Fase 7.1. Mostrar al usuario. Ejecutar ANTES del deploy |
| Services nuevos sin tests | Media | Regla: cada service nuevo en Fases 1-4 hereda los tests del service original |
| Refactor de Asistencias introduce bugs | Media | Asistencias tiene la mejor cobertura de tests (528 ln de tests). Aprovecharla |

---

## Relacion con el Plan Frontend

| Fase Backend | Fase Frontend relacionada |
|-------------|--------------------------|
| F1 (services gordos) | F2 (archivos TS grandes) — mismo principio, diferente repo |
| F5 (CI backend) | Ya existe CI frontend — alinear ambos |
| F7 (matricula backend) | F6 frontend (tests pre-matricula) — backend primero, UI despues |
| F4 (interfaces) | F5 frontend (barrel exports) — mismo concepto: contratos explicitos |
