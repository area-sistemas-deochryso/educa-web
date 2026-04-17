# Transparencia Global (tablas, paginadores, stat-cards)

## Regla

> **Todas las `p-table`, `p-paginator` y `.stat-card` del proyecto tienen fondo transparente por defecto.**
> Cubierto globalmente en `src/styles.scss` — **NO requiere override per-component**.

El intranet usa `--intranet-background-color: #eeeeee` como base. Cualquier elemento con fondo blanco (default de PrimeNG o `var(--surface-card)`) rompe la consistencia visual. El override global garantiza que todo respete `--surface-ground`.

## Dónde vive el override

`src/styles.scss` — regiones:

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

Cubre cualquier card con la clase `.stat-card` — las variantes (`stat-new`, `stat--critical`, `stat-resolved`, etc.) solo modifican `border` y color del texto, no el background, así que funcionan perfectamente con el global.

## ❌ NO hacer

```scss
// ❌ INCORRECTO - duplica lo que ya hace el global
::ng-deep .p-datatable {
	background: transparent;
	.p-datatable-table { background: transparent; }
	// ...
}

// ❌ INCORRECTO - cada componente repetía esto
.stat-card {
	background: var(--surface-card, #ffffff);  // fondo blanco innecesario
	// ...
}
```

## ✅ SÍ hacer

- Confiar en el global — basta usar `<p-table>` o `class="stat-card"` y funciona.
- Para variantes de color, modificar `border` y `color`, no `background`:

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

## ⚠️ Cuidado con wrappers

El override global cubre `p-table`, `p-paginator` y `.stat-card`, pero NO contenedores custom (`section`, `div`) que los envuelvan. Si ves fondo blanco detrás de estos elementos, revisa el padre:

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

## Excepciones legítimas (raras)

Si una tabla/card específica requiere fondo propio (ej: enfatizar un panel de resumen), override explícito con justificación:

```scss
// Motivo: panel de KPIs destacado en dashboard de dirección
:host ::ng-deep .p-datatable {
	background: var(--surface-card) !important;
}
```

## Historial

Antes existía override per-component (pattern `::ng-deep .p-datatable { background: transparent; ... }` repetido en cada `.scss`, y `.stat-card { background: var(--surface-card) }` en 19+ archivos). Migrado a global para eliminar repetición. Overrides existentes son redundantes pero no rompen nada — se pueden limpiar incrementalmente al tocar cada archivo.

## Buscar overrides redundantes (cleanup gradual)

```bash
# Tablas con override local redundante
grep -rn "p-datatable" src/ --include="*.scss" | grep -v "styles.scss"

# Stat-cards con background explícito
grep -rn "stat-card" src/ --include="*.scss" | grep -i "background"
```
