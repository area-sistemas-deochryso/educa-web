> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 30 · **Chat**: FE combinado (Chat 3 + Chat 4) · **Fase**: F3.FE + F4.FE · **Estado**: ⏳ pendiente arrancar — cola top 3 del maestro posición #1 (tras bloqueo de Plan 31 Chat 2 por deploy pendiente).

---

# Plan 30 Chat FE — Pantallas admin del diagnóstico (Chat 3 + Chat 4 combinados)

## PLAN FILE

Plan canónico: inline en `.claude/plan/maestro.md` sección **"🟡 Plan 30 —
Dashboard Visibilidad Admin"**. Este chat cierra ambos FE que quedaban:

- **F3.FE** (consumer del Chat 3 BE ya cerrado — commit `eb92ec2`): pantalla
  del gap asistencia-vs-correos del día.
- **F4.FE** (consumer del Chat 4 BE ya cerrado — commit `3c316a2`): pantalla
  de búsqueda/diagnóstico por correo específico.

Después de este chat el **Plan 30 cierra al 100%**.

## OBJETIVO

Crear **dos pantallas admin en `educa-web`** que consumen los endpoints BE ya
desplegados y reemplazan las queries SSMS manuales restantes del Plan 30:

1. `/intranet/admin/email-outbox/diagnostico-correos-dia` — responde "marcaron
   entrada 62 estudiantes pero solo salieron 56 correos, ¿quiénes son los 6?".
2. `/intranet/admin/email-outbox/diagnostico-correo` — responde "¿qué pasó con
   `rey.ichigo@hotmail.com`?" en una sola request.

Ambas son **read-only**, gated por feature flag + permiso admin, y siguen el
molde de la pantalla `dashboard-dia` que ya existe (Chat 2 FE cerrado).

## PRE-WORK OBLIGATORIO (investigación antes de codear)

1. **Leer** `src/app/features/intranet/pages/admin/email-outbox-dashboard-dia/`
   completo — es el molde canónico del Plan 30 FE. Replicar estructura:

   ```
   email-outbox-dashboard-dia/
     ├── index.ts (barrel)
     ├── email-outbox-dashboard-dia.component.{ts,html,scss}  # Page (Smart)
     ├── components/
     │   ├── {resumen-cards,por-hora-chart,por-tipo-table,bouncers-table}/
     │   └── skeleton/
     ├── models/dashboard-dia.models.ts
     └── services/
         ├── dashboard-dia.store.ts
         ├── dashboard-dia-data.facade.ts
         ├── dashboard-dia.service.ts
         └── index.ts
   ```

2. **Leer** `src/app/config/environment.ts` y `environment.development.ts` —
   seguir el patrón de `emailOutboxDashboardDia: true` al agregar los nuevos
   flags. Ambos defaultean a `true` en dev y `false` en prod.

3. **Leer** `src/app/shared/constants/permission-registry.ts` — agregar los 2
   permisos nuevos al mismo nivel que `ADMIN_EMAIL_OUTBOX_DASHBOARD_DIA`. Los
   paths del permiso son exactamente las rutas de la pantalla.

4. **Leer** `src/app/features/intranet/shared/config/intranet-menu.config.ts`
   líneas 121-122 — son los ítems del Chat 2 FE. Agregar 2 ítems nuevos al
   mismo grupo `Monitoreo` con sus respectivos `featureFlag` y `permiso`.

5. **Leer** `src/app/features/intranet/intranet.routes.ts` líneas 206-215 —
   la ruta `admin/email-outbox/dashboard-dia` usa spread condicional con el
   feature flag. Replicar mismo patrón para las 2 rutas nuevas.

6. **Leer** ambos DTOs del BE ya desplegado — son la fuente de verdad del
   shape que el FE debe consumir:
   - `DTOs/Sistema/DiagnosticoCorreosDiaDto.cs` (+ sub-DTOs `*Resumen`,
     `EstudianteSinCorreoApoderado`, `ApoderadoBlacklisteadoDelDia`,
     `EntradaSinCorreoEnviado`).
   - `DTOs/Sistema/EmailDiagnosticoDto.cs` (+ sub-DTOs `*Resumen`,
     `*HistoriaItem`, `*Blacklist`, `*PersonaAsociada`).

   Path relativo desde `educa-web`: `../Educa.API/Educa.API/DTOs/Sistema/`.

