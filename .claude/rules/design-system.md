# Design System — Globales del Proyecto

> **Origen**: Extraído de `/intranet/admin/usuarios` como estándar. Tarea completa en `.claude/tasks/design-system-from-usuarios.md`.
>
> **Regla de oro**: todas las overrides y utilidades globales del design system viven en `src/styles.scss`. **NO** duplicar per-component salvo excepciones justificadas.

Este archivo es la fuente de verdad para overrides de PrimeNG y utilidades de CSS que aplican a toda la intranet, y para las pautas estructurales recomendadas por componente (B1-B11). Está organizado en dos capas:

| Capa | Cubre | Secciones |
|---|---|---|
| **Globales (A)** — overrides y utilidades en `src/styles.scss` | Qué pinta PrimeNG "solo" sin escribir SCSS en el componente | 1-5 |
| **Pautas recomendadas (B)** — estructura, clases y ejemplos canónicos | Cómo armar un componente nuevo para que encaje con el estándar | 6 (B1-B11) |
| **Tokens de color (D)** — variables CSS del tema PrimeNG Aura usadas como fuente de verdad | Qué variable usar en lugar de hex literal | 7 |

Cuando aparezca un patrón nuevo que se repite en 3+ páginas, decidir en qué capa vive: si es visualmente invariable (background, color, border-color de PrimeNG) → A en `styles.scss`. Si es estructural o requiere clases semánticas (layout de filtros, anatomía de stat card, acciones de fila) → B como pauta.

---

## 1. Transparencia global (tablas, paginadores, stat-cards)

> **Todas las `p-table`, `p-paginator` y `.stat-card` del proyecto tienen fondo transparente por defecto.**
> Cubierto globalmente en `src/styles.scss` — **NO requiere override per-component**.

El intranet usa `--intranet-background-color: #eeeeee` como base. Cualquier elemento con fondo blanco (default de PrimeNG o `var(--surface-card)`) rompe la consistencia visual. El override global garantiza que todo respete `--surface-ground`.

### Tablas y paginador

```scss
.p-datatable .p-datatable-table,
.p-datatable .p-datatable-thead > tr > th,
.p-datatable .p-datatable-tbody > tr,
.p-datatable .p-datatable-tbody > tr > td,
.p-datatable .p-datatable-tfoot > tr > td,
.p-datatable .p-datatable-paginator-top,
.p-datatable .p-datatable-paginator-bottom,
.p-paginator {
	background: transparent !important;
}
```

Cubre:

- Todas las partes internas de `p-table` (table, thead, tbody, tfoot, tr, td, th)
- Paginator embebido en la tabla (`.p-datatable-paginator-*`)
- Paginator standalone (`<p-paginator>` fuera de la tabla)

### Stat cards

```scss
.stat-card {
	background: transparent !important;
}
```

Cubre cualquier card con la clase `.stat-card` — las variantes (`stat-new`, `stat--critical`, `stat-resolved`, etc.) solo modifican `border` y color del texto, no el background.

---

## 2. Reset de inputs y selects — intranet (A2)

> **Los `p-inputtext` y `p-select` dentro de `<app-intranet-layout>` llevan fondo transparente, texto `--text-color`, borde `--surface-300` y focus con ring `--text-color` (no `--primary-color`).**
> Cubierto globalmente en `src/styles.scss` — **NO requiere override per-component** en la intranet.

```scss
app-intranet-layout {
	.p-inputtext,
	.p-select {
		background: transparent;
		color: var(--text-color);
		border-color: var(--surface-300);

		&::placeholder {
			color: var(--text-color-secondary);
		}

		&:enabled:focus {
			border-color: var(--text-color);
			box-shadow: 0 0 0 1px var(--text-color);
		}
	}

	.p-select-label,
	.p-select-dropdown {
		color: var(--text-color);
	}
}
```

**Scope**: `app-intranet-layout` — no afecta formularios del portal público (contacto, landing, etc.).

**Focus**: `--text-color` en lugar de `--primary-color` — evita el ring celeste del tema Aura, que sobre fondo claro pierde contraste (ver `rules/a11y.md`).

**Supersede**: esto reemplaza el patrón per-component de `rules/filter-transparency.md`. Esa regla queda como referencia histórica — al tocar un componente con el override local, eliminarlo para no duplicar.

---

## 3. Botones text/outlined — intranet (A3)

> **Los `p-button-text` y `p-button-outlined` dentro de `<app-intranet-layout>` usan `--text-color` y `--surface-300` en lugar del primary del tema. Hover con `--surface-100`.**

```scss
app-intranet-layout {
	.p-button.p-button-text {
		color: var(--text-color);

		&:enabled:hover {
			background: var(--surface-100);
			color: var(--text-color);
		}
	}

	.p-button.p-button-outlined {
		color: var(--text-color);
		border-color: var(--surface-300);

		&:enabled:hover {
			background: var(--surface-100);
			color: var(--text-color);
			border-color: var(--surface-300);
		}
	}
}
```

**Scope**: `app-intranet-layout` — los CTAs del portal público conservan el color primary del tema.

**Modificadores semánticos** (`p-button-danger`, `p-button-success`, `p-button-info`, etc.) siguen funcionando sobre estos — PrimeNG aplica los semánticos con mayor especificidad cuando se combinan con `p-button-text/outlined`.

