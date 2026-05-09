# Setup Cowork — educa-web + Educa.API

Guía para que Claude (Cowork mode) tenga el entorno listo en una nueva sesión.

## Pegar este bloque al iniciar un chat nuevo

```
educa-web
```

> Cowork lee `C:\devtest\qa-cowork-playbook.md` + `C:\devtest\setup-cowork-template.md` + este archivo automáticamente. Solo el slug del proyecto basta.

---

## 1. Reglas operativas críticas

- **Filtro INV-C11 (asistencia diaria)**: el sistema solo trackea asistencia diaria de **5to Primaria en adelante** (`GRA_Orden ≥ 8`). Si el usuario pide probar asistencia, usar salones **sección A** con grado ≥ 5to Primaria. Grados inferiores muestran empty state legítimo, no es bug.
- **"Sin ediciones" significa**: NO clic en Guardar/Confirmar/Eliminar. SÍ se permite abrir dialogs, expandir filas, click en botones de navegación/acción mientras no muten data real.
- **Rutas BE — convención mixta, confirmar caso por caso**: algunos controllers usan kebab literal (`[Route("api/asistencia-admin")]`), otros PascalCase implícito (`[Route("api/[controller]")]` → `/api/ReportesAsistencia`). NO asumir kebab global. Antes de fetch directo: `Grep "[Route"` en `Educa.API/Controllers/<area>/<Controller>.cs`.
  - **Kebab literal**: `AsistenciaAdminController` (`api/asistencia-admin`), `PermisoSaludController` (`api/permisos-salud`), `CierreAsistenciaController` (`api/cierre-asistencia`), `AsistenteAdministrativoController` (`api/asistente-administrativo`), `RateLimitEventsController` (`api/sistema/rate-limit-events`).
  - **PascalCase implícito**: `ReportesAsistenciaController` (`api/ReportesAsistencia`), `ConsultaAsistenciaController` (`api/ConsultaAsistencia`), `AsistenciaController` (`api/Asistencia`).
- **Permisos**: Director ve TODO. Otros roles (Profesor, Estudiante, Apoderado, Asistente Admin) requieren credenciales separadas — pedir al usuario.
- **Reglas del proyecto** que viven en `educa-web/.claude/CLAUDE.md` (infra Claude Code, raíz `.claude/`). Antes de sugerir cambios de código, leer:
  - `rules/business-rules.md` — invariantes del dominio (INV-*)
  - `rules/architecture.md` — taxonomía servicios/componentes
  - `rules/a11y.md` — contraste y accesibilidad
  - `rules/design-system.md` — pautas visuales B1-B11
  - `rules/communication.md` — protocolo de mensajes

---

## 2. Carpetas conectadas

| Carpeta | Ruta | Rol |
|---|---|---|
| Frontend | `C:\Users\Asus Ryzen 9\EducaWeb\educa-web` | Angular 21 + Capacitor (web + Android/iOS) |
| Backend | `C:\Users\Asus Ryzen 9\EducaWeb\Educa.API` | ASP.NET Core 9 + EF Core 9 + SQL Server (Azure) |

---

## 3. Navegador y credenciales

- **Browser laboral**: Chrome perfil `Sistemas` (`area.sistemas.min@gmail.com`), nombre en el listado del MCP: **`work aqui m`** (deviceId `30baf13d`). Cuando `list_connected_browsers` devuelva varios, **siempre elegir este**.
- **NO usar**: el browser `tu papi mas naki` (deviceId `a87b2f3a`) es personal — preguntar al usuario si por error solo aparece ese.
- **Vivaldi**: tiene la extensión pero atada a cuenta personal — NO usar para Cowork de trabajo.
- **Extensión**: "Claude in Chrome" (Anthropic, Beta) autenticada con `area.sistemas.min@gmail.com`.
- **Credenciales test**: DNI `74125896` / pwd `12349898` / rol `Director`. Hay sesión guardada en el login screen — un click en el item "ADMINISTRADOR EL DIRECTOR" basta, sin tipear credenciales.
- **Cómo opera Claude en Chrome**: vía DOM events (DevTools Protocol), NO con cursor del SO. No verás un puntero animado moverse — los cambios suceden directos. Para auditar en tiempo real: tener DevTools abierto en Network (filtro `Fetch/XHR`) y Console.

---

## 4. URLs

