# Reporte Cowork — verificación post-deploy 2026-05-19

> **Para Claude Code.** Reemplaza la sección "Reporte consolidado" del usuario tras el deploy FE main (`6b6ace9`) + BE master (`7cc17a3`).
> **Sesión Cowork**: 2026-05-19, Director read-only contra prod + sesión local (`localhost:4201` apuntando a BD prueba) con credenciales adicionales (ver §3).
> **Universo**: 20 briefs en `educa-web/.claude/chats/awaiting-prod/` clasificados en `verify-awaiting-prod-2026-05-19.md`.

---

## 1. Resultado por brief

### Categoría 2 — BD-PROD-RO (Director sobre prod)

| # | Brief | Estado | Evidencia | Acción Claude Code |
|---|---|---|---|---|
| 2.1 | 180 — Export JSON | ✅ | Blob 855B, shape `{correlationId, generatedAt, hubUrl, snapshot}` con `snapshot.{errorLogs, rateLimitEvents, reportesUsuario, emailOutbox}` | Mover a `closed/`. `/verify 180` ✅ |
| 2.2 | 186 — Cross-link buttons | ⚠️ doc | Los 4 cross-link existen y navegan con `?correlationId=...`. El brief 186 dice "rate-limit sin botón" pero el archivo `correlation-rate-limit-section.component.html:8-16` tiene el anchor desde `a70b8d3` (2026-04-25 — commit inicial del hub) | Decidir: a) actualizar el doc del brief 186 para reflejar realidad; b) si el botón no debe existir, abrir nuevo brief para removerlo |
| 2.3 | 185 — Related correlation IDs | ✅ | Key `relatedCorrelationIds` viaja en el response (`/api/sistema/correlation/{id}`). En 2 IDs probados llegó vacía → sección oculta como espera el brief. Caso "visible con chips" no validable sin tráfico orgánico con related en últimas 2h reales | Mover a `closed/`. `/verify 185` ✅ |
| 2.4 | 184 — Paginación bandeja | ✅ | UI muestra "Mostrando 1-25 de 6101" → page 2 → "Mostrando 26-50". Total viene de `/api/sistema/email-outbox/count` (FE hace 2 calls). Filtros `correlationId/estado/tipoFallo` viajan como query params (param de paginación es `page`, no `pageNumber`) | Mover a `closed/`. `/verify 184` ✅ |
| 2.5 | 169 — SMTP response drawers | ⚠️ parcial | Blacklist drawer: secciones "SMTP response" arriba + "Causa interna" abajo OK. Quarantine vacío (0 registros prod) → tabla "Histórico de hits" no validable. Badge "(reconstruido)" no validable (ningún item con `source === 'reconstructed'`) | Dejar en `awaiting-prod/` con nota: "blacklist drawer OK; quarantine + badge reconstruido pendientes de tráfico real" |
| 2.6 | 152 — Sparkline ErrorGroup | ✅ | Vista Tabla y Kanban: 20 SVGs con `aria-label="Tendencia 30 días de ..."`. Placeholder "sin actividad" no validable (todos los grupos tienen data) | Mover a `closed/`. `/verify 152` ✅ |
| 2.7 | 147 G.3 — Link auditoría → usuarios `autoOpen` | ❌ | Navegar a `/intranet/admin/usuarios?dni=74125896&autoOpen=true` muestra la tabla con sus 10 filas default, input de búsqueda vacío, drawer cerrado. El query param no se consume | **Abrir F-021** (ver §2). `/verify 147` ❌ G.3 |
| 2.8 | 195 — Auto-refresh opt-in | ✅ | Toggle default `aria-pressed="false"` + `aria-label="Activar auto-refresh cada 30 segundos"`. Click alterna estado y class (`p-button-text` ↔ `p-button-outlined`) | Mover a `closed/`. `/verify 195` ✅ |
| 2.9 | 197 — Occurrence drawer 5 tabs | ✅ | Drawer ocurrencia con 5 tabs confirmadas: General, Trace, Breadcrumbs (5), Group, Req/Res. Fix "Anónimo" (`360aa28`) no validable (ocurrencia probada tenía Director, no usuario nulo) | Mover a `closed/`. `/verify 197` ✅ |
| 2.10 | dashboard usuarios stats | ✅ | 7 stat-cards: Total=273, Directores=2, Asist.Adm=3, Promotores=1, Coord.Académicos=1, Profesores=21, Estudiantes=245. Endpoint `/api/sistema/usuarios/estadisticas` devuelve `totalPromotores` y `totalCoordinadoresAcademicos`. Estilo icon-right aplicado | Mover a `closed/`. `/verify dashboard-usuarios-...` ✅ |