7. **Confirmar endpoints activos** con el equipo/usuario si BE ya está
   deployado en dev (los commits `eb92ec2` y `3c316a2` viven en
   `Educa.API master` — si aún sin push, arrancar con mocks del shape del
   DTO y validar después del deploy).

## DECISIONES A VALIDAR CON EL USUARIO (antes de tocar código)

5 decisiones no triviales. **Todas con recomendación del plan**.

1. **Una pantalla con tabs vs dos pantallas separadas** — las dos pantallas
   comparten módulo (email-outbox) pero tienen UX distinta (una es dashboard
   automático, la otra es búsqueda manual).
   - **Recomendación**: **dos pantallas separadas** con rutas independientes.
     Razones: (a) permisos granulares por si admin quiere ver una y no la otra;
     (b) feature flags independientes para liberar gradual; (c) caching SWR
     distinto (dashboard diario cachea, búsqueda no). Sigue el patrón del
     Chat 2 FE (`dashboard-dia` es pantalla propia).

2. **Auto-polling en dashboard diario** — la pantalla del gap se puede actualizar
   cada X minutos para ver entradas nuevas del día sin que el admin refresque.
   - **Recomendación**: **sin auto-polling** (consistente con decisión del
     Chat 2 FE). El admin pulsa "Refrescar" cuando quiera. Mantener el label
     "Actualizado hace X min" con cálculo reactivo desde `GeneratedAt` del DTO.

3. **Feature flags y permisos** — ¿1 flag/permiso para ambas pantallas o 2?
   - **Recomendación**: **2 separados** por consistencia con Chat 2 FE.
     Flags: `emailOutboxDiagnosticoCorreosDia` + `emailOutboxDiagnosticoCorreo`.
     Permisos: `ADMIN_EMAIL_OUTBOX_DIAGNOSTICO_CORREOS_DIA` +
     `ADMIN_EMAIL_OUTBOX_DIAGNOSTICO_CORREO`.

4. **Persistencia del último correo buscado** (Pantalla B) — ¿guardar en
   localStorage el último correo consultado para re-abrir la pantalla con el
   mismo input?
   - **Recomendación**: **NO persistir**. Diagnóstico ad-hoc, cada apertura
     es un caso nuevo. Evita exponer correos de otros casos en el próximo
     login en el mismo equipo (privacidad). La URL sí puede llevar `?correo=`
     como query param compartible para soporte, pero no localStorage.

5. **Copy-to-clipboard en filas de personas/correos** — la pantalla B devuelve
   DNI enmascarados y nombres. ¿Botón copiar por fila?
   - **Recomendación**: **solo para el correo consultado** (eco en el header).
     Facilita pegarlo en otros sistemas/SSMS si el admin necesita queries
     extra. NO copiar DNIs enmascarados (inútil) ni nombres (flujo normal).

Durante el chat, el usuario acepta/ajusta antes de codear.

## ALCANCE

**Estrategia sugerida**: ejecutar en **2 fases secuenciales** dentro del mismo
chat, cerrando cada una con su propio commit. Si el chat se vuelve pesado
después de la Fase A, mover la Fase B a un chat dedicado.

### Fase A — Pantalla `diagnostico-correos-dia` (F3.FE)

#### Archivos a crear

Ruta raíz: `src/app/features/intranet/pages/admin/email-outbox-diagnostico-correos-dia/`