| Entorno | URL | Notas |
|---|---|---|
| Frontend local | `http://localhost:4201/intranet` | Raíz de pruebas |
| Backend local | `https://localhost:7102` | Educa.API (HTTPS) |
| Frontend prod | `https://educa.com.pe/intranet/login` | Verificación post-deploy. Mismo origen que el BE (`/api/...` mismo host) |
| Backend prod | `https://educacom.azurewebsites.net` (origen Azure) o `https://educa.com.pe/api` (mismo host del FE) | Read-only por default. Mutaciones requieren OK explícito del usuario en el chat por round y, cuando sea posible, sobre datos creados como prueba (`smoke-cowork-<fecha>` o equivalente) — la UI hace soft delete pero `edit` pierde estado previo. |

---

## 5. Atajos de la app (intranet)

- `Ctrl+K` → menú de navegación lateral
- Pill del header (desktop) → mismo menú
- Hamburguesa (móvil ~380px) → mismo menú
- `Esc` → cierra el menú

---

## 6. Limitaciones técnicas específicas del proyecto

### 6.1 Componentes y framework

- **PrimeNG `p-select`**: `form_input` MCP a veces falla con "SPAN is not a supported form input". Workaround: usar `javascript_tool` con `dispatchEvent('change')` sobre el `<select>` nativo si está expuesto, o click en el trigger por coordenadas.
- **Two-way binding en dialogs PrimeNG**: nunca usar `[(visible)]`; siempre `[visible]` + `(visibleChange)` (regla del proyecto en `rules/dialogs-sync.md`).
- **HttpClient usa `withFetch`**: Angular 21 está bootstrapeado con `provideHttpClient(withFetch())`. Para interceptar requests desde JS inyectado, sobreescribir `window.fetch` — sobreescribir `XMLHttpRequest.prototype.send` NO funciona, no se invoca.

### 6.2 Patrones reutilizables para Claude (probados en WAL smoke)

- **Inspeccionar IndexedDB sin destruirla** (`deleteDatabase` devuelve `blocked` mientras la app la tiene abierta):
  ```js
  new Promise(res => {
    const r = indexedDB.open('educa-wal-db');
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction(['wal-entries'], 'readonly');
      const all = tx.objectStore('wal-entries').getAll();
      all.onsuccess = () => { db.close(); res(all.result); };
    };
  })
  ```
- **Limpiar IndexedDB sin destruirla**: usar `tx.objectStore(name).clear()` con transacción `readwrite`. Más rápido y no se bloquea.
- **Simular offline real (afecta WAL engine)**: `window.dispatchEvent(new Event('offline'))`. Solo cambia `SwService.isOnline` — el `fetch` real sigue funcionando. Para que un POST falle también hay que interceptar `window.fetch` y devolver `new Response(body, {status: 503})`.
- **Volver online**: `window.dispatchEvent(new Event('online'))`.
- **CSRF para fetch directo desde consola**: el header `X-XSRF-TOKEN` se obtiene del cookie `XSRF-TOKEN`:
  ```js
  const csrf = document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('XSRF-TOKEN='))?.split('=')[1];
  fetch(url, { method:'PUT', headers:{'Content-Type':'application/json', 'X-XSRF-TOKEN': csrf}, credentials:'include', body: JSON.stringify(payload) })
  ```

### 6.3 Quirks del MCP Claude in Chrome

- **`tabs_create_mcp` NO hereda sesión**: el tab nuevo aterriza en `/intranet/login`. Hay que clickear la sesión guardada o re-loguearse manualmente. Probable causa: sessionStorage por-tab en estado fresh.
- **`read_console_messages` y `read_network_requests` arrancan tracking en la primera llamada**: los logs y requests previos se pierden. Llamarlos al inicio del flujo si interesa capturar logs de page load.
- **`F5` mata todo JS inyectado**: interceptores de `window.fetch`, listeners, variables globales — todo se borra. Re-inyectar después de cada reload.
- **`computer-use` sobre Chrome está en tier `read`**: clicks y typing bloqueados a nivel SO (política de Anthropic, no negociable). Toda interacción con el navegador debe pasar por `mcp__Claude_in_Chrome__*`. Para apps nativas (Notes, Finder, Explorer, etc.) sí funciona tier `full`.
- **Login screen prod — click en el card NO loguea**: clic sobre el texto/avatar del item "ADMINISTRADOR EL DIRECTOR" solo dispara hover state que expone dos íconos a la derecha (flecha `→` para login, `X` para borrar la sesión). Hay que clickear específicamente la flecha `→` (a la izquierda de la `X`) para autenticar. En viewport 1568px aterriza aprox en `(964, 408)`.
- **Harness Cowork bloquea respuestas con `[BLOCKED: Cookie/query string data]`**: triggers conocidos al usar `javascript_tool` — concatenar URLs con `&` y `=` literales; serializar header `Content-Disposition` (contiene `filename=`); encadenar `await rD.json()` con muchos campos en un solo retorno. Workarounds: usar `URLSearchParams` en vez de string templates, NO incluir `Content-Disposition` en el output, partir scripts grandes en sub-llamadas más cortas con un solo `fetch` por call.

