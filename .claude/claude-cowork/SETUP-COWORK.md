# Setup Cowork — educa-web + Educa.API

Guía para que Claude (Cowork mode) tenga el entorno listo en una nueva sesión.

## Pegar este bloque al iniciar un chat nuevo

```text
Lee C:\devtest\qa-cowork-playbook.md y aplica el flujo.
Lee C:\devtest\setup-cowork-template.md para saber cómo escribir el SETUP del proyecto.
Lee .claude/claude-cowork/SETUP-COWORK.md de este repo para datos del proyecto y hallazgos abiertos.

Proyecto: educa-web
Ruta repo FE: C:\Users\Asus Ryzen 9\EducaWeb\educa-web
Ruta repo BE: C:\Users\Asus Ryzen 9\EducaWeb\Educa.API
URL local: http://localhost:4201/intranet
Stack: Angular 21 + Capacitor + .NET 9 + EF Core 9
Login: DNI 74125896 / pwd 12349898 / rol Director
```

---

## 1. Reglas operativas críticas

- **Filtro INV-C11 (asistencia diaria)**: el sistema solo trackea asistencia diaria de **5to Primaria en adelante** (`GRA_Orden ≥ 8`). Si el usuario pide probar asistencia, usar salones **sección A** con grado ≥ 5to Primaria. Grados inferiores muestran empty state legítimo, no es bug.
- **"Sin ediciones" significa**: NO clic en Guardar/Confirmar/Eliminar. SÍ se permite abrir dialogs, expandir filas, click en botones de navegación/acción mientras no muten data real.
- **Rutas BE en kebab-case**: el backend usa `/api/asistencia-admin` (no `/api/AsistenciaAdmin`). Confirmar siempre con `Grep "[Route"` en `Educa.API/Controllers/...` antes de fetch directo.
- **Permisos**: Director ve TODO. Otros roles (Profesor, Estudiante, Apoderado, Asistente Admin) requieren credenciales separadas — pedir al usuario.
- **Reglas del proyecto** que viven en `educa-web/.claude/CLAUDE.md`. Antes de sugerir cambios de código, leer:
  - `../rules/business-rules.md` — invariantes del dominio (INV-*)
  - `../rules/architecture.md` — taxonomía servicios/componentes
  - `../rules/a11y.md` — contraste y accesibilidad
  - `../rules/design-system.md` — pautas visuales B1-B11
  - `../rules/communication.md` — protocolo de mensajes

---

## 2. Carpetas conectadas

| Carpeta | Ruta | Rol |
|---|---|---|
| Frontend | `C:\Users\Asus Ryzen 9\EducaWeb\educa-web` | Angular 21 + Capacitor (web + Android/iOS) |
| Backend | `C:\Users\Asus Ryzen 9\EducaWeb\Educa.API` | ASP.NET Core 9 + EF Core 9 + SQL Server (Azure) |

---

## 3. Navegador y credenciales

- **Browser**: Chrome perfil `Sistemas` (`area.sistemas.min@gmail.com`)
- **Extensión**: "Claude in Chrome" (Anthropic, Beta) autenticada con la misma cuenta
- Vivaldi tiene la extensión pero atada a una cuenta personal — NO usar Vivaldi para Cowork de trabajo
- **Credenciales test**: DNI `74125896` / pwd `12349898` / rol `Director`

---

## 4. URLs

| Entorno | URL | Notas |
|---|---|---|
| Frontend local | `http://localhost:4201/intranet` | Raíz de pruebas |
| Backend local | `https://localhost:7102` | Educa.API (HTTPS) |
| Frontend prod | (pedir al usuario antes de tocar) | Solo verificación post-deploy |
| Backend prod | `https://educacom.azurewebsites.net` | Solo lectura, no mutaciones |

---

## 5. Atajos de la app (intranet)

- `Ctrl+K` → menú de navegación lateral
- Pill del header (desktop) → mismo menú
- Hamburguesa (móvil ~380px) → mismo menú
- `Esc` → cierra el menú

---

## 6. Limitaciones técnicas específicas del proyecto

- **PrimeNG `p-select`**: `form_input` MCP a veces falla con "SPAN is not a supported form input". Workaround: usar `javascript_tool` con `dispatchEvent('change')` sobre el `<select>` nativo si está expuesto, o click en el trigger por coordenadas.
- **Two-way binding en dialogs PrimeNG**: nunca usar `[(visible)]`; siempre `[visible]` + `(visibleChange)` (regla del proyecto en `../rules/dialogs-sync.md`).
- **MCPs útiles para este stack**: Microsoft Learn (`89a7ddf5-2a6b-410c-be11-aa0e1a1b35a6`) para .NET 9 docs y Exa (`91408932-1110-4350-97c7-2d6b3a6d9694`) para búsqueda web.

---

## 7. Hallazgos abiertos — cierre 2026-04-29

**Resumen**: 0 críticos · 2 altos · 3 medios · 6 bajos

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

### F-003 · Alto · SignalR `/asistenciahub` falla con 404 en cada navegación de Seguimiento

**Capa**: BE (probable mismatch de mapeo + proxy FE)
**Componente / archivo**: `Educa.API/Program.cs` (mapeo del hub) + `educa-web/proxy.conf.json` (forward del WebSocket)

**Síntoma**:
Al entrar a cualquier vista de asistencia (`/intranet/asistencia`, `/admin/asistencias`, `/admin/permisos-salud`), la consola muestra dos errores rojos por intento de conexión SignalR:
```
POST /asistenciahub/negotiate → 404
"Cannot POST /asistenciahub/negotiate"
Failed to start the connection
```

**Datos medidos**:
- El backend tiene `ChatHub` y `AsistenciaHub` en `Educa.API/Hubs/`.
- La ruta `/asistenciahub` no responde — 404 en cada intento.
- Cada nueva navegación dentro del módulo dispara los 2 errores otra vez.

**Pasos para reproducir**:
1. Login como Director.
2. Navegar a `localhost:4201/intranet/asistencia`.
3. Abrir DevTools → Console: aparecen 2 errores SignalR.

**Sugerencia para Claude Code**:
- Verificar en `Educa.API/Program.cs`: `app.MapHub<AsistenciaHub>("/asistenciahub")`.
- Verificar `educa-web/proxy.conf.json` reenvía `/asistenciahub` al puerto 7102 con `ws: true`.
- Confirmar URL del hub que pide el cliente: `core/services/signalr/asistencia-signalr.service.ts`.

**Por qué importa**: el Director (y profesores) NO ven actualizaciones en tiempo real de marcaciones biométricas CrossChex. Página queda con datos estáticos hasta refresh manual.

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

## 8. Hallazgos verificados

*Aún ninguno. Cuando Claude Code corrija un hallazgo y Cowork verifique el fix, mover la sub-sección desde §7 hasta acá agregando:*

```markdown
**Verificación**: {cómo se confirmó el fix — re-test, network limpia, captura}
**Commit**: `{hash o referencia PR}`
```
