> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo. El trabajo es **frontend puro** — el endpoint BE ya está en `master` (commit `a1082eb`). No tocar `Educa.API`.
> **Plan**: 22 · **Chat**: 6 · **Fase**: F4.FE · **Estado**: ⏳ pendiente arrancar — cola top 3 del maestro posición #2 (el #1 es Plan 29 Chat 3 OPS, no es código).

---

# Plan 22 Chat 6 — F4.FE Pantalla admin de auditoría de correos

## PLAN FILE

- Plan canónico (vive en BE): [`../../Educa.API/.claude/plan/asistencia-correos-endurecimiento.md`](../../Educa.API/.claude/plan/asistencia-correos-endurecimiento.md) → sección **"Chat 6 — F4.FE: Pantalla admin de auditoría de correos"** (líneas 575-589).
- Maestro cross-repo: [`.claude/plan/maestro.md`](../../.claude/plan/maestro.md) → fila **22** (97%, cierra a 100% con este chat) + cola top 3 posición #2.
- Contexto de chats cerrados (referencia — NO re-derivar wording):
  - `.claude/chats/closed/030-plan-22-chat-5-be-auditoria-correos.md` — brief del Chat 5 BE que creó el endpoint. Lista las columnas y queries reales, útil para entender la forma del payload.

## OBJETIVO

Pantalla admin read-only que consume `GET /api/sistema/auditoria-correos-asistencia` y permite al director/admin ver los correos activos (Estudiante / Apoderado / Profesor) con formato inválido, navegar al registro correspondiente para corregir el dato en la fuente y así evitar que `EmailOutboxService.EnqueueAsync` los rechace silenciosamente por `INV-MAIL01`.

- Ruta: `/intranet/admin/auditoria-correos`
- Permisos: `Roles.Administrativos` (Director + Asistente Administrativo + Promotor + Coordinador Académico — **alineado con el BE**, NO solo Director+AsistenteAdministrativo como sugería el brief original del plan file)
- Feature flag: `auditoriaCorreos` en `environment.ts` (OFF prod, ON dev)
- Menú: Sistema → Monitoreo → "Auditoría de Correos" (junto a Errores / Bandeja de Correos / Reportes de Usuarios)

## PRE-WORK SÓLIDO (del Chat 5 BE — no re-derivar)

El pre-work SQL del Chat 5 ya está persistido en memoria (`project_email_audit_universe.md`) y en el maestro. Resumen para no tener que consultar:

| Dato | Valor | Implicación FE |
|---|---|---|
| Universo total activo | **192 filas** (180 `EST_CorreoApoderado` + 0 `APO_Correo` + 12 `PRO_Correo`) | No paginar — `<p-table>` con `[value]="items()"` directo |
| Crecimiento esperado | Gradual a ~400 sin plazo fijo | Sigue debajo del umbral — sin paginación tampoco en mediano plazo |
| Estimado de inválidos hoy | **~22-25 filas** (~10-12 estudiantes + ~12 profesores + 0 apoderados) | Tabla cabe completa en pantalla sin scroll vertical exagerado |
| Canal primario | `EST_CorreoApoderado`, NO `APO_Correo` (tabla vacía) | Los stats por tipo van a mostrar "0 Apoderados" — NO es bug, es el estado real |
| Caso dominante de invalidez | Caracteres **invisibles** (zero-width space, NBSP) que el ojo no detecta | UX debe guiar al admin a entender por qué un correo "se ve bien" aparece como inválido |

## ALCANCE

### Estructura del feature (estilo `error-logs` / `feedback-reports`)

```
src/app/features/intranet/pages/admin/auditoria-correos/
├── auditoria-correos.component.ts          # Page (Smart) — consume facade
├── auditoria-correos.component.html
├── auditoria-correos.component.scss
├── index.ts                                 # Barrel export
├── components/
│   ├── auditoria-correos-stats/            # Stats cards (total / por tipo)
│   ├── auditoria-correos-filters/          # Filter bar (tipo, búsqueda)
│   ├── auditoria-correos-table/            # Tabla con acciones de navegación
│   └── auditoria-correos-skeleton/          # Skeleton loader
├── models/
│   └── auditoria-correos.models.ts          # DTO + filter state
└── services/
    ├── auditoria-correos.service.ts         # HTTP gateway
    ├── auditoria-correos.store.ts           # Signals privados + readonly
    └── auditoria-correos.facade.ts          # Orquesta load + filtros + navegación
```