### 6.4 Comportamientos del proyecto fáciles de malinterpretar

- **DELETE en `/api/sistema/cursos/{id}/eliminar` es soft delete**: BE devuelve 200 pero la fila persiste con `CUR_Estado=false`. NO es bug — la baja lógica preserva historial. Para limpieza física del entorno de pruebas, hay que pedir SQL directo al usuario.
- **`commitAndClean` borra la entry WAL inmediatamente al commit**: NO espera `COMMITTED_TTL_MS` (24h). Si pruebas un caso happy y el IDB queda en 0 entries, es lo esperado, no que falló persistir.
- **Las entries WAL `FAILED` quedan persistidas hasta que algo las limpie**: si haces un caso 4 (permanent error), la entry FAILED queda en IDB y aparece en `WalStatusFacade` como warning. Limpiar manualmente con `clear()` antes de seguir con otros casos.
- **Cross-tab refetch tras commit del leader** (resuelto en chat 098, 2026-05-05): el follower SÍ refresca UI automáticamente vía `WalCrossTabRefetchService` con callbacks `refetchItems` (obligatorio) + `refetchStats` (opcional). Si ves un counter stale en otra tab tras CRUD, verificá en `core/services/wal/wal-cross-tab-refetch.service.ts` que el feature pase `refetchStats` cuando tiene endpoint de estadísticas. Ver `rules/optimistic-ui.md` § "Asimetría items vs stats".
- **SW agresivo con bundle stale en dev** (chat 098): después de `npm run start`, si tus logs nuevos no aparecen en consola y el código nuevo no corre, lo más probable es que el SW está sirviendo chunks viejos. Workaround: F12 → Application → Service Workers → Unregister TODOS + Clear site data + tab nuevo. Ver `rules/service-worker.md` § "SW activo en dev — bundle stale al iterar código".
- **`logger.log` y `logger.warn` no emiten en `ng serve`** (Angular 21 + esbuild): `isDevMode()` retorna `false` porque `ngDevMode` no se setea como global. Para debugging puntual usar `console.log` directo con tag prefijado y comentario `// TEMP debug <NNN>`. Ver `rules/debug.md` § "Quirk: Angular 21 + esbuild".

### 6.5 MCPs útiles para este stack

- **Microsoft Learn** (`89a7ddf5-2a6b-410c-be11-aa0e1a1b35a6`): .NET 9 / EF Core 9 docs.
- **Exa** (`91408932-1110-4350-97c7-2d6b3a6d9694`): búsqueda web general.

### 6.6 Endpoints BE útiles para validación de carga / smoke

Validados en prod 2026-05-09 con sesión Director (cookie auth + `X-XSRF-TOKEN`):

| Endpoint | Método | Carga server | Uso típico |
|---|---|---|---|
| `/api/Auth/perfil` | GET | Liviano (~5-30ms) | Smoke de cap global / concurrency F1 (PROD-1). 10+ paralelos sin saturar. |
| `/api/sistema/notificaciones/activas` | GET | Liviano | Smoke alterno de auth + DB simple. |
| `/api/sistema/rate-limit-events?take=200` | GET | Liviano | Inspección de telemetría histórica de rate limits y bulkheads — campos clave: `policy`, `endpoint`, `limiteEfectivo`, `tokensConsumidos`, `fueRechazado`, `correlationId`, `fecha`. |
| `/api/sistema/rate-limit-events/stats?horas=24` | GET | Liviano | Stats agregados — `Top rol`, `Top endpoint`. |
| `/api/ReportesAsistencia/datos?filtro=todos&rango=mes&fecha=YYYY-MM-15&tipoPersona={E\|P\|A\|todos}` | GET | Medio | JSON con shape `data.salones`, `data.asistentesAdmin`, `data.estadisticas`. Útil para validar separación de tipos de persona (Plan 28). |
| `/api/ReportesAsistencia/pdf?filtro=todos&rango=mes&fecha=YYYY-MM-15&tipoPersona={E\|P\|A}` | GET | **Pesado** (~7s/PDF) | Saturar bulkhead `concurrency:reports` (cap 8). 12 paralelos → cap honrado vía queue, latencias escalonadas 7s→9s sin emitir 503. Para forzar 503+`Retry-After` hay que superar también el queue. |
| `/api/ReportesAsistencia/excel?...` | GET | Medio | Mirror Excel del PDF (INV-RE01). |

