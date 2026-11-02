import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Bloque colapsable «Cómo se calcula» (INV-PG10 foto histórica, INV-PG14 sin dato). */
@Component({
	selector: 'app-cobranza-calculo',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<details class="calc">
			<summary>Cómo se calcula</summary>
			<ul>
				<li>Es una foto histórica a la fecha del corte elegido, no el estado de hoy.</li>
				<li>
					El recargo de un corte pasado se recalcula a la fecha del corte (no se lee el valor congelado): anular un pago
					posterior no cambia un corte ya presentado.
				</li>
				<li>La asistencia se mide solo desde 2.º de Primaria.</li>
				<li>Un cargo «sin dato» nunca cuenta como deuda.</li>
				<li>Índice de morosidad = saldo vencido / exigible; la cobranza por dinero es su complemento.</li>
			</ul>
		</details>
	`,
	styles: `
		.calc {
			padding: 0.75rem 1rem;
			border: 1px solid var(--surface-border, #e5e7eb);
			border-radius: 0.75rem;
			background: var(--surface-card, #fff);
		}
		summary {
			cursor: pointer;
			font-weight: 600;
		}
		ul {
			margin: 0.75rem 0 0;
			padding-left: 1.25rem;
			font-size: 0.875rem;
		}
	`,
})
export class CobranzaCalculoComponent {}