| # | Archivo | Rol | Líneas est. |
|---|---------|-----|-----------:|
| 1 | `email-outbox-diagnostico-correos-dia.component.{ts,html,scss}` | Page Smart | ~150/~130/~80 |
| 2 | `components/diagnostico-correos-dia-resumen/*.{ts,html,scss}` | Stat cards (8 métricas) | ~120/~100/~50 |
| 3 | `components/diagnostico-correos-dia-filtros/*.{ts,html,scss}` | Datepicker + sedeId + refresh | ~80/~60/~40 |
| 4 | `components/estudiantes-sin-correo-table/*.{ts,html,scss}` | Tabla drill-down lista 1 | ~100/~80/~40 |
| 5 | `components/apoderados-blacklisteados-table/*.{ts,html,scss}` | Tabla drill-down lista 2 | ~90/~70/~40 |
| 6 | `components/entradas-sin-correo-table/*.{ts,html,scss}` | Tabla drill-down lista 3 (razón tipada) | ~130/~100/~50 |
| 7 | `components/skeleton/*.{ts,html,scss}` | Skeleton screen | ~80/~60/~40 |
| 8 | `models/diagnostico-correos-dia.models.ts` | DTOs (mirror del BE) | ~80 |
| 9 | `services/diagnostico-correos-dia.service.ts` | API client | ~40 |
| 10 | `services/diagnostico-correos-dia.store.ts` | Estado reactivo | ~120 |
| 11 | `services/diagnostico-correos-dia-data.facade.ts` | Orquestación (load, refresh) | ~100 |
| 12 | `services/index.ts` + `index.ts` raíz | Barrel exports | ~20 |
| 13 | `pipes/razon-label.pipe.ts` (+ spec) | `SIN_CORREO`/`BLACKLISTED`/`FALLIDO`/`PENDIENTE`/`SIN_RASTRO` → label | ~40 |

#### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/app/config/environment.ts` + `.development.ts` | `emailOutboxDiagnosticoCorreosDia: false` (prod) / `true` (dev) |
| `src/app/shared/constants/permission-registry.ts` | Agregar `ADMIN_EMAIL_OUTBOX_DIAGNOSTICO_CORREOS_DIA` |
| `src/app/features/intranet/shared/config/intranet-menu.config.ts` | Agregar ítem en grupo `Monitoreo` con label "Gap asistencia-vs-correos" y `featureFlag` |
| `src/app/features/intranet/intranet.routes.ts` | Spread condicional con loadComponent lazy + `permisosGuard` |
| **Backend (mínimo)** `Educa.API/Data/...` (opcional) | Si existe tabla `Vista` con seed, sumar el nuevo path al script. Si no hay seed, el admin registra el permiso desde la UI de permisos. |

#### Shape del endpoint (del Chat 3 BE cerrado)

```
GET /api/sistema/asistencia/diagnostico-correos-dia?fecha={yyyy-MM-dd}&sedeId={n}
→ ApiResponse<DiagnosticoCorreosDiaDto>

DiagnosticoCorreosDiaDto {
  Fecha: DateTime
  SedeId: number | null
  Resumen: {
    EntradasMarcadas, EstudiantesConEntrada, EstudiantesFueraDeAlcance,
    EstudiantesSinCorreoApoderado, CorreosApoderadosBlacklisteados,
    CorreosEnviados, CorreosFallidos, CorreosPendientes, CorreosFaltantes
  }
  EstudiantesSinCorreo: [{ EstudianteId, DniMasked, NombreCompleto, Salon, GraOrden }]
  ApoderadosBlacklisteados: [{ CorreoMasked, MotivoBloqueo, FechaBloqueo, HijosAfectadosConEntradaHoy }]
  EntradasSinCorreoEnviado: [{ AsistenciaId, EstudianteId, DniMasked, NombreCompleto,
                               Salon, GraOrden, HoraEntrada, Razon, TipoFallo? }]
  GeneratedAt: DateTime
}
```

`Razon` ∈ `{SIN_CORREO, BLACKLISTED, FALLIDO, PENDIENTE, SIN_RASTRO}` — tipar
con const+type (ver `rules/semantic-types.md`).

### Fase B — Pantalla `diagnostico-correo` (F4.FE)

#### Archivos a crear

Ruta raíz: `src/app/features/intranet/pages/admin/email-outbox-diagnostico-correo/`