**Cómo extraer CSRF para fetch directo desde consola** — ya documentado en §6.2.

**Cuidado con prod**: 12 PDFs paralelos = 12 PDFs reales generados. Limitar volumen de carga sintética. Para tests de saturación reales usar k6 (ver `claude-cowork/f6a-k6-calibration.md`).

---

## 7. Hallazgos abiertos — cierre 2026-04-29

**Resumen**: 0 críticos · 1 alto · 4 medios · 11 bajos · _F-003 verificado, ver §8_

### F-001 · Bajo · Jerarquía visual ambigua entre items y subgrupos del menú

**Capa**: FE
**Componente / archivo**: nav-menu / panel — buscar SCSS de `.panel-group-label` en `src/app/features/intranet/shared/components/layout/intranet-layout/...`

**Síntoma**:
Subgrupos como *Administración*, *Asistencia*, *Calendario*, *Gestión*, *Permisos* dentro del menú lateral se ven casi iguales a los items individuales. En Comunicación aparece "Calendario" como subgrupo seguido de "Calendario" como item con icono — confusión visual inmediata.

**Datos medidos**:
- `.panel-group-label` (subgrupo): 10.4px · weight 600 · negro · sin icono · cursor:auto
- `.panel-item-label` (item): 13.2px · weight 500 · negro · con icono
- Module headers (*ACADÉMICO*, *SEGUIMIENTO*): verde + uppercase + tracking — bien diferenciados

**Pasos para reproducir**:
1. Login como Director.
2. Pulsar `Ctrl+K` (o clic en pill "Inicio Ctrl+K" del header).
3. Observar: en Académico → "Administración" (subgrupo) vs "Cursos" (item). En Comunicación → "Calendario" (subgrupo) vs "Calendario" (item).

**Sugerencia para Claude Code**:
Aplicar uppercase + letter-spacing al `.panel-group-label` en color `--text-color-secondary`, similar a los module headers pero más sutil. O reemplazar por divider con micro-label estilo "—— Administración ——".

---

### F-002 · Medio · FAB Reportar tapa el footer del drawer móvil

**Capa**: FE
**Componente / archivo**: `.feedback-fab` (probable: `src/app/features/intranet/shared/components/layout/intranet-layout/...` o `src/app/shared/components/feedback-report-dialog/...`)

**Síntoma**:
En viewport móvil (probado a 400×477), al abrir el drawer con la hamburguesa, el FAB *Reportar* queda flotando encima del menú y bloquea visualmente el footer del drawer (avatar + "ADMINISTRADOR DIRECTOR / Director").

**Datos medidos**:
- `.feedback-fab`: `position: fixed`, `z-index: 997`
- `.menu-overlay` (drawer): `z-index: 200`
- FAB ubicado a `x:370, y:440` dentro del viewport del drawer (ancho 434)

**Pasos para reproducir**:
1. Login Director.
2. Forzar viewport móvil (DevTools device mode ~400×800).
3. Tap en el icono hamburguesa del header.
4. Drawer se abre — el botón Reportar queda flotando sobre el footer.

**Sugerencia para Claude Code**:
Ocultar `.feedback-fab` mientras el drawer móvil esté abierto, vía `[class.fab-hidden]="menuOpen()"` consumiendo un signal del store de la intranet. Alternativa: bajar `z-index` del FAB a 150 (menor que el drawer).

---

### F-004 · Medio · Vista cross-role `/intranet/asistencia` sin notice de filtro INV-C11

**Capa**: FE
**Componente / archivo**: `src/app/features/intranet/pages/cross-role/attendance-component/...`

