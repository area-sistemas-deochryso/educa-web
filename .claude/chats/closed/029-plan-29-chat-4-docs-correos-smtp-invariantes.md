> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo. El trabajo es **documentación pura** en `.claude/rules/business-rules.md`.
> **Plan**: 29 · **Chat**: 4 · **Fase**: docs (cierre documental) · **Estado**: ⏳ pendiente arrancar — **75% listo (INV-MAIL01/02/03 con wording cerrado; INV-MAIL04 depende de Chat 3 OPS que aún no cierra)**.

---

# Plan 29 Chat 4 — Formalizar §18 "Correos salientes y protección del canal SMTP" + INV-MAIL01/02/03/04

## PLAN FILE

- Maestro: `.claude/plan/maestro.md` → fila **29** del inventario + sección **🔴 Plan 29 — Corte de cascada SMTP** (líneas ~220-293). Sub-sección concreta: **"Invariantes a formalizar en Chat 4 (wording final cerrado 2026-04-22)"** (líneas 275-281).
- Contexto de chats cerrados (leer solo si hace falta, **no re-derivar wording**; el maestro ya lo tiene):
  - `.claude/chats/closed/024-plan-29-chat-1-design-corte-cascada-smtp.md` — Decisión 7 original (propuesta inicial de wording).
  - `.claude/chats/closed/025-plan-29-chat-2-be-email-validator-blacklist-ssl-fix.md` — ajustes de wording post-implementación BE (INV-MAIL02 clarificó que SSL/auth/max-defers NO cuentan).
  - `.claude/chats/closed/026-plan-29-chat-2-5-be-extender-validacion-formato.md` — INV-MAIL01 extendido a todos los tipos de correo (ya no hay whitelist).
  - `.claude/chats/closed/027-plan-29-chat-2-6-be-defer-fail-status-endpoint.md` — endpoint de monitoreo (no aporta wording nuevo de invariantes, pero sí motiva una mención opcional al widget en §18).

## OBJETIVO

Cerrar documentalmente el Plan 29 agregando a `.claude/rules/business-rules.md`:

1. **Nueva §18 "Correos salientes y protección del canal SMTP"** después de §17 Reportes exportables. Documenta el techo `max_defer_fail_percentage` del hosting y las defensas en capas que el sistema implementa (validación pre-encolado, auto-blacklist por bounces, coherencia con throttle de Plan 22, monitoreo vía endpoint defer-fail-status).
2. **Nueva §15.14 "Invariantes de Correos Salientes"** en el §15 Registro de Invariantes con `INV-MAIL01`, `INV-MAIL02`, `INV-MAIL03`, `INV-MAIL04`.
3. Actualizar el **checklist de cierre** al final del archivo agregando entradas `[ ]` sobre §18 (paralelo a lo que hace §17 con INV-RE01/02/03).

**No es código.** Es exclusivamente documentación. No toca `Educa.API/` ni `src/`.

## PRE-WORK OBLIGATORIO

### 1. Leer el wording final ya acordado

**No re-derivarlo desde los chats cerrados.** El maestro tiene el wording final consolidado en las líneas 275-281. Copiar literalmente de ahí. Los chats 024/025/026 están solo como referencia histórica si hace falta aclarar un matiz.

Wording final cerrado (del maestro):

