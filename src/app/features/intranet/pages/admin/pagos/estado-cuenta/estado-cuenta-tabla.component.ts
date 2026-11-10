// #region Imports
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, type TemplateRef, computed, input, signal } from '@angular/core';

import { EduTag } from '@edu-ui';
import { type EtiquetaView, type Orden, ordenar, siguienteOrden } from './estado-cuenta.logic';
// #endregion

export interface ColumnaTabla<T> {
	key: string;
	label: string;
	numeric?: boolean;
	/** Texto de la celda. */
	texto: (fila: T) => string;
	/** Valor para ordenar; si falta se usa el texto. */
	valor?: (fila: T) => string | number | null;
	/** Si está, la celda se pinta como insignia de estado en vez de texto plano (el texto sigue siendo `texto`). */
	etiqueta?: (fila: T) => EtiquetaView;
}

/**
 * Tabla presentacional con orden por columna en cliente (los arreglos de la cuenta son chicos y llegan completos).
 * Una fila anulada se marca aparte y muestra su detalle debajo; no se oculta.
 */
@Component({
	selector: 'app-estado-cuenta-tabla',
	standalone: true,
	imports: [NgTemplateOutlet, EduTag],
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
	/** Plantilla de la columna «Acciones» (botones por fila). Sin ella no hay columna. */
	readonly acciones = input<TemplateRef<{ $implicit: T }> | null>(null);
	protected readonly totalColumnas = computed(() => this.columnas().length + (this.acciones() ? 1 : 0));

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