**Síntoma**:
Al entrar a `/intranet/asistencia`, el dropdown de Grado y Sección viene seleccionado por defecto en *"INICIAL 3 AÑOS - A"*, que está fuera del alcance INV-C11 (`GRA_Orden < 8`). El usuario ve un empty state *"No hay registros de asistencia para esta fecha"* sin entender por qué.

**Datos medidos**:
- La vista admin `/admin/asistencias` SÍ muestra banner azul prominente explicando el filtro temporal.
- Esta vista cross-role NO. Inconsistencia.

**Pasos para reproducir**:
1. Login Director.
2. Navegar a `/intranet/asistencia`.
3. El dropdown viene en "INICIAL 3 AÑOS - A" (GRA_Orden 1, fuera de alcance).
4. Tabla muestra "No hay registros" sin contexto.

**Sugerencia para Claude Code**:
- Replicar el banner INV-C11 en la vista cross-role cuando el grado seleccionado tenga `GRA_Orden < UMBRAL_GRADO_ASISTENCIA_DIARIA`.
- O cambiar el default del filtro al primer grado dentro de alcance (5to Primaria, `GRA_Orden = 8`).
- Constante FE: `shared/constants/attendance-scope.ts → UMBRAL_GRADO_ASISTENCIA_DIARIA` (= 8).

---

### F-005 · Bajo · Title del navegador no refleja sub-pestaña `?tab=reportes`

**Capa**: FE
**Componente / archivo**: `src/app/features/intranet/pages/admin/attendances/attendances.component.ts`

**Síntoma**:
Estando en `?tab=reportes`, la pestaña del navegador sigue diciendo *"Intranet - Gestión de Asistencias"*. El título debería reflejar la sub-pestaña activa.

**Sugerencia para Claude Code**:
En el component, suscribirse a `queryParams` y actualizar el `Title` service de Angular según la tab activa (ej: "Intranet - Reportes de Asistencia").

---

### F-006 · Bajo · Permisos de Salud: layout de botones de acción confuso

**Capa**: FE
**Componente / archivo**: `src/app/features/intranet/pages/admin/permisos-salud/...`

**Síntoma**:
Los botones *Permiso de Salida* y *Justificación Médica* aparecen en la esquina superior derecha de la sección "Permisos de Salida", pero crean ambos tipos de registro. Layout sugiere que aplican solo a Permisos de Salida cuando son acciones globales del salón.

**Sugerencia para Claude Code**:
Mover los CTAs a un header de página (no anidados a una sección específica). Patrón consistente con otros módulos admin del proyecto.

---

### F-007 · Bajo · Estado "X" se renderiza pero NO está en la leyenda

**Capa**: FE
**Componente / archivo**: `/intranet/asistencia` · clase `.estado-box.status-sin-registro`

**Síntoma**:
La leyenda lista 5 estados (A, T, F, J, -). La tabla renderiza un sexto estado **"X" (sin-registro)** sin presencia en la leyenda. Usuario no entiende qué significa. Además el span "X" no tiene `title` ni `aria-label` — falla accesibilidad.

**Sugerencia para Claude Code**:
- Agregar "X = Sin registro" a la leyenda.
- Agregar `aria-label="Sin registro"` al span con clase `.status-sin-registro`.

---

### F-008 · Medio · Tooltip "Clic para justificar" aparece sobre estudiantes con estado A

**Capa**: FE
**Componente / archivo**: `/intranet/asistencia` tab Estudiantes

**Síntoma**:
Hover sobre cualquier fila de estudiante (incluso con estado A=Asistió) muestra tooltip *"Clic para justificar"*. No tiene sentido invitar a justificar a alguien que asistió correctamente. Solo debería aparecer en F (Falta), T (Tardanza) o estados pendientes.

**Sugerencia para Claude Code**:
Condicionar el tooltip al estado: `[pTooltip]="esJustificable(estudiante) ? 'Clic para justificar' : null"` donde `esJustificable` retorna true solo para F/T/X.

---

### F-009 · Bajo · Tab Estudiantes vs Profesores tienen UI de acciones inconsistente

**Capa**: FE
**Componente / archivo**: `/intranet/asistencia`

**Síntoma**:
Tab **Profesores** tiene columna *ACCIONES* con icono pencil explícito (deep-link a admin). Tab **Estudiantes** NO tiene esa columna pero la fila completa es clickeable (tooltip "Clic para justificar"). Misma funcionalidad expresada de dos maneras distintas.

