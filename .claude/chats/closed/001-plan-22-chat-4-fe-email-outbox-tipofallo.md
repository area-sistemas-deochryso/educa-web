> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 22 · **Chat**: 4 · **Fase**: F3.FE · **Estado**: ⏳ WIP (9 archivos modificados en git status al 2026-04-21 — email-outbox models/pipes untracked).

---

# Plan 22 Chat 4 — F3.FE: UI admin email-outbox con `tipoFallo`

## PLAN FILE

- Frontend (maestro): [.claude/plan/maestro.md](.claude/plan/maestro.md) → **Plan 22 — Endurecimiento correos de asistencia**, fila `Chat 4 — F3.FE`.
- Backend (plan base, referencia): [`../Educa.API/.claude/plan/asistencia-correos-endurecimiento.md`](../Educa.API/.claude/plan/asistencia-correos-endurecimiento.md) → sección **"Chat 4 — F3.FE: UI admin outbox con TipoFallo (FE, 1 chat, repo `educa-web`, `/execute`)"**.

## OBJETIVO

En `/intranet/admin/email-outbox`:

1. Mostrar una nueva columna **"Tipo de fallo"** en la tabla con badge `p-tag`, severity coherente, y tooltip con la razón (`EO_UltimoError`).
2. Agregar filtro **"Tipo de fallo"** en la barra de filtros (dropdown, `appendTo="body"`).
3. Deshabilitar el botón **"Reintentar"** con tooltip explicativo cuando el tipo es **permanente** (no tiene sentido reintentar un bounce con destinatario inválido sin corregir el registro origen).

**Puramente frontend**. El backend ya entrega `EmailOutbox.EO_TipoFallo` en el DTO `EmailOutboxListaDto` desde Plan 22 Chat 2 (F2) cerrado 2026-04-21.

---

## PRE-WORK OBLIGATORIO (regla DB SELECT first — aplicada a archivos)

**El task anterior dio un aprendizaje duro**: los archivos/estructura que el plan asume pueden no coincidir con la realidad del repo. Antes de tocar código, confirmar:

```bash
# 1. ¿Existe ya la página admin/email-outbox?
ls "src/app/features/intranet/pages/admin/email-outbox/" 2>&1

# 2. Localizar DTO frontend del outbox (ya debe existir con 'estado', 'destinatario', etc.)
find src/app -name "*outbox*.models.ts" -o -name "*email-outbox*.ts" 2>&1 | head -20

# 3. ¿Ya existe algún pipe tipoFallo?
find src/app -name "tipo-fallo*" 2>&1

# 4. ¿Ya existen constantes de tipos de fallo en frontend?
grep -rn "FAILED_INVALID_ADDRESS\|FAILED_MAILBOX_FULL\|FAILED_UNKNOWN" src/app/ 2>&1 | head -10

# 5. ¿El DTO ya tiene "tipoFallo" (puede haberse agregado en F2 sin UI)?
grep -rn "tipoFallo\|TipoFallo" src/app/ 2>&1 | head -20

# 6. Ver el store/facade del feature para decidir dónde inyectar el nuevo filtro
find src/app/features/intranet/pages/admin/email-outbox -name "*.store.ts" -o -name "*.facade.ts" 2>&1
```

Si alguno devuelve vacío o algo inesperado, **pausar y discutir** antes de inventar estructura. Específicamente:

- Si la página NO existe → confirmar si hay que crearla desde cero (no es F3.FE entonces, es fase previa).
- Si el DTO NO tiene `tipoFallo` → agregar al tipo antes de seguir; verificar si falta unwrap/mapping en el service.
- Si ya hay un pipe `tipoFallo*` → reusar, no duplicar.

---

## ALCANCE

### Archivos a crear

