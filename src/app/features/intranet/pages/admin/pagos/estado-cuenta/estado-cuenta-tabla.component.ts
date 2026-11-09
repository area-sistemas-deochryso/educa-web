// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { type Orden, ordenar, siguienteOrden } from './estado-cuenta.logic';
// #endregion

export interface ColumnaTabla<T> {
	key: string;
	label: string;
	numeric?: boolean;
	/** Texto de la celda. */
	texto: (fila: T) => string;
	/** Valor para ordenar; si falta se usa el texto. */
	valor?: (fila: T) => string | number | null;
}

/**
 * Tabla presentacional con orden por columna en cliente (los arreglos de la cuenta son chicos y llegan completos).
 * Una fila anulada se marca aparte y muestra su detalle debajo; no se oculta.
 */
@Component({
	selector: 'app-estado-cuenta-tabla',
	standalone: true,
	templateUrl: './estado-cuenta-tabla.component.html',
	styleUrl: './estado-cuenta-tabla.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadoCuentaTablaComponent<T> {
	readonly caption = input.required<string>();
	readonly columnas = input.required<ColumnaTabla<T>[]>();
	readonly filas = input.required<readonly T[]>();
	readonly vacio = input('Sin registros.');
	/** Fila marcada como anulada o sin efecto. */
	readonly anulada = input<(fila: T) => boolean>(() => false);
	/** Texto bajo la fila (motivo de anulación). Vacío = nada. */
	readonly detalle = input<(fila: T) => string>(() => '');

	protected readonly orden = signal<Orden>(null);

	protected readonly ordenadas = computed(() => {
		const cols = this.columnas();
		return ordenar(this.filas(), this.orden(), (fila, key) => {
			const col = cols.find((c) => c.key === key);
			if (!col) return null;
			return col.valor ? col.valor(fila) : col.texto(fila);
		});
	});

	protected alternar(key: string): void {
		this.orden.update((actual) => siguienteOrden(actual, key));
	}

	protected ariaSort(key: string): 'ascending' | 'descending' | 'none' {
		const o = this.orden();
		if (o?.key !== key) return 'none';
		return o.descendente ? 'descending' : 'ascending';
	}

	protected sortIcon(key: string): string {
		const o = this.orden();
		if (o?.key !== key) return 'pi pi-sort-alt';
		return o.descendente ? 'pi pi-sort-amount-down' : 'pi pi-sort-amount-up-alt';
	}
}