**Sugerencia para Claude Code**:
Unificar — ambos tabs con columna ACCIONES, o ambos con click en fila. Recomendado: columna ACCIONES explícita en ambos, alinea con design system §B5 (row actions triplet).

---

### F-010 · Bajo · Deep-link a admin no auto-abre el dialog de edición

**Capa**: FE
**Componente / archivo**: `src/app/features/intranet/pages/admin/attendances/attendances.component.ts`

**Síntoma**:
Click pencil en cross-role pasa filtros a admin (DNI + fecha + tipoPersona) pero NO abre automáticamente el dialog de edición. El admin todavía debe encontrar la fila y abrir el editor manualmente.

**Sugerencia para Claude Code**:
Cuando el queryParam contenga `asistenciaId` (preferido) o el DNI matchee 1 sola fila, abrir el editDialog automáticamente al cargar la vista.

> **Nota**: este hallazgo depende de F-011. Mientras F-011 no se arregle, el dialog tampoco podría auto-abrirse porque la fila ni siquiera aparece.

---

### F-011 · Alto · Filtro `search` de `/asistencia-admin/dia` NO busca por DNI — rompe deep-link "Editar en admin"

**Capa**: BE
**Componente / archivo**: `Educa.API/Repositories/Asistencias/AsistenciaAdminQueryRepository.cs:75` (estudiantes) y `:156-157` (profesores)

**Síntoma**:
Click en el icono pencil junto a un profesor en `/intranet/asistencia` hace deep-link a `/admin/asistencias?tab=gestion&tipoPersona=P&dni=76357038&fecha=2026-04-29`. La vista admin filtra por ese DNI pero muestra *"No hay registros de asistencia para esta fecha con el filtro activo"* aunque el registro SÍ existe.

**Datos medidos** (causa raíz verificada):
```csharp
// AsistenciaAdminQueryRepository.cs línea 75 (estudiantes):
x.e.EST_Nombres.Contains(term) || x.e.EST_Apellidos.Contains(term)

// línea 156-157 (profesores):
x.p.PRO_Nombres.Contains(term) ||
x.p.PRO_Apellidos.Contains(term)
```

**Pruebas que lo confirman**:
```
GET /api/asistencia-admin/dia?fecha=...&tipoPersona=P            → 9 profesores (RAMIREZ DNI 76357038 incluido)
GET /api/asistencia-admin/dia?fecha=...&tipoPersona=P&search=RAMIREZ    → 1 ✓
GET /api/asistencia-admin/dia?fecha=...&tipoPersona=P&search=ramirez    → 1 ✓ (case-insensitive funciona en nombres)
GET /api/asistencia-admin/dia?fecha=...&tipoPersona=P&search=76357038   → 0 ❌ (DNI exacto)
GET /api/asistencia-admin/dia?fecha=...&tipoPersona=P&search=763        → 0 ❌ (DNI parcial)
```

**Pasos para reproducir**:
1. Login como Director.
2. Navegar a `/intranet/asistencia`.
3. Cambiar Grado y Sección a "5TO PRIMARIA - A".
4. Click en tab "Profesores".
5. Click en el icono pencil del profesor RAMIREZ BERNARDO JOSE DANIEL (DNI 76357038).
6. Aterriza en `/admin/asistencias?tab=gestion&tipoPersona=P&dni=76357038&fecha=2026-04-29`.
7. Tabla muestra "No hay registros..." aunque RAMIREZ tiene entrada 07:32 ese día.

**Sugerencia para Claude Code**:
- BE: extender el predicado en `AsistenciaAdminQueryRepository.ListarEstudiantesDelDiaAsync` y `ListarProfesoresDelDiaAsync` para incluir `EST_DNI.Contains(term)` y `PRO_DNI.Contains(term)`.
- Considerar también búsqueda por `NombreCompleto` concatenado (Nombres + " " + Apellidos) — hoy un search "JUAN PEREZ" no matchearía si Nombres="JUAN" y Apellidos="PEREZ".
- Test: agregar test de integración con `search` = DNI exacto, DNI parcial, nombre+apellido.

**Por qué importa**: el flujo principal de corrección admin se rompe. El Director ve una tardanza/falta en cross-role, hace clic para editarla en admin, y la vista admin le dice "no existe". La única forma de encontrarla es escribiendo el nombre completo manualmente.

---

### F-012 · Bajo · Eje X del chart "Serie temporal" (Mapa de envío) renderiza etiquetas pegadas