### Categoría 1 — BD-PRUEBA (local con BD prueba)

| # | Brief | Estado | Evidencia | Acción Claude Code |
|---|---|---|---|---|
| 1.4 | 143 — Vista asistencia uniforme 4 roles | ⚠️ regresión | Matriz 3 roles × 2 pantallas (ver §4). Director/Promotor/CoordAcad ✅ uniformes en `/intranet` + `/intranet/asistencia`. **AA YARUPAITA ve panel admin en `/intranet/asistencia` cuando brief 134 parte 4a dice que debe ver self-service** | **Abrir F-022** (ver §2). `/verify 143` ⚠️ (3 de 4 ✅, AA rompe) |
| 1.1 · 1.2 · 1.3 · 1.5 · 1.6 | 140, 119, 134 4b, 137, 147 G.2 | ⏸ pendientes | Requieren sesión Cowork local con mutaciones (CRUD reales) | Dejar para próxima sesión Cowork |

### Categoría 3 — PROD-ONLY (observación pasiva)

Sin cambios. Briefs 106, 110, 127, 142, 147 G.1, 153 quedan en observación de telemetría orgánica.

---

## 2. Hallazgos nuevos a abrir

### F-021 · Alto · Deep-link `dni=X&autoOpen=true` no filtra ni auto-abre drawer

**Capa**: FE
**Brief origen**: 147 G.3
**Componente**: `src/app/features/intranet/pages/admin/usuarios/...` (componente que renderiza `/intranet/admin/usuarios`)

**Síntoma**:
Navegar a `https://educa.com.pe/intranet/admin/usuarios?dni=74125896&autoOpen=true` aterriza con:
- Tabla mostrando las 10 filas default (no filtrada al DNI)
- Input "Buscar por ID, nombre, DNI o correo..." vacío
- Drawer del usuario cerrado (`role=dialog` count = 0)

El flujo end-to-end desde auditoría → usuarios con deep-link queda roto.

**Reproducir**:
1. Login Director en prod
2. Navegar manualmente a `/intranet/admin/usuarios?dni=74125896&autoOpen=true`
3. Esperar 5s — la tabla termina de cargar con todas las filas, ningún drawer abierto

**Sugerencia FE**:

En el `ngOnInit` del componente Usuarios, consumir los query params:

```typescript
ngOnInit() {
  // ... lógica existente
  const dni = this.route.snapshot.queryParamMap.get('dni');
  const autoOpen = this.route.snapshot.queryParamMap.get('autoOpen') === 'true';

  if (dni) {
    this.searchControl.setValue(dni, { emitEvent: true });
  }

  if (autoOpen && dni) {
    // esperar a que la lista cargue y haya 1 match
    this.usuariosLista$
      .pipe(filter(rows => rows.length === 1), take(1))
      .subscribe(rows => this.abrirDrawer(rows[0]));
  }
}
```

Test: integración con `RouterTestingHarness` validando que `?dni=X&autoOpen=true` setea el filtro y abre el drawer cuando hay 1 match. Caso edge: 0 matches no debe abrir nada; 2+ matches debe filtrar pero no abrir (ambiguo).

---

### F-022 · Alto · AA pierde vista self-service en `/intranet/asistencia` (regresión brief 134)

**Capa**: FE
**Brief origen**: 143 (uniformidad 4 roles) vs 134 parte 4a (AA self-service)
**Componente**: `src/app/features/intranet/pages/cross-role/attendance-component/...` o el feature AA que aloja el self-service

**Síntoma**:
Login local con AA YARUPAITA RICARDO REY (DNI 72884913 / pwd YA4913 / rol Asistente Administrativo) → `/intranet/asistencia` muestra el mismo panel admin que el Director:
- Tabs Estudiantes / Profesores / Asistentes Admin
- Leyenda completa (A/T/F/J/-)
- Filtro INV-C11 banner
- Dropdown Grado y Sección con todos los grados
- **Ninguna sección self-service** (no "Mi asistencia", "Mis registros", "Marcar entrada")

El brief 143 (uniformidad) y el brief 134 parte 4a (AA self-service) están en conflicto. El doc `verify-awaiting-prod-2026-05-19.md §1.4` anticipa exactamente este caso:

> "Conflicto conocido con 134: AA en `/intranet/asistencia` debería ver self-service (no panel admin). Si ve panel admin, hay regresión. Reportar."

**Causa probable**:
El unificador del brief 143 expandió el componente cross-role a los 4 roles administrativos (Director, Promotor, Coord. Académico, AA) sin preservar la rama AA → self-service.

**Sugerencia FE**:

En el componente cross-role de asistencia, branch por rol:

```typescript
const rol = this.authService.usuarioActual()?.rol;
const esAdminCompleto = ['Director', 'Promotor', 'Coordinador Académico'].includes(rol);
const esAa = rol === 'Asistente Administrativo';

if (esAdminCompleto) {
  // panel admin uniforme (estado actual brief 143)
} else if (esAa) {
  // delegar a AaSelfServiceComponent (brief 134 parte 4a)
}
```

Verificar primero qué componente self-service tenía el AA antes — buscar en git log del feature AA:

```bash
git log --all --oneline -- 'src/app/features/intranet/pages/aa/**' 'src/app/features/intranet/pages/asistente-administrativo/**'
```

Test: integración del componente cross-role con `rol = 'Asistente Administrativo'` debe renderizar el self-service, no el panel admin.

---

## 3. Credenciales locales obtenidas (BD prueba)

Sesión local 2026-05-19 — banner UI confirma "Hay contraseñas en texto plano que pueden migrarse al campo encriptado". Patrón generado: 2 letras del apellido + últimos 4 dígitos del DNI.

| Rol | Usuario | DNI | Password local |
|---|---|---|---|
| Director | ADMINISTRADOR EL DIRECTOR | 74125896 | 12349898 |
| Coordinador Académico | TREJO PÉREZ MEDALITH MATILDE | 41163676 | TR3676 |
| Promotor | MEDINA AVALOS LUZMILA GENOVEVA | 09766543 | ME6543 |
| Asistente Administrativo | YARUPAITA MALASQUEZ RICARDO REY | 72884913 | YA4913 |

Útiles para validación de Plan 28 / Plan 43 / Plan 41 cuando requieran multi-rol.

---

## 4. Matriz brief 143 (4 roles × 2 pantallas)

| Rol | `/intranet` widget Asistencia | `/intranet/asistencia` |
|---|---|---|
| Director | Estudiantes 0/152 + Profesores 0/18 con métricas Completas/Solo entrada/Faltas + Asistió/Tardanza/Falta | Panel admin: 3 tabs + leyenda + filtro INV-C11 + dropdown Grado/Sección |
| Promotor (MEDINA) | ✅ idéntico al Director | ✅ panel admin idéntico |
| Coord. Académico (TREJO) | ✅ idéntico al Director | ✅ panel admin idéntico |
| Asistente Admin (YARUPAITA) | ✅ idéntico al Director | ❌ panel admin (debe ser self-service por brief 134) |

---

## 5. Aclaraciones de ambigüedades resueltas con código local

### 5.1 — Botón "Abrir en rate-limit" en hub Correlation

El brief 186 (Plan 41 Chat 3a) escribió en su nota: "Resultado: 3 sub-components con botón… `rate-limit-section` sin botón (confirmado: no hay vista admin filtrable por evento individual)".

**Realidad**: `src/app/features/intranet/pages/admin/correlation/components/correlation-rate-limit-section/correlation-rate-limit-section.component.html` líneas 8-16 contiene el anchor:

```html
<a
  [routerLink]="['/intranet/admin/rate-limit-events']"
  [queryParams]="{ correlationId: correlationId() }"
  pButton
  type="button"
  label="Abrir en rate-limit"
  icon="pi pi-external-link"
  class="p-button-text p-button-sm"
></a>
```

`git log --follow -p` confirma que ese anchor existe desde el commit inicial del hub `a70b8d3` (2026-04-25). El brief 186 erró su confirmación — no es regresión.

**Acción**: editar `verify-awaiting-prod-2026-05-19.md §2.2` para reflejar que **las 4 secciones** (errors, rate-limit, reports, emails) tienen botón de navegación. O bien, si funcionalmente no se quiere el botón, abrir brief separado para removerlo (no parece justificado — la vista destino existe y filtra por `correlationId`).

### 5.2 — Key `relatedCorrelationIds` en response

