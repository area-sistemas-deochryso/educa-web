import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

import { SkeletonLoaderComponent, TableSkeletonComponent } from '@shared/components';
import type { SkeletonColumnDef } from '@shared/components';

import { DashboardSenderStat } from '../../models/email-monitoreo.models';

const SKELETON_COLUMNS: SkeletonColumnDef[] = [
	{ width: 'flex', cellType: 'text' },
	{ width: '70px', cellType: 'text' },
	{ width: '70px', cellType: 'text' },
	{ width: '70px', cellType: 'text' },
	{ width: '90px', cellType: 'text' },
];

/**
 * Tile B — Sender Mix. Visualiza el reparto por buzón (`EO_Remitente`) con
 * barra de tasa de fallo. Cap defensivo BE: ventanaDias <= 30.
 */
@Component({
	selector: 'app-sender-stats-tile',
	standalone: true,
	imports: [DatePipe, DecimalPipe, SkeletonLoaderComponent, TableSkeletonComponent],
	templateUrl: './sender-stats-tile.component.html',
	styleUrl: './sender-stats-tile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SenderStatsTileComponent {
	readonly items = input<DashboardSenderStat[]>([]);
	readonly loading = input<boolean>(false);
	readonly ventanaDias = input<number>(7);

	readonly skeletonColumns = SKELETON_COLUMNS;

	readonly hasData = computed(() => this.items().length > 0);

	readonly maxTotal = computed(() => {
		const totals = this.items().map((s) => s.total);
		return totals.length === 0 ? 0 : Math.max(...totals);
	});

	percentageOfMax(total: number): number {
		const max = this.maxTotal();
		if (max === 0) return 0;
		return Math.round((total / max) * 100);
	}

	severityClass(tasaFalloPct: number): 'ok' | 'warn' | 'danger' {
		if (tasaFalloPct >= 30) return 'danger';
		if (tasaFalloPct >= 10) return 'warn';
		return 'ok';
	}
}
