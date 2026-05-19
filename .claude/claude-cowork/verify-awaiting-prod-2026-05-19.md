# Verificación post-deploy — awaiting-prod 2026-05-19

> **Para Cowork + usuario**. Lee primero [`SETUP-COWORK.md`](SETUP-COWORK.md) (credenciales Director, browser `work aqui m`, login flow con flecha `→` no card).

**Universo**: 20 briefs en `educa-web/.claude/chats/awaiting-prod/` tras deploy FE main + BE master 2026-05-19.

> **Limpieza previa al armar este doc**: los briefs **133** (AA self-service endpoints) y **136** (Plan 26 F3 time-of-day modifier) fueron verificados en la sesión Cowork local pre-deploy 2026-05-09 (LOCAL-5 / LOCAL-6 PASS) y movidos a `closed/` en este mismo deploy. Las verificaciones complementarias post-deploy (1-2 semanas de observación de telemetría para F3) viven en plan 26 directo, no en este barrido.

## Clasificación por tipo de verificación

Cada brief se asigna a **una sola categoría**:

| # | Criterio | Significado | Quién verifica |
|---|---|---|---|
| 1 | **BD-PRUEBA** | Verificable contra BD de prueba (local) — seguro para mutaciones, DELETEs, creación de registros | Usuario (o Cowork con credenciales test) |
| 2 | **BD-PROD-RO** | Verificable contra BD producción (FE local apuntando a Azure SQL) — solo lectura, sin mutar | Cowork (Director read-only) |
| 3 | **PROD-ONLY** | Solo observable en producción real con tráfico vivo — telemetría, jobs en background, orgánica diferida | Operación / observación pasiva |

---

## 1 · BD-PRUEBA (mutaciones permitidas)

Estos briefs requieren **crear / eliminar registros** o **probar con múltiples roles**. Hacerlos contra BD prueba local; no contra prod.

### 1.1 — Brief 140 · Fix F-018 botón "Registrar" en dialog asistencia manual AA

- **Ruta**: `/intranet/admin/asistencias` → tab AA → "+ Nueva asistencia"
- **Acción**: completar formulario (tipoPersona=AA, tipoRegistro=entrada, AA seleccionado, hora válida, observación) → botón **debe habilitarse** → click "Registrar" → toast verde + fila nueva.
- **Mutativo**: SÍ — crea `AsistenciaPersona` con `Tipo='A'`.
- **Reportar**: ✅ si el botón se habilitó y el insert ocurrió. ❌ con captura del `isFormValid` computed si sigue disabled.

### 1.2 — Brief 119 · Audit walDelete soft vs hard (~15 facades)

- **Acción**: ejecutar DELETEs en ~5 facades críticos y verificar que counters `total`/`inactivos` quedan coherentes con el contrato BE (soft → `total` igual, `inactivos +=1`; hard → `total -=1`).
- **Lista priorizada**: `cursos` (control ✅), `attendances-crud`, `blacklist-crud`, `attachments-modal`, otro a elección.
- **Mutativo**: SÍ — DELETEs reales.
- **Reportar**: tabla `[facade, BE contract, FE coherente?]`.

### 1.3 — Brief 134 · AA self-service tab — parte 4b (Director tab AA)

- **Bloqueante**: depende de que 1.1 (brief 140) esté ✅.
- **Acción**: con Director, `/intranet/asistencia` → submenu Estudiantes / Profesores / **Asistentes Administrativos** → tab AA carga tabla con AAs → cross-link a `/admin/asistencias?tab=gestion&tipoPersona=A&dni=X` funciona.
- **Parte 4a (AA viendo lo suyo)** ya verificado 2026-05-12 — no re-confirmar.

### 1.4 — Brief 143 · Vista asistencia uniforme para 4 roles administrativos

- **Acción**: login con Promotor (DNI a definir), Coordinador Académico (MEDALITH TREJO) y AA (`72884913`). Para cada uno:
  - `/intranet` (home) → widget igual al Director (4 contadores).
  - `/intranet/asistencia` → mismo panel admin del Director.
