import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { PagosAgingTramo, PagosOportuna, PagosPorNivel } from '@data/models';
import { formatPorcentaje, formatSoles } from '../utils/pagos-format.util';

/** Barras «al día» por nivel, aging de deuda y recaudación oportuna. */
@Component({
	selector: 'app-cobranza-desglose',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="grid">
			<section aria-labelledby="h-nivel">
				<h3 id="h-nivel">Al día por nivel</h3>
				@for (n of porNivel(); track n.nivel) {
					<div class="bar">
						<div class="bar__head">
							<span>{{ n.nivel }}</span>
							<span>{{ pct(n.porcentaje) }} ({{ n.alDia }} de {{ n.matriculados }})</span>
						</div>
						<div
							class="bar__track"
							role="progressbar"
							aria-valuemin="0"
							aria-valuemax="100"
							[attr.aria-valuenow]="n.porcentaje"
							[attr.aria-label]="'Al día en ' + n.nivel + ': ' + pct(n.porcentaje)"
						>
							<div class="bar__fill" [style.width.%]="ancho(n.porcentaje)"></div>
						</div>
					</div>
				} @empty {
					<p class="muted">Sin niveles para mostrar.</p>
				}
			</section>

			<section aria-labelledby="h-aging">
				<h3 id="h-aging">Antigüedad de la deuda</h3>
				<table class="table">
					<caption class="sr-only">
						Saldo vencido por tramo de días de atraso
					</caption>
					<thead>
						<tr>
							<th scope="col">Tramo</th>
							<th scope="col" class="num">Saldo</th>
							<th scope="col" class="num">Cuotas</th>
							<th scope="col" class="num">Alumnos</th>
						</tr>
					</thead>
					<tbody>
						@for (t of aging(); track t.etiqueta) {
							<tr>
								<th scope="row">{{ t.etiqueta }}</th>
								<td class="num">{{ soles(t.saldo) }}</td>
								<td class="num">{{ t.cuotas }}</td>
								<td class="num">{{ t.alumnos }}</td>
							</tr>
						}
					</tbody>
				</table>
			</section>

			<section aria-labelledby="h-oportuna">
				<h3 id="h-oportuna">Recaudación oportuna</h3>
				<p class="big">{{ pct(oportuna().porcentaje) }}</p>
				<p class="muted">
					{{ oportuna().cuotasOportunas }} de {{ oportuna().cuotasExigibles }} cuotas exigibles cubiertas antes del
					primer día fuera de fecha.
				</p>
			</section>
		</div>
	`,
	styles: `
		.grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
			gap: 1.5rem;
		}
		h3 {
			margin: 0 0 0.75rem;
			font-size: 1rem;
		}
		.bar {
			margin-bottom: 0.75rem;
		}
		.bar__head {
			display: flex;
			justify-content: space-between;
			gap: 0.5rem;
			font-size: 0.8125rem;
		}
		.bar__track {
			height: 0.625rem;
			border-radius: 999px;
			background: var(--surface-200, #e5e7eb);
			overflow: hidden;
		}
		.bar__fill {
			height: 100%;
			background: var(--green-500, #22c55e);
		}
		.table {
			width: 100%;
			border-collapse: collapse;
			font-size: 0.875rem;
		}
		.table th,
		.table td {
			padding: 0.375rem 0.5rem;
			border-bottom: 1px solid var(--surface-border, #e5e7eb);
			text-align: left;
		}
		.table .num {
			text-align: right;
		}
		.big {
			margin: 0;
			font-size: 2rem;
			font-weight: 700;
		}
		.muted {
			margin: 0.25rem 0 0;
			font-size: 0.8125rem;
			color: var(--text-color-secondary, #6b7280);
		}
		.sr-only {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
		}
	`,
})
export class CobranzaDesgloseComponent {
	readonly porNivel = input.required<PagosPorNivel[]>();
	readonly aging = input.required<PagosAgingTramo[]>();
	readonly oportuna = input.required<PagosOportuna>();

	protected readonly pct = formatPorcentaje;
	protected readonly soles = formatSoles;

	/** Ancho de barra acotado a 0-100; null no dibuja nada. */
	protected ancho(valor: number | null): number {
		return valor === null ? 0 : Math.min(100, Math.max(0, valor));
	}
}
