# Tarea: Edición formal de asistencia para Admin/Director

> **Estado**: ✅ Completado (backend 100%, frontend 100%)
> **Iniciado**: 2026-04-07
> **Handoff**: Cambio de cuenta Claude. Esta nota tiene TODO el contexto necesario para continuar sin re-discutir decisiones.

---

## 0. Contexto y problema original

El sistema marca asistencia diaria de estudiantes vía CrossChex (biométrico) → webhook → tabla `Asistencia` → correo automático al apoderado + BCC a sistemas. Funciona bien.

**Problema detectado**: Ayer alguien marcó asistencia editando **directamente la BD** (SSMS / Azure Portal) sin pasar por CrossChex. Los registros quedaron en la tabla pero **no se enviaron correos** porque el envío vive como side effect imperativo dentro de [`AsistenciaService.RegistrarAsistencia()`](../../../Educa.API/Educa.API/Services/Asistencias/AsistenciaService.cs) → método [`EnviarNotificacionesEnBackground()`](../../../Educa.API/Educa.API/Services/Asistencias/AsistenciaService.cs#L242).

**Causa raíz arquitectónica**: cualquier escritura que no pase por ese único método se salta los correos.

**Decisión del usuario**: Justificación se queda como está (no notifica). Pero hay que crear una vía formal con UI + endpoints propios para que admin/director pueda mutar asistencia sin tocar BD.

---

## 1. Decisiones de negocio cerradas (NO re-preguntar)

| # | Decisión | Confirmado |
|---|---|---|
| 1 | Operaciones permitidas: (a) crear entrada, (b) crear salida, (c) crear ambas, (d) editar horas, (e) eliminar, (g) fecha pasada. **NO** cambiar sede (f). | ✅ |
| 2 | Correo al apoderado en cada operación con **plantilla diferenciada** ("Corrección de asistencia") — distinto del correo en tiempo real para no confundir cuando es retroactivo | ✅ |
| 3 | Bloqueo de edición por **cierre mensual manual** (nueva entidad). Una vez cerrado un mes, no se puede tocar. Reversible solo por el Director con observación obligatoria y audit | ✅ |
| 4 | **Manual prima sobre CrossChex**: si existe registro con `OrigenManual=true`, el webhook descarta silenciosamente la marcación biométrica de ese día | ✅ |
| 5 | Nueva ruta `intranet/admin/asistencias` siguiendo el patrón CRUD admin estándar (multi-facade: data + crud + ui), igual que `usuarios`, `cursos`, etc. | ✅ |

---

## 2. SQL ya ejecutado en Azure SQL ✅

El usuario ya corrió este script. **NO volver a correrlo.**

```sql
-- 1. Marcar registros con origen manual
ALTER TABLE Asistencia
ADD ASI_OrigenManual BIT NOT NULL CONSTRAINT DF_Asistencia_OrigenManual DEFAULT 0;

-- 2. Tabla de cierres mensuales
CREATE TABLE CierreAsistenciaMensual (
    CAM_CodID            INT IDENTITY(1,1) NOT NULL,
    CAM_SED_CodID        INT NOT NULL,
    CAM_Anio             INT NOT NULL,
    CAM_Mes              INT NOT NULL,
    CAM_FechaCierre      DATETIME2 NOT NULL,
    CAM_UsuarioCierre    NVARCHAR(50) NOT NULL,
    CAM_Observacion      NVARCHAR(500) NULL,
    CAM_Estado           BIT NOT NULL CONSTRAINT DF_CierreAsistenciaMensual_Estado DEFAULT 1,
    CAM_UsuarioReg       NVARCHAR(50) NOT NULL,
    CAM_FechaReg         DATETIME2 NOT NULL,
    CAM_UsuarioMod       NVARCHAR(50) NULL,
    CAM_FechaMod         DATETIME2 NULL,
    CAM_RowVersion       ROWVERSION NOT NULL,
    CONSTRAINT PK_CierreAsistenciaMensual PRIMARY KEY CLUSTERED (CAM_CodID),
    CONSTRAINT FK_CierreAsistenciaMensual_Sede FOREIGN KEY (CAM_SED_CodID) REFERENCES Sede (SED_CodID),
    CONSTRAINT CK_CierreAsistenciaMensual_Mes CHECK (CAM_Mes BETWEEN 1 AND 12),
    CONSTRAINT CK_CierreAsistenciaMensual_Anio CHECK (CAM_Anio BETWEEN 2020 AND 2100)
);

CREATE UNIQUE INDEX UX_CierreAsistenciaMensual_Sede_Anio_Mes
ON CierreAsistenciaMensual (CAM_SED_CodID, CAM_Anio, CAM_Mes)
WHERE CAM_Estado = 1;

CREATE INDEX IX_CierreAsistenciaMensual_Sede_Anio_Mes_Estado
ON CierreAsistenciaMensual (CAM_SED_CodID, CAM_Anio, CAM_Mes, CAM_Estado);
```

---

## 3. Nuevas invariantes del dominio

A agregar en `.claude/rules/business-rules.md` sección 1 (Asistencia Diaria) y al registro de invariantes (sección 15.1):

| ID | Invariante |
|---|---|
| `INV-AD01` | Toda mutación sobre tabla `Asistencia` debe pasar por `IAsistenciaService` (webhook/biométrico) o `IAsistenciaAdminService` (admin/director). Edición directa en BD prohibida en producción |
| `INV-AD02` | Un registro con `ASI_OrigenManual = true` no puede ser sobrescrito por el webhook de CrossChex — el webhook lo descarta silenciosamente |
| `INV-AD03` | Operaciones del `AsistenciaAdminService` sobre fechas dentro de un mes con `CierreAsistenciaMensual` activo lanzan `BusinessRuleException("ASISTENCIA_MES_CERRADO")` |
| `INV-AD04` | Un cierre mensual es irreversible para el flujo normal. Solo se desactiva (`CAM_Estado = false`) por intervención explícita del Director con `RevertirCierreMensualDto.Observacion` (mín 10 chars) y queda auditado |
| `INV-AD05` | El `AsistenciaAdminService` envía correo diferenciado al apoderado (plantilla "Corrección de asistencia") en cada operación, distinto del correo de marcación en tiempo real |

---

## 4. Estado de implementación

### ✅ Backend completado

| # | Archivo | Estado |
|---|---|---|
| 1 | `Educa.API/Models/Asistencias/Asistencia.cs` — campo `ASI_OrigenManual` agregado | ✅ |
| 2 | `Educa.API/Models/Asistencias/CierreAsistenciaMensual.cs` — entidad nueva | ✅ |
| 3 | `Educa.API/Data/ApplicationDbContext.cs` — DbSet agregado | ✅ |
| 4 | `Educa.API/Data/Configurations/CierreAsistenciaMensualConfiguration.cs` — EF config (índices + FK) | ✅ |
| 5 | `Educa.API/DTOs/AsistenciaAdmin/CrearEntradaManualDto.cs` | ✅ |
| 6 | `Educa.API/DTOs/AsistenciaAdmin/CrearSalidaManualDto.cs` | ✅ |
| 7 | `Educa.API/DTOs/AsistenciaAdmin/CrearAsistenciaCompletaManualDto.cs` | ✅ |
| 8 | `Educa.API/DTOs/AsistenciaAdmin/ActualizarHorasAsistenciaDto.cs` | ✅ |
| 9 | `Educa.API/DTOs/AsistenciaAdmin/AsistenciaAdminListaDto.cs` | ✅ |
| 10 | `Educa.API/DTOs/AsistenciaAdmin/EstudianteParaSeleccionDto.cs` | ✅ |
| 11 | `Educa.API/DTOs/AsistenciaAdmin/AsistenciaAdminEstadisticasDto.cs` | ✅ |
| 12 | `Educa.API/DTOs/AsistenciaAdmin/CrearCierreMensualDto.cs` | ✅ |
| 13 | `Educa.API/DTOs/AsistenciaAdmin/RevertirCierreMensualDto.cs` | ✅ |
| 14 | `Educa.API/DTOs/AsistenciaAdmin/CierreMensualListaDto.cs` | ✅ |
| 15 | `Educa.API/Interfaces/Repositories/Asistencias/IAsistenciaAdminRepository.cs` | ✅ |
| 16 | `Educa.API/Repositories/Asistencias/AsistenciaAdminRepository.cs` | ✅ |
| 17 | `Educa.API/Interfaces/Repositories/Asistencias/ICierreAsistenciaRepository.cs` | ✅ |
| 18 | `Educa.API/Repositories/Asistencias/CierreAsistenciaRepository.cs` | ✅ |
| 19 | `Educa.API/Interfaces/Services/Notifications/IEmailNotificationService.cs` — método `EnviarNotificacionAsistenciaCorreccion` agregado | ✅ |
| 20 | `Educa.API/Services/Notifications/EmailNotificationService.cs` — implementación + plantilla HTML diferenciada (banner azul `#1976D2`, "Corrección de asistencia") | ✅ |
| 21 | `Educa.API/Interfaces/Services/Asistencias/ICierreAsistenciaService.cs` | ✅ |
| 22 | `Educa.API/Services/Asistencias/CierreAsistenciaService.cs` — crear, revertir, listar, `EnsureFechaNoCerradaAsync` | ✅ |
| 23 | `Educa.API/Interfaces/Services/Asistencias/IAsistenciaAdminService.cs` | ✅ |

### ✅ Backend completado (sesión 2)

| # | Archivo | Detalle |
|---|---|---|
| 24 | `Educa.API/Services/Asistencias/AsistenciaAdminService.cs` | **EL ARCHIVO MÁS GRANDE PENDIENTE.** Implementar interfaz `IAsistenciaAdminService`. Cada operación (crear entrada, crear salida, crear completa, actualizar horas, eliminar):<br>1. Validar sede activa (`_adminRepo.SedeExistsAsync`)<br>2. Validar estudiante existe activo<br>3. Llamar `_cierreService.EnsureFechaNoCerradaAsync(sedeId, fecha)` antes de cualquier mutación → **INV-AD03**<br>4. Para crear entrada/salida: validar coherencia (entrada existe antes de salida, no duplicado, etc.)<br>5. Para actualizar horas: cargar entidad, aplicar `dto.RowVersion`, manejar `DbUpdateConcurrencyException` → `ConflictException` (INV-S05)<br>6. Crear/actualizar registro con `ASI_OrigenManual = true` → **INV-AD02**<br>7. Recalcular `ASI_Estado` (Completa/Incompleta) según horas presentes<br>8. Auditoría: `ASI_UsuarioReg` o `ASI_UsuarioMod` = `usuarioDni` (NO la sede)<br>9. Transacción `_adminRepo.BeginTransactionAsync` + commit<br>10. Post-commit fire-and-forget: `_emailService.EnviarNotificacionAsistenciaCorreccion(...)` con tipo "creada" / "actualizada" / "eliminada" → **INV-AD05**<br>11. Retornar `AsistenciaAdminListaDto` (mapear desde entidad).<br><br>**Métodos de lectura** (`ListarDelDiaAsync`, `ObtenerEstadisticasDelDiaAsync`, `ListarEstudiantesParaSeleccionAsync`) son simple delegación al repo.<br><br>**Importante**: la operación `CrearSalidaAsync` recibe `AsistenciaId` (no `EstudianteId`) porque completa un registro existente. La operación `CrearEntradaAsync` debe verificar que no existe ya un registro del día con `GetByEstudianteFechaAsync` para evitar duplicados. |
| 25 | `Educa.API/Services/Asistencias/AsistenciaService.cs` | **Modificación**: en `RegistrarSalidaAsync` (línea ~198), antes del retry de concurrencia, agregar validación: si `asistenciaHoy.ASI_OrigenManual == true` → `return ("Marcación CrossChex descartada: ya existe registro manual del día", null)`. Y en `RegistrarEntradaAsync` también: si ya existe un registro manual del día, descartar la entrada nueva del webhook. **INV-AD02**.<br><br>Verificar que el registro existente no sea sobrescrito. La forma más limpia es agregar el chequeo en el método principal `RegistrarAsistencia` después de obtener `asistenciaHoy`. |
| 26 | `Educa.API/Controllers/Asistencias/AsistenciaAdminController.cs` | **NUEVO**. Rutas:<br>`POST /api/asistencia-admin/entrada`<br>`POST /api/asistencia-admin/salida`<br>`POST /api/asistencia-admin/completa`<br>`PUT /api/asistencia-admin/{id}/horas`<br>`DELETE /api/asistencia-admin/{id}`<br>`GET /api/asistencia-admin/dia?fecha=YYYY-MM-DD&sedeId=X&search=...`<br>`GET /api/asistencia-admin/estadisticas?fecha=...&sedeId=...`<br>`GET /api/asistencia-admin/estudiantes?sedeId=...&search=...`<br><br>`[Authorize(Roles = "Director,Asistente Administrativo")]`. Usar `User.GetDni()` desde `Educa.API/Helpers/Auth/UserClaimsExtensions.cs` para auditoría. Retornar `ApiResponse<T>.Ok(...)`. Sin try/catch — `GlobalExceptionMiddleware` maneja excepciones tipadas. |
| 27 | `Educa.API/Controllers/Asistencias/CierreAsistenciaController.cs` | **NUEVO**. Rutas:<br>`POST /api/cierre-asistencia` (crear)<br>`POST /api/cierre-asistencia/{id}/revertir` (Director only)<br>`GET /api/cierre-asistencia?sedeId=...&anio=...` (listar)<br><br>`[Authorize(Roles = "Director,Asistente Administrativo")]` para crear/listar. Para revertir: solo `Director` (no Asistente). |
| 28 | `Educa.API/Extensions/RepositoryExtensions.cs` | Agregar:<br>`services.AddScoped<IAsistenciaAdminRepository, AsistenciaAdminRepository>();`<br>`services.AddScoped<ICierreAsistenciaRepository, CierreAsistenciaRepository>();` |
| 29 | `Educa.API/Extensions/ServiceExtensions.cs` | Agregar:<br>`services.AddScoped<IAsistenciaAdminService, AsistenciaAdminService>();`<br>`services.AddScoped<ICierreAsistenciaService, CierreAsistenciaService>();` |

### ✅ Frontend completado (sesión 2)

Estructura siguiendo el patrón multi-facade de `features/intranet/pages/admin/usuarios/` (referencia exacta):

```
src/app/features/intranet/pages/admin/asistencias/
├── asistencias.component.{ts,html,scss}    # Page (Smart) — consume facades
├── index.ts                                 # Barrel export
├── components/
│   ├── asistencias-table/                  # Tabla con acciones inline (ver/editar/eliminar)
│   ├── asistencias-stats/                  # 4 cards: total, completas, incompletas, manuales
│   ├── asistencias-stats-skeleton/
│   ├── asistencias-table-skeleton/
│   ├── asistencias-filters/                # Fecha (calendar) + sede (select) + buscador
│   ├── asistencias-header/                 # Título + botones nuevo + cerrar mes
│   ├── asistencia-form-dialog/             # Crear/editar — campos según operación
│   └── cierre-mes-dialog/                  # Crear cierre mensual + listar/revertir
├── models/
│   └── asistencias-admin.models.ts         # Re-export de @data/models/asistencia-admin.models
└── services/
    ├── index.ts
    ├── asistencias-admin.service.ts        # API gateway HTTP
    ├── asistencias-admin.store.ts          # Estado reactivo (NO extends BaseCrudStore — feature custom)
    ├── asistencias-data.facade.ts          # loadData, refresh, filtros
    ├── asistencias-crud.facade.ts          # CRUD con WAL
    └── asistencias-ui.facade.ts            # dialogs/drawers
```

**Modelos compartidos** en `src/app/data/models/asistencia-admin.models.ts`:

```typescript
export interface AsistenciaAdminLista {
  asistenciaId: number;
  estudianteId: number;
  dni: string;
  nombreCompleto: string;
  grado: string;
  seccion: string;
  sede: string;
  sedeId: number;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  estado: 'Completa' | 'Incompleta';
  observacion: string | null;
  origenManual: boolean;
  estadoCodigo: string;
  rowVersion: string; // base64
}

export interface AsistenciaAdminEstadisticas {
  fecha: string;
  totalRegistros: number;
  completas: number;
  incompletas: number;
  registrosManuales: number;
  registrosWebhook: number;
}

export interface CrearEntradaManualRequest {
  estudianteId: number;
  sedeId: number;
  horaEntrada: string;
  observacion?: string;
}
// ... resto de DTOs equivalentes a backend
```

**Reglas de proyecto a respetar** (todas documentadas en `.claude/rules/`):
- `OnPush` en todos los componentes nuevos
- Botones con solo icono → `pt` con `aria-label` (`a11y.md`)
- `appendTo="body"` en todos los `p-select` / `p-calendar` (`primeng.md`)
- Tablas con `::ng-deep .p-datatable { background: transparent }` (`table-transparency.md`)
- Filtros transparentes (`filter-transparency.md`)
- `<p-table>` con `<app-table-skeleton>` mientras carga (`skeletons.md`)
- `<app-stats-skeleton [count]="4">` para las cards
- Dialogs **NUNCA** dentro de `@if` — siempre en el DOM con `[visible]` + `(visibleChange)` separados (`dialogs-sync.md`)
- `<p-confirmDialog>` para eliminar/revertir (`dialogs-sync.md`)
- WAL helper para mutaciones (`crud-patterns.md`): `WalFacadeHelper.execute({...})` con `optimistic.apply` + `optimistic.rollback`
- Mutaciones quirúrgicas (sin refetch en update/delete/toggle), refetch solo en create
- Signals privados con `.asReadonly()`, sub-ViewModels (`dataVm`, `uiVm`, `formVm`) y vm consolidado en el store

**Ruta y permiso a registrar**:

1. `src/app/features/intranet/intranet.routes.ts` → agregar dentro del array de rutas admin (junto a `admin/usuarios`):
   ```typescript
   {
     path: 'admin/asistencias',
     loadComponent: () =>
       import('./pages/admin/asistencias').then((m) => m.AsistenciasComponent),
     title: 'Intranet - Gestión de Asistencias',
   },
   ```

2. `src/app/shared/constants/permission-registry.ts` → agregar `ADMIN_ASISTENCIAS: 'intranet/admin/asistencias'`

3. `src/app/shared/config/intranet-menu.config.ts` → agregar entry en sección "Gestión Académica" con `permiso: PERMISOS.ADMIN_ASISTENCIAS`, icono `pi pi-clock`

---

## 5. Plan de continuación (orden recomendado)

### Backend primero (sigue desde donde se quedó)

1. **AsistenciaAdminService.cs** — el archivo más complejo. Implementar todos los métodos siguiendo el patrón ya documentado en la tabla del punto 4.
2. **AsistenciaService.cs** — agregar el chequeo de `ASI_OrigenManual` en `RegistrarAsistencia` para que el webhook descarte marcaciones cuando ya hay registro manual.
3. **AsistenciaAdminController.cs** — controller delgado, solo delega.
4. **CierreAsistenciaController.cs** — controller delgado.
5. **RepositoryExtensions.cs + ServiceExtensions.cs** — registrar DI.
6. **Probar build** del backend: `dotnet build` desde `Educa.API/Educa.API/`. Corregir cualquier error de compilación antes de tocar frontend.

### Frontend después

1. Modelos en `@data/models/asistencia-admin.models.ts`
2. Service API gateway
3. Store
4. 3 facades (data → crud → ui)
5. Skeletons
6. Componentes presentacionales (header → stats → filters → table → form-dialog → cierre-mes-dialog)
7. Page component
8. Ruta + menú + permiso

### Cierre

- Actualizar `.claude/rules/business-rules.md`:
  - Sección 1 (Asistencia Diaria): agregar referencia a `IAsistenciaAdminService` como segunda vía válida de mutación
  - Sección 15.1: agregar `INV-AD01` a `INV-AD05` al registro
- Marcar este archivo como **Completado** con fecha

---

## 6. Patrones de referencia (rutas exactas)

Cuando dudes del patrón a seguir, lee estos archivos del proyecto:

| Para qué | Archivo de referencia |
|---|---|
| Estructura multi-facade admin CRUD | `src/app/features/intranet/pages/admin/usuarios/` (carpeta completa) |
| Store con signals + sub-ViewModels | `src/app/features/intranet/pages/admin/usuarios/services/usuarios.store.ts` |
| Facade CRUD con WAL | `src/app/features/intranet/pages/admin/usuarios/services/usuarios-crud.facade.ts` |
| Facade Data con loadData + cache refresh | `src/app/features/intranet/pages/admin/usuarios/services/usuarios-data.facade.ts` |
| Facade UI con dialogs/drawers | `src/app/features/intranet/pages/admin/usuarios/services/usuarios-ui.facade.ts` |
| Page component (smart) | `src/app/features/intranet/pages/admin/usuarios/usuarios.component.ts` |
| API gateway service | `src/app/features/intranet/pages/admin/usuarios/services/usuarios.service.ts` |
| Backend service con transacciones, retry y notificación | `Educa.API/Educa.API/Services/Asistencias/AsistenciaService.cs` |
| Backend controller delgado | `Educa.API/Educa.API/Controllers/Asistencias/AsistenciaController.cs` |
| Backend repository pattern | `Educa.API/Educa.API/Repositories/Asistencias/AsistenciaRepository.cs` |
| Backend EF configuration | `Educa.API/Educa.API/Data/Configurations/AsistenciaConfiguration.cs` |

---

## 7. Notas finales del handoff

- **NO re-discutir** las 5 decisiones del punto 1 con el usuario. Ya están cerradas.
- **NO volver a correr** el SQL del punto 2 — ya está en Azure SQL.
- El usuario sigue el protocolo de comunicación de `.claude/rules/communication.md`. Al cerrar el chat con "gracias", responder con feedback bidireccional obligatorio.
- Si encuentras decisiones no cubiertas durante la implementación, **preguntar antes** en lugar de inventar. Por ejemplo:
  - ¿Qué pasa si admin elimina una asistencia y al día siguiente CrossChex envía marcación de la misma fecha? Mi recomendación: ya no hay registro `OrigenManual=true`, así que CrossChex crearía uno nuevo. Discutible si eso es deseable.
  - ¿La ventana de "no tocar futuro" del cierre mensual debe cubrir también el día actual? Hoy permite cerrar el mes en curso si ya pasó.
- El usuario es **senior, prefiere respuestas directas y odia el ruido**. Va al grano.
