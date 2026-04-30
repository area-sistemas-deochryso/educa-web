import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { TableSkeletonComponent } from '@shared/components';
import type { SkeletonColumnDef } from '@shared/components';

import { DashboardDominioReceptor } from '../../models/email-monitoreo.models';

const SKELETON_COLUMNS: SkeletonColumnDef[] = [
	{ width: 'flex', cellType: 'text' },
	{ width: '70px', cellType: 'text' },
	{ width: '70px', cellType: 'text' },
	{ width: '90px', cellType: 'text' },
];

@Component({
	selector: 'app-dominios-receptores-tile',
	standalone: true,
	imports: [DecimalPipe, TableSkeletonComponent],
	templateUrl: './dominios-receptores-tile.component.html',
	styleUrl: './dominios-receptores-tile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DominiosReceptoresTileComponent {
	readonly items = input<DashboardDominioReceptor[]>([]);
	readonly loading = input<boolean>(false);
	readonly ventanaDias = input<number>(7);

	readonly skeletonColumns = SKELETON_COLUMNS;

	readonly hasData = computed(() => this.items().length > 0);

	readonly maxTotal = computed(() => {
		const totals = this.items().map((d) => d.total);
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
