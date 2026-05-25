# Plan — Migración de arquitectura `.claude/` (FE + BE + carpeta hermana de coordinación)

> ℹ️ **Reviewed for ADR-0006 D1 compliance** (2026-05-25). No rewrite needed — plan is already closed (✅ CERRADO 2026-05-15) and serves as historical record.

> **Fecha**: 2026-05-13
> **Objetivo**: Romper el acoplamiento bidireccional entre `educa-web/.claude/` y `Educa.API/.claude/`. Cada repo solo carga lo suyo. La coordinación (invariantes de dominio, contratos, planes cross-repo, principios) vive en una carpeta hermana neutral.
> **Estado**: ✅ **CERRADO 2026-05-15** — F1…F7 ejecutadas y verificadas. Decisión congelada en [`educa-coord/decisions/0001-arquitectura-coord-folder.md`](../../../educa-coord/decisions/0001-arquitectura-coord-folder.md). Drift residual menor documentado como follow-up no bloqueante.

---

## 0. Principios arquitectónicos rectores

> **"Arquitectura solo sirve si se usa para evitar que cambios probables rompan partes que deberían permanecer estables."**

### 0.1 Fuerzas a negociar

- **Volatilidad** → cambiar rápido.
- **Estabilidad** → mantener predictibilidad.

Si todo es estable → predecible pero rígido. Si todo es flexible → se pierde coherencia. La habilidad es **aislar volatilidad sin destruir simplicidad**.

### 0.2 Errores frecuentes a evitar

1. **Generalizar demasiado temprano** para cambios hipotéticos → complejidad accidental, indirection hell, código imposible de seguir.
2. **Acoplar zonas de alta volatilidad a zonas críticas** → cambios pequeños con propagación global, invariantes rotos, mayor costo cognitivo.

### 0.3 Lo que sí se debe hacer

- Poner **límites correctos**.
- **Absorber movimiento**.
- **Evitar propagación sistémica**.

### 0.4 Tipos de volatilidad

| Tipo | Cómo se trata |
|---|---|
| Negocio | Debe aislarse |
| Técnica | No debe contaminar al dominio |
| Organizacional | Ley de Conway: el sistema estará tan alineado como los equipos |
| Operacional | Escala, latencia, throughput, failures |
| Integración | Adapters, ACL, versionado, contratos |

### 0.5 Arquitectura resultante

- **Core** → estable, pequeño, protegido.
- **Edges** → adaptables, reemplazables, aislados.
- **Las dependencias apuntan hacia estabilidad** (nunca hacia volatilidad).
- **Estabilidad ≠ rigidez. Flexibilidad ≠ abstracción.**

### 0.6 Evolución sana (no big-bang)

1. Simple y directa.
2. Detectás fricción repetida.
3. Identificás volatilidad real.
4. Extraés boundary.
5. Formalizás contrato.
6. Aislás cambio.

### 0.7 Cómo este plan honra los principios

- El **core estable** es `educa-coord/invariants/` + `educa-coord/contracts/`. No se reescribe a la ligera. Las dependencias FE y BE apuntan hacia él.
- Los **edges adaptables** son los `.claude/` de cada repo (reglas de stack, planes locales, chats). Pueden mutar sin afectar el otro.
- **No se generaliza prematuro**: el plan parte de fricción real observada (contexto inflado, cross-repo `Read`, `business-rules.md` huérfano), no de hipótesis.
- **Migración incremental** (fases F0…F7), cada una verde antes de la siguiente.

---

## 1. Diagnóstico

### Síntoma observable

Al abrir un chat en `educa-web`, el contexto incluye:

- `rules/backend.md` (~600 ln) — reglas de C#/EF Core que **no aplican al FE**.
- `rules/business-rules.md` (1213 ln) — invariantes `INV-*` del dominio, mezcla reglas FE (qué muestra el componente) con reglas BE (qué enforza el service).
- Reglas de UI (a11y, design-system 946 ln, primeng, dialogs-sync, skeletons, …) cargadas aunque el chat sea de pura lógica.

