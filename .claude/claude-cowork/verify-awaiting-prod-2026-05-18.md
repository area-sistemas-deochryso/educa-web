# Verificación post-deploy — awaiting-prod 2026-05-18

> **Para Cowork**. Lee primero [`SETUP-COWORK.md`](SETUP-COWORK.md) (credenciales Director, browser `work aqui m`, login flow con flecha `→` no card). Todo este barrido es **read-only / no-destructive salvo donde se indique explícitamente**. Reportá resultados al usuario con: `✅ verde` / `❌ rojo` (con captura + console + network) / `⚠️ ambiguo` (con observación concreta y pregunta).

**Universo**: 14 briefs FE/BE+FE en `educa-web/.claude/chats/awaiting-prod/`. De estos, **Cowork puede verificar 8 solo** (sesión Director). Los otros 6 requieren al usuario (otros roles, mutaciones, sanity profunda) y están listados aparte en [`../../../GUIA-USER-VERIFY-2026-05-18.md`](../GUIA-USER-VERIFY-2026-05-18.md) en `educa-web/.claude/`.

**Orden sugerido**: top-down, son independientes. Si una falla, reportá y seguí — no bloquees el barrido.

---

## A. Brief 180 — Export JSON en hub Correlation

**Ruta**: `/intranet/admin/correlation/<algún-id>`
**Brief**: `awaiting-prod/180-fe-plan-41-chat-10-export-json.md`

### Pasos

1. Ir a `/intranet/admin/monitoreo/correos/bandeja` o `/intranet/admin/error-logs` y copiar un `correlationId` de alguna fila reciente (cualquier formato — el fix del brief 153 ya unificó a GUID-36).
2. Navegar a `/intranet/admin/correlation/<id>`.
3. Esperar que el snapshot cargue.
4. Buscar botón **"Exportar JSON"** en `header-actions` (junto a Volver / Toggle vista / Refresh). Estilo `p-button-outlined` (distinto del resto que son text).
5. Click → debe descargar `correlation-<id>-YYYYMMDD.json`.
6. Inspeccionar archivo descargado: debe contener `{ correlationId, generatedAt (ISO), hubUrl (absoluta), snapshot }`.

### Casos a chequear

- Botón **disabled** cuando `loading` o cuando se entra a un id inexistente (probar `/intranet/admin/correlation/00000000-0000-0000-0000-000000000000`).
- `hubUrl` apunta al origen correcto (educa.com.pe o el real de prod).

### Reportar

✅ si descarga + payload OK. ❌ con captura + consola si falla.

---

## B. Brief 186 — Botones navegación cruzada en secciones del hub Correlation

**Ruta**: `/intranet/admin/correlation/<id>`
**Brief**: `awaiting-prod/186-fe-plan41-chat3a-cross-links-buttons.md`

### Pasos

Sobre el mismo correlationId del test A:

1. Sección **Errors** → cada fila debe tener botón "Ver grupo de errores" (icon `pi pi-sitemap`). Click → debe navegar a `/intranet/admin/error-groups?fingerprint=<errorGroupCode>`. Si la fila no tiene `errorGroupCode`, el botón debe estar **disabled**.
2. Sección **Emails** → botón "Ver bandeja del destinatario" (icon `pi pi-inbox`). Click → navega a `/intranet/admin/email-outbox?destinatario=<masked>`. Verificar que la bandeja efectivamente filtra por ese destinatario.
3. Sección **Reports** → botón "Ver reporte" (icon `pi pi-external-link`). Click → navega a `/intranet/admin/feedback-reports/<id>` o equivalente.
4. Sección **Rate-limit** → confirmar que **NO** tiene botón (es intencional).

### A11y

Cada botón debe tener `aria-label` vía `pt`. Usar `_evaluate` en consola:

```js
$$('.correlation-*-section button[pButton]').map(b => ({ label: b.getAttribute('aria-label'), text: b.innerText }))
```

### Reportar

Tabla con 3 filas (errors / emails / reports): navegación funciona ✅/❌ + url destino + si el filtro se aplicó.

---

## C. Brief 185 — Sección "Otros correlation IDs" en hub

**Ruta**: `/intranet/admin/correlation/<id>`
**Brief**: `awaiting-prod/185-fe-plan41-chat3b-related-correlation-ids.md`

### Pasos

1. Mismo hub. Buscar al final (probable: después de eventos, antes de footer) una sección **"Otros correlation IDs de este usuario (últimas 2h)"**.
2. La sección debe ser **invisible** si `relatedCorrelationIds` viene vacío o ausente. Si visible, debe renderizar chips (`<app-correlation-id-pill>`) — truncados a 8 chars con tooltip.
3. Click sobre un pill → navega a `/intranet/admin/correlation/<otroId>`.

### Cómo encontrar un id con `relatedCorrelationIds` no vacío