- **Mutativo**: NO, pero requiere credenciales de varios roles que solo el usuario tiene.
- **Conflicto conocido con 134**: AA en `/intranet/asistencia` debería ver self-service (no panel admin). Si ve panel admin, hay regresión. Reportar.
- **Reportar**: matriz 3 roles × 2 pantallas.

### 1.5 — Brief 137 · Hardening wrappers (barrel + lint)

- **Acción**: smoke navegacional cross-app — `/intranet/login`, `/intranet`, `/intranet/admin/usuarios`, `/intranet/admin/cursos`, cualquier ruta con dialog. Consola sin rojos tipo `is not a function` / `undefined import`. Logout + re-login.
- **Mutativo**: opcional (CRUD smoke).
- **Reportar**: ✅ pasada limpia, o lista de rutas con import error.

### 1.6 — Brief 147 G.2 · Textarea obligatoria blacklist manual

- **Ruta**: `/intranet/admin/monitoreo/email-blacklist` → "Bloquear manualmente" → motivo `MANUAL`.
- **Acción**: campo observación debe ser textarea con contador `n/20 min`. Submit disabled hasta `>= 20` chars trimeados. NO submitear (suficiente con verificar el estado).
- **Mutativo**: NO (no se llega a confirmar).
- **Reportar**: captura del estado del botón con `n=10` y `n=25`.

---

## 2 · BD-PROD-RO (lectura sobre datos reales, sin mutar)

FE local con backend apuntando a Azure SQL **prod**. Read-only estricto. Cowork puede correrlos solo con sesión Director.

### 2.1 — Brief 180 · Export JSON en hub Correlation

- **Ruta**: `/intranet/admin/correlation/<id>`.
- **Acción**: copiar un correlationId reciente (bandeja o error-logs) → navegar al hub → botón **"Exportar JSON"** (outlined) descarga `correlation-<id>-YYYYMMDD.json` con `{ correlationId, generatedAt, hubUrl, snapshot }`. Disabled cuando snapshot vacío.
- **Reportar**: ✅ + sample del JSON descargado.

### 2.2 — Brief 186 · Cross-link buttons en hub Correlation

- **Ruta**: `/intranet/admin/correlation/<id>`.
- **Acción**: secciones Errors / Emails / Reports cada una con botón de navegación (sitemap / inbox / external-link). Click navega y filtra. Rate-limit NO tiene botón (intencional). A11y vía `pt`.
- **Reportar**: tabla 3 filas con url destino + filtro aplicado.

### 2.3 — Brief 185 · Related correlation IDs

- **Ruta**: `/intranet/admin/correlation/<id>`.
- **Acción**: sección "Otros correlation IDs de este usuario (últimas 2h)" oculta si vacío, visible con chips clickeables si hay data. Click en pill navega a otro hub.
- **Cómo encontrar data**: tomar 2 ids del mismo destinatario en email-outbox dentro de 2h.
- **Reportar**: ✅ visible cuando hay data + ✅ oculto cuando vacío.

### 2.4 — Brief 184 · Paginación + filtros bandeja correos

- **Ruta**: `/intranet/admin/email-outbox`.
- **Acción**: paginación muestra "Mostrando X a Y de Z" real (no estimación). `rowsPerPageOptions` dispara `loadPage`. Filtros `tipoFallo`, `correlationId`, `estado` van como query params. Botón clear resetea + página 1.
- **Reportar**: 2-3 capturas del Network panel con query params distintos.

### 2.5 — Brief 169 · SMTP response en drawers monitoreo

- **Rutas**: `/intranet/admin/monitoreo/email-blacklist` y `/intranet/admin/monitoreo/email-quarantine`.
- **Acción**: click en fila → drawer detalle muestra sección **"SMTP response"** arriba con `originalSmtpResponse`; "Causa interna" abajo (renombrado desde `ultimoError`). Badge `(reconstruido)` cuando `source === 'reconstructed'`. Quarantine drawer muestra tabla "Histórico de hits" con hasta 3 entries.
- **Reportar**: 2 capturas (una por drawer) + matriz badge/empty-state.

### 2.6 — Brief 152 · Mini-sparkline 30d ErrorGroup

