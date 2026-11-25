import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { MesesPagadosCelda } from '@data/models';
import { formatSoles } from '../utils/pagos-format.util';
import { ESTADO_VISUAL, etiquetaCelda, tieneSaldo } from './meses-pagados.logic';

/**
 * Una celda de la matriz: icono + texto del estado (+ saldo si debe). El color refuerza, no informa solo.
 * `aria-label` completo para lectores de pantalla; el contenido visual queda oculto a ellos para no leerlo dos veces.
 */
@Component({
	selector: 'app-meses-pagados-celda',
	standalone: true,
	template: `
		<span class="celda" [class]="'celda celda--' + visual().clase" role="img" [attr.aria-label]="etiqueta()">
			<i [class]="visual().icono" aria-hidden="true"></i>
			<span class="celda__texto" aria-hidden="true">{{ visual().texto }}</span>
			@if (saldoTexto(); as saldo) {
				<span class="celda__saldo" aria-hidden="true">{{ saldo }}</span>
			}
		</span>
	`,
	styleUrl: './meses-pagados-celda.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MesesPagadosCeldaComponent {
	readonly celda = input.required<MesesPagadosCelda>();
	/** Nombre de la columna (p. ej. «Marzo»), para la etiqueta accesible. */
	readonly columna = input.required<string>();

	protected readonly visual = computed(() => ESTADO_VISUAL[this.celda().estado]);
	protected readonly etiqueta = computed(() => etiquetaCelda(this.columna(), this.celda()));
	protected readonly saldoTexto = computed(() => (tieneSaldo(this.celda()) ? formatSoles(this.celda().saldo) : null));
}
