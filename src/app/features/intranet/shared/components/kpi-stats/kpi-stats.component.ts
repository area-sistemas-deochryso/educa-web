// #region Imports
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
// #endregion

// #region Types
export type KpiStatVariant = 'critical' | 'error' | 'warning' | 'success' | 'info';

export interface KpiStatItem {
	icon: string;
	label: string;
	value: string | number;
	sublabel?: string;
	variant?: KpiStatVariant;
}
// #endregion

// #region Implementation
@Component({
	selector: 'app-kpi-stats',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './kpi-stats.component.html',
	styleUrls: ['./kpi-stats.component.scss'],
})
export class KpiStatsComponent {
	readonly items = input.required<KpiStatItem[]>();
	readonly iconPosition = input<'left' | 'right'>('left');
	readonly minColumnWidth = input('200px');
}
// #endregion
