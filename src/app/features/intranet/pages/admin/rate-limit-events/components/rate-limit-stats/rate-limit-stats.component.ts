import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

import { KpiStatsComponent, type KpiStatItem } from '@intranet-shared/components';

import { RateLimitStats } from '../../models';

@Component({
	selector: 'app-rate-limit-stats',
	standalone: true,
	imports: [CommonModule, TooltipModule, KpiStatsComponent],
	templateUrl: './rate-limit-stats.component.html',
	styleUrl: './rate-limit-stats.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RateLimitStatsComponent {
	readonly stats = input<RateLimitStats | null>(null);
	readonly loading = input<boolean>(false);

	readonly statsItems = computed<KpiStatItem[]>(() => {
		const s = this.stats();
		const horas = s?.horas ?? 24;
		const rechazados = s?.totalRechazados ?? 0;
		const esAltoVolumen = rechazados > 50;

		return [
			{
				icon: 'pi pi-chart-line',
				label: 'Total eventos',
				value: s?.total ?? 0,
				sublabel: `últimas ${horas}h`,
			},
			{
				icon: 'pi pi-ban',
				label: 'Rechazados',
				value: rechazados,
				sublabel: esAltoVolumen ? 'alto volumen' : `últimas ${horas}h`,
				variant: esAltoVolumen ? 'critical' : undefined,
			},
		];
	});
}
