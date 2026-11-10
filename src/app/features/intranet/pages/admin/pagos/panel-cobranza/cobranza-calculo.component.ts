import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Bloque «Cómo se calcula» (INV-PG10 foto histórica, INV-PG14 sin dato). Siempre visible. */
@Component({
	selector: 'app-cobranza-calculo',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<section class="calc" aria-labelledby="h-calculo">
			<h3 id="h-calculo">Cómo se calcula</h3>
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
		</section>
	`,
	styleUrl: './cobranza-calculo.component.scss',
})
export class CobranzaCalculoComponent {}
