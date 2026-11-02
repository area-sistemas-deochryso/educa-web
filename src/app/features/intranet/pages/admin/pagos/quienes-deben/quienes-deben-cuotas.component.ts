// #region Imports
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { QuienDebeCuota } from '@data/models';
import { formatFechaConDia, formatSoles } from '../utils/pagos-format.util';
// #endregion

/** Detalle de cuotas vencidas de un alumno (fila expandida). Presentacional. */
@Component({
	selector: 'app-quienes-deben-cuotas',
	standalone: true,
	template: `
		<table class="cuotas" aria-label="Cuotas vencidas del alumno">
			<thead>
				<tr>
					<th scope="col">Concepto</th>
					<th scope="col">Cuota</th>
					<th scope="col">Vencimiento</th>
					<th scope="col" class="num">Días de atraso</th>
					<th scope="col" class="num">Saldo</th>
					<th scope="col" class="num">Recargo</th>
				</tr>
			</thead>
			<tbody>
				@for (c of cuotas(); track c.cargoId) {
					<tr>
						<td>{{ c.concepto }}</td>
						<td>{{ c.cuota ?? '—' }}</td>
						<td>{{ fecha(c.vencimiento) }}</td>
						<td class="num">{{ c.diasAtraso }}</td>
						<td class="num">{{ soles(c.saldo) }}</td>
						<td class="num">{{ soles(c.recargo) }}</td>
					</tr>
				}
			</tbody>
		</table>
	`,
	styles: `
		.cuotas {
			width: 100%;
			border-collapse: collapse;
			font-size: 0.875rem;
		}
		th,
		td {
			padding: 0.375rem 0.75rem;
			text-align: left;
		}
		th {
			color: var(--text-color-secondary);
			font-weight: 600;
		}
		.num {
			text-align: right;
			font-variant-numeric: tabular-nums;
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuienesDebenCuotasComponent {
	readonly cuotas = input.required<QuienDebeCuota[]>();

	protected readonly fecha = formatFechaConDia;
	protected readonly soles = formatSoles;
}
