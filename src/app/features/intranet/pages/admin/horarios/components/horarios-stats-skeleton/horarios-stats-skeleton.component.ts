// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { StatsSkeletonComponent } from '@shared/components';
// #endregion

// #region Implementation
@Component({
	selector: 'app-horarios-stats-skeleton',
	standalone: true,
	imports: [StatsSkeletonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './horarios-stats-skeleton.component.html',
	styleUrls: ['./horarios-stats-skeleton.component.scss'],
})
export class HorariosStatsSkeletonComponent {}
// #endregion