Probar varios ids recientes del mismo usuario (filtrar por DNI en email-outbox y tomar 2 ids distintos del mismo destinatario en ventana 2h). Si Cowork no consigue uno, reportar como `⚠️ no-reproducible-sin-data` — no es falla del fix, es ausencia de datos.

### Reportar

✅ sección oculta cuando vacío + ✅ chips clickeables cuando hay data. ❌ si la sección aparece vacía o el click rompe.

---

## D. Brief 184 — Bandeja correos: paginación server-side + filtros

**Ruta**: `/intranet/admin/email-outbox` (alias `monitoreo/correos/bandeja`)
**Brief**: `awaiting-prod/184-fe-plan43-chat41b-bandeja-paginacion-filtros.md`

⚠️ **Bloqueante BE**: este brief depende del brief 183 (BE `/listar` paginado + `/count`). Si el BE no está deployado todavía, los filtros se mandan pero el conteo total será estimación. Verificar tras confirmar deploy BE.

### Pasos

1. Cargar la bandeja. Verificar que la tabla muestra `currentPageReportTemplate` tipo "Mostrando 1 a 25 de 1234".
2. Cambiar `rowsPerPageOptions` (10/25/50/100). Debe disparar nuevo `loadPage` (ver Network: `/api/sistema/email-outbox/listar?page=...&pageSize=...`).
3. Filtros:
   - **tipoFallo**: seleccionar valor → debe disparar refetch. (Antes era bug, no aplicaba).
   - **correlationId**: nuevo input de texto. Pegar un id real → filtra a 1+ filas.
   - **btn-clear** (icon `pi pi-filter-slash`): visible a la derecha, opacidad 0.5 → 1 en hover. Click resetea todos los filtros + página 1.
4. Filtro `estado=FAILED` → verificar que el counter total es coherente con lo paginado.

### Reportar

Network panel: capturar 2-3 requests con filtros distintos y mostrar que `page`, `pageSize`, `tipoFallo`, `correlationId` van como query params.

---

## E. Brief 169 — SMTP response en drawers monitoreo

**Rutas**: `/intranet/admin/monitoreo/email-blacklist` y `/intranet/admin/monitoreo/email-quarantine`
**Brief**: `awaiting-prod/169-fe-plan-43-chat-3-1b-smtp-response-execute.md`

### Pasos blacklist

1. Cargar lista. Click en una fila para abrir drawer detalle.
2. Debe haber sección **"SMTP response"** arriba con `originalSmtpResponse`.
3. La sección anterior `ultimoError` debe pasar a llamarse **"Causa interna"** y aparecer abajo, menos destacada.
4. Si `originalSmtpResponseSource === 'reconstructed'`: badge `(reconstruido)` (PrimeNG `p-tag` `tag-neutral` o `severity="warn"`). Si `stored`: sin badge. Si `unavailable`: texto "—" + tooltip "Sin trazas disponibles".

### Pasos cuarentena

1. Cargar lista. Click una fila para abrir drawer detalle.
2. Debe haber sección **"Histórico de hits"** con tabla de hasta 3 entries (`recentHits[]`): columnas Fecha / Código SMTP / Mensaje. Headers UPPERCASE.
3. Si `recentHits` vacío/null → empty-state "Sin hits previos registrados".
4. Mismo badge `(reconstruido)` que blacklist cuando aplique.

### Reportar

2 capturas (uno por drawer) + matriz: ¿se ve la sección? ¿badge correcto? ¿tabla con datos o empty legítimo?

---

## F. Brief 152 — Mini-sparkline 30d en ErrorGroup

**Ruta**: `/intranet/admin/error-groups`
**Brief**: `awaiting-prod/152-fe-plan-43-chat-1-2-errorgroup-sparkline.md`

### Pasos

1. Cargar lista de ErrorGroups.
2. Cada card/fila debe tener una mini-sparkline SVG (~32px alto, línea + último punto destacado, sin ejes).
3. Si `data.length === 0` o todos `0` → placeholder text "sin actividad".
4. Click en sparkline (si tiene handler) → modal con gráfico ampliado.
5. A11y: cada sparkline debe tener `aria-label` descriptivo.

### Reportar

Captura de la lista con sparklines visibles. ⚠️ si los SVG están en el DOM pero no renderizan (`viewBox` mal, path vacío).

---

## G. Brief 147 — Quick-wins monitoreo: badge + textarea + link auditoría

**Brief**: `awaiting-prod/147-fe-plan-43-chat-2-1-monitoreo-quick-wins-fe.md`

Tres mini-checks independientes:

### G.1 — Badge "Pendiente reintento" en bandeja

1. `/intranet/admin/email-outbox`.
2. Filtrar por `estado=PROCESSING`.
3. Filas con `ultimoErrorTransiente != null` deben mostrar badge gris **"Pendiente reintento"** (PrimeNG `tag-neutral`).
4. Tooltip muestra `ultimoErrorTransiente` truncado a 80 chars.