| # | Archivo | Rol | Líneas est. |
|---|---------|-----|-----------:|
| 1 | `email-outbox-diagnostico-correo.component.{ts,html,scss}` | Page Smart | ~160/~140/~90 |
| 2 | `components/diagnostico-correo-header/*.{ts,html,scss}` | Input correo + botón buscar + echo `CorreoConsultado` + copy-to-clipboard | ~110/~80/~50 |
| 3 | `components/diagnostico-correo-resumen/*.{ts,html,scss}` | Stat cards (6 métricas: Total/Enviados/Fallidos/Pendientes + Primer/Último intento) | ~100/~80/~50 |
| 4 | `components/diagnostico-correo-blacklist-card/*.{ts,html,scss}` | Card condicional (muestra solo si Blacklist != null) con estado ACTIVO/DESPEJADO | ~90/~70/~50 |
| 5 | `components/diagnostico-correo-personas-table/*.{ts,html,scss}` | Tabla personas asociadas (Tipo + DNI masked + Nombre + Campo) | ~100/~80/~40 |
| 6 | `components/diagnostico-correo-historia-table/*.{ts,html,scss}` | Tabla historia últimos 50 con expand por fila para ver UltimoError/Remitente/Bounce | ~160/~130/~70 |
| 7 | `components/skeleton/*.{ts,html,scss}` | Skeleton screen | ~80/~60/~40 |
| 8 | `models/diagnostico-correo.models.ts` | DTOs (mirror del BE) | ~90 |
| 9 | `services/diagnostico-correo.service.ts` | API client | ~40 |
| 10 | `services/diagnostico-correo.store.ts` | Estado reactivo | ~130 |
| 11 | `services/diagnostico-correo-data.facade.ts` | Orquestación (buscar, limpiar) | ~100 |
| 12 | `services/index.ts` + `index.ts` raíz | Barrel exports | ~20 |
| 13 | `pipes/tipo-persona-label.pipe.ts` (+ spec) | `E`/`P`/`D`/`APO` → "Estudiante"/"Profesor"/"Director"/"Apoderado" | ~40 |

#### Archivos a modificar (igual patrón que Fase A)

| Archivo | Cambio |
|---------|--------|
| `environment.ts` + `.development.ts` | `emailOutboxDiagnosticoCorreo: false` (prod) / `true` (dev) |
| `permission-registry.ts` | `ADMIN_EMAIL_OUTBOX_DIAGNOSTICO_CORREO` |
| `intranet-menu.config.ts` | Ítem en `Monitoreo` con label "Diagnóstico por correo" |
| `intranet.routes.ts` | Spread condicional + loadComponent |

#### Shape del endpoint (del Chat 4 BE cerrado)

```
GET /api/sistema/email-outbox/diagnostico?correo={email}
→ ApiResponse<EmailDiagnosticoDto>

Validaciones controller:
 - correo vacío/null → 400 errorCode="CORREO_REQUERIDO"
 - correo sin @ o >200 chars → 400 errorCode="CORREO_INVALIDO"

EmailDiagnosticoDto {
  CorreoConsultado: string           // eco normalizado (trim + lower)
  Resumen: {
    TotalIntentos, Enviados, Fallidos, Pendientes,
    PrimerIntento: DateTime | null,
    UltimoIntento: DateTime | null,
    MostrandoUltimos: number           // min(TotalIntentos, 50)
  }
  Historia: [{
    Id, Fecha, Tipo, Asunto, Estado, TipoFallo?, Intentos,
    UltimoError?, Remitente?, BounceSource?, BounceDetectedAt?
  }]  // últimas 50 DESC
  Blacklist: { Estado: "ACTIVO" | "DESPEJADO", MotivoBloqueo, IntentosFallidos,
               FechaPrimerFallo?, FechaUltimoFallo?, FechaReg, UltimoError? } | null
  PersonasAsociadas: [{ TipoPersona: "E"|"P"|"D"|"APO", Id, DniMasked, NombreCompleto, Campo }]
  GeneratedAt: DateTime
}
```

Mapear `CORREO_REQUERIDO` y `CORREO_INVALIDO` a toasts localizados en el
facade antes de disparar el submit.

## TESTS MÍNIMOS

### Fase A — Pantalla `diagnostico-correos-dia`

| # | Caso | Esperado |
|---|------|----------|
| 1 | Store: `setData()` actualiza `dto()` y calcula `lastUpdated` | `dto()` con payload y timestamp derivado |
| 2 | Store: `clear()` vuelve a estado inicial | Signals en default |
| 3 | Facade: `load()` sin filtros llama service con `fecha=hoy Lima` y setea data | Service mock llamado 1x |
| 4 | Facade: error del service → error code mapeado + toast | Store tiene `error`, no cambia `dto` |
| 5 | Facade: `setFecha` dispara reload | Service llamado con nuevo fecha |
| 6 | `ResumenComponent`: 9 stat cards renderizan con signal entry | Todos los números visibles |
| 7 | `EntradasSinCorreoTable`: razon `SIN_RASTRO` con TipoFallo null muestra guión | Columna tipo fallo `—` |
| 8 | `razon-label` pipe: cada razón devuelve label en español | 5 assertions |

