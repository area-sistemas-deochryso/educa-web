# Transparencia de Tablas (p-table)

## Regla

> **Toda `p-table` en la intranet DEBE tener fondo transparente.** PrimeNG aplica fondo blanco por defecto que rompe la consistencia visual con `--surface-ground`.

## Override obligatorio en SCSS

Agregar en la region `// #region Tabla` de cada componente que use `p-table`:

```scss
// #region Tabla
::ng-deep .p-datatable {
	background: transparent;

	.p-datatable-table {
		background: transparent;
	}

	.p-datatable-thead > tr > th {
		background: transparent;
	}

	.p-datatable-tbody > tr {
		background: transparent;

		> td {
			background: transparent;
		}
	}

	.p-datatable-paginator-bottom,
	.p-paginator {
		background: transparent;
	}
}
// ... resto de estilos de tabla
// #endregion
```

## Checklist

```
[ ] ::ng-deep .p-datatable con background: transparent
[ ] .p-datatable-table transparente
[ ] .p-datatable-thead > tr > th transparente
[ ] .p-datatable-tbody > tr y > td transparentes
[ ] .p-paginator transparente (el paginador tiene su propio fondo)
```

## Buscar violaciones

```bash
# Componentes con p-table que NO tienen el override
grep -rl "<p-table" src/ --include="*.html" | while read f; do
  scss="${f/.component.html/.component.scss}"
  if [ -f "$scss" ] && ! grep -q "p-datatable" "$scss"; then
    echo "FALTA override: $scss"
  fi
done
```