---

## 4. Utility `.label-uppercase` (A4)

Utility opt-in para labels UPPERCASE del estándar (headers de tabla, labels de filtros, etc.).

```scss
.label-uppercase {
	font-size: 0.8rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}
```

**Uso**:

```html
<label class="label-uppercase">Filtrar por rol</label>
```

**No afecta** nada salvo que la clase se aplique explícitamente. Los headers de tabla del estándar usuarios ya usan estos valores; la utility permite replicarlos sin repetir propiedades en cada SCSS.

---

## 5. Botón `p-button-success` — texto blanco (A5)

> **Todos los `p-button-success` dentro de `app-intranet-layout` llevan `color: var(--white-color)` por defecto.**
> Cubierto globalmente en `src/styles.scss` — **NO** usar `style="color: white"` inline en los componentes.

```scss
app-intranet-layout {
	.p-button.p-button-success {
		color: var(--white-color);

		&:enabled:hover {
			color: var(--white-color);
		}
	}
}
```

**Origen**: El tema PrimeNG Aura no garantiza texto blanco en `p-button-success`. Históricamente cada consumidor aplicaba `style="color: white"` inline en el template. El override global centraliza la decisión y elimina el inline en todas las páginas (ver Plan 20 F4.2, 2026-04-17).

**Scope**: `app-intranet-layout` — no afecta CTAs del portal público.

---

## 6. `p-tag` — Convención semántica (A1 · Opción C)

> **Dos tipos de tag en el sistema: `tag-neutral` e `tag-crítico`. La decisión es explícita por tag, no global.**

### La regla

| Intención del tag | Clase | Color |
|---|---|---|
| **Informativo** — responde "¿qué tipo/rol/categoría/metadato es esto?" (rol del usuario, sección, tipo de evento, categoría de notificación, estado de periodo que no requiere atención urgente) | `styleClass="tag-neutral"` | Gris (`--surface-200` + `--text-color`) |
| **Crítico/operativo** — responde "¿necesito atención aquí ya?" (severity de error, asistencia F, aprobación APROBADO/DESAPROBADO, CRITICAL logs) | **Sin clase** (`styleClass` ausente) + `severity="danger"/"success"/...` | Colores del tema por severidad |

### Implementación global (styles.scss)

```scss
.p-tag.tag-neutral {
	background: var(--surface-200);
	color: var(--text-color);
	font-weight: 600;
}
```

No existe `.tag-critical` como clase — los tags críticos usan el default de PrimeNG con `severity`. Se puede introducir en el futuro si se necesita marcador semántico explícito (ej: agregar ícono prefijo a críticos), pero hoy `severity` solo ya hace el trabajo visual.

### Ejemplos canónicos

```html
<!-- ✅ Informativo: rol, sección, categoría → tag-neutral -->
<p-tag [value]="usuario.rolNombre" styleClass="tag-neutral" />
<p-tag [value]="'Sección ' + salon.seccion" styleClass="tag-neutral" />
<p-tag [value]="evento.tipo" styleClass="tag-neutral" />
<p-tag [value]="notificacion.categoria" styleClass="tag-neutral" />

<!-- ✅ Crítico: severity hace el trabajo → sin tag-neutral -->
<p-tag [value]="asistencia.estado" [severity]="estadoSeverity" />
<p-tag [value]="'CRITICAL'" severity="danger" />
<p-tag [value]="aprobacion.estado" [severity]="aprobacionSeverity" />

<!-- ❌ Incorrecto: tag-neutral + severity pelean -->
<p-tag value="CRITICAL" severity="danger" styleClass="tag-neutral" />
```

### Criterio de decisión para tags dudosos

Preguntarse antes de decidir:

1. **¿El usuario escanea esta columna buscando problemas?** → crítico (sin `tag-neutral`)
2. **¿El color comunica información que el texto ya dice igual de bien?** → informativo (con `tag-neutral`)
3. **¿Eliminar el color haría más difícil el uso operativo de la página?** → crítico (sin `tag-neutral`)
4. **¿El tag es solo para categorizar/agrupar/identificar?** → informativo (con `tag-neutral`)

### Estado de migración

- **F2.1** ✅ (2026-04-17) — Infraestructura + usuarios como ejemplo canónico. 4 archivos de usuarios tocados.
- **F2.2** ⏳ — Estados operativos (asistencia, aprobación, error-logs). Mayoría ya usa `severity`, audit para confirmar que ninguno lleva `tag-neutral` accidental.
- **F2.3** ⏳ — Metadatos admin (vistas, permisos, events, notificaciones, email-outbox, feedback-reports). Candidatos fuertes a `tag-neutral`.
- **F2.4** ⏳ — Académico (horarios, salones, cursos, calificaciones, grupos). Mezcla — requiere audit por tag.
- **F2.5** ⏳ — Misc y cross-role (videoconferencias, mensajería, foro, ctest-k6, campus).

---

## 7. Pautas recomendadas por componente (B1-B11)

> **Estándar extraído literalmente de `/intranet/admin/usuarios`.** Los ejemplos de esta sección son copy-paste-ables — si tu página nueva tiene el mismo componente, copia la estructura y adáptala.
>
> Estas pautas NO viven en `styles.scss`. Viven como convención. El día que alguien se desvíe, el código review apunta aquí.