Análogo en `Educa.API`: la `CLAUDE.md` apunta a `../educa-web/.claude/rules/business-rules.md` (cross-repo `@Read` cuando toca dominio). Cada repo termina conociendo demasiado del otro.

### Causa raíz

1. **`business-rules.md` no es del FE ni del BE — es del dominio.** Vive físicamente en FE por accidente histórico. Ambos repos lo necesitan, así que ambos lo cargan o lo referencian cruzado.
2. **El índice on-demand del FE lista 30+ archivos**. Incluso si solo se cargan "cuando aplica el trigger", muchos triggers son por path y se disparan ante cualquier edición típica → todos terminan cargados.
3. **No hay ubicación neutral** para planes y decisiones que tocan ambos repos (Plan 14 contratos, Plan 40 bulkheads, ADRs cross-cutting). Hoy viven en uno u otro y el segundo los referencia cruzado.

### Costo

- Cada chat FE paga el costo de contexto BE y viceversa.
- Cambios en `business-rules.md` requieren sincronizar dos cabezas (la FE y la BE) sin garantía de consistencia.
- Reglas cruzadas (`rules/backend.md` en FE, `../educa-web/.claude/rules/business-rules.md` en BE) crean dependencias frágiles entre repos.

---

## 2. Diseño objetivo

### 2.1 Layout final (carpeta hermana)

```text
C:/Users/Asus Ryzen 9/EducaWeb/
├── educa-web/                  # FE — Angular
│   └── .claude/                # Solo concerns del FE
├── Educa.API/                  # BE — ASP.NET
│   └── .claude/                # Solo concerns del BE
└── educa-coord/                # NUEVO — coordinación neutral cross-repo
    ├── README.md               # Mapa: qué vive acá, cómo se consume
    ├── COORD.md                # Protocolo de delegación entre repos
    │
    ├── principles/             # Marco arquitectónico — 17 elementos × 2 vistas
    │   ├── README.md           # Índice + tabla "trigger → archivo"
    │   ├── 01-function-objective/
    │   │   ├── claude.md       # ≤40 ln — qué optimizamos + trigger de lectura
    │   │   └── human.md        # narrativa completa para revisión humana
    │   ├── 02-restrictions/        { claude.md, human.md }
    │   ├── 03-tradeoffs/           { claude.md, human.md }
    │   ├── 04-invariants/          { claude.md, human.md }   # filosofía; los INV-* concretos viven en invariants/
    │   ├── 05-cohesion/            { claude.md, human.md }
    │   ├── 06-coupling/            { claude.md, human.md }
    │   ├── 07-boundaries/          { claude.md, human.md }
    │   ├── 08-complexity/          { claude.md, human.md }
    │   ├── 09-volatility/          { claude.md, human.md }
    │   ├── 10-dependencies/        { claude.md, human.md }
    │   ├── 11-abstraction/         { claude.md, human.md }
    │   ├── 12-modularity/          { claude.md, human.md }
    │   ├── 13-evolution/           { claude.md, human.md }
    │   ├── 14-uncertainty/         { claude.md, human.md }
    │   ├── 15-debt-erosion/        { claude.md, human.md }
    │   ├── 16-system-dynamics/     { claude.md, human.md }
    │   └── 17-heuristics/          { claude.md, human.md }
    │
    ├── invariants/             # Single source of truth de invariantes CONCRETAS de dominio
    │   ├── README.md           # Índice INV-* por dominio
    │   ├── asistencia.md       # INV-C01..C11, INV-AD01..AD09
    │   ├── calificaciones.md   # INV-CA01..
    │   ├── horarios.md         # INV-U03..U05, INV-C06..C08, INV-AS01..05
    │   ├── matricula.md        # INV-M01..M04, INV-V01..V03
    │   ├── permisos.md         # INV-S01..S04
    │   ├── correos.md          # INV-MAIL01..MAIL10
    │   └── …                   # un archivo por dominio (≤300 ln cada uno)
    │
    ├── contracts/              # DTOs y endpoints — contrato compartido
    │   ├── README.md
    │   ├── api-catalog.md      # Catálogo de endpoints (versión actual)
    │   └── dtos-snapshot.json  # Generado por test BE, copiado a FE
    │
    ├── glossary/               # Términos del dominio (E/P/A, tutor pleno, etc.)
    │   └── domain.md
    │
    ├── fitness/                # Métricas que el sistema debe sostener (latencias, FAILED rate, etc.)
    │   └── README.md           # Lista de fitness functions activas + límites
    │
    ├── decisions/              # ADRs cross-repo
    │   └── …                   # 0001, 0002, …
    │
    ├── plans/                  # Planes que cruzan FE+BE
    │   ├── README.md           # Índice + estado
    │   └── …                   # ej: plan-14-contratos-fe-be.md
    │
    └── chats/                  # Briefs de chats que coordinan FE+BE
        ├── open/
        ├── running/
        ├── waiting/
        └── closed/
```