### Fase B — Pantalla `diagnostico-correo`

| # | Caso | Esperado |
|---|------|----------|
| 9 | Store: `setResult()` actualiza `dto()` con CorreoConsultado | Eco visible |
| 10 | Store: `clear()` resetea dto + correo input | Input vacío |
| 11 | Facade: `buscar("")` no llama service, toast de "correo requerido" | Service 0x |
| 12 | Facade: `buscar("sincorreo")` no llama service, toast "correo inválido" | Service 0x |
| 13 | Facade: `buscar("ok@x.com")` llama service con input normalizado | Service llamado 1x |
| 14 | Facade: 400 del BE con errorCode → toast del mensaje BE | Store tiene error |
| 15 | `BlacklistCard`: Blacklist `null` → card no renderiza (condicional) | DOM sin card |
| 16 | `BlacklistCard`: Blacklist `ACTIVO` → severity danger | Tag visible |
| 17 | `BlacklistCard`: Blacklist `DESPEJADO` → severity warning | Tag visible |
| 18 | `PersonasTable`: mezcla E + P + APO → 3 filas con label correcto | 3 rows |
| 19 | `HistoriaTable`: 50 filas renderizan con paginador local opcional | 50 visibles |
| 20 | `tipo-persona-label` pipe: E/P/D/APO → labels correctos | 4 assertions |

**Framework**: Vitest + jsdom + Angular TestBed. Seguir el molde de
`email-outbox-dashboard-dia/services/dashboard-dia-data.facade.spec.ts`.

**Baseline FE esperado**: 1549 (post Chat 2 FE) + ~20 nuevos = **~1569**.

## REGLAS OBLIGATORIAS

- **Standalone components** con `changeDetection: ChangeDetectionStrategy.OnPush`.
- **Signals** para estado local + `BaseCrudStore`/`signalStore` si aplica —
  pero estas pantallas **no son CRUD estándar**, así que un store manual con
  `signal()` privado + `asReadonly()` es más apropiado (ver
  `rules/state-management.md` + `rules/crud-patterns.md`).
- **Facade manual** — no `BaseCrudFacade` (no hay WAL, no hay mutaciones).
  El facade solo orquesta `load()` + manejo de error. Leer
  `rules/optimistic-ui.md` §"Prohibido: .subscribe() directo" — los facades
  **de lectura read-only** están exentos (ignored por la regla), pero deben
  usar `takeUntilDestroyed(this.destroyRef)`.
- **`.subscribe()` en facades de lectura**: OK con `takeUntilDestroyed`.
  Ejemplo canónico: `email-outbox-dashboard-dia/services/dashboard-dia-data.facade.ts`.
- **Tipos semánticos** (`rules/semantic-types.md`): `Razon` y `TipoPersona`
  deben ser `const + type`, no strings libres.
- **Design system**: seguir `rules/design-system.md` B1-B11. Stat cards (B3),
  tabla (B4), filter bar (B6), botones (B7).
- **Accesibilidad**: todos los botones icon-only con `pt` + `aria-label`
  (`rules/a11y.md`). `pTooltip` NO reemplaza `aria-label`.
- **PrimeNG dropdowns**: SIEMPRE `appendTo="body"` en `p-select`, `p-calendar`,
  `p-multiselect`.
- **Tokens de color**: no hex literales — usar `var(--red-500)`, `var(--blue-800)`
  (ver `rules/design-system.md` §D).
- **No localStorage** para el correo consultado (decisión 4). Sí URL query
  param `?correo=` opcional para compartir URL con soporte.
- **Skeleton obligatorio** (`rules/skeletons.md`) — ambas pantallas con
  `app-table-skeleton` + `app-stats-skeleton` mientras `loading === true`.
- **Lazy rendering** (`rules/lazy-rendering.md`) — envolver secciones en
  `app-lazy-content` con `minHeight` para evitar CLS.

## APRENDIZAJES TRANSFERIBLES (del Chat 4 BE cerrado 2026-04-24)

### Shape del DTO ya conocido

- `EmailDiagnosticoDto.Blacklist` es **nullable** — el FE debe manejar el
  caso con `@if (dto().Blacklist) { ... }`.