---

### B1 · Container con border, no background

Las secciones internas de una página (filtros, tabla, bloques de stats) se agrupan con **border + border-radius**, NO con background propio. El fondo lo pone `--surface-ground` a nivel de página.

```scss
.filters-bar,
.table-section {
	background: transparent;
	border: 1px solid var(--surface-300);
	border-radius: 10px;  // filtros
	// border-radius: 12px;  // bloques grandes (tabla, cards)
	overflow: hidden;  // solo para el wrapper de tabla, para que el border-radius recorte el thead
}
```

**Por qué**: el fondo plano `--surface-ground` da continuidad visual. El border delimita áreas sin romper la continuidad. Usar `background: var(--surface-card)` crea "islas" blancas que pelean con el patrón global de transparencia (sección 1).

**Anti-patrón**:

```scss
// ❌ rompe el patrón global y genera islas blancas
.table-section {
	background: var(--surface-card);
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

---

### B2 · Page header

Usar el componente shared `<app-page-header>`. Layout canónico: **icono a la izquierda → title+subtitle → acciones a la derecha vía `margin-left: auto`**.

```html
<app-page-header
	icon="pi pi-users"
	title="Administración de Usuarios"
	subtitle="Gestiona todos los usuarios del sistema"
>
	<div class="header-actions">
		<!-- Botones contextuales de la página -->
		<button pButton icon="pi pi-refresh" class="p-button-text p-button-sm btn-icon" ... />
		<span class="action-divider"></span>
		<button pButton icon="pi pi-download" label="Exportar" class="p-button-outlined p-button-sm" ... />
		<button pButton icon="pi pi-user-plus" label="Nuevo" class="p-button-success p-button-sm" ... />
	</div>
</app-page-header>
```

```scss
// SCSS del componente-página para .header-actions (ng-content-projected)
.header-actions {
	display: flex;
	align-items: center;
	gap: 0.5rem;

	.btn-icon {
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
	}

	.action-divider {
		width: 1px;
		height: 1.5rem;
		background: var(--surface-300);
		margin: 0 0.25rem;
	}
}
```

**Orden recomendado de botones (izquierda → derecha)**: acciones de utilidad (refresh, filtros) → separador → acciones secundarias (exportar, importar) → acción primaria (crear/nuevo).

**Por qué separador**: separa visualmente "acciones que no mutan" (refresh) de "acciones que mutan el sistema" (importar, crear). No es decorativo.

---

### B3 · Stat card

Anatomía: **content-left (label + valor + sublabel) + icon-right (48×48, border-radius 12px, fondo `--surface-200`)**. El valor grande (1.75rem / 700) es el número; el label (0.85rem) dice qué mide; el sublabel (0.75rem) da contexto.

```html
<section class="stats-section">
	<div class="stat-card">
		<div class="stat-content">
			<span class="stat-label">Total Usuarios</span>
			<span class="stat-value">{{ estadisticas().totalUsuarios }}</span>
			<span class="stat-sublabel">usuarios registrados</span>
		</div>
		<div class="stat-icon">
			<i class="pi pi-users"></i>
		</div>
	</div>
	<!-- ... más stat-cards -->
</section>
```

```scss
.stats-section {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 1rem;
	margin-bottom: 1.5rem;

	.stat-card {
		// background: transparent ya lo aplica el global (sección 1)
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem;
		border-radius: 12px;

		.stat-content {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;

			.stat-label { font-size: 0.85rem; color: var(--text-color-secondary); font-weight: 500; }
			.stat-value { font-size: 1.75rem; font-weight: 700; color: var(--text-color); }
			.stat-sublabel { font-size: 0.75rem; color: var(--text-color-secondary); }
		}

		.stat-icon {
			width: 48px;
			height: 48px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 12px;
			background: var(--surface-200);

			i { font-size: 1.25rem; color: var(--text-color); }
		}
	}
}

@media (max-width: 768px) {
	.stats-section { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
	.stats-section { grid-template-columns: 1fr; }
}
```

**Variantes semánticas** (críticos, highlights): modificar `border-left` o `color`, NO `background`. Ver bloque "✅ SÍ hacer" más abajo.

---

### B4 · Tabla

Wrapper `.table-section` con **border, sin background** (sección 1 ya hace transparente la tabla interna). Headers **UPPERCASE 0.8rem + letter-spacing 0.5px**. Rows inactivas con `opacity: 0.5` + `background: var(--surface-100)`. Row-hover con `var(--surface-100)`.

```html
<section class="table-section" appTableLoading [loading]="loading()" [minHeightPx]="420">
	<p-table
		[value]="items()"
		[lazy]="true"
		[paginator]="true"
		[rows]="rows()"
		[first]="first()"
		[totalRecords]="totalRecords()"
		[rowsPerPageOptions]="[5, 10, 25, 50]"
		[showCurrentPageReport]="true"
		currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} registros"
		(onLazyLoad)="onLazyLoad($event)"
		class="p-datatable-sm"
	>
		<ng-template #header>
			<tr>
				<th style="width: 80px" pSortableColumn="id">ID <p-sortIcon field="id" /></th>
				<th pSortableColumn="nombreCompleto">NOMBRE <p-sortIcon field="nombreCompleto" /></th>
				<!-- ... -->
				<th style="width: 140px">ACCIONES</th>
			</tr>
		</ng-template>

		<ng-template #body let-item>
			<tr [class.row-inactive]="!item.estado">
				<!-- ... celdas ... -->
			</tr>
		</ng-template>

		<ng-template #emptymessage>
			<tr>
				<td colspan="7" class="empty-message">
					<div class="empty-state">
						<i class="pi pi-users"></i>
						<p>No se encontraron resultados</p>
						<span>Intenta ajustar los filtros de búsqueda</span>
					</div>
				</td>
			</tr>
		</ng-template>
	</p-table>