### Archivos a crear

| # | Archivo | Rol | Líneas estimadas |
|---|---------|-----|-----------------:|
| 1 | `models/auditoria-correos.models.ts` | DTO `AuditoriaCorreoAsistenciaDto` + `type TipoOrigen = 'Estudiante' \| 'Apoderado' \| 'Profesor'` + filter state | ~25-30 |
| 2 | `services/auditoria-correos.service.ts` | `GET /api/sistema/auditoria-correos-asistencia` → `Observable<AuditoriaCorreoAsistenciaDto[]>` (interceptor unwraps ApiResponse) | ~25 |
| 3 | `services/auditoria-correos.store.ts` | Estado reactivo: items, loading, error, filterTipo, searchTerm | ~70-90 |
| 4 | `services/auditoria-correos.facade.ts` | `loadAuditoria()`, `refresh()`, `setFilterTipo()`, `navegarAUsuario(item)`, `vm` computed | ~80-100 |
| 5 | `auditoria-correos.component.ts/html/scss` | Page Smart — consume vm del facade, delega a sub-componentes | ~100 total |
| 6 | `components/auditoria-correos-stats/` | Presentational: 4 stat cards (total / estudiantes / apoderados / profesores) siguiendo design-system B3 | ~70 |
| 7 | `components/auditoria-correos-filters/` | Filter bar: search + select por tipo + botón clear (design-system B6) | ~60 |
| 8 | `components/auditoria-correos-table/` | Tabla con columnas tipo-dni-nombre-correo-razón-acción + skeleton. Acción: navegar a usuarios con filtro pre-aplicado | ~130-150 |
| 9 | `components/auditoria-correos-skeleton/` | Wrapper de `<app-stats-skeleton>` + `<app-table-skeleton>` | ~30 |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/app/config/environment.ts` + `environment.development.ts` | Agregar flag `auditoriaCorreos: false` (prod) / `true` (dev) en `features` |
| `src/app/features/intranet/intranet.routes.ts` | Agregar ruta `{ path: 'admin/auditoria-correos', canActivate: [permisosGuard], loadComponent: () => import(...) }` con spread condicional por feature flag |
| `src/app/features/intranet/shared/config/intranet-menu.config.ts` | Agregar entrada en módulo `sistema`, grupo `Monitoreo`, con feature flag check. Label: `"Auditoría de Correos"`, icon sugerido `pi pi-envelope` (o `pi pi-exclamation-triangle`) |

### Estructura del DTO (1:1 con el BE)

```typescript
// src/app/features/intranet/pages/admin/auditoria-correos/models/auditoria-correos.models.ts

export const TIPOS_ORIGEN = ['Estudiante', 'Apoderado', 'Profesor'] as const;
export type TipoOrigen = (typeof TIPOS_ORIGEN)[number];

export const TIPOS_FALLO = ['FAILED_NO_EMAIL', 'FAILED_INVALID_ADDRESS'] as const;
export type TipoFallo = (typeof TIPOS_FALLO)[number];

