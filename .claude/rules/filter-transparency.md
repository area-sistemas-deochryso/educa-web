# Transparencia de Filtros (inputs, selects)

## Regla

> **Todo `p-inputtext`, `p-select` y `p-iconfield` en la intranet DEBE tener fondo transparente.** PrimeNG aplica fondo blanco por defecto que rompe la consistencia visual con `--surface-ground`.

## Override obligatorio en SCSS

Agregar como `:host ::ng-deep` a nivel raiz del SCSS del componente:

```scss
// #region Overrides PrimeNG
:host ::ng-deep {
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

	.p-select-label {
		color: var(--text-color);
	}

	.p-select-dropdown {
		color: var(--text-color);
	}
}
// #endregion
```

## Por que `:host ::ng-deep` y no solo `::ng-deep`

- `:host` limita el scope al componente actual (no contamina hijos)
- `::ng-deep` penetra el encapsulamiento de PrimeNG
- Combinados: override seguro y con scope correcto

## Checklist

```
[ ] :host ::ng-deep con .p-inputtext y .p-select transparentes
[ ] .p-select-label y .p-select-dropdown con color correcto
[ ] Placeholder con color secundario
[ ] Focus con border y box-shadow usando --text-color
```