- `PersonasAsociadas` puede tener **múltiples entradas** para un mismo correo
  (caso típico: el correo de la madre está tanto en `EST_CorreoApoderado`
  como en `APO_Correo`). NO asumir que es array de 1.
- `Historia` viene **pre-ordenada DESC** por el BE. No re-ordenar en FE.
- `UltimoError` viene **pre-truncado a 200 chars** por el BE. No truncar
  más en FE — mostrar completo.
- `CorreoConsultado` es el eco **normalizado** (trim + lower) — puede diferir
  del input del admin. Mostrarlo en el header junto al input original si se
  quiere dar feedback visual de la normalización.

### Error codes del BE

- `CORREO_REQUERIDO` (400) — correo vacío o null.
- `CORREO_INVALIDO` (400) — correo sin `@` o >200 chars.
- Ambos vienen en `ApiResponse.ErrorCode` del `BadRequest`. Mapear en facade
  a toasts localizados antes de mostrar "Error desconocido".

### Validación en FE antes de pegarle al BE

- Correo trim local antes de enviar — el BE lo hace también pero evita una
  round-trip si el input es obviamente inválido.
- Regex mínimo local: `/.+@.+/` (rudimentario — mismo nivel que el BE).
- El input puede tener `pattern` HTML + `aria-describedby` para UX.

### Permisos y feature flags en el proyecto

- **Feature flag** vive en `environment.features.emailOutboxDiagnostico*`.
  El menú + el route guard ambos leen `environment.features`.
- **Permiso** vive en `permission-registry.ts` como `ADMIN_EMAIL_OUTBOX_*`.
  El valor del permiso ES la ruta que protege (hay lookup exacto).
- **Ruta** en `intranet.routes.ts` con spread condicional
  `...(environment.features.X ? [routeObj] : [])` + `canActivate: [authGuard, permisosGuard]`.
- **Menú** en `intranet-menu.config.ts` con `featureFlag: 'X'` +
  `permiso: PERMISOS.ADMIN_...`.

### Estructura de la carpeta de página

La convención del Plan 30 es **carpeta hermana a `email-outbox/`**, no
subcarpeta. Ver:

```
pages/admin/
  ├── email-outbox/                   # Bandeja de Correos (existente)
  ├── email-outbox-dashboard-dia/     # Dashboard del día (Chat 2 FE)
  ├── email-outbox-diagnostico-correos-dia/   # F3.FE (este chat)
  └── email-outbox-diagnostico-correo/        # F4.FE (este chat)
```

La ruta URL sí es anidada (`/intranet/admin/email-outbox/diagnostico-*`),
pero el folder FE es hermano por claridad (cada pantalla auto-contenida).

### Tests baseline

- `dotnet test` BE verde en `1371` (post Chat 4 BE). Los endpoints están vivos.
- FE baseline esperado al arrancar este chat: `~1549` (post Chat 2 FE cerrado).

## FUERA DE ALCANCE

- ❌ **Cambios en BE** — los 2 endpoints ya están desplegados. Si aparece un
  campo faltante en el DTO, abrir micro-chat separado para ampliar el BE.
- ❌ **Persistencia del último correo buscado** en localStorage (decisión 4).
- ❌ **Export de diagnóstico a PDF/Excel** — no es el universo ni dolor del
  admin. Queries SSMS ya cubren export. Si el admin lo pide, micro-chat
  nuevo usando `rules/reports-exportable.md`.
- ❌ **Pantalla de blacklist crud** — ya existe `EmailBlacklistController`
  con su propia pantalla si aplica. Este chat solo muestra el estado
  read-only del correo consultado.
- ❌ **Historial profundo > 50 filas** — cap fijo en BE. Si se pide más,
  abrir chat para parametrizar.
- ❌ **Polling automático** (decisión 2) — refresh manual con botón.
- ❌ **Unificación en una sola pantalla con tabs** (decisión 1).
- ❌ **Navegación entre pantallas** — cada una vive sola. El admin usa el
  menú. Si se vuelve dolor, micro-chat para agregar "ver diagnóstico
  histórico" desde fila de `dashboard-dia` → `diagnostico-correo`.

## CRITERIOS DE CIERRE