### 2.1.1 Patrón dual `claude.md` / `human.md`

Cada elemento de `principles/` y, opcionalmente, cada doc denso de `invariants/contracts/` lleva **dos vistas**:

- **`claude.md`** — mínimo absoluto. ≤40 líneas. Estructura fija:
  1. Una frase: **qué optimiza este principio**.
  2. **Trigger de lectura**: cuándo Claude debe abrir este archivo (1-2 líneas).
  3. **Regla operativa**: 3-5 bullets accionables (qué hacer / qué no hacer).
  4. **Puntero**: `Para el razonamiento extendido ver [human.md](human.md).`
- **`human.md`** — narrativa completa para el humano: razones, ejemplos, trade-offs detallados, casos vivos del proyecto. Sin límite de tamaño. **Claude NO lo carga salvo pedido explícito del usuario** ("explicame este principio en detalle").

Razón del patrón: el humano necesita el "por qué" para mantener criterio; Claude necesita el "cuándo y qué hacer" para no romper el sistema. Mezclarlos en un solo archivo infla contexto sin ganancia.

### 2.1.2 Los 17 elementos y su función

> Cada uno tendrá su par `claude.md` / `human.md`. El `claude.md` se lee on-demand desde el `.claude/CLAUDE.md` de cada repo cuando el trigger aplica.

| # | Elemento | Qué optimiza (función) | Trigger típico de lectura |
|---|---|---|---|
| 01 | Función objetivo | Qué estamos optimizando realmente | Antes de decidir un trade-off no obvio |
| 02 | Restricciones | Presupuesto, tiempo, equipo, compliance, escala | Al evaluar si una solución cabe en el contexto real |
| 03 | Trade-offs | Qué se gana, qué se sacrifica, quién paga, cuándo | Decisión arquitectónica con múltiples caminos |
| 04 | Invariantes (filosofía) | Qué jamás debe romperse — protege identidad | Al diseñar un cambio que toque INV-* concretas |
| 05 | Cohesión | Qué cambia junto naturalmente | Al modularizar o mover código entre carpetas |
| 06 | Acoplamiento | Cómo se propaga el cambio | Al introducir una dependencia nueva |
| 07 | Boundaries | Dónde separar por ownership / volatilidad / riesgo | Al crear una capa, módulo o repo nuevo |
| 08 | Complejidad | Esencial vs accidental; cognitiva, operacional, distribuida | Antes de aceptar una solución por inercia |
| 09 | Volatilidad | Qué cambia rápido, qué cambia lento | Al decidir dónde aislar cambio |
| 10 | Dependencias | Dirección, propagación, inversión, temporalidad | Al diseñar imports / capas |
| 11 | Abstracción | Qué vale la pena ocultar; cuándo cuesta más de lo que ahorra | Antes de crear una interfaz / base class |
| 12 | Modularidad | Composición, reemplazabilidad, aislamiento evolutivo | Al partir o consolidar módulos |
| 13 | Evolución | Reversibilidad, optionality, migraciones incrementales | Al diseñar un cambio que aún no tiene todos los datos |
| 14 | Incertidumbre | Decisiones reversibles, experimentación controlada | Cuando "no sabemos suficiente todavía" |
| 15 | Deuda y erosión | Drift, degradación invisible, presión evolutiva | Auditorías periódicas; doc-freshness |
| 16 | Dinámica sistémica | Feedback loops, bottlenecks, emergent behavior | Cuando un cambio local empeora algo no relacionado |
| 17 | Heurísticas | Cómo decidir con ambigüedad e información incompleta | Cuando no hay respuesta matemática perfecta |