### G.2 — Textarea obligatoria en blacklist manual

1. `/intranet/admin/monitoreo/email-blacklist` → "Bloquear manualmente".
2. Seleccionar `motivo = MANUAL`.
3. Campo observación debe ser **textarea** (no input).
4. Contador `{{n}}/20 min` debajo.
5. Submit **disabled** mientras `< 20` chars trimeados.
6. Si motivo distinto a MANUAL → textarea opcional, submit habilitado sin contador.

**⚠️ NO submitear** — solo verificar el estado del botón y mensajes. (Test G.2 es no-destructivo si no se clickea "Bloquear".)

### G.3 — Link auditoría → usuarios autoOpen

1. `/intranet/admin/email-audit` (o ruta de auditoría de correos).
2. Cada fila debe tener columna "Acción" con anchor (icono `pi pi-arrow-right`).
3. Click → navega a `/intranet/admin/usuarios?dni=<x>&autoOpen=true` y abre el drawer del usuario.

### Reportar

3 sub-resultados independientes con captura por cada uno.

---

## H. Brief fe-dashboard-usuarios-estadisticas-promotor-coordacad

**Ruta**: `/intranet/admin/usuarios`
**Brief**: `awaiting-prod/fe-dashboard-usuarios-estadisticas-promotor-coordacad.md`

### Pasos

1. Cargar dashboard de usuarios.
2. La tarjeta de estadísticas debe mostrar **6 categorías** (antes 4):
   - Directores (debe ser **2**, no 4 — esto es cambio visible)
   - Asistentes Administrativos (4)
   - **Promotores (1 — NUEVO)**
   - **Coordinadores Académicos (1 — NUEVO)**
   - Profesores
   - Apoderados / Estudiantes
3. Stat-cards nuevos deben seguir patrón B3 del design-system (icon-right 48×48, valor grande, label).
4. Verificar Network: `GET /api/usuarios/estadisticas` debe devolver `totalPromotores` y `totalCoordinadoresAcademicos`.

### Reportar

Captura del dashboard con todas las stat-cards visibles + valores. ❌ si "Directores" sigue diciendo 4.

---

## Reporte consolidado al cerrar

Cuando termines el barrido (A → H), generá un único mensaje al usuario con esta tabla:

```
| Brief | Test | Status | Notas |
| 180 | Export JSON | ✅ / ❌ / ⚠️ | ... |
| 186 | Botones cruzados (errors/emails/reports) | ... | ... |
| 185 | Related IDs | ... | ... |
| 184 | Paginación + filtros bandeja | ... | bloqueado BE 183? |
| 169 | SMTP response (BL + QU) | ... | ... |
| 152 | Sparkline ErrorGroup | ... | ... |
| 147 | Quick-wins (G.1, G.2, G.3) | ... | ... |
| H   | Stats usuarios 6 cats | ... | ... |
```

Y por separado, los hallazgos nuevos que aparezcan (regresiones visuales, errores 4xx/5xx en consola, tiempos de carga >5s) van como **F-### · {sev} · {síntoma}** en el formato de `SETUP-COWORK.md` §7.

---

## Lo que NO está en este barrido

Estos 6 briefs requieren acciones que Cowork no puede hacer solo. Pasarlos al usuario:

| Brief | Por qué requiere usuario |
| --- | --- |
| 143 | Login como Promotor / Coordinador Académico / Asistente Admin (credenciales separadas) |
| 134 | Idem (AA self-service + tab director-profesores) |
| 140 | Repro F-018 mutativo: click "Registrar" en dialog asistencia manual AA — crea asistencia |
| 119 | Audit walDelete soft vs hard — requiere DELETE reales en ~15 entidades para ver counters |
| 137 | Hardening barrel + lint — sanity navegacional (cualquier ruta que rompa). Cowork SÍ puede hacer un smoke ligero, pero juicio de "no se rompió nada" es del usuario |
| 153 | Correlation id unificado E2E — análisis de consistencia formato GUID-36 cross-table |

Estos van en [`GUIA-USER-VERIFY-2026-05-18.md`](../GUIA-USER-VERIFY-2026-05-18.md).

---

## Tips operativos para este barrido

- **Tracking de network**: llamar `read_network_requests` al **inicio** de cada test (antes de navegar), si interesa capturar requests del page load.
- **F5 mata interceptores**: si usás `javascript_tool` para inyectar algo, re-inyectar tras cada reload.
- **CSRF para fetch directo**: ver `SETUP-COWORK.md` §6.2.
- **Si una ruta tira 404 o el componente crashea**: pegar la traza de consola + URL exacta + correlation id del request fallido en el reporte.
- **Cap límites**: 12 PDFs paralelos en prod = 12 PDFs reales. No saturar carga sintética accidentalmente — este barrido es navegacional, no de carga.

---

**Generado**: 2026-05-18 · `/go` sesión cross-repo de verificación post-deploy.
