import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { PanelCobranza } from '@data/models';
import { formatFechaConDia, formatPorcentaje, formatSoles } from '../utils/pagos-format.util';

/** Tarjetas KPI del panel. Todo porcentaje pasa por `formatPorcentaje` (null → «—», INV-PG10). */
@Component({
	selector: 'app-cobranza-kpis',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<section class="kpis" aria-label="Indicadores de cobranza">
			<article class="kpi">
				<h3 class="kpi__title">Matriculados</h3>
				<p class="kpi__value">{{ panel().matriculados }}</p>
				<p class="kpi__hint">Año {{ panel().anio }}</p>
			</article>
			<article class="kpi">
				<h3 class="kpi__title">Asistieron</h3>
				<p class="kpi__value">{{ pct(panel().asistencia.porcentaje) }}</p>
				<p class="kpi__hint">
					{{ panel().asistencia.asistieron }} de {{ panel().asistencia.universo }} alumnos desde 2.º de Primaria. Del
					{{ fecha(panel().asistencia.desde) }} al {{ fecha(panel().asistencia.hasta) }}. Al inicio del mes puede salir
					0 %: aún hay pocas marcaciones.
				</p>
			</article>
			<article class="kpi">
				<h3 class="kpi__title">Pagaron (al día)</h3>
				<p class="kpi__value">{{ pct(panel().porcentajeAlDia) }}</p>
				<p class="kpi__hint">{{ panel().conteos.alDia }} de {{ panel().matriculados }} matriculados</p>
			</article>
			<article class="kpi">
				<h3 class="kpi__title">Cobranza por dinero</h3>
				<p class="kpi__value">{{ pct(panel().dinero.porcentaje) }}</p>
				<p class="kpi__hint">
					De lo que ya se podía cobrar a esta fecha, lo que sí se cobró:
					{{ soles(panel().dinero.cobradoDeLoExigible) }} de {{ soles(panel().dinero.exigible) }} exigible.
				</p>
			</article>
			<article class="kpi kpi--warn">
				<h3 class="kpi__title">Índice de morosidad</h3>
				<p class="kpi__value">{{ pct(panel().dinero.indiceMorosidad) }}</p>
				<p class="kpi__hint">
					De lo exigible, lo que sigue sin pagar: saldo vencido {{ soles(panel().dinero.saldoVencido) }}. Es el
					complemento de la cobranza: entre las dos suman 100 %.
				</p>
			</article>
		</section>
	`,
	styles: `
		.kpis {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
			gap: 1rem;
		}
		.kpi {
			background: var(--surface-card, #fff);
			border: 1px solid var(--surface-border, #e5e7eb);
			border-radius: 0.75rem;
			padding: 1rem;
		}
		.kpi--warn {
			border-color: var(--orange-300, #fdba74);
		}
		.kpi__title {
			margin: 0;
			font-size: 0.875rem;
			font-weight: 600;
			color: var(--text-color-secondary, #6b7280);
		}
		.kpi__value {
			margin: 0.25rem 0;
			font-size: 2rem;
			font-weight: 700;
		}
		.kpi__hint {
			margin: 0;
			font-size: 0.8125rem;
			color: var(--text-color-secondary, #6b7280);
		}
	`,
})
export class CobranzaKpisComponent {
	readonly panel = input.required<PanelCobranza>();

	protected readonly pct = formatPorcentaje;
	protected readonly soles = formatSoles;
	protected readonly fecha = formatFechaConDia;
}