- **Ruta**: `/intranet/admin/error-groups`.
- **Acción**: cada card muestra SVG sparkline (~32px alto, sin ejes, último punto destacado). Placeholder "sin actividad" si `data.length===0`. A11y label en cada SVG.
- **Reportar**: captura de la lista con sparklines renderizados.

### 2.7 — Brief 147 G.3 · Link auditoría → usuarios autoOpen

- **Ruta**: `/intranet/admin/email-audit-findings` (o equivalente).
- **Acción**: columna "Acción" con anchor `pi pi-arrow-right` → navega a `/intranet/admin/usuarios?dni=X&autoOpen=true` y abre drawer del usuario con foco en correo.
- **Reportar**: ✅ + captura del drawer abierto.

### 2.8 — Brief 195 · Auto-refresh opt-in en hub Correlation

- **Ruta**: `/intranet/admin/correlation/<id>`.
- **Acción**: toggle de auto-refresh (opt-in, default off). Cuando se enciende refresca el snapshot cada N segundos sin recargar. Disabled cuando id inexistente.
- **Reportar**: ✅ + Network mostrando refetch periódico.

### 2.9 — Brief 197 · Occurrence drawer split en 5 tabs

- **Ruta**: `/intranet/admin/error-groups/<id>` → click ocurrencia → drawer.
- **Acción**: drawer renderiza 5 tabs (la división del Plan 45 F2.1). Verificar que cada tab tiene contenido coherente y no mezclado. Campo `usuarioRol` nulo renderiza "Anónimo" (fix 360aa28).
- **Reportar**: matriz 5 tabs × contenido esperado.

### 2.10 — Brief Dashboard usuarios estadísticas Promotor + CoordAcad

- **Ruta**: `/intranet/admin/usuarios`.
- **Acción**: stat-cards muestran **6 categorías**: Directores=2, Asist.Adm=4, Promotores=1, **Coord.Académicos=1** (NUEVO), Profesores, Apoderados/Estudiantes. Estilo B3 (icon-right 48×48). `GET /api/sistema/usuarios/estadisticas` devuelve `totalPromotores` y `totalCoordinadoresAcademicos`.
- **Reportar**: captura + valores. ❌ si "Directores" sigue diciendo 4.

---

## 3 · PROD-ONLY (observación pasiva diferida)

Solo se confirman con tráfico real en producción. No se fuerzan con FE local + BD prod porque dependen de workers / telemetría / SQL cross-tabla con data fresca.

### 3.1 — Brief 106 · Load control F4 backpressure (BE)

- **Qué observar**: bajo carga real (lunes 07:30-09:30 horario escolar), cuando el bulkhead `concurrency:reports` se llena, las requests excedentes reciben 503 con `Retry-After` dinámico (≥ 1s, según p95 del endpoint).
- **Cómo**: panel rate-limit + Application Insights `customMetrics` → `bulkhead.queue.depth`, `bulkhead.rejected.count`.
- **No reproducible localmente** — depende de N>140 requests concurrentes reales.

### 3.2 — Brief 110 · Cancellation cascade F3b (BE)

- **Qué observar**: cuando un cliente cierra la conexión mid-request (timeout, navegación), la cascada `CancellationToken` aborta la query EF y libera el slot del bulkhead.
- **Cómo**: logs estructurados con `operation_cancelled=true` + slot release ≤ 100ms.

### 3.3 — Brief 127 · AA correos dispatcher (BE)

- **Qué observar**: cuando un AA registra/edita asistencia o entra correos AA al sistema (ASISTENCIA_AA), el dispatcher envía a destino correcto (admin del salón, no apoderado). Verificable con SQL `EmailOutbox` filtrando `EO_Tipo LIKE 'ASISTENCIA_AA%'`.
- **No reproducible local** sin SMTP saliente real.

### 3.4 — Brief 142 · Quick wins monitoreo BE (companion de 147)