**Capa**: FE
**Componente / archivo**: `src/app/features/intranet/pages/admin/email-outbox-dashboard-dia/components/...` (tile "Serie temporal", ventana 24h)

**Síntoma**:
En el tab "Mapa de envío" del Dashboard del día (`/intranet/admin/monitoreo/correos/dashboard`), las etiquetas horarias del eje X del chart "Serie temporal" se imprimen sin separación: `14:0015:0016:0017:0018:00`. Lo correcto sería "14:00 15:00 16:00 17:00 18:00" con espaciado proporcional al ancho del contenedor.

**Pasos para reproducir**:
1. Login Director.
2. Navegar a `/intranet/admin/monitoreo/correos/dashboard`.
3. Click en sub-tab "Mapa de envío".
4. Scroll hasta el tile "Serie temporal" — observar el eje X.

**Sugerencia para Claude Code**:
Configurar `tickInterval` / `autoSkip: true` en la config de Chart.js (o el wrapper que use el proyecto), o establecer `min-width` por tick. Validar también con ventana "30d".

---

### F-013 · Bajo · Eje X del chart "Tendencia de envíos (últimos 30 días)" en Bandeja de Correos pega los días

**Capa**: FE
**Componente / archivo**: `/intranet/admin/email-outbox` → tab "Bandeja" — chart resumen 30d

**Síntoma**:
Mismo síntoma que F-012 pero en el chart de Bandeja: `07/008/009/040/041/043/044/045/046/047/020/041/042/043/044/047/028…`. Días sin separación. Probable raíz común con F-012 (config compartida o wrapper de chart sin auto-skip).

**Pasos para reproducir**:
1. Login Director.
2. Navegar a `/intranet/admin/email-outbox` (redirige a `/monitoreo/correos/bandeja`).
3. Observar el chart "Tendencia de envíos (últimos 30 días)".

**Sugerencia para Claude Code**:
Si F-012 y F-013 comparten config de chart, fixar uno arregla ambos. Considerar abstraer la config base en un util.

---

### F-014 · Bajo · Placeholder del filtro Blacklist expone sintaxis SQL al usuario

**Capa**: FE
**Componente / archivo**: `src/app/features/intranet/pages/admin/email-outbox-blacklist/...` (tab Blacklist)

**Síntoma**:
El input de búsqueda en `/intranet/admin/monitoreo/correos/blacklist` tiene placeholder `Buscar por correo (LIKE %q%)...`. La parte `(LIKE %q%)` es jerga SQL que no aporta al usuario final y desentona con el resto de placeholders del proyecto.

**Sugerencia para Claude Code**:
Cambiar a `Buscar por correo...` o `Buscar por correo (coincidencia parcial)...` si se quiere comunicar el comportamiento sin filtrar implementación.

---

### F-015 · Medio · Toast engañoso al crear override duplicado en Permisos

**Capa**: FE
**Componente / archivo**: `src/app/features/intranet/pages/admin/permisos-usuarios/...`

**Síntoma**:
En `/intranet/admin/permisos/usuarios`, al click en "Nuevo Permiso" para un par usuario+rol que ya tiene override, el backend responde 409 (o equivalente) y el FE muestra toast `Error de conexión: Ya existe un permiso configurado para este usuario con este rol`. Dos problemas:
1. **Mensaje incorrecto** — no es error de conexión, es conflicto de unicidad.
2. **No ofrece acción** — debería redirigir a "Editar permisos" del override existente, o al menos mencionar dónde está.

**Pasos para reproducir**:
1. Login Director.
2. Ir a `/intranet/admin/permisos/usuarios`.
3. Click "Nuevo Permiso".
4. Seleccionar rol Director y un usuario que ya tenga override (por ejemplo `EL DIRECTOR ADMINISTRADOR`).
5. Marcar cualquier vista y "Guardar Cambios".
6. Aparece toast `Error de conexión...`.

**Sugerencia para Claude Code**:
- Detectar el código de error específico (probablemente 409 Conflict o status custom) y diferenciar del genérico de red.
- Mensaje sugerido: `Este usuario ya tiene un override para el rol {rol}. Editá ese permiso desde la fila correspondiente.` con CTA "Editar permisos" que abra el drawer del usuario en modo edición.

---

### F-016 · Bajo · Buscador de usuario en form Permisos no tolera orden de tokens