| Archivo | Rol | Líneas estimadas |
| --- | --- | ---: |
| `src/app/features/intranet/pages/admin/email-outbox/pipes/tipo-fallo-label.pipe.ts` | Pipe puro: `FAILED_INVALID_ADDRESS` → `"Dirección inválida"`, etc. | ~40 |
| `src/app/features/intranet/pages/admin/email-outbox/pipes/tipo-fallo-severity.pipe.ts` | Pipe puro: `FAILED_*` permanentes → `"danger"`, transitorios → `"warn"`, `null` → `"info"` | ~35 |
| `src/app/features/intranet/pages/admin/email-outbox/models/tipo-fallo.models.ts` | `TiposFallo` (const array), `TipoFallo` (type), `TIPOS_PERMANENTES` (const array), helper `esPermanente(tipo)` | ~30 |
| `src/app/features/intranet/pages/admin/email-outbox/pipes/tipo-fallo-label.pipe.spec.ts` | Vitest: 6+ casos del pipe label | ~50 |
| `src/app/features/intranet/pages/admin/email-outbox/pipes/tipo-fallo-severity.pipe.spec.ts` | Vitest: 6+ casos del pipe severity | ~50 |

> Rutas exactas a ajustar según lo que devuelva el pre-work. Si ya hay una carpeta `pipes/` en el feature, usarla. Si todo vive inline en el componente, decidir dónde ponerlos siguiendo `rules/domain-modeling.md` (feature-scoped).

### Archivos a modificar (según pre-work)

| Archivo (probable) | Cambio |
| --- | --- |
| `src/app/data/models/email-outbox.models.ts` o feature models | Si falta, agregar `tipoFallo?: TipoFallo \| null` al `EmailOutboxListaDto` (debe venir del backend ya; verificar). |
| Componente tabla del feature (ej: `email-outbox-table.component.html/ts`) | + columna "Tipo de fallo" con `<p-tag [value]="row.tipoFallo \| tipoFalloLabel" [severity]="row.tipoFallo \| tipoFalloSeverity" [pTooltip]="row.ultimoError">`. Respetar convención de `rules/design-system.md` §6 (Opción C): tags de severidad crítica usan `[severity]` sin `styleClass="tag-neutral"`. |
| Componente filtros (ej: `email-outbox-filters.component.html/ts`) | + `<p-select>` con opciones derivadas de `TIPOS_FALLO` + `appendTo="body"` + label uppercase del estándar. |
| Store del feature | + signal privado `_filterTipoFallo = signal<TipoFallo \| null>(null)` + `asReadonly()` + setter `setFilterTipoFallo`. |
| Facade del feature | + acción `setFilterTipoFallo(tipo)` que dispara `refetch` o filtrado client-side según como ya funcione el filtro de `estado`. |
| Botón "Reintentar" (tabla o detail drawer) | `[disabled]="esPermanente(row.tipoFallo)"` + `pTooltip` explicando el porqué + `[pt]` aria-label dinámico. Si el botón es icon-only, aria-label OBLIGATORIO (regla `a11y.md`). |

---

## MAPEO TIPO → LABEL → SEVERITY

Replicar estos valores literalmente en los pipes:

| `tipoFallo` (backend) | Label (es) | Severity PrimeNG | ¿Permanente? |
| --- | --- | --- | :-: |
| `FAILED_INVALID_ADDRESS` | Dirección inválida | `danger` | ✅ |
| `FAILED_NO_EMAIL` | Sin correo | `danger` | ✅ |
| `FAILED_MAILBOX_FULL` | Bandeja llena | `danger` | ✅ |
| `FAILED_REJECTED` | Rechazado por servidor | `danger` | ✅ |
| `FAILED_UNKNOWN` | Error desconocido | `warn` | ❌ (admin puede reintentar) |
| `FAILED_TRANSIENT` | Transitorio agotado | `warn` | ❌ |
| `TRANSIENT` | En reintento | `info` | ❌ |
| `null` / `undefined` | Sin clasificar | `info` | ❌ |

**Reintentar** se deshabilita SOLO para los marcados `✅ Permanente`. El resto queda habilitado porque:

- `FAILED_UNKNOWN` puede ser un auth fail temporal (ver aprendizaje del Chat 2: 535 auth que el admin puede reintentar tras rotar credenciales).
- `FAILED_TRANSIENT` se agotó tras 2 intentos automáticos, pero el admin puede forzar uno manual.
- `TRANSIENT` es estado vivo — no debería aparecer como FAILED, pero si aparece por race condition, permitir retry.
- `null` sigue la política previa (reintentar permitido).

---

## TESTS MÍNIMOS

### Pipe `tipoFalloLabel`

| Input | Output esperado |
| --- | --- |
| `"FAILED_INVALID_ADDRESS"` | `"Dirección inválida"` |
| `"FAILED_UNKNOWN"` | `"Error desconocido"` |
| `"TRANSIENT"` | `"En reintento"` |
| `null` | `"Sin clasificar"` |
| `undefined` | `"Sin clasificar"` |
| `"BOGUS_VALUE"` (fallback desconocido) | El mismo string tal cual, o `"Sin clasificar"` — decidir y testear |

### Pipe `tipoFalloSeverity`

| Input | Output esperado |
| --- | --- |
| `"FAILED_INVALID_ADDRESS"` | `"danger"` |
| `"FAILED_MAILBOX_FULL"` | `"danger"` |
| `"FAILED_UNKNOWN"` | `"warn"` |
| `"TRANSIENT"` | `"info"` |
| `null` | `"info"` |

### Helper `esPermanente(tipo)`

| Input | Output |
| --- | --- |
| `"FAILED_INVALID_ADDRESS"` | `true` |
| `"FAILED_NO_EMAIL"` | `true` |
| `"FAILED_MAILBOX_FULL"` | `true` |
| `"FAILED_REJECTED"` | `true` |
| `"FAILED_UNKNOWN"` | `false` |
| `"FAILED_TRANSIENT"` | `false` |
| `null` | `false` |

---

## REGLAS OBLIGATORIAS

- **PrimeNG**: `appendTo="body"` obligatorio en `<p-select>` del filtro (`rules/primeng.md`).
- **Accesibilidad**: el botón "Reintentar" si es icon-only DEBE tener `[pt]="{ root: { 'aria-label': '...' } }"` dinámico según estado (`rules/a11y.md`).
- **Design system**: el badge de `tipoFallo` es un **estado operativo crítico** → usar `[severity]` sin `styleClass="tag-neutral"` (`rules/design-system.md` §6, Opción C).
- **Azul oscuro sobre fondo claro**: NO usar `var(--primary-color)` (celeste) — si aparece un acento azul, usar `#1e40af` (`rules/a11y.md`).
- **Pipes puros** siempre (`pure: true` default; nunca `pure: false`).
- **Mutación quirúrgica**: al reintentar, actualizar solo la fila del ID, no refetch completo (`rules/crud-patterns.md`).
- **Overlays no en `@if`**: confirm dialogs si se usan van al DOM (`rules/dialogs-sync.md`).
- **Signals privados + `asReadonly()`** en el store (`rules/state-management.md`).
- **trackBy único** en `@for` sobre filas (`rules/templates.md`).
- **Cap 300 ln / función 50 ln** por archivo.
- **WAL para la mutación "reintentar"**: si hoy el feature usa `wal.execute`, mantenerlo. Si no, no introducir WAL aquí — el cambio es pequeño y solo mutación de estado local tras éxito del endpoint (`rules/optimistic-ui.md`).

---

## APRENDIZAJES TRANSFERIBLES (del Chat 3 F3.BE que acaba de cerrar)

**Backend entrega**:

- `EmailOutboxListaDto.TipoFallo` (string? nullable) ya existe en el DTO backend desde F2. Posibles valores finitos (lista completa arriba). Confirmar en pre-work que el service frontend lo mapea.
- Endpoint `PATCH /api/email-outbox/{id}/reintentar` (o equivalente) **no rechaza** por tipo. El gate "no reintentar permanentes" es **100% frontend** — el admin podría técnicamente llamar el API si quisiera. Esto es intencional: el FE provee UX, el BE mantiene la flexibilidad.
- El correo resumen diario del job nuevo `ReporteFallosCorreoAsistencia` NO aparecerá en el filtro de `EntidadOrigen` `Asistencia`/`AsistenciaProfesor` si filtran así la tabla — lleva `EO_EntidadOrigen = "ReporteFallosCorreoAsistencia"`. Confirmar con usuario si ese tipo debe verse también (mostrar todos los failed sin importar origen) o filtrarse.
- El backend persiste también en `ErrorLog` cada fallo — no es parte de esta UI (ese es un módulo aparte `/admin/error-logs`), pero vale saberlo por si el admin pregunta dónde ver más detalle técnico.

**Valores de `TipoFallo` activos en producción (datos reales del Chat 2)**:

- Las 7 filas históricas fueron `FAILED_UNKNOWN` (en realidad `535 Incorrect authentication data` — auth SMTP mal configurada en su momento).
- Lo esperado en producción post-F2: ver `FAILED_INVALID_ADDRESS` de los correos con ñ/tildes, `FAILED_MAILBOX_FULL` ocasional, y `FAILED_TRANSIENT` muy raro.
- **No es realista** ver `TRANSIENT` en la tabla con `estado=FAILED` — `TRANSIENT` siempre viene acompañado de `estado=PENDING`. Si aparece en la UI con `FAILED`, es un bug del backend a reportar.

**Convenciones reafirmadas en el Chat 3**:

- Tests backend usan `Moq` + `FluentAssertions` + `xUnit`. En frontend aquí es **Vitest** (`rules/testing.md`).
- La skill `commit` es estricta: inglés + español solo entre `"..."` + sin `Co-Authored-By`. Aplicar igual en frontend.
- Antes de codificar, hacer el pre-work y pedir decisiones. Evita que el chat improvise cuando la realidad del repo difiere del plan.

---

## FUERA DE ALCANCE

- **Chat 5 (F4.BE)**: endpoint `GET /api/sistema/auditoria-correos-asistencia` que lista preventivamente correos con formato inválido. Es backend, no toca esta UI.
- **Chat 6 (F4.FE)**: pantalla `/intranet/admin/auditoria-correos`. Nueva página distinta.
- Cambios al backend — si el DTO no tiene `tipoFallo`, **pausar y discutir** antes de modificar el backend (no es alcance de este chat).
- Reintento con confirmación override para tipos permanentes — plan actual dice disabled hard; si el usuario lo pide en el feedback de cierre, agendar Chat futuro.
- Cambios al job `ReporteFallosCorreoAsistencia` ni al `EmailFailureLogger` — eso cerró en F3.BE.
- Nuevas vistas o widgets fuera del feature `email-outbox`.

---

## CRITERIOS DE CIERRE

- [ ] Pre-work ejecutado y compartido con el usuario antes de codificar
- [ ] `TipoFallo` / `TiposFallo` + `TIPOS_PERMANENTES` + helper `esPermanente` creados en models del feature
- [ ] Pipe `tipoFalloLabel` creado y con tests Vitest verdes (mín 6 casos)
- [ ] Pipe `tipoFalloSeverity` creado y con tests Vitest verdes (mín 6 casos)
- [ ] Columna "Tipo de fallo" visible en tabla con `<p-tag>` + tooltip de razón
- [ ] Filtro "Tipo de fallo" en filter bar con `appendTo="body"`
- [ ] Botón "Reintentar" deshabilitado + tooltip + aria-label dinámico cuando `esPermanente(row.tipoFallo)`
- [ ] `npm run lint` limpio (sin nuevos warnings)
- [ ] `npm test` verde (sin regresiones — si la suite tenía X, sigue en X o X+N por los nuevos pipes)
- [ ] `npm run build` limpio
- [ ] Smoke check manual en dev: mostrar tabla, filtrar por cada tipo, intentar reintentar un permanente (debe estar disabled), reintentar un `FAILED_UNKNOWN` (debe funcionar y mutar localmente sin refetch)
- [ ] Actualizar `.claude/plan/maestro.md`: Plan 22 Chat 4 ✅ con fecha, resumen del entregable y próximo Chat 5 (F4.BE) en repo backend
- [ ] (Opcional, si el usuario lo pide) Actualizar `../Educa.API/.claude/plan/asistencia-correos-endurecimiento.md` marcando Chat 4 ✅ desde la sección resumen
- [ ] Commit frontend con el mensaje sugerido abajo