</section>
```

```scss
.table-section {
	background: transparent;
	border: 1px solid var(--surface-300);
	border-radius: 12px;
	overflow: hidden;
}

:host ::ng-deep {
	.p-datatable {
		.p-datatable-thead > tr > th {
			font-weight: 600;
			font-size: 0.8rem;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			color: var(--text-color);
			border-color: var(--surface-300);
		}

		.p-datatable-tbody > tr {
			> td {
				vertical-align: middle;
				color: var(--text-color);
				border-color: var(--surface-300);
			}

			&:hover > td { background: var(--surface-100); }

			&.row-inactive {
				opacity: 0.5;
				> td { background: var(--surface-100); }
				&:hover > td { opacity: 1; background: var(--surface-200); }
			}
		}

		.p-paginator {
			padding: 1rem;
			border-top: 1px solid var(--surface-300);
			// background ya transparente por el global
		}
	}
}
```

**Tipografía de celdas**: IDs con `.id-badge` (pill `--surface-200`, `border-radius: 6px`), DNIs/códigos con `font-family: monospace`. Nombres en stack `user-name` + `user-email` (secundario en 0.8rem).

---

### B5 · Row actions (triplet ver / editar / toggle)

Tres botones icon-only `p-button-rounded p-button-text`, centrados. Severities:

| Acción | Severity | Icon |
|---|---|---|
| **Ver** | `p-button-secondary` | `pi pi-eye` |
| **Editar** | `p-button-info` | `pi pi-pencil` |
| **Toggle estado** (dinámico) | `p-button-warning` si activo / `p-button-success` si inactivo | dinámico vía pipe |

```html
<div class="actions">
	<button
		pButton
		icon="pi pi-eye"
		class="p-button-rounded p-button-text p-button-secondary"
		pTooltip="Ver detalles"
		(click)="onViewDetail(item)"
		[pt]="{ root: { 'aria-label': 'Ver detalles' } }"
	></button>
	<button
		pButton
		icon="pi pi-pencil"
		class="p-button-rounded p-button-text p-button-info"
		pTooltip="Editar"
		(click)="onEdit(item)"
		[pt]="{ root: { 'aria-label': 'Editar' } }"
	></button>
	<button
		pButton
		[icon]="item.estado | estadoToggleIcon"
		class="p-button-rounded p-button-text"
		[class.p-button-warning]="item.estado"
		[class.p-button-success]="!item.estado"
		[pTooltip]="item.estado | estadoToggleLabel"
		(click)="onToggleEstado(item)"
		[pt]="{ root: { 'aria-label': item.estado | estadoToggleLabel } }"
	></button>
</div>
```

```scss
.actions {
	display: flex;
	gap: 0.25rem;
	justify-content: center;
}
```

**Requisito de accesibilidad**: los 3 botones son icon-only, así que `pTooltip` NO basta — siempre incluir `[pt]="{ root: { 'aria-label': '...' } }"` (ver `rules/a11y.md`).

**Pipes estándar** disponibles en `@intranet-shared/pipes`: `estadoLabel`, `estadoSeverity`, `estadoToggleIcon`, `estadoToggleLabel`. Reusar antes de crear nuevos.

---

### B6 · Filter bar

Flex horizontal con **search-box (relative, icono absolute dentro) + filter-dropdowns + btn-clear con `margin-left: auto`**. Aparece entre page-header y tabla.

```html
<div class="filters-bar">
	<div class="search-box">
		<i class="pi pi-search"></i>
		<input
			type="text"
			pInputText
			placeholder="Buscar por ID, nombre, DNI o correo..."
			[ngModel]="searchTerm()"
			(ngModelChange)="onSearchChange($event)"
		/>
	</div>

	<div class="filter-dropdowns">
		<p-select [options]="opts.rolesOptions" [ngModel]="filterRol()" (ngModelChange)="..." placeholder="Rol" appendTo="body" />
		<p-select [options]="opts.estadoOptions" [ngModel]="filterEstado()" (ngModelChange)="..." placeholder="Estado" appendTo="body" />
	</div>

	<button
		pButton
		icon="pi pi-filter-slash"
		class="p-button-text p-button-sm btn-clear"
		pTooltip="Limpiar filtros"
		(click)="onClearFilters()"
		[pt]="{ root: { 'aria-label': 'Limpiar filtros' } }"
	></button>
</div>
```

```scss
.filters-bar {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 1rem;
	padding: 0.75rem 1rem;
	background: transparent;
	border: 1px solid var(--surface-300);  // B1 aplicado
	border-radius: 10px;
}