- **Qué observar**: el worker SMTP debe popular `EO_UltimoErrorTransiente` cuando entra un defer 4.x.x reintenable sin promover a FAILED.
- **Diagnóstico Cowork 2026-05-19**: hoy 66 PROCESSING con la columna en NULL (legacy). Tras el deploy del binary nuevo, monitorear:

  ```sql
  SELECT TOP 5 EO_CodID, EO_Estado, EO_UltimoErrorTransiente, EO_FechaActualizacion
  FROM dbo.EmailOutbox
  WHERE EO_Estado = 'PROCESSING' AND EO_UltimoErrorTransiente IS NOT NULL
  ORDER BY EO_FechaActualizacion DESC;
  ```

  Hasta que aparezca ≥1 fila orgánica, el badge G.1 de 147 (BD-PROD-RO §2.7 si se considera observable, o acá si se espera orgánica) no se valida visualmente. Si en 1 semana no aparece → inyectar defer artificial en staging.

### 3.5 — Brief 147 G.1 · Badge "Pendiente reintento" (depende de 3.4)

- **Por qué acá y no en BD-PROD-RO**: técnicamente Cowork ya validó en BD prod 2026-05-19 que la **key** del JSON viaja (`ultimoErrorTransiente: null`). Lo que falta es que aparezca **un caso real** con valor no-null para confirmar render del badge + tooltip. Eso depende de la observación de 3.4.
- **Acción inmediata post-deploy**: confirmar que el GET `email-outbox/listar?estado=PROCESSING` incluye la key en cada item del array (aunque el valor sea null). Eso ya sirve para cerrar el brief, el badge orgánico es follow-up.

### 3.6 — Brief 153 · Correlation id unificado E2E

- **Qué observar**: SQL cross-tabla con data post-deploy. Todos los nuevos `EL_/EO_/RLE_/REU_CorrelationId` deben tener `LEN = 36` (GUID con guiones). Registros viejos pre-deploy pueden tener `LEN = 32`.
- **Cómo**: query del bloque en `GUIA-USER-VERIFY-2026-05-18.md §6`.
- **Verificable localmente con BD prod RO** si se ejecuta el SELECT directamente en SSMS. Si Cowork no tiene acceso DB, queda como PROD-ONLY.

---

## Reporte consolidado al cerrar

Por brief: `[id] · [criterio 1/2/3] · ✅/❌/⚠️ · [nota]`. Para ⚠️ aclarar si requiere otra ronda o si bloquea cierre.

```
1.1  140              · 1 · ?
1.2  119              · 1 · ?
1.3  134 (4b)         · 1 · ?  (depende de 1.1)
1.4  143              · 1 · ?
1.5  137              · 1 · ?
1.6  147 G.2          · 1 · ?
2.1  180              · 2 · ?
2.2  186              · 2 · ?
2.3  185              · 2 · ?
2.4  184              · 2 · ?
2.5  169              · 2 · ?
2.6  152              · 2 · ?
2.7  147 G.3          · 2 · ?
2.8  195              · 2 · ?
2.9  197              · 2 · ?
2.10 dashboard usuarios · 2 · ?
3.1  106              · 3 · observación pasiva
3.2  110              · 3 · observación pasiva
3.3  127              · 3 · observación pasiva
3.4  142              · 3 · SQL EmailOutbox 1 semana
3.5  147 G.1          · 3 · depende de 3.4
3.6  153              · 3 · SQL cross-tabla
```

Hallazgos nuevos en formato **F-### · {sev} · {síntoma}** (`SETUP-COWORK.md` §7).

---

## Cierre

Cuando un brief sale ✅ → `/verify <NNN>` mueve `awaiting-prod/` → `closed/`.
Cuando sale ❌ → `/verify <NNN>` con motivo de rollback → vuelve a `running/`.

Categoría 3 puede tomar 1-2 semanas. No bloquear cierre del deploy por ella — cada brief PROD-ONLY se cierra individualmente cuando aparezca evidencia.

---

**Generado**: 2026-05-19 · post-deploy FE main (`6b6ace9`) + BE master (`7cc17a3`). Reemplaza `verify-awaiting-prod-2026-05-18.md` (obsoleto: la división Cowork-only / Usuario-only ya no aplica — ahora se clasifica por tipo de verificación).
