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
				<li class="chip chip--ok"><strong>{{ conteos().alDia }}</strong> Al día</li>
				<li class="chip chip--partial">
					<strong>{{ conteos().pagoParcial }}</strong> Pago parcial
					<small>Incluye adelanto parcial de una cuota que aún no vence.</small>
				</li>
				<li class="chip chip--debt"><strong>{{ conteos().conDeuda }}</strong> Con deuda</li>
				<li class="chip" data-testid="total"><strong>{{ total() }}</strong> Total</li>
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
			font-size: 1rem;
		}
		.row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.75rem;
			list-style: none;
			margin: 0 0 0.5rem;
			padding: 0;
		}
		.chip {
			display: flex;
			flex-direction: column;
			min-width: 9rem;
			max-width: 16rem;
			padding: 0.75rem 1rem;
			border-radius: 0.75rem;
			border: 1px solid var(--surface-border, #e5e7eb);
			background: var(--surface-card, #fff);
		}
		.chip strong {
			font-size: 1.5rem;
		}
		.chip small {
			margin-top: 0.25rem;
			font-size: 0.75rem;
			color: var(--text-color-secondary, #6b7280);
		}
		.chip--ok {
			border-left: 4px solid var(--green-500, #22c55e);
		}
		.chip--partial {
			border-left: 4px solid var(--yellow-500, #eab308);
		}
		.chip--debt {
			border-left: 4px solid var(--red-500, #ef4444);
		}
		.chip--aside {
			border-style: dashed;
		}
		.note {
			margin: 0.5rem 0;
			font-size: 0.8125rem;
			color: var(--text-color-secondary, #6b7280);
		}
	`,
})
export class CobranzaConteosComponent {
	readonly conteos = input.required<PagosConteos>();

	protected readonly total = computed(() => totalExclusivo(this.conteos()));
}