.search-box {
	position: relative;
	flex: 1;
	min-width: 180px;
	max-width: 300px;

	i {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-color-secondary);
		font-size: 0.85rem;
	}

	input {
		width: 100%;
		padding-left: 2.25rem;
		font-size: 0.875rem;
	}
}

.filter-dropdowns {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.btn-clear {
	margin-left: auto;
	opacity: 0.5;

	&:hover { opacity: 1; }
}

@media (max-width: 768px) {
	.filters-bar { flex-wrap: wrap; }
	.search-box { flex: 1 1 100%; max-width: none; }
	.filter-dropdowns { flex-wrap: wrap; flex: 1; }
}
```

**Por qué `opacity: 0.5 → 1` en `.btn-clear`**: el "limpiar filtros" es una acción secundaria, NO debe competir visualmente con los filtros mismos. El hover la "ilumina" cuando el usuario se acerca.

**Requisito de PrimeNG**: los `p-select` SIEMPRE con `appendTo="body"` (ver `rules/primeng.md`).

---

### B7 · Botones canónicos por rol semántico

| Rol | Clase | Uso | Ejemplo |
|---|---|---|---|
| **Primary** (acción principal de la página) | `p-button-success` | Guardar, Nuevo, Crear | Botón "Nuevo" del header, "Guardar" de dialog |
| **Secondary** (acción secundaria) | `p-button-outlined` | Exportar, Importar, Validar | Botones de exportar/importar, "Validar Datos" |
| **Destructive** | `p-button-danger p-button-outlined` | Eliminar, Descartar | Confirmaciones de borrado |
| **Clear / Close** | `p-button-text` | Cancelar, Cerrar, Limpiar | Cancelar de dialog, cerrar drawer, clear filters |
| **Icon-only utility** | `p-button-text` + `btn-icon` | Refresh, acciones de row | Refresh del header, actions triplet (B5) |

**Size estándar**: `p-button-sm` en header y filtros, tamaño default en dialogs.

**Texto blanco en `p-button-success`**: se aplica globalmente en `styles.scss` dentro de `app-intranet-layout` (ver sección A5). **NO** usar `style="color: white"` inline en los componentes — el global ya lo resuelve.

---

### B8 · Dialogs (CRUD form)

Estructura canónica: **header tipado según modo + content con `.form-grid` de 2 columnas + footer con botones alineados a la derecha**.

```html
<p-dialog
	[visible]="visible()"
	(visibleChange)="onVisibleChange($event)"
	[header]="isEditing() ? 'Editar Usuario' : 'Nuevo Usuario'"
	[modal]="true"
	[style]="{ width: '600px' }"
	[draggable]="false"
	[resizable]="false"
	class="edit-usuario-dialog"
>
	<div class="dialog-content">
		<div class="form-grid">
			<div class="field full-width">
				<label for="rol">Rol *</label>
				<p-select ... />
			</div>
			<div class="field">
				<label for="nombres">Nombres *</label>
				<input id="nombres" pInputText ... />
			</div>
			<div class="field">
				<label for="apellidos">Apellidos *</label>
				<input id="apellidos" pInputText ... />
			</div>
			<!-- ... -->
		</div>
	</div>

	<ng-template #footer>
		<div class="dialog-footer">
			<button
				pButton
				label="Cancelar"
				icon="pi pi-times"
				class="p-button-text"
				(click)="onCancel()"
				[pt]="{ root: { 'aria-label': 'Cancelar' } }"
			></button>
			<button
				pButton
				label="Guardar"
				icon="pi pi-check"
				class="p-button-success"
				(click)="onSave()"
				[disabled]="!isFormValid() || loading()"
				[pt]="{ root: { 'aria-label': 'Guardar' } }"
			></button>
		</div>
	</ng-template>
</p-dialog>
```

```scss
.dialog-content .form-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 1rem;

	.field {
		&.full-width { grid-column: 1 / -1; }

		label {
			display: block;
			margin-bottom: 0.5rem;
			font-weight: 500;
			color: var(--text-color);
		}

		input { width: 100%; }

		.p-error {
			display: block;
			margin-top: 0.35rem;
			font-size: 0.8rem;
			color: var(--red-500);
		}
	}
}

.dialog-footer {
	display: flex;
	justify-content: flex-end;
	gap: 0.5rem;
	// p-button-success ya lleva color blanco por el global en styles.scss (A5)
}

@media (max-width: 768px) {
	.dialog-content .form-grid { grid-template-columns: 1fr; }
}
```

**Header/Content/Footer con fondo del tema** (deben empatar con `--surface-ground`):

```scss
:host ::ng-deep .edit-usuario-dialog {
	.p-dialog-header,
	.p-dialog-content,
	.p-dialog-footer {
		background: var(--surface-ground);
		color: var(--text-color);
	}
	.p-dialog-header { border-bottom: 1px solid var(--surface-300); }
	.p-dialog-footer { border-top: 1px solid var(--surface-300); }
}
```

**Regla de DialogsSync**: NUNCA poner el `<p-dialog>` dentro de `@if`. Siempre en el DOM con `[visible]` + `(visibleChange)`. Ver `rules/dialogs-sync.md`.

**Fields obligatorios marcados con `*` en el label** (convención de UX, no una regla de PrimeNG).

---

### B9 · Alert banners con `color-mix()`

Banners de información, advertencia o éxito (migración pending, preview de feature, ambiente dev) usan `color-mix()` para fondo tintado que **respeta tema light/dark**.

```html
<div class="migration-banner">
	<span><i class="pi pi-info-circle"></i> Hay contraseñas en texto plano que pueden migrarse.</span>
	<button pButton label="Migrar" icon="pi pi-shield" class="p-button-warning p-button-sm" ... />