- **`INV-MAIL01` — Validación de destinatario pre-encolado**: Todo llamado a `EmailOutboxService.EnqueueAsync` valida el destinatario contra el regex canónico y consulta `EmailBlacklist`. Correos con formato inválido o presentes en blacklist con `EBL_Estado = 1` se rechazan silenciosamente con `LogWarning` (email enmascarado), sin crear registro en `EmailOutbox`.
- **`INV-MAIL02` — Auto-blacklist por bounces permanentes**: Cuando un destinatario acumula ≥ 3 rebotes con código SMTP `5.x.x`, `EmailOutboxWorker` lo inserta en `EmailBlacklist` (`MotivoBloqueo = 'BOUNCE_5XX'`) dentro de la misma transacción que actualiza el registro a `EO_Estado = 'FAILED_BLACKLISTED'`. SSL handshake, timeouts, `535 auth fail` y rechazos tipo `max defers and failures per hour` del MTA del hosting **no** cuentan para este umbral.
- **`INV-MAIL03` — Defensa contra `max_defer_fail_percentage`**: El hosting cPanel descarta silenciosamente todo correo del dominio `laazulitasac.com` cuando acumula 5 defers+fails en una hora. Este umbral es política del hosting y no es configurable. `INV-MAIL01` y `INV-MAIL02` son las únicas defensas disponibles — el sistema no controla el contador, solo qué envía al MTA. Cualquier fallo evitable (SSL handshake, auth, formato inválido) consume el contador y se considera deuda que agota la cuota para correos legítimos.

### 2. Proponer wording de `INV-MAIL04` (NUEVO en este chat)

Este chat introduce por primera vez `INV-MAIL04`. Propuesta:

> **`INV-MAIL04` — Monitoreo y transparencia del techo cPanel**: El sistema expone `GET /api/sistema/email-outbox/defer-fail-status` con el contador de la hora actual vs threshold configurable `Email:DeferFailThresholdPerHour` (default 5, ajustable en caliente sin redeploy cuando el hosting negocia un valor superior). El semáforo se calcula por bandas — OK (<60%), WARNING (60-100%), CRITICAL (≥100%). El widget admin `DeferFailStatusWidget` (Plan 22 Chat B) consume este endpoint cada 60s para visibilizar el riesgo antes de que el hosting bloquee el dominio. Service BE con fallback-CRITICAL en `try/catch` global (INV-S07) — un fallo interno de telemetría nunca falla el envío de correos, pero tampoco oculta un problema real.

**Placeholder sobre threshold negociado**: El wording actual deja `5` como valor "hoy" implícito en el default de `INV-MAIL03`. Cuando el Chat 3 OPS cierre con el valor negociado (25-30 esperado), hay que volver sobre este archivo y:

- Actualizar el `5` de `INV-MAIL03` si el hosting subió el techo permanentemente.
- Actualizar el default de `Email:DeferFailThresholdPerHour` mencionado en `INV-MAIL04` si se redefinió.

Dejar un **comentario inline explícito** en el markdown sobre esto — patrón `<!-- TBD post-OPS: ... -->` para que sea fácil de encontrar después.

### 3. Revisar el orden de numeración de §15 (posible housekeeping)

**Observación opcional** (no obligatorio en este chat): En `business-rules.md` actual, §15 tiene las sub-secciones numeradas `15.1 … 15.13 … 15.11`. Es decir, **§15.11 "Cómo Usar Este Registro" está física y textualmente después de §15.13**. Si el wording del Chat 4 agrega §15.14, va directamente antes de §15.11 (para que `15.11 Cómo Usar` quede al final como siempre). No renumerar §15.11 → §15.14 en este chat salvo que el usuario lo pida explícitamente — podría reventar referencias cruzadas históricas.

### 4. Confirmar con el usuario antes de arrancar

- **¿Se pone §18 después de §17 o se integra a §16 Reportes de Usuario?** → Decisión 7 del Chat 1 ya cerró: **nueva §18, no integrar** (§16 es feedback manual; §18 es canal SMTP — dominios distintos).
- **¿Se actualiza el default de `INV-MAIL03` (5/h) con el threshold del Chat 3 OPS antes de cerrar este chat?** → Dos variantes válidas:
  - (a) Esperar Chat 3 OPS antes de cerrar Chat 4 (bloquea el cierre documental por días/semanas).
  - (b) Cerrar Chat 4 con `5` + `INV-MAIL04` con TBD comment, y abrir un micro-chat futuro cuando OPS cierre que haga el swap de 1 línea.