```
INVESTIGACIÓN INICIAL (≤ 15 min)
[ ] Leer estructura de email-outbox-dashboard-dia (molde canónico)
[ ] Leer los 2 DTOs BE para confirmar shape
[ ] Confirmar endpoints BE desplegados en dev (ambos commits pusheados)
[ ] Confirmar las 5 DECISIONES con usuario antes de codear

FASE A — diagnostico-correos-dia
[ ] Carpeta + 13 archivos del scope creados
[ ] Feature flag + permiso + ruta + menú configurados
[ ] Stat cards renderizan 9 métricas del Resumen
[ ] 3 tablas drill-down con razón tipada (const + type)
[ ] Skeleton screen + minHeight para evitar CLS
[ ] Error codes BE mapeados a toasts
[ ] ~8 tests del checklist pasan
[ ] Lint + build limpios
[ ] Commit separado: "feat(admin): Plan 30 FE Chat 3 — ..."

FASE B — diagnostico-correo
[ ] Carpeta + 13 archivos del scope creados
[ ] Feature flag + permiso + ruta + menú configurados
[ ] Input correo con validación local + echo de CorreoConsultado
[ ] Stat cards renderizan 6 métricas del Resumen
[ ] Blacklist card condicional con severity por estado
[ ] Personas table con tipo-persona-label pipe
[ ] Historia table con 50 filas (expand por fila opcional)
[ ] Copy-to-clipboard del correo consultado
[ ] ~12 tests del checklist pasan
[ ] Lint + build limpios
[ ] Commit separado: "feat(admin): Plan 30 FE Chat 4 — ..."

INVARIANTES
[ ] No hay `.subscribe()` directo sin `takeUntilDestroyed`
[ ] No hay `console.log` (solo `logger`)
[ ] Imports con alias (@core, @shared, @intranet-shared)
[ ] Tipos semánticos (Razon, TipoPersona) con const + type
[ ] Tokens de color (var(--red-*)), no hex literales
[ ] Dropdowns con appendTo="body"
[ ] Botones icon-only con pt + aria-label
[ ] Skeleton + minHeight en secciones con data async

VALIDACIÓN
[ ] `npm run lint` limpio
[ ] `npm run build` OK
[ ] `npm test` con delta esperado (~1549 → ~1569)
[ ] Smoke manual contra dev con ambas pantallas:
    1. diagnostico-correos-dia?fecha=hoy → render completo
    2. diagnostico-correos-dia?fecha=futura → toast error FECHA_FUTURA_INVALIDA
    3. diagnostico-correo?correo=vacío → toast CORREO_REQUERIDO
    4. diagnostico-correo?correo=real → render completo con historia

MAESTRO
[ ] maestro.md Plan 30: ~95% → **100% CERRADO**
[ ] Mover este brief a `.claude/chats/closed/`
[ ] Cola top 3 actualizada — slot del Plan 30 libre
[ ] Commit docs: "docs(maestro): Plan 30 ✅ cerrado 100% — FE consumer"
```

## COMMIT MESSAGE sugerido

### Commit A — Fase diagnostico-correos-dia (educa-web main)

**Subject** (≤ 72 chars):

```
feat(admin): Plan 30 Chat 3 FE — gap asistencia-vs-correos page
```

**Body**:

```
Add admin page "/intranet/admin/email-outbox/diagnostico-correos-dia"
consuming the read-only endpoint closed in Plan 30 Chat 3 BE
(commit "eb92ec2"). Replaces the manual SQL set that verifies INV-C11
+ D2/D3/D5 every day.

 - Page loads "DiagnosticoCorreosDiaDto" with 9-cell "Resumen"
   summary ("EntradasMarcadas", "EstudiantesConEntrada",
   "EstudiantesFueraDeAlcance", "EstudiantesSinCorreoApoderado",
   "CorreosApoderadosBlacklisteados", "CorreosEnviados",
   "CorreosFallidos", "CorreosPendientes", "CorreosFaltantes") plus
   three drill-down tables: students without guardian email,
   blacklisted guardians with children marked today, entries missing
   outgoing email (typed "Razon": "SIN_CORREO" / "BLACKLISTED" /
   "FALLIDO" / "PENDIENTE" / "SIN_RASTRO").
 - Filter bar with date picker (default today Lima, max 90d back)
   and optional sede dropdown. Manual refresh; no auto-polling
   (consistent with Chat 2 FE).
 - Feature-flagged with "emailOutboxDiagnosticoCorreosDia" (OFF prod
   / ON dev) + new permission "ADMIN_EMAIL_OUTBOX_DIAGNOSTICO_CORREOS_DIA".
   Menu item under Sistema > Monitoreo.
 - Error codes from BE ("FECHA_FORMATO_INVALIDO" /
   "FECHA_FUTURA_INVALIDA" / "FECHA_DEMASIADO_ANTIGUA") mapped to
   localized toasts in the facade.
 - Skeleton screen with minHeight to avoid CLS on initial load.

Tests: N store/facade/component tests. Suite "1549 -> 15NN FE verdes"
("npm test"). Lint + build OK.
```