### 2.1.3 Orden de aplicación

Los 17 elementos **no son una checklist obligatoria** para cada cambio. Son un menú. La regla:

- Decisiones triviales → ninguno aplica.
- Decisiones tácticas (componente, endpoint, helper) → suelen tocar 04 (invariantes), 06 (acoplamiento), 11 (abstracción).
- Decisiones estratégicas (boundary nuevo, capa nueva, repo nuevo) → tocan 01 (función objetivo), 02 (restricciones), 03 (trade-offs), 07 (boundaries), 09 (volatilidad), 13 (evolución).
- **Recién después de los 17, tiene sentido entrar a ADRs, RFCs, governance, fitness functions y architecture reviews** — esos viven en `decisions/` y `fitness/` y se apoyan en el criterio que los 17 dejaron sembrado.

### 2.2 Reglas duras

1. **Cero `@import` cross-repo.** Nunca un `.claude/CLAUDE.md` hace `@import` a algo fuera de su propio `.claude/`.
2. **Cero `Read` directo cross-repo a `rules/` o `context/` del otro.** Si un chat FE necesita una invariante, la lee de `../educa-coord/invariants/<dominio>.md`. Si necesita el contrato de un endpoint, de `../educa-coord/contracts/`.
3. **Una sola fuente de verdad por concepto**:
   - **Invariantes de dominio** → `educa-coord/invariants/`.
   - **Reglas de stack** (cómo se escribe Angular / cómo se escribe C#) → en el `.claude/rules/` del repo dueño del stack.
   - **Reglas operativas** (commits, chats, modos) → en cada repo (pueden ser distintas si lo necesitan, hoy son casi iguales).
4. **Delegación cruzada vía brief, no vía read directo.** Si un chat FE descubre que necesita un cambio en BE, abre un brief en `educa-coord/chats/open/` enumerado en la cola compartida, no se mete a `../Educa.API/` a editar.
5. **Numeración de planes y chats es global** en `educa-coord/`. Los planes locales (solo FE o solo BE) siguen viviendo en cada repo con su propia numeración.

### 2.3 Qué se queda en cada repo

| Categoría | educa-web/.claude | Educa.API/.claude | educa-coord |
|---|---|---|---|
| Reglas de código FE (Angular, NgRx, PrimeNG, ESLint FE) | ✅ | ❌ | ❌ |
| Reglas de código BE (controllers, services, EF, analyzers) | ❌ | ✅ | ❌ |
| Reglas operativas (commit, chat-modes, backlog-hygiene) | ✅ | ✅ | ❌ |
| **Invariantes de dominio `INV-*`** | ❌ (puntero) | ❌ (puntero) | ✅ |
| **Catálogo de endpoints / DTOs snapshot** | ❌ (puntero) | ❌ (puntero) | ✅ |
| **Glosario de dominio** | ❌ (puntero) | ❌ (puntero) | ✅ |
| Planes solo FE | ✅ | ❌ | ❌ |
| Planes solo BE | ❌ | ✅ | ❌ |
| **Planes cross-repo** | ❌ | ❌ | ✅ |
| ADRs solo de stack FE | ✅ | ❌ | ❌ |
| ADRs solo de stack BE | ❌ | ✅ | ❌ |
| **ADRs cross-repo** | ❌ | ❌ | ✅ |
| Chats solo FE / solo BE | ✅ / ✅ | — / ✅ | ❌ |
| Chats que tocan FE+BE | ❌ | ❌ | ✅ |

### 2.4 Cómo se consume desde un chat

Caso A — chat FE puro (editás un componente Angular):

- CLAUDE.md de `educa-web` carga sus 8-10 always-on (operativas + estilo).
- No se carga nada de BE ni de coord salvo trigger explícito.

Caso B — chat FE que toca dominio (ej: pantalla de calificaciones):

- Trigger por path (`features/intranet/pages/admin/calificaciones/**`) dispara lectura on-demand de `../educa-coord/invariants/calificaciones.md` (≤300 ln) en lugar del business-rules.md monolítico de 1213.

Caso C — chat cross-repo (ej: agregar endpoint nuevo):

- Se abre brief en `educa-coord/chats/open/NNN-feat-X.md` con frontmatter `repos: [educa-web, Educa.API]`.
- `/start-chat` levanta el brief en `running/` y trabaja en ambos repos secuencialmente (no en paralelo — un repo, un chat es la regla salvo worktrees, que hoy no aplican).
- Al cerrar, commitea en cada repo + mueve el brief a `educa-coord/chats/closed/`.

---

## 3. Migración por fases

> **Orden importa**: cada fase debe quedar verde antes de empezar la siguiente. Sin big-bang.

### F1 — Crear esqueleto de `educa-coord/` (sin mover nada)

- `mkdir educa-coord/{principles,invariants,contracts,glossary,fitness,decisions,plans,chats/{open,running,waiting,closed}}`
- Escribir `educa-coord/README.md` con el mapa de la sección 2.1.
- Escribir `educa-coord/COORD.md` con el protocolo de la sección 2.2 + 2.4.
- Escribir `educa-coord/principles/README.md` con la tabla de los 17 elementos (sección 2.1.2) — solo el índice, sin contenido de cada elemento todavía.
- Crear las 17 subcarpetas `principles/NN-<slug>/` vacías. Aún sin `claude.md` ni `human.md`.
- `git init` en `educa-coord/`. Es un repo aparte (decisión: independiente para que cada developer lo clone una vez junto con FE+BE).
- Sin tocar nada de FE ni BE todavía.

Salida verificable: `educa-coord/` existe con README + COORD + `principles/` esqueleto, repo git inicializado, push a un remote nuevo.

### F1b — Poblar `principles/` con `claude.md` (mínimos) + plantilla de `human.md`

- Para cada elemento `01..17`, escribir `claude.md` siguiendo la estructura fija de §2.1.1 (≤40 ln). Estos son los archivos que Claude va a leer on-demand.
- Para cada elemento, dejar `human.md` con solo un esqueleto (heading + 3 secciones: "Contexto / Por qué importa / Ejemplos en este proyecto"). El contenido pleno se completa después (no bloquea la migración).
- Validar que la suma de los 17 `claude.md` ≤ 700 líneas totales (≤40 cada uno × 17).

### F2 — Migrar invariantes (el dolor grande)

- Partir `educa-web/.claude/rules/business-rules.md` (1213 ln) por dominio en `educa-coord/invariants/`:
  - `asistencia.md`, `calificaciones.md`, `horarios.md`, `matricula.md`, `permisos.md`, `correos.md`, `aprobacion.md`, `error-tracing.md`, `feedback.md`, …
- Mantener IDs `INV-*` idénticos — son los anchors que ya se citan en código y commits.
- Cada archivo ≤300 ln. Si un dominio pasa, partir más fino (ej: `asistencia.md` → `asistencia-diaria.md` + `asistencia-curso.md` + `asistencia-admin.md`).
- Crear `educa-coord/invariants/README.md` con índice cruzado: tabla `INV-* → archivo`.
- En `educa-web/.claude/CLAUDE.md`, reemplazar el puntero a `rules/business-rules.md` por uno a `../educa-coord/invariants/<dominio>.md` con triggers por path FE (los mismos que hoy).
- En `Educa.API/.claude/CLAUDE.md`, mismo cambio: el puntero `../educa-web/.claude/rules/business-rules.md` pasa a `../educa-coord/invariants/<dominio>.md`.
- Borrar `educa-web/.claude/rules/business-rules.md` (su contenido ya vive partido en coord).

Salida verificable: `grep -r "business-rules.md"` en ambos repos solo encuentra menciones en commits/history, no en config viva.

### F3 — Mover planes cross-repo ✅ (cerrado 2026-05-15, brief 163)

**Resultado**: 11 planes migrados a `educa-coord/plans/` con prefijo `xrepo-` (9 desde FE: 14, 15, 32, 34, 39, 41, 42, 43, migracion-smtp-acs; 2 desde BE: 22, asignacion-profesor-salon-curso). `educa-coord/plans/README.md` creado con índice + estado. Maestro FE actualizado con punteros relativos en planes activos (14, 15, 41, 42, 43, 22 detalle + 6 archivado). Cross-plan refs actualizados en `consolidacion-{backend,frontend}.md`, `blacklist-detection-admin.md` (FE), `arquitectura-backend-opciones.md`, `domain-layer.md` (BE). 3 commits independientes (coord + educa-web + Educa.API).



Inventario inicial (a confirmar al ejecutar — `educa-coord/plans/`):

| Plan | Origen actual | Mueve a |
|---|---|---|
| Plan 14 — Contratos FE-BE | `educa-web/.claude/plan/contratos-fe-be.md` | `educa-coord/plans/plan-14-contratos-fe-be.md` |
| Plan 40 — Bulkheads/timeouts | `Educa.API/.claude/plan/…` + ecos en FE | `educa-coord/plans/plan-40-bulkheads.md` |
| Plan 28/29/38 cadena de correos | `Educa.API/.claude/plan/…` + widget FE | `educa-coord/plans/plan-NN-correos.md` |
| Plan 21/23/27 polimorfismo asistencia | mezclado | `educa-coord/plans/plan-NN-asistencia-polimorfica.md` |

Criterio: cualquier plan cuyo brief original mencione "FE+BE", "Educa.API y educa-web", o tenga sub-chats en ambos repos → cross-repo.

Renumerar bajo numeración global `educa-coord` o conservar el número original con prefijo `xrepo-` (decisión a tomar en F1).

### F4 — Saneamiento de reglas cruzadas ✅ (brief 164, 2026-05-15)

Resuelto en 1 chat. Resultado:

- `educa-web/.claude/rules/backend.md` (659 ln) **borrado** — 90% duplicaba reglas BE locales; las 4 secciones "síntesis FE-friendly" (`ApiResponse<T>` shape, excepciones tipadas, rate-limiting, auth) migraron a `educa-coord/contracts/`.
- `educa-web/.claude/context/api-endpoints.md` (191 ln) + `Educa.API/.claude/context/api-endpoints.md` (68 ln) **borrados** — consolidados en `educa-coord/contracts/api-catalog.md` (tomó el FE, más completo y actualizado).
- `educa-web/.claude/context/domain.md` (-38 ln) y `Educa.API/.claude/context/domain.md` (-30 ln) **adelgazados** — entidades + jerarquía + flujo CrossChex movidos a `educa-coord/glossary/domain.md`; prefijos BD y convenciones a `educa-coord/glossary/db-fields.md`.
- `Educa.API/.claude/rules/frontend.md` **no existía** (tarea 2 del brief era no-op).
- Punteros on-demand en ambos `CLAUDE.md` reapuntados a `educa-coord/contracts/` y `glossary/`.
- Drift bonus: `drift-map.md` + `drift-check.md` del FE también reapuntados (commit fix follow-up).

Total: **-997 ln duplicadas** (-899 FE, -98 BE) + **+681 ln** en coord (single source). Neto cross-repo: **-316 ln**. 4 commits separados (1 coord + 2 FE + 1 BE) + 1 commit aparte de WIP del chat 157.

### F5 — Adelgazar índices on-demand

- Revisar `educa-web/.claude/CLAUDE.md` índice on-demand. Para cada entrada:
  - ¿Trigger ≤30% de los chats típicos? Mantener.
  - ¿Trigger >70%? Subir a always-on si es chiquita (<100 ln) o aceptar el costo.
  - ¿Trigger raro pero contenido enorme? Partir el archivo con `/split-catalog` antes de promocionarlo.
- Objetivo: índice on-demand del FE ≤25 entradas. Hoy son ~30.

### F6 — Protocolo de chats cross-repo

- Documentar en `educa-coord/COORD.md`:
  - Plantilla de brief cross-repo (frontmatter `repos: [...]`, `touches:` por repo, `exclusive: true|false`).
  - `/start-chat` cross-repo: opens en `educa-coord/chats/running/`, no en ningún repo individual.
  - `/end` cross-repo: commitea en cada repo afectado por separado (cada uno con su `commit-style.md`), después mueve el brief a `educa-coord/chats/closed/` con un commit propio.
- Implementar (o documentar como deuda) hooks/scripts mínimos: solo el move del brief y el manifest, sin paralelización.

### F7 — Auditoría y cierre

- `grep -r "\.\./Educa\.API" educa-web/.claude/` debe estar vacío salvo en planes históricos ya cerrados.
- `grep -r "\.\./educa-web" Educa.API/.claude/` idem.
- Cada `CLAUDE.md` no excede 200 líneas always-on (siguiendo `~/.claude/rules/context-budget.md`).
- ADR cross-repo en `educa-coord/decisions/0001-arquitectura-coord-folder.md` que congela la decisión.

---

## 4. Decisiones a confirmar antes de ejecutar

1. **¿`educa-coord/` es un repo git aparte, o subcarpeta no versionada del workspace?**
   - Recomendado: repo aparte. Permite que un developer nuevo clone los 3 en paralelo y que el coord tenga su propia historia.
2. **¿Numeración de planes cross-repo: global nueva, o prefijo `xrepo-NNN` preservando el número original?**
   - Recomendado: prefijo. Preserva trazabilidad de commits viejos.
3. **¿Los chats `awaiting-prod/` cross-repo viven en `educa-coord/chats/awaiting-prod/`?**
   - Recomendado: sí. Un chat que cerró deploy en ambos repos se valida desde un solo lugar.
4. **¿`business-rules.md` se borra inmediato en F2 o se deja en `educa-web/.claude/rules/business-rules.deprecated.md` un mes como redirect?**
   - Recomendado: borrar. El git history alcanza para reconstruir.

---

## 5. Lo que NO hace este plan

- No mueve código fuente. Solo `.claude/`.
- No promete worktrees ni chats paralelos. Sigue siendo "un repo, un chat" + delegación vía brief.
- No reemplaza `~/.claude/` global. Las reglas universales (`~/.claude/rules/`) siguen vigentes y se aplican a `educa-coord/` igual que a cualquier repo.
- No documenta migraciones SQL ni de código. Si una invariante cambia, eso es trabajo de un chat normal.

---

## 6. Estimación de esfuerzo

| Fase | Esfuerzo | Riesgo |
|---|---|---|
| F1 — esqueleto coord | 1 chat (≤30 min) | bajo |
| F1b — `principles/` claude.md mínimos + human.md skeletons | 2 chats | bajo |
| F2 — partir invariantes | 2-3 chats | medio (volumen + cuidado con anchors) |
| F3 — mover planes cross-repo ✅ | 1 chat (brief 163, 2026-05-15) | bajo |
| F4 — saneamiento reglas cruzadas ✅ | 1 chat (brief 164, 2026-05-15) | medio — resuelto en 1 chat |
| F5 — adelgazar índices on-demand | 1 chat | bajo |
| F6 — protocolo cross-repo | 1 chat | bajo |
| F7 — auditoría final | 0.5 chat | bajo |
| F8 (opcional) — `human.md` completos | N chats sueltos | bajo (no bloquea) |

Total fases obligatorias: ~10-12 chats. Se puede pausar entre fases sin dejar el repo roto (cada fase es self-contained).

F8 es deuda voluntaria: completar `human.md` de cada principio se puede hacer goteo cuando un chat tope con ese tema y quiera dejar el "por qué" escrito.