</div>

<div class="migration-banner migration-success">
	<span><i class="pi pi-check-circle"></i> Migración completada correctamente.</span>
</div>
```

```scss
.migration-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.75rem 1rem;
	margin-bottom: 1rem;
	border-radius: 8px;
	background: color-mix(in srgb, var(--yellow-500) 15%, transparent);
	border: 1px solid var(--yellow-500);
	color: var(--text-color);
	font-size: 0.875rem;

	span {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	&.migration-success {
		background: color-mix(in srgb, var(--green-500) 15%, transparent);
		border-color: var(--green-500);
	}
}
```

**Paleta semántica**:

| Intención | Color base | Icono |
|---|---|---|
| Info / neutro | `var(--blue-500)` | `pi pi-info-circle` |
| Success | `var(--green-500)` | `pi pi-check-circle` |
| Warning (acción recomendada) | `var(--yellow-500)` | `pi pi-exclamation-triangle` |
| Danger (acción inmediata) | `var(--red-500)` | `pi pi-exclamation-circle` |

**Por qué `color-mix()` y no `rgba()` hardcoded**: `rgba(#e6a23c, 0.15)` queda lavado sobre tema dark. `color-mix` con `--yellow-500` resuelve automáticamente a la variante del tema.

---

### B10 · Drawer detalle (right-side)

`p-drawer` right, **width 450px**. Avatar circle 80px arriba, name 1.25rem/600 centrado, tag de rol, luego **info list en `--surface-50`** con items `flex space-between`. Footer con botones Cerrar (text) + Editar (primary).

```html
<p-drawer
	[visible]="visible()"
	(visibleChange)="onVisibleChange($event)"
	position="right"
	[style]="{ width: '450px' }"
	[modal]="true"
>
	<ng-template pTemplate="header">
		<div class="drawer-header">
			<span>Detalles del Usuario</span>
		</div>
	</ng-template>

	@if (usuario()) {
		<div class="detail-content">
			<div class="detail-avatar">
				<i class="pi pi-user"></i>
			</div>

			<div class="detail-name">{{ usuario()!.apellidos | fullName: usuario()!.nombres }}</div>

			<p-tag [value]="usuario()!.rol" [severity]="uiMapping.getRolSeverity(usuario()!.rol)" styleClass="tag-neutral" />

			<div class="detail-info">
				<div class="info-item">
					<span class="info-label">DNI</span>
					<span class="info-value">{{ usuario()!.dni }}</span>
				</div>
				<div class="info-item">
					<span class="info-label">Estado</span>
					<p-tag [value]="usuario()!.estado | estadoLabel" [severity]="usuario()!.estado | estadoSeverity" styleClass="tag-neutral" />
				</div>
				@if (usuario()!.correo) {
					<div class="info-item">
						<span class="info-label">Correo</span>
						<span class="info-value">{{ usuario()!.correo }}</span>
					</div>
				}
				<!-- ... más info-items -->
			</div>
		</div>

		<div class="drawer-footer">
			<button pButton label="Cerrar" icon="pi pi-times" class="p-button-text" (click)="onClose()" [pt]="{ root: { 'aria-label': 'Cerrar' } }" />
			<button pButton label="Editar" icon="pi pi-pencil" class="p-button-primary" (click)="onEdit()" [pt]="{ root: { 'aria-label': 'Editar' } }" />
		</div>
	}
</p-drawer>
```

```scss
.drawer-header { font-weight: 600; font-size: 1.1rem; }

.detail-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 1rem 0;

	.detail-avatar {
		width: 80px;
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-200);
		border-radius: 50%;
		margin-bottom: 1rem;

		i { font-size: 2.5rem; color: var(--text-color); }
	}

	.detail-name {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
		text-align: center;
	}

	.detail-info {
		width: 100%;
		margin-top: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		background: var(--surface-50);
		border-radius: 8px;

		.info-item {
			display: flex;
			justify-content: space-between;
			align-items: center;

			.info-label { font-weight: 500; color: var(--text-color-secondary); }
			.info-value { font-weight: 500; color: var(--text-color); }
		}
	}
}

.drawer-footer {
	display: flex;
	justify-content: flex-end;
	gap: 0.5rem;
	padding-top: 1rem;
	border-top: 1px solid var(--surface-200);
	margin-top: 1.5rem;
}

:host ::ng-deep .p-drawer {
	.p-drawer-content {
		padding: 1.5rem;
		background: var(--surface-ground);
	}
	.p-drawer-header {
		background: var(--surface-ground);
		color: var(--text-color);
		border-bottom: 1px solid var(--surface-300);
	}
}
```

**Cuándo usar drawer vs dialog**:

| Usar drawer | Usar dialog |
|---|---|
| Ver detalles read-only (sin editar) | Crear o editar (formulario) |
| Info adicional sin bloquear el flujo principal | Acción que requiere confirmación explícita |
| Puede quedar abierto mientras el usuario navega la lista | Modal estricto — bloquea hasta decisión |

---

### B11 · Dev banners (ambientes de desarrollo, features opt-in)

Variante de B9 pensada para información **visible solo en dev** o features en migración. Border dashed + tinte fuerte:

```scss
.dev-migration-panel {
	margin: 1.5rem 0;
	padding: 1.5rem;
	border: 2px dashed var(--yellow-500);
	border-radius: 8px;
	background: var(--yellow-50);

	h3 {
		margin: 0 0 0.5rem;
		color: var(--yellow-800);
		font-size: 1rem;
		i { margin-right: 0.5rem; }
	}

	p {
		margin: 0 0 1rem;
		color: var(--yellow-700);
		font-size: 0.875rem;
	}

	.migration-result {
		margin-top: 1rem;
		padding: 0.75rem;
		background: var(--green-50);
		border-radius: 6px;
		color: var(--green-800);
		font-size: 0.875rem;
	}
}
```

**Mostrarlo condicional a `isDev`** en el componente:

```typescript
readonly isDev = !environment.production;
```

```html
@if (isDev && !migracionCompletada()) {
	<div class="dev-migration-panel">
		<h3><i class="pi pi-wrench"></i> Migración de contraseñas pendiente</h3>
		<p>Hay N contraseñas en texto plano que pueden migrarse al campo encriptado.</p>
		<button pButton label="Ejecutar migración" class="p-button-warning p-button-sm" (click)="onMigrar()" />
	</div>
}
```

**Diferencia vs B9**: B9 es un banner operativo (puede quedarse en producción). B11 es un banner de deuda técnica / migración one-time que vive hasta que la migración se ejecute. Border `dashed` + flag `isDev` son las señales visuales de "esto no es permanente".

---

## 8. Tokens de color — Convención (D)

> **"Ningún color hex literal sobre fondo plano de la intranet. Siempre token."**

El tema PrimeNG Aura expone variables CSS de paleta completas (`--red-50..900`, `--blue-50..900`, `--green-50..900`, `--yellow-50..900`, etc.). Son la fuente de verdad para colores semánticos en la intranet.

### Mapa canónico

| Intención | Token | Valor aproximado | Usos |
|---|---|---|---|
| Error de formulario (invalid state, `.p-error`) | `var(--red-500)` | `#ef4444` | Borde + texto de campo inválido, mensaje de error bajo input |
| Error operativo fuerte (CRITICAL, eliminar, métrica alarmante) | `var(--red-600)` | `#dc2626` | Stat críticos, banner de error, icono de peligro, texto de alerta alta |
| Acento azul sobre fondo claro (textos y bordes destacados) | `var(--blue-800)` | `#1e40af` | Icono/texto sobre `--surface-100`, header destacado, link fuerte |
| Fondo de sección destacada | `var(--blue-100)` | `#dbeafe` | Fondo suave de banners informativos |
| Éxito operativo | `var(--green-500)`, `var(--green-600)` | `#22c55e`, `#16a34a` | Estado APROBADO, success banner |
| Advertencia | `var(--yellow-500)`, `var(--yellow-700)` | `#eab308`, `#a16207` | Tag warn, borde de alerta de cuidado |
| Texto blanco sobre fondo primario | `var(--white-color)` | `#ffffff` | Texto en botones `p-button-success` (ver A5) |

### Reglas

1. **No usar hex literal** (`#dc2626`, `#1e40af`, `#e24c4c`) en SCSS de componentes. Usar siempre el token equivalente.
2. **No reinventar variables locales** (`$priority-urgent: #dc2626`): si existe el token, usarlo directo (`$priority-urgent: var(--red-600)`). La SCSS var se mantiene solo como alias semántico local.
3. **No usar `color: white`** inline: el global (A5) lo aplica en `p-button-success`. Para otros botones con fondo oscuro, usar `var(--white-color)` del `:root`.
4. **Excepciones legítimas** (documentar inline con comentario `// motivo`):
   - **Sass color functions** (`color.adjust`, `darken`): la función necesita un color literal en compile time, no resuelve `var()`. Ej: `notification-quick-access.scss` usa `$priority-map` con hex literales para generar gradientes Sass.
   - **Canvas API** (`ctx.fillStyle = '#dc2626'`): el Canvas API no soporta `var()` directamente.
   - **Paletas de avatares / decorativas** (chat, foro): los colores son slots rotativos, no semánticos; no aplica esta convención.
5. **Fallback defensivo aceptable**: `var(--red-600, #dc2626)` es válido si el archivo se carga antes del tema o para resiliencia. Preferir sin fallback; con fallback si ya existe y funciona.

### Estado de migración (Plan 20 F4, 2026-04-17)

- **Admin pages**: migradas (usuarios, error-logs, feedback-reports, classrooms, schedules, campus, ctest-k6).
- **Shared**: migrado (form-field-error, feedback-report-dialog, voice-button, user-profile-menu, floating-notification-bell).
- **Cross-role + profesor + estudiante**: migrados (reports, attendance widgets, home widgets, student tabs, health-justification-list).
- **Excepciones activas**: 3 archivos con hex literal justificado (notification-quick-access Sass, campus-minimap Canvas, mensajería/foro avatar palettes).

Buscar tokens hardcoded restantes:

```bash
# Los 3 tokens principales del design system
grep -rn "#e24c4c\|#dc2626\|#1e40af" src/ --include="*.scss" --include="*.ts"

# color: white inline (solo HTML)
grep -rn 'style="color: white' src/ --include="*.html"
```

---

## ❌ NO hacer

```scss
// ❌ INCORRECTO - duplica lo que ya hace el global
::ng-deep .p-datatable {
	background: transparent;
	.p-datatable-table { background: transparent; }
	// ...
}

// ❌ INCORRECTO - override per-component de inputs/selects en la intranet
:host ::ng-deep {
	.p-inputtext {
		background: transparent;
		color: var(--text-color);
		border-color: var(--surface-300);
		// ...
	}
}

// ❌ INCORRECTO - cada stat-card repetía esto
.stat-card {
	background: var(--surface-card, #ffffff);
	// ...
}
```

## ✅ SÍ hacer

- Confiar en los globales — basta usar `<p-table>`, `<p-select>`, `p-button-text`, `class="stat-card"`, `class="label-uppercase"` dentro de la intranet y funciona.
- Para variantes de color de stat-card, modificar `border` y `color`, no `background`:

```scss
.stat-card {
	&.stat-new { border-left: 4px solid #1e40af; }
	&.stat-resolved { border-left: 4px solid #16a34a; }

	.stat-icon { color: var(--text-color-secondary); }
	.stat-value { color: var(--text-color); }

	&--critical {
		border-color: var(--red-600);
		.stat-icon { color: var(--red-600); }
		.stat-value { color: var(--red-600); }
	}
}
```

---

## ⚠️ Cuidado con wrappers

El override global cubre `p-table`, `p-paginator` y `.stat-card`, pero **NO** contenedores custom (`section`, `div`) que los envuelvan. Si ves fondo blanco detrás de estos elementos, revisa el padre:

```scss
// ❌ INCORRECTO — el wrapper rompe la transparencia visualmente
.table-section {
	background: var(--surface-card, #ffffff);
	// ...
}

// ✅ CORRECTO — el wrapper también respeta --surface-ground
.table-section {
	background: transparent;
	// ...
}
```

**Regla práctica**: cualquier `section`/`div` que envuelva tablas, paginadores o stat-cards debe tener `background: transparent` (o no declarar background), salvo casos excepcionales con motivo documentado.

---

## Excepciones legítimas (raras)

Si una tabla/card/input específica requiere fondo propio (ej: enfatizar un panel de resumen), override explícito con justificación:

```scss
// Motivo: panel de KPIs destacado en dashboard de dirección
:host ::ng-deep .p-datatable {
	background: var(--surface-card) !important;
}
```

El escape hatch exige comentario con la razón específica del negocio — "lo necesito" no es razón suficiente.

---

## Historial

- **Fase 0 (pre-2026-04-17)** — Transparencia per-component (pattern `::ng-deep .p-datatable { ... }` repetido en cada `.scss`, y `.stat-card { background: var(--surface-card) }` en 19+ archivos).
- **Fase 1 (2026-04-17)** — Migrado a global: tablas, paginador, stat-cards. Regla original `table-transparency.md` creada.
- **Fase 2 (2026-04-17, Design System F1)** — Renombrado a `design-system.md`. Agregados A2 (inputs/selects reset), A3 (buttons text/outlined), A4 (utility `.label-uppercase`).
- **Fase 3 (2026-04-17, Design System F3)** — Agregada sección 7 (antes 6) con pautas recomendadas B1-B11 (container con border, page header, stat card, tabla, row actions triplet, filter bar, botones canónicos, dialogs, alert banners con `color-mix()`, drawer detalle, dev banners). Extraídas literalmente de `/intranet/admin/usuarios`.
- **Fase 4 (2026-04-17, Design System F4)** — Agregada sección 5 (A5: `p-button-success` con texto blanco global) + sección 8 (D: Tokens de color con mapa canónico). Migrados ~30 archivos de admin/shared/cross-role/profesor/estudiante: `#e24c4c → var(--red-500)`, `#dc2626 → var(--red-600)`, `#1e40af → var(--blue-800)`. Eliminado `style="color: white"` inline en `usuarios-header`. Excepciones justificadas documentadas (Sass color functions, Canvas API, avatar palettes). Deuda C1/C4 resuelta, C3 resuelta con token; C2 resuelta en todas las rutas migrables.

Overrides existentes son redundantes con los globales pero no rompen nada — se pueden limpiar incrementalmente al tocar cada archivo.

---

## Buscar overrides redundantes (cleanup gradual)

```bash
# Tablas con override local redundante
grep -rn "p-datatable" src/ --include="*.scss" | grep -v "styles.scss"

# Stat-cards con background explícito
grep -rn "stat-card" src/ --include="*.scss" | grep -i "background"

# Inputs/selects con el patrón de reset ahora global (dentro de intranet)
grep -rn "p-inputtext\|p-select" src/app/features/intranet --include="*.scss" | grep -v "styles.scss"

# Botones text/outlined con overrides de color local
grep -rn "p-button-text\|p-button-outlined" src/app/features/intranet --include="*.scss" | grep -i "color:"
```
