import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { PagosConteos } from '@data/models';
import { totalExclusivo } from './panel-cobranza.logic';

/**
 * Conteos por categoría. Al día / parcial / con deuda son exclusivos y suman el total;
 * «con datos sin confirmar» y «sin cargos» son transversales y NO suman (INV-PG14).
 */
@Component({
	selector: 'app-cobranza-conteos',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<section aria-label="Alumnos por situación de pago">
			<h3 class="title">Alumnos por situación de pago</h3>
			<ul class="row" aria-label="Categorías exclusivas">
				<li class="chip chip--total" data-testid="total"><strong>{{ total() }}</strong> Total</li>
				<li class="chip chip--ok"><strong>{{ conteos().alDia }}</strong> Al día</li>
				<li class="chip chip--partial">
					<strong>{{ conteos().pagoParcial }}</strong> Pago parcial
					<small>Incluye adelanto parcial de una cuota que aún no vence.</small>
				</li>
				<li class="chip chip--debt"><strong>{{ conteos().conDeuda }}</strong> Con deuda</li>
			</ul>
			<p class="note">Aparte, sin sumar al total (un mismo alumno puede estar en ambos):</p>
			<ul class="row" aria-label="Conteos transversales">
				<li class="chip chip--aside" data-testid="sin-confirmar">
					<strong>{{ conteos().conDatosSinConfirmar }}</strong> Con datos sin confirmar
					<small>Un cargo «sin dato» nunca cuenta como deuda.</small>
				</li>
				<li class="chip chip--aside" data-testid="sin-cargos">
					<strong>{{ conteos().sinCargos }}</strong> Sin cargos
					<small>Cuentan como «al día»: sin esta cifra casi todos parecen al día antes de la carga inicial.</small>
				</li>
			</ul>
		</section>
	`,
	styles: `
		.title {
			margin: 0 0 0.5rem;
			font-size: 1.0625rem;
			font-weight: 600;
		}
		.row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.625rem;
			align-items: flex-start;
			list-style: none;
			margin: 0 0 0.5rem;
			padding: 0;
		}
		.chip {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 0.375rem;
			max-width: 18rem;
			padding: 0.375rem 0.875rem;
			border-radius: 16px;
			border: 1px solid var(--surface-300);
			font-size: 0.875rem;
		}
		.chip strong {
			font-size: 1rem;
			font-variant-numeric: tabular-nums;
		}
		.chip small {
			flex-basis: 100%;
			font-size: 0.75rem;
			color: var(--text-color-secondary);
		}
		.chip--total {
			border-color: var(--blue-700, #1d4ed8);
			background: var(--blue-700, #1d4ed8);
			color: #fff;
		}
		.chip--ok {
			border-color: var(--green-500);
			background: color-mix(in srgb, var(--green-500) 15%, transparent);
		}
		.chip--partial {
			border-color: var(--yellow-500);
			background: color-mix(in srgb, var(--yellow-500) 15%, transparent);
		}
		.chip--debt {
			border-color: var(--red-500);
			background: color-mix(in srgb, var(--red-500) 15%, transparent);
		}
		.chip--aside {
			border-style: dashed;
		}
		.note {
			margin: 0.5rem 0;
			font-size: 0.8125rem;
			color: var(--text-color-secondary);
		}
	`,
})
export class CobranzaConteosComponent {
	readonly conteos = input.required<PagosConteos>();

	protected readonly total = computed(() => totalExclusivo(this.conteos()));
}