export interface AuditoriaCorreoAsistenciaDto {
  tipoOrigen: TipoOrigen;       // "Estudiante" | "Apoderado" | "Profesor"
  entidadId: number;             // EST_CodID / APO_CodID / PRO_CodID
  dni: string;                   // YA ENMASCARADO por el BE — "***1234"
  nombreCompleto: string;        // Apellidos + Nombres
  correoActual: string;          // YA ENMASCARADO por el BE — "pa***añ@gmail.com"
  tipoFallo: TipoFallo;
  razon: string;                 // Razón humana corta, ej: "contiene caracteres no permitidos..."
}
```

**Importante**: la respuesta ya viene **camelCase** (convención del pipeline Newtonsoft del BE). Si llegara PascalCase, confirmar con el usuario antes de agregar transformadores.

### UI — design-system

Seguir las pautas del design-system (`.claude/rules/design-system.md` sección 7 B1-B11):

- **Page header** (B2): icon `pi pi-envelope` (o equivalente), title "Auditoría de Correos", subtitle "Correos activos con formato inválido". Header actions: refresh + (opcional) export CSV si el usuario lo pide.
- **Stats cards** (B3): 4 cards — Total / Estudiantes / Apoderados / Profesores. Usar `app-stats-skeleton` para loading.
- **Filter bar** (B6): search + p-select de tipo + btn-clear con `margin-left: auto`. `appendTo="body"` obligatorio.
- **Tabla** (B4): `<p-table>` con columnas UPPERCASE, rows con `row-inactive` NO aplica (todos activos). Empty state "No hay correos inválidos — todo está en orden".
- **Row actions** (B5): un solo botón `pi pi-external-link` o `pi pi-pencil` con tooltip "Ir a usuarios" / "Corregir". Triplet NO aplica — no hay ver/toggle/eliminar aquí.
- **Banner informativo** (B9): banner azul suave arriba de la tabla explicando qué hace la pantalla y mencionando el caso de caracteres invisibles. Colors: `color-mix(in srgb, var(--blue-500) 15%, transparent)` + `var(--blue-800)` border/text.

### Tipos de fallo — mapping a labels humanos

```typescript
const TIPO_FALLO_LABEL: Record<TipoFallo, string> = {
  FAILED_NO_EMAIL: 'Sin correo',
  FAILED_INVALID_ADDRESS: 'Formato inválido',
};
```

El DTO ya trae `razon` con texto humano; úsalo como tooltip o segunda línea en la celda. El `tipoFallo` como badge compacto para filtrar/visualizar severidad.

### Navegación desde la tabla

Al hacer clic en la acción de una fila, navegar a `/intranet/admin/usuarios` con query params que pre-filtren la tabla de usuarios por rol + búsqueda. **Investigar en el chat** qué query params acepta la page `/intranet/admin/usuarios` hoy (reading `features/intranet/pages/admin/usuarios/usuarios.component.ts`). Si no acepta query params, proponer al usuario:

- Opción A: agregar soporte de query params a `usuarios` (expansión mínima de scope — +~20 líneas).
- Opción B: copiar el DNI enmascarado al clipboard con un toast ("DNI copiado — pégalo en el buscador de Usuarios") y navegar sin query params. Más barato pero peor UX.

Decidir con el usuario en el chat según el trade-off real visto al investigar. **No asumir** una opción sin consultar.

## TESTS MÍNIMOS

Framework: **Vitest** (ver `.claude/rules/testing.md`).

### Smoke tests (page + facade)

| Caso | Setup | Esperado |
|------|-------|----------|
| Page renderiza skeleton mientras carga | `facade.vm().loading = true` | `<app-auditoria-correos-skeleton>` visible, tabla ausente |
| Page renderiza stats + tabla cuando carga termina | Mock 3 items (1 de cada tipo) | 4 stat cards con counts correctos (1/1/1 + total 3), 3 rows en tabla |
| Page renderiza empty state si lista vacía | Mock `[]` | Stats todos en 0, tabla muestra "No hay correos inválidos" |
| Filtro por tipo reduce items | 6 items (2 de cada tipo), filter tipo "Estudiante" | Tabla muestra 2 rows, stats NO se modifican (son del universo completo) |
| Search filtra por nombre/dni | 3 items con nombres distintos, search "Perez" | Solo fila que matchea |
| Clear filters resetea | Filters aplicados → click clear | Tabla muestra todos los items, filtros vacíos |
| Error al cargar muestra toast | Mock `error` en service | Toast de error, stats/tabla vacías o con empty state de error |

### Guard de permisos

Test que la ruta está configurada con `permisosGuard` y no es accesible sin sesión con rol administrativo. Seguir el pattern de tests existentes de rutas admin.

### Feature flag

Test que la ruta NO se registra si `environment.features.auditoriaCorreos = false`. Seguir el pattern de las rutas condicionadas por flag en `intranet.routes.ts`.

## REGLAS OBLIGATORIAS

- **Arquitectura**: Facade + Store + Service (ver `.claude/rules/architecture.md`, `.claude/rules/state-management.md`). Signals privados + `asReadonly()` — NO exponer mutables. Component consume `vm` computed del facade.
- **NO duplicar enmascaramiento**: el DTO ya viene enmascarado. Mostrar `dni` y `correoActual` tal cual vienen del BE.
- **Reading optimization**: el interceptor auto-unwrap `ApiResponse<T>`. El service retorna `Observable<AuditoriaCorreoAsistenciaDto[]>`, NO `Observable<ApiResponse<...>>`. Ver `feedback_api_response_unwrap.md`.
- **Logger no console**: `import { logger } from '@core/helpers';` — NUNCA `console.log`.
- **takeUntilDestroyed** en todo `.subscribe()` de component/facade. Ver `.claude/rules/state-management.md`.
- **PrimeNG `appendTo="body"`** en todo `p-select` / `p-multiselect` / `p-calendar`. Ver `.claude/rules/primeng.md`.
- **a11y**: botones icon-only con `aria-label` vía `pt`. Ver `.claude/rules/a11y.md`.
- **OnPush** en todos los components presentacionales. Page puede ser Default si necesita, pero preferir OnPush.
- **Skeleton obligatorio**: reusar `<app-table-skeleton>` y `<app-stats-skeleton>` del shared. Ver `.claude/rules/skeletons.md`.
- **Design system**: NO hex literales sobre fondos planos — usar tokens (`--red-600`, `--blue-800`, etc.). Ver `.claude/rules/design-system.md` §7 D.
- **Cap 500 líneas** por archivo TS (warning 350, bloqueo 500). Cap 250 HTML. Cap 30 líneas por función (warning 50). Ver `.claude/rules/crud-patterns.md` "Límites de Tamaño".
- **Feature flag**: el flag controla tanto la ruta como la entrada de menú. Alternar `false`/`true` en `environment.ts`/`environment.development.ts` debe ser suficiente para ocultar/mostrar el feature completo.
- **Menu modules** (`.claude/rules/menu-modules.md`): la pantalla va en módulo **Sistema** → grupo **Monitoreo** (pregunta rectora "¿cómo se configura la plataforma?" — monitoreo de datos que el admin corrige, infraestructura de la plataforma).

## APRENDIZAJES TRANSFERIBLES (del Chat 5 BE)

1. **Endpoint en master pero sin deploy aún**: `GET /api/sistema/auditoria-correos-asistencia` está en `Educa.API` branch `master` (commit `a1082eb`). Funciona en local apuntando al BE local. Para staging/prod requiere deploy del BE. Decidir con el usuario al arrancar el chat si se trabaja contra BE local (recomendado) o contra staging.

2. **Roles del endpoint**: `[Authorize(Roles = Roles.Administrativos)]` a nivel clase — los 4 roles administrativos. El guard FE debe alinear con esto. NO restringir a Director+AsistenteAdministrativo solamente (ese wording venía del brief original del plan, pero el BE abrió a los 4).

3. **Forma del payload**: camelCase. El BE configura Newtonsoft con `PropertyNamingPolicy = CamelCase` para SignalR (Program.cs) pero los controllers HTTP usan Newtonsoft con la config default — **confirmar en el chat** al recibir el primer response real si llega `tipoOrigen` (camelCase) o `TipoOrigen` (PascalCase). Si llega PascalCase, el interceptor de response puede necesitar ajuste o usar `@JsonProperty` en el modelo TS.

4. **Orden determinista**: el BE ya ordena `TipoOrigen ASC, EntidadId ASC`. Si el FE reordena (ej: por TipoFallo) asumir que es cliente-side, no que el BE cambió el orden.

5. **Correos ya enmascarados**: no aplicar `substring` ni regex de enmascarado en FE. Mostrar tal cual.

6. **Estimado hoy**: 22-25 filas visibles. Diseñar UI asumiendo "la tabla cabe en pantalla sin scroll". Con ~50 filas post-crecimiento tampoco es problema.

7. **Caso dominante = caracteres invisibles**: el admin va a ver un correo `"luciamefcg@gmail.com"` marcado como inválido y va a decir "pero si se ve bien". El banner informativo y el `razon` del DTO deben guiar ("contiene caracteres no permitidos como ñ, tildes o espacios invisibles — copia el correo a Notepad++ o VS Code con whitespace render para verificar"). Considerar un tooltip con ese texto.

8. **Pattern de referencia** en `/intranet/admin/error-logs` y `/intranet/admin/feedback-reports` — mismo estilo (admin read-only + filtros + stats). Leer uno de esos antes de codear para capturar el layout/convenciones sin reinventar.

9. **`Roles.Administrativos` ya está en `@shared/constants/app-roles.ts`** (confirmar en el chat — si no, agregarlo con los 4 roles del BE).

10. **Memoria persistente disponible**: `project_email_audit_universe.md` tiene el snapshot del universo. Útil para justificar decisiones de UX sin re-correr SQL.

## FUERA DE ALCANCE

- **Edición masiva de correos** — este endpoint es read-only. La corrección se hace yendo a Usuarios y editando el registro individual.
- **Export a Excel/PDF** — si el universo es 22-25 filas y el admin va a corregir en el momento, exportar no agrega valor. Si el usuario lo pide en el chat, agregar como scope incremental (no adelantar).
- **Sweep periódico / notificación al admin** — fuera de alcance. El admin visita la pantalla manualmente. Si en el futuro se quiere notificar proactivamente, es un feature nuevo.
- **Corrección automática de caracteres invisibles** (`email.Replace('​', '')`) — fuera de alcance. El admin decide caso por caso. Corregir automáticamente puede cambiar un correo válido a inválido si el carácter era intencional (improbable pero posible).
- **Validación del lado FE** del formato del correo — el BE ya valida con `EmailValidator.Validate()`. NO duplicar regex en FE. La razón del fallo la comunica el BE.
- **Backend** — el endpoint está cerrado en Chat 5. Si se descubre un bug del BE durante el chat, abrir issue/chat separado, NO arreglar en este chat.
- **Plan 24** (sync CrossChex background) — arranca después de este chat.

## CRITERIOS DE CIERRE

```
INVESTIGACIÓN INICIAL (≤ 10 min)
[ ] Leer 1 page de referencia: /intranet/admin/error-logs o /intranet/admin/feedback-reports
[ ] Confirmar shape del response real (camelCase vs PascalCase) con una request en dev
[ ] Investigar si /intranet/admin/usuarios acepta query params (?search, ?rol) y decidir opción A vs B de navegación

