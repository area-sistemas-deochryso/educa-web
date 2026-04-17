# Design System — Globales del Proyecto

> **Origen**: Extraído de `/intranet/admin/usuarios` como estándar. Tarea completa en `.claude/tasks/design-system-from-usuarios.md`.
>
> **Regla de oro**: todas las overrides y utilidades globales del design system viven en `src/styles.scss`. **NO** duplicar per-component salvo excepciones justificadas.

Este archivo es la fuente de verdad para overrides de PrimeNG y utilidades de CSS que aplican a toda la intranet (y en algunos casos, a todo el proyecto). Las pautas visuales detalladas (estructura de componentes, layouts canónicos, B1-B11) viven aparte y se agregarán en F3.

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

## 5. Pendiente — Neutralización de `p-tag` (A1)

> **Decisión abierta, bloquea F2 del task de design system.**

Actualmente `p-tag` muestra colores por severidad (error-logs CRITICAL rojo, asistencia A/T/F con colores, aprobación APROBADO/DESAPROBADO con colores). La página `usuarios` los neutraliza (`--surface-200` + `--text-color`).

Tres opciones bajo evaluación del usuario (ver `tasks/design-system-from-usuarios.md` § "Decisión crítica previa al F1"):

- **A** — Global: neutralizar todos los tags en la intranet
- **B** — Opt-in: crear clase `.neutral-tags` y aplicarla selectivamente
- **C** — Semántica: distinguir tags "informativos" (neutros) vs "críticos" (con color)

F1 cerró las overrides sin polémica (A2, A3, A4). A1 se ejecuta en F2 cuando se confirme la opción.

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
		border-color: #dc2626;
		.stat-icon { color: #dc2626; }
		.stat-value { color: #dc2626; }
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
- **Fase 3 (pendiente)** — Decisión A1 sobre `p-tag` + pautas B1-B11 (estructura recomendada por componente).

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