### Commit B — Fase diagnostico-correo (educa-web main)

**Subject**:

```
feat(admin): Plan 30 Chat 4 FE — email diagnostico page
```

**Body**:

```
Add admin page "/intranet/admin/email-outbox/diagnostico-correo"
consuming the read-only endpoint closed in Plan 30 Chat 4 BE
(commit "3c316a2"). Replaces the manual SSMS set M1-M8 that the
admin runs every time a guardian reports a missing email.

 - Page reads "EmailDiagnosticoDto" for a single recipient: echo
   of the normalized "CorreoConsultado", 6-cell aggregated summary,
   optional "Blacklist" card (active/cleared), table of associated
   persons ("Estudiante" / "Profesor" / "Director" / "Apoderado")
   with masked DNI, and up to 50 history rows sorted DESC with
   "UltimoError" already truncated by the BE.
 - Input field with local validation (trim + regex ".+@.+") before
   hitting the backend. BE error codes "CORREO_REQUERIDO" /
   "CORREO_INVALIDO" mapped to localized toasts.
 - Copy-to-clipboard of the normalized consulted email in the
   header; masked DNIs are read-only.
 - Feature-flagged with "emailOutboxDiagnosticoCorreo" (OFF prod /
   ON dev) + new permission "ADMIN_EMAIL_OUTBOX_DIAGNOSTICO_CORREO".
   Menu item under Sistema > Monitoreo.
 - No localStorage persistence of the consulted email (privacy
   on shared terminals); URL query "?correo=" is supported for
   sharing links with support.

Tests: N store/facade/component tests. Suite "15NN -> 15MM FE
verdes" ("npm test"). Lint + build OK.
```

### Commit C — docs-maestro (separado, mismo repo educa-web)

**Subject**:

```
docs(maestro): Plan 30 ✅ cerrado 100% — FE Chat 3+4 consumer
```

Cuerpo corto: explicación del cierre total del Plan 30 (los 4 chats del
Plan 30 BE + 3 FE), commits hash, baseline tests, brief movido a
`.claude/chats/closed/`.

## CIERRE

Feedback a pedir al cerrar este chat:

1. **Decisiones aceptadas vs ajustadas** — registrar cuál de las 5 recomendaciones
   quedó igual y cuáles ajustó el usuario (especialmente separar en 2 pantallas
   y feature flags independientes).
2. **UX real del admin** — ¿la pantalla de gap ayuda a identificar rápido a
   los "6 estudiantes con entrada sin correo"? ¿La pantalla de diagnóstico
   por correo reemplaza el flujo SSMS de M1-M8 completamente?
3. **Campos faltantes en el DTO** — si el admin usó la pantalla y pidió
   algo que el BE no trae, abrir micro-chat para ampliar endpoint.
4. **Tests baseline** — confirmar delta final (~20 esperados). Si subió/bajó,
   documentar razón.
5. **Plan 30 cerrado al 100%** — actualizar cola top 3 del maestro liberando
   el slot. Candidatos nuevos:
   - Plan 31 Chat 2 BE (desbloqueado cuando el header `X-Educa-Outbox-Id`
     esté validado en Roundcube — hasta entonces sigue estancado).
   - Plan 24 Chat 4 BE (validación `Task.Delay(30000)` + rate limit).
   - Frentes nuevos que surjan del feedback del admin post-deploy de este
     Plan 30 FE.
6. **Telemetría post-deploy** — si el admin adopta las pantallas y encuentra
   casos que no cubren, abrir chats de ajuste menor. Si la adopción es alta,
   el chat justificó el Plan 30.