CÓDIGO
[ ] 9 archivos nuevos creados (page + facade + store + service + models + 4 sub-components)
[ ] Ruta agregada en intranet.routes.ts con feature flag + permisosGuard
[ ] Entrada de menú agregada en intranet-menu.config.ts módulo Sistema → Monitoreo con feature flag
[ ] Feature flag auditoriaCorreos agregado en ambos environment files
[ ] Cap de líneas respetado (≤ 500 TS, ≤ 250 HTML, ≤ 30/función)

UI / DESIGN SYSTEM
[ ] Page header con icon + title + subtitle + refresh button (B2)
[ ] 4 stat cards (Total / Estudiantes / Apoderados / Profesores) con skeleton (B3)
[ ] Filter bar search + tipo + clear (B6)
[ ] Tabla con columnas UPPERCASE + skeleton + empty state (B4)
[ ] Banner azul informativo arriba explicando el caso de caracteres invisibles (B9)
[ ] Navegación al registro (opción A con query params o opción B con clipboard, según decisión)
[ ] NO hay hex literales sobre fondos planos (usar tokens CSS)

ARQUITECTURA
[ ] Facade + Store + Service separados (no god-component)
[ ] Signals privados con asReadonly()
[ ] vm computed en el facade
[ ] NO duplicación de enmascaramiento (DNI y correo tal cual del BE)
[ ] takeUntilDestroyed en todas las subscripciones