---

## COMMIT MESSAGE sugerido

Idioma: **inglés**. Español solo entre `"..."` para términos de dominio (`"tipoFallo"`, `"FAILED_INVALID_ADDRESS"`, `"Reintentar"`). **NO incluir `Co-Authored-By`** (regla explícita de la skill `commit`).

Frontend (repo `educa-web`, branch `main`):

```text
feat(email-outbox): Plan 22 F3.FE — "tipoFallo" badge + filter + retry gate

- Add "Tipo de fallo" column to admin outbox table with severity badge
  (danger for permanent bounces, warn for transient, info for null).
- Add "tipoFallo" dropdown filter in filter bar with appendTo="body".
- Disable "Reintentar" button with tooltip for permanent types
  ("FAILED_INVALID_ADDRESS", "FAILED_NO_EMAIL", "FAILED_MAILBOX_FULL",
  "FAILED_REJECTED") — backend allows the call, FE gates the UX.
- New pure pipes "tipoFalloLabel" + "tipoFalloSeverity" with Vitest
  unit tests (N cases each).
- New models file with "TiposFallo" const + "esPermanente" helper.

Closes Plan 22 F3.FE.
```

Maestro update (si se hace commit aparte):

```text
docs(maestro): close Plan 22 Chat 4 — F3.FE admin outbox UI

Plan 22: Chat 4 (F3.FE) done with "tipoFallo" visibility and retry gating
in admin outbox UI. Pending Chat 5 (F4.BE, backend) — endpoint
"GET /api/sistema/auditoria-correos-asistencia" for preemptive audit of
emails with invalid format before the next CrossChex webhook batch.
```

---

## CIERRE

Feedback breve a pedir al usuario tras cerrar:

- **Label técnico vs user-friendly**: ¿el badge muestra `"Dirección inválida"` (user-friendly, default propuesto) o `"FAILED_INVALID_ADDRESS"` (técnico, correlaciona con logs backend)? Si el Director se queja de no poder correlacionar con error-logs, agregar tooltip con el código técnico.
- **Override de retry permanente**: ¿el Director quiere poder forzar retry en un `FAILED_INVALID_ADDRESS` (con dialog de confirmación) cuando él ya corrigió el registro origen y sabe que el correo ahora es válido? Hoy el disabled es hard — si lo piden, bajarlo a chat futuro con un dialog "¿Confirmar reintento? Solo tiene sentido si corrigió el registro origen".
- **Filtro por entidad origen**: ¿la tabla debería separar visualmente los `ReporteFallosCorreoAsistencia` (el nuevo correo resumen del job) del resto? Si vive en el mismo filtro se ve mezclado con correos "de verdad". Decidir si filtrar por `EntidadOrigen` se vuelve también visible o queda siempre oculto.
- **Default filter al abrir**: ¿la vista por default muestra todos o solo FAILED del día? Hoy probablemente muestra todos. Si el Director pide "solo los que requieren acción", cambiar default.
- **Ajustes para Chat 5 (F4.BE)**: ¿con el badge en la UI ya resuelve el 80% del diagnóstico, o sigue haciendo falta la pantalla preventiva de `/admin/auditoria-correos`? Si con F3.FE basta, considerar mover F4 a backlog frío.