**Capa**: FE
**Componente / archivo**: `src/app/features/intranet/pages/admin/permisos-usuarios/...` (combo de búsqueda de usuario en dialog "Nuevo Permiso")

**Síntoma**:
El combo "Usuario" en el dialog de Permisos hace match por substring contiguo. Para el usuario cuyo nombre real es `EL DIRECTOR ADMINISTRADOR`, escribir `ADMINISTRADOR EL DIRECTOR` (orden invertido, intuitivo) devuelve "No results found". Solo `DIRECTOR` o `EL DIRECTOR` matchean. El avatar del header dice `ADMINISTRADOR DIRECTOR` lo que invita a teclear ese orden.

**Sugerencia para Claude Code**:
Tokenizar la query y aplicar AND sobre los tokens contra `Nombres + " " + Apellidos`. Patrón:

```ts
const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
const haystack = `${u.nombres} ${u.apellidos}`.toLowerCase();
return tokens.every(t => haystack.includes(t));
```

---

### F-017 · Bajo · Import muerto: SkeletonLoaderComponent en SenderStatsTileComponent

**Capa**: FE
**Componente / archivo**: `src/app/features/intranet/pages/admin/email-outbox-dashboard-dia/components/sender-stats-tile/sender-stats-tile.component.ts:29`

**Síntoma**:
El compilador Angular emite warning en `bun run start`:
```
NG8113: SkeletonLoaderComponent is not used within the template of SenderStatsTileComponent
```

**Sugerencia para Claude Code**:
Quitar `SkeletonLoaderComponent` del array `imports` del decorator (o agregar el skeleton al template si era la intención).

---

> **Nota operativa SignalR `/hubs/email-alerts`**: la consola registra 404 en `POST /hubs/email-alerts/negotiate` al cargar `/intranet/admin/monitoreo/correos/dashboard`. Es esperado hasta deploy de **Plan 39 Chat B (`awaiting-prod/078`)** que registra el `EmailHub` server-side. El FE 079 ya tiene listener pero falla negociación; el polling de fallback a `/email-outbox/defer-fail-status` cubre la funcionalidad. No abrir hallazgo nuevo — tracking en plan 078.

---

## 8. Hallazgos verificados

### F-003 · Alto · SignalR `/asistenciahub` falla con 404 en cada navegación de Seguimiento ✅

**Capa**: FE (dev only — Netlify ya tenía el wiring de prod)
**Componente / archivo**: `educa-web/proxy.conf.json`

**Síntoma original**:
Al entrar a `/intranet/asistencia`, `/admin/asistencias` o `/admin/permisos-salud`, la consola mostraba:
```
POST /asistenciahub/negotiate → 404
"Cannot POST /asistenciahub/negotiate"
Failed to start the connection
```

**Causa raíz** (descubierta en `/investigate` chat 083):
El BE `MapHub<AsistenciaHub>("/asistenciahub")` ya existía en `Educa.API/Extensions/PipelineExtensions.cs:131`. Netlify `netlify.toml` y `_redirects` ya tenían los redirects de prod. La única falla era que `proxy.conf.json` del dev server solo tenía `/chathub` y le faltaba la entry `/asistenciahub` con `ws: true`. **Bug dev-only — prod nunca estuvo afectado**.

**Fix aplicado**: agregada entry `/asistenciahub` en `proxy.conf.json` (6 líneas).

**Verificación** (smoke local 2026-05-02):
- `/asistenciahub/negotiate` → 200 con response completo (`negotiateVersion: 1`, `connectionId`, `connectionToken`).
- Transports disponibles: `WebSockets`, `ServerSentEvents`, `LongPolling`.
- Navegación `/intranet/asistencia` (5TO PRIMARIA - A) sin errores rojos en consola.

**Commit**: `17208f2` — `fix(proxy): add /asistenciahub entry to dev proxy config`

**Aprendizaje**: re-evaluar severidad de hallazgos SignalR en local — verificar primero si afectan prod (Netlify) antes de marcar como pre-deploy crítico. Diferenciar dev-proxy vs prod-redirects es la pregunta clave.

---

*Pendientes de verificar. Cuando Claude Code corrija un hallazgo y Cowork verifique el fix, mover la sub-sección desde §7 hasta acá agregando:*

```markdown
**Verificación**: {cómo se confirmó el fix — re-test, network limpia, captura}
**Commit**: `{hash o referencia PR}`
```