VALIDACIÓN
[ ] npm run lint limpio
[ ] npm test verdes — suite ≥ 1519 baseline + 7-10 tests nuevos esperados
[ ] npm run build limpio
[ ] Smoke manual en dev con BE local corriendo — ver filas reales, filtrar, navegar

MAESTRO
[ ] maestro.md fila 22 actualizada: 97% → 100% + nota "Chat 6 F4.FE cerrado, Plan 22 cerrado"
[ ] cola top 3 actualizada: Chat 6 removido, Plan 24 Chat 1 promovido a #2 (si sigue siendo el siguiente), nuevo item al final si aplica
[ ] Foco actualizado reflejando cierre de Chat 6 y cierre completo de Plan 22

COMMIT
[ ] Un solo commit en educa-web main con el subject sugerido abajo
[ ] Mover este archivo a educa-web/.claude/chats/closed/031-plan-22-chat-6-fe-auditoria-correos-pantalla.md
[ ] NO requiere commit separado en Educa.API (no hay cambios de BE en este chat)
```

## COMMIT MESSAGE sugerido

### Commit FE (educa-web main)

**Subject** (≤ 72 chars):

```
feat(auditoria): Plan 22 Chat 6 — add admin "auditoria-correos" page
```

**Body**:

```
Close Plan 22 Chat 6 F4.FE. Add read-only admin page that consumes
"GET /api/sistema/auditoria-correos-asistencia" (Plan 22 Chat 5 BE,
commit "a1082eb") and lists active "Estudiante"/"Apoderado"/"Profesor"
rows whose email fails "EmailValidator.Validate()" — the same
validator the outbox applies ("INV-MAIL01"). Allows the admin to
spot invalid emails (typically invisible characters like zero-width
space) and correct them at the source before the outbox silently
rejects them.

 - Route "/intranet/admin/auditoria-correos" with "permisosGuard" +
   "Roles.Administrativos" (4 administrative roles aligned with BE).
 - Feature flag "auditoriaCorreos" in "environment.ts" (OFF prod,
   ON dev) guards both route and menu entry.
 - Menu entry under Sistema → Monitoreo.
 - Facade + Store + Service architecture (read-only, no CRUD).
 - DTO "AuditoriaCorreoAsistenciaDto" consumed 1:1 from BE — DNI
   and email already masked server-side, NO duplicate masking in FE.
 - Stats cards (total + by tipo) + filter bar (search + tipo select)
 - + tabla with UPPERCASE headers + row action to navigate to user
   record. Informative banner explaining the invisible-character
   case so the admin understands why an apparently-clean email is
   flagged.