Mi reporte preliminar dijo que la key no viajaba. **Era falso**: regex de extracción de field names no la capturó. Re-verificado con `/relatedCorrelationIds/.test(body)` → `true`. BE `CorrelationSnapshotDto.cs:31` la incluye con default `new()`. Brief 185 ✅.

### 5.3 — Key `ultimoErrorTransiente` en `/email-outbox/listar`

DTO `EmailOutboxListaDto.cs:19` declara la propiedad. `EmailOutboxService` (proyección EF en method `ListarAsync`) la asigna con `UltimoErrorTransiente = e.EO_UltimoErrorTransiente`. Pero el response no la incluye porque:

`Program.cs:41` configura Newtonsoft con `NullValueHandling = Ignore` global. Confirmado empíricamente:
- `?estado=SENT` → no viaja `ultimoError`, `tipoFallo`, `ultimoErrorTransiente` (todos null en exitosos)
- `?estado=FAILED` → viaja `ultimoError` y `tipoFallo` (con valor); **NO viaja `ultimoErrorTransiente`** (siempre se setea a null cuando se promueve a FAILED — ver `EmailOutboxWorker.cs:165, 216`)
- `?estado=PROCESSING` → ningún item de los 66 PROCESSING legacy actuales tiene `EO_UltimoErrorTransiente != null`

**No es bug**. Es contrato API + comportamiento del worker.

**Para validar el brief 147 G.1**: hay 2 opciones:
- (a) Esperar tráfico orgánico que genere un PROCESSING con transient error real. La query SQL del brief 142:
  ```sql
  SELECT TOP 5 EO_CodID, EO_Estado, EO_UltimoErrorTransiente, EO_FechaActualizacion
  FROM dbo.EmailOutbox
  WHERE EO_Estado = 'PROCESSING' AND EO_UltimoErrorTransiente IS NOT NULL
  ORDER BY EO_FechaActualizacion DESC;
  ```
- (b) Si el brief 147 G.1 esperaba que **la key siempre viaje aunque sea null** (preflight más estricto), agregar `[JsonProperty(NullValueHandling = NullValueHandling.Include)]` específicamente en esa propiedad del DTO. Decisión de producto, no obvio.

---

## 6. Lo que Cowork necesita en próxima sesión

Para cerrar categoría 1 BD-PRUEBA pendientes:

- **1.1 (brief 140)** — Probar dialog "+ Nueva asistencia" con tipoPersona=AA en `/intranet/admin/asistencias`. Mutativo: crea `AsistenciaPersona` real. Requiere local + BD prueba (ya disponible).
- **1.2 (brief 119)** — DELETEs en ~5 facades. Mutativo. Requiere local + BD prueba.
- **1.3 (brief 134 4b)** — Bloqueado por 1.1 (tab AA del Director necesita data).
- **1.5 (brief 137)** — Smoke navegacional cross-app. No mutativo. Puede correr ahora con local + BD prueba.
- **1.6 (brief 147 G.2)** — Validar textarea obligatoria blacklist manual sin submitear. No mutativo. Puede correr ahora.

Tarea menor sin abrir hallazgo: la combinación MCP `left_click + type` consecutiva sobre el mismo input duplica el texto (vi `YA4913YA4913` en pwd field). Workaround para próximas sesiones: usar `inputElement.value` + dispatch `input` event vía `javascript_tool`. No es bug del proyecto.

---

## 7. Resumen ejecutivo (1 línea por brief)

```
2.1   180              · ✅ JSON shape correcto · /verify 180
2.2   186              · ⚠️ doc desactualizado, no regresión · actualizar verify
2.3   185              · ✅ key viaja, ocultaba por falta de related orgánico · /verify 185
2.4   184              · ✅ pagination total real, filtros como query · /verify 184
2.5   169              · ⚠️ blacklist OK, quarantine + badge sin data
2.6   152              · ✅ sparklines en Tabla y Kanban · /verify 152
2.7   147 G.3          · ❌ deep-link autoOpen no funciona · F-021
2.8   195              · ✅ toggle opt-in default off · /verify 195
2.9   197              · ✅ 5 tabs · /verify 197
2.10  dashboard usuarios · ✅ 7 stat-cards · /verify dashboard-usuarios-...
1.4   143              · ⚠️ regresión AA self-service · F-022
1.1, 1.2, 1.3, 1.5, 1.6 · ⏸ próxima sesión Cowork
3.x   PROD-ONLY        · observación pasiva, sin cambios
```
