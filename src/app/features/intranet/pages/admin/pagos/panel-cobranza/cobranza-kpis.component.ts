import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { PanelCobranza } from '@data/models';
import { formatFechaConDia, formatPorcentaje, formatSoles } from '../utils/pagos-format.util';

/** Cobranza por debajo de este porcentaje pinta su barra en naranja (solo énfasis visual, no regla de negocio). */
const COBRANZA_BAJA = 80;

/** Tarjetas KPI del panel. Todo porcentaje pasa por `formatPorcentaje` (null → «—», INV-PG10). */
@Component({
	selector: 'app-cobranza-kpis',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<section class="kpis" aria-label="Indicadores de cobranza">
			<article class="kpi">
				<i class="kpi__icon pi pi-users" aria-hidden="true"></i>
				<div class="kpi__body">
					<h3 class="kpi__title">Matriculados</h3>
					<p class="kpi__value">{{ panel().matriculados }}</p>
					<p class="kpi__hint">Año {{ panel().anio }}</p>
				</div>
			</article>
			<article class="kpi">
				<i class="kpi__icon pi pi-calendar" aria-hidden="true"></i>
				<div class="kpi__body">
					<h3 class="kpi__title">Asistieron</h3>
					<p class="kpi__value">{{ pct(panel().asistencia.porcentaje) }}</p>
					@if (panel().asistencia.porcentaje !== null) {
						<div class="kpi__track" aria-hidden="true">
							<div class="kpi__fill" [style.width.%]="ancho(panel().asistencia.porcentaje)"></div>
						</div>
					}
					<p class="kpi__hint">
						{{ panel().asistencia.asistieron }} de {{ panel().asistencia.universo }} alumnos desde 2.º de Primaria. Del
						{{ fecha(panel().asistencia.desde) }} al {{ fecha(panel().asistencia.hasta) }}. Al inicio del mes puede salir
						0 %: aún hay pocas marcaciones.
					</p>
				</div>
			</article>
			<article class="kpi">
				<i class="kpi__icon pi pi-check-circle" aria-hidden="true"></i>
				<div class="kpi__body">
					<h3 class="kpi__title">Pagaron (al día)</h3>
					<p class="kpi__value">{{ pct(panel().porcentajeAlDia) }}</p>
					@if (panel().porcentajeAlDia !== null) {
						<div class="kpi__track" aria-hidden="true">
							<div class="kpi__fill" [style.width.%]="ancho(panel().porcentajeAlDia)"></div>
						</div>
					}
					<p class="kpi__hint">{{ panel().conteos.alDia }} de {{ panel().matriculados }} matriculados</p>
				</div>
			</article>
			<article class="kpi">
				<i class="kpi__icon pi pi-wallet" aria-hidden="true"></i>
				<div class="kpi__body">
					<h3 class="kpi__title">Cobranza por dinero</h3>
					<p class="kpi__value">{{ pct(panel().dinero.porcentaje) }}</p>
					@if (panel().dinero.porcentaje !== null) {
						<div class="kpi__track" aria-hidden="true">
							<div
								class="kpi__fill"
								[class.kpi__fill--warn]="(panel().dinero.porcentaje ?? 0) < cobranzaBaja"
								[style.width.%]="ancho(panel().dinero.porcentaje)"
							></div>
						</div>
					}
					<p class="kpi__hint">
						De lo que ya se podía cobrar a esta fecha, lo que sí se cobró:
						{{ soles(panel().dinero.cobradoDeLoExigible) }} de {{ soles(panel().dinero.exigible) }} exigible.
					</p>
				</div>
			</article>
			<article class="kpi kpi--warn">
				<i class="kpi__icon pi pi-exclamation-triangle" aria-hidden="true"></i>
				<div class="kpi__body">
					<h3 class="kpi__title">Índice de morosidad</h3>
					<p class="kpi__value">{{ pct(panel().dinero.indiceMorosidad) }}</p>
					<p class="kpi__hint">
						De lo exigible, lo que sigue sin pagar: saldo vencido {{ soles(panel().dinero.saldoVencido) }}. Es el
						complemento de la cobranza: entre las dos suman 100 %.
					</p>
				</div>
			</article>
		</section>
	`,
	styleUrl: './cobranza-kpis.component.scss',
})
export class CobranzaKpisComponent {
	readonly panel = input.required<PanelCobranza>();

	protected readonly cobranzaBaja = COBRANZA_BAJA;
	protected readonly pct = formatPorcentaje;
	protected readonly soles = formatSoles;
	protected readonly fecha = formatFechaConDia;

	/** Ancho de barra acotado a 0-100. */
	protected ancho(valor: number | null): number {
		return valor === null ? 0 : Math.min(100, Math.max(0, valor));
	}
}