Tests:
 - N smoke tests covering loading skeleton, stats computation, tipo
   filter, search filter, clear filters, empty state, error handling.
 - Route registration test guarded by feature flag.

Suite "<baseline>+<delta> verdes" ("npm test"). Lint + build OK.
Plan 22 fila 22 de 97% a 100% — plan cerrado.
```

### Commit docs maestro (separado si aplica — en este caso NO, porque el docs va en el mismo commit)

Este chat es FE puro en `educa-web main` y el maestro también vive en `educa-web`. Un solo commit cubre código + docs.

**Recordatorios** (skill `commit`):

- Inglés imperativo (`add`, `close`, `consume`, `align`).
- Español solo entre `"..."` para dominio (`"EmailValidator.Validate()"`, `"INV-MAIL01"`, `"AuditoriaCorreoAsistenciaDto"`, `"Roles.Administrativos"`, `"Sistema"`, `"Monitoreo"`, `"permisosGuard"`).
- NUNCA `Co-Authored-By`.

## CIERRE

Feedback a pedir al cerrar el Chat 31 (Plan 22 Chat 6):

1. **Decisión de navegación** — ¿se implementó opción A (query params en `/admin/usuarios`) u opción B (clipboard)? Si fue A, ¿se descubrió que era más ambicioso de lo esperado (más de 20 líneas)? Anotar en el maestro si aplica como deuda técnica menor.
2. **Filas reales visibles en dev** — ¿cuántas filas aparecieron con BE local conectado? Si fue significativamente distinto del estimado (22-25), actualizar el memory `project_email_audit_universe.md` con el número real.
3. **Feature flag** — ¿se dejó OFF en prod inicialmente para validar con el usuario antes de exponer? ¿Cuándo se va a prender (post-deploy del BE)?
4. **Próximo chat tras 31** — Plan 22 queda cerrado al 100%. El siguiente es **Plan 24 Chat 1** (design session, sync CrossChex en Background Job, repo `Educa.API`). La cola top 3 hay que reordenar: #1 sigue siendo Plan 29 Chat 3 OPS; #2 promueve a Plan 24 Chat 1; #3 queda abierto (discutir con el usuario qué frente priorizar post-Plan-22).