Default asumido: **(b)**. El 75% del Chat 4 está listo hoy; el 25% TBD se cierra cuando OPS cierre.

## ALCANCE

### Archivos a MODIFICAR

| # | Archivo | Cambio | Líneas estimadas |
|---|---------|--------|------------------|
| 1 | `.claude/rules/business-rules.md` | Agregar **§18** completa después de §17 (antes del "Checklist: Antes de Implementar una Feature de Backend"). Agregar **§15.14** en §15 Registro de Invariantes (antes de §15.11). Actualizar el Checklist final agregando sección "CORREOS SALIENTES" con items `[ ] INV-MAIL01-04`. | +130-180 |
| 2 | `.claude/plan/maestro.md` | Marcar fila 29 a ~90% y agregar nota "Chat 4 docs ✅ cerrado — resta solo Chat 3 OPS + swap threshold si se negocia valor nuevo". Actualizar cola de 3 chats (remover Chat 4 docs; promover Plan 28 Chat 3 BE a #2). Actualizar **Foco** reflejando cierre documental. | ~20 |

### Archivos a NO TOCAR

- `Educa.API/**` — este chat es docs puros, no toca backend.
- `src/**` — ídem frontend.
- `.claude/history/planes-cerrados.md` — **no archivar el Plan 29 aquí**. Se archiva cuando el monitoreo post-deploy cierre (48-72h sin bloqueo del dominio) + Chat 3 OPS cierre. Eso será un chat posterior de limpieza (o directamente un commit sin chat si el usuario lo hace manual).
- `Educa.API/Constants/Notifications/MetodosPago.cs` etc. — wording del dominio debe citar los nombres exactos de los símbolos en BE (`EmailOutboxService`, `EmailBlacklist`, `EmailOutboxWorker`, `EO_Estado`, `EBL_Estado`, `Email:DeferFailThresholdPerHour`) pero no se modifican.

### Estructura propuesta para la nueva §18

```markdown
## 18. Correos Salientes y Protección del Canal SMTP

> **"El hosting no lo controlamos. Lo que controlamos es qué le enviamos."**

### 18.1 Contexto — el techo cPanel

[Breve: hosting configura max_defer_fail_percentage=5/h por dominio. Cuando se agota, 60 min de bloqueo total. Política externa, no configurable.]

### 18.2 Defensas en capas

[Tabla de 3 capas:
1. Pre-encolado — validación formato + blacklist lookup (INV-MAIL01).
2. Durante envío — auto-blacklist por bounces 5.x.x (INV-MAIL02).
3. Monitoreo — endpoint defer-fail-status + widget admin (INV-MAIL04).]

### 18.3 Qué cuenta y qué no cuenta contra el contador cPanel

[Tabla clara: bounces 5xx, SSL handshake, timeouts, 4xx del MTA cuentan. Rechazos INV-MAIL01 (formato inválido, blacklisted) NO cuentan — ni siquiera cruzan al MTA.]

### 18.4 Coordinación con throttle (Plan 22)

[2 párrafos: throttle per-sender 50/h cuida cuota de envíos; defer-fail 5/h cuida cuota de fallos. Complementarios, no sustitutivos.]

### 18.5 Invariantes

[4 bullet points compactos con IDs y una línea cada uno, linkeando a §15.14 para el wording completo.]
```

### Estructura propuesta para §15.14

```markdown
### 15.14 Invariantes de Correos Salientes

| ID | Entidad | Invariante | Enforcement | Sección |
|----|---------|------------|-------------|---------|
| `INV-MAIL01` | EmailOutbox | [wording completo del maestro línea 279] | `EmailOutboxService.EnqueueAsync` + `EmailValidator.Validate` + `IEmailBlacklistService.IsBlacklistedAsync` | 18.2 |
| `INV-MAIL02` | EmailBlacklist | [wording completo del maestro línea 280] | `EmailBounceBlacklistHandler` dentro del `ProcessSingleEmailAsync.catch` del worker, con mutación atómica via ChangeTracker | 18.2 |
| `INV-MAIL03` | Hosting (externo) | [wording completo del maestro línea 281] | **No enforced en código** — política del hosting. Se honra vía INV-MAIL01/02 que evitan consumir el contador | 18.1 |
| `INV-MAIL04` | EmailOutbox + widget admin | [wording propuesto arriba] | `GET /api/sistema/email-outbox/defer-fail-status` (Plan 29 Chat 2.6) + `DeferFailStatusWidget` FE (Plan 22 Chat B) | 18.2, 18.4 |
```

## TESTS MÍNIMOS

**No aplica.** Este chat es docs puros. Validación manual:

- Previsualizar el markdown renderizado (VS Code preview o equivalente) para que las tablas estén alineadas y los links internos funcionen.
- Confirmar que `grep -n "INV-MAIL"` sobre `business-rules.md` retorna exactamente **4 IDs** (01, 02, 03, 04) en §15.14 + las menciones correspondientes en §18.
- Confirmar que el TOC implícito (los `### X.Y` saltos) respeta el orden 17 → 18 → Checklist final.

## REGLAS OBLIGATORIAS

- **Wording literal del maestro**. No parafrasear INV-MAIL01/02/03. Si el usuario quiere refinar el wording, lo hacemos en la misma iteración del chat — **nunca** dejar dos fuentes (maestro + business-rules) divergiendo.
- **INV-MAIL04 es nuevo en este chat**. Al cerrar, el usuario debe confirmar el wording antes del commit. Proponerlo explícitamente al inicio del chat.
- **Idioma de la sección**: español (es docs de negocio, coherente con §1-§17). Símbolos del dominio (`EmailOutboxService`, `EO_Estado='FAILED_BLACKLISTED'`, `EBL_Estado=1`) en el idioma original del código.
- **Comentarios HTML `<!-- TBD post-OPS: ... -->`** para marcar cualquier valor que dependa del Chat 3 OPS. Facilita el swap futuro.
- **Mencionar referencias cruzadas** (Plan 22 Chat A throttle, Plan 22 Chat B widget, Plan 29 Chat 2/2.5/2.6 BE) pero **no mover** información de una sección a otra. §18 vive solo.
- **No archivar nada todavía**. `history/planes-cerrados.md` se toca en otro chat post Chat 3 OPS.

## APRENDIZAJES TRANSFERIBLES (del Plan 29 hasta hoy)

### El wording ya está cerrado — no re-diseñar

El Chat 1 `/design` (024) acordó el wording inicial de INV-MAIL01/02/03. Chats 2 (025) y 2.5 (026) lo refinaron con hallazgos de implementación. El maestro consolidó el wording final en su sección "Invariantes a formalizar en Chat 4". **Copiar textualmente** del maestro a `business-rules.md` — no reabrir la discusión salvo error factual.

### INV-MAIL04 es nuevo — un caso legítimo para aprovechar el Chat 4

El Chat 2.6 (027) agregó el endpoint `defer-fail-status` + el widget FE (Plan 22 Chat B, ahora cerrado). Estos NO estaban en el wording original de los 3 invariantes. INV-MAIL04 nace como la formalización del **monitoreo** que se construyó en paralelo. El brief del Chat 1 no lo previó — lo descubrimos al implementar.

### El threshold `5/h` puede cambiar — diseñar el archivo para eso

El `Email:DeferFailThresholdPerHour` es configurable en caliente (binding `IOptions<EmailSettings>`). Si el Chat 3 OPS consigue subirlo a 25-30, el FE lo refleja automáticamente (el endpoint ya toma `EmailSettings.DeferFailThresholdPerHour` en runtime). **Lo único que hay que actualizar en docs** es:

- `INV-MAIL03` menciona "5 defers+fails en una hora" — hay que cambiar este número.
- `INV-MAIL04` menciona default 5 — hay que cambiar este número.

**Dejar ambos números comentados con `<!-- TBD post-OPS -->`** para que el grep funcione.

### El checklist al final de `business-rules.md` se alimenta con 1 bloque por sección

Mirar el patrón existente de `§17 Reportes exportables` al final del checklist (líneas 1478-1482 aprox): agrega 4 items `[ ]` con los IDs INV-RE01/02/03. Replicar el mismo patrón para INV-MAIL01/02/03/04 en un bloque "CORREOS SALIENTES (Sección 18)".

### Convención de sub-secciones §15.X

- §15.1-§15.10 y §15.12-§15.13 están ordenadas consecutivamente.
- §15.11 "Cómo Usar Este Registro" está **textualmente después** de §15.13 — es el cierre conceptual del §15. No renumerar.
- **§15.14 nuevo va antes de §15.11** (el orden textual 12, 13, 14, 11 queda raro pero es el patrón establecido y no es trabajo del Chat 4 arreglarlo).

## FUERA DE ALCANCE

- **Chat 3 OPS** (negociación hosting) — no es código, lo ejecuta el usuario con el admin cPanel. No bloquea este chat.
- **Archivar Plan 29 en `history/planes-cerrados.md`** — se hace en chat futuro post-monitoreo 48-72h + post Chat 3 OPS cerrado.
- **Actualizar wording de INV-MAIL03 con threshold negociado** — se hace post-OPS en micro-chat de 1 línea (o commit manual sin chat si el usuario prefiere).
- **Renumerar §15.11** — housekeeping opcional fuera de alcance; reventaría posibles referencias cruzadas.
- **Tocar código** (BE o FE). Este chat es docs puros.
- **Mover Plan 22 a 100%** — Chat 22 fila está a 95% con Chats 4-6 aún abiertos; no inflar ese % desde un chat de docs del Plan 29.

## CRITERIOS DE CIERRE

```
PRE-WORK
[ ] Wording final de INV-MAIL01/02/03 localizado en maestro líneas 275-281 — copiado sin parafrasear
[ ] Wording propuesto de INV-MAIL04 confirmado con el usuario antes de escribir
[ ] Decisión confirmada: cerrar con 5/h como threshold actual + TBD comment, o esperar OPS

EDICIÓN
[ ] §18 "Correos Salientes y Protección del Canal SMTP" agregada después de §17 con sub-secciones 18.1-18.5
[ ] §15.14 "Invariantes de Correos Salientes" agregada en §15 (antes de §15.11) con tabla de 4 invariantes
[ ] Checklist de cierre al final del archivo incluye bloque "CORREOS SALIENTES" con 4 items
[ ] Comentarios <!-- TBD post-OPS --> agregados donde mencionan 5/h

VALIDACIÓN
[ ] grep -n "INV-MAIL" sobre business-rules.md retorna 4 IDs en §15.14 + menciones esperadas en §18
[ ] Preview markdown OK: tablas alineadas, sin roturas de formato
[ ] Orden de secciones: 17 → 18 → Checklist (no 17 → Checklist → 18)
[ ] Referencias cruzadas funcionan (Plan 22 Chat A/B, Plan 29 Chats 2/2.5/2.6)

MAESTRO
[ ] maestro.md fila 29: estado a ~90% con nota "Chat 4 docs cerrado; resta Chat 3 OPS + swap threshold si aplica"
[ ] maestro.md cola próximos 3 chats: remover Chat 4 docs; promover Plan 28 Chat 3 BE
[ ] maestro.md Foco actualizado reflejando cierre documental del Plan 29 (~3 líneas)

COMMIT
[ ] Un solo commit FE con mensaje sugerido abajo
[ ] Mover este archivo a .claude/chats/closed/029-plan-29-chat-4-docs-correos-smtp-invariantes.md
```

## COMMIT MESSAGE sugerido

**Subject** (≤ 72 chars):

```
docs(business-rules): Plan 29 Chat 4 — add §18 SMTP outbound + INV-MAIL01-04
```

**Body**:

```
Close Plan 29 Chat 4 — formalize outgoing-email safeguards in
"business-rules.md". Add new §18 "Correos Salientes y Protección del
Canal SMTP" after §17 and a matching §15.14 "Invariantes de Correos
Salientes" in the invariants registry.

Invariants registered (wording finalized in Chat 1 /design, refined by
Chats 2 and 2.5, committed as-is from "maestro.md" consolidated section):

 - "INV-MAIL01" — pre-enqueue validation: "EmailOutboxService.EnqueueAsync"
   rejects invalid format or blacklisted addresses silently, no row in
   "EmailOutbox".
 - "INV-MAIL02" — auto-blacklist: 3+ "5.x.x" bounces on the same recipient
   trigger an "EmailBlacklist" row with "MotivoBloqueo='BOUNCE_5XX'" in
   the same transaction as the outbox mutation. SSL handshake, auth 535
   and "max defers" do NOT count toward this threshold.
 - "INV-MAIL03" — respect cPanel's "max_defer_fail_percentage" (currently
   5/h per domain, non-configurable at the hosting level). The system has
   no control over the counter; "INV-MAIL01" and "INV-MAIL02" are the
   only defenses.
 - "INV-MAIL04" — monitor the counter via
   "GET /api/sistema/email-outbox/defer-fail-status" (Plan 29 Chat 2.6)
   + "DeferFailStatusWidget" (Plan 22 Chat B) polling every 60s. Service
   falls back to "CRITICAL" on internal error (INV-S07) — telemetry
   failures never block real sending.

Threshold "5" left inline with TBD comments pending Chat 3 OPS (hosting
negotiation to raise it to 25-30). Section §18.4 cross-references Plan 22
throttle (per-sender 50/h — complementary, not a substitute).

Checklist at the end of "business-rules.md" extended with a new "CORREOS
SALIENTES (Sección 18)" block listing the 4 invariants.

Plan 29 fila 29 at ~90% in "maestro.md"; remaining work is OPS-only
(Chat 3) plus a 1-line swap of the threshold once negotiated.
```

**Recordatorios (skill `commit`)**:

- Inglés imperativo (`add`, `close`, `formalize`).
- Español solo entre `"..."` para términos del dominio (`"EmailOutboxService"`, `"EmailBlacklist"`, `"EmailOutbox"`, `"INV-MAIL01"`, `"maestro.md"`, `"business-rules.md"`, `"DeferFailStatusWidget"`, `"CORREOS SALIENTES"`, `"MotivoBloqueo='BOUNCE_5XX'"`, `"max_defer_fail_percentage"`).
- NUNCA `Co-Authored-By`.
- Subject = 78 chars → **acortar si es necesario** a: `docs(rules): Plan 29 Chat 4 — add §18 SMTP + INV-MAIL01-04` (55 chars ✓).

## CIERRE

Feedback a pedir al usuario al cerrar el Chat 29-4:

1. **Wording de INV-MAIL04** — ¿el propuesto captura bien lo que el widget hace, o hay que matizar (ej: mencionar explícitamente que `Retrying` se expone como métrica separada)?
2. **Threshold 5/h** — ¿dejar con TBD comment (cerrar hoy) o esperar Chat 3 OPS (posponer cierre)? Recomendación: cerrar hoy, swap después — 1 línea se cambia sin drama.
3. **§15.11 reubicación** — ¿vale la pena un micro-chat futuro de housekeeping para ponerla al final del §15 correctamente? Sin urgencia, pero raspa la conciencia.
4. **Próximo chat después del 29-4** — Plan 28 Chat 3 BE ya es el siguiente en la cola (AA reportes + correos). Depende de validación del jefe Plan 27 post-deploy. ¿Ya hubo señal o seguimos esperando?