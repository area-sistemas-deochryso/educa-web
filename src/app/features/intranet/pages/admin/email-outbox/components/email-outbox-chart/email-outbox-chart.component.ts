import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EmailOutboxTendencia } from '@data/models/email-outbox.models';

@Component({
	selector: 'app-email-outbox-chart',
	standalone: true,
	templateUrl: './email-outbox-chart.component.html',
	styleUrl: './email-outbox-chart.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxChartComponent {
	readonly data = input.required<EmailOutboxTendencia[]>();

	// #region Computed
	readonly maxValue = computed(() => {
		const items = this.data();
		if (items.length === 0) return 1;
		return Math.max(...items.map((d) => d.total), 1);
	});

	readonly chartBars = computed(() => {
		const items = this.data();
		const max = this.maxValue();
		return items.map((d) => ({
			fecha: this.formatDate(d.fecha),
			enviados: d.enviados,
			fallidos: d.fallidos,
			pendientes: d.pendientes,
			total: d.total,
			enviadosPct: (d.enviados / max) * 100,
			fallidosPct: (d.fallidos / max) * 100,
			pendientesPct: (d.pendientes / max) * 100,
		}));
	});
	// #endregion

	// #region Helpers
	private formatDate(fecha: string): string {
		const parts = fecha.split('-');
		return `${parts[2]}/${parts[1]}`;
	}
	// #endregion
}
