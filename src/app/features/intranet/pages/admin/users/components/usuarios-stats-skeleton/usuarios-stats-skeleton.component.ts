// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { StatsSkeletonComponent } from '@shared/components';
// #endregion

// #region Implementation
@Component({
	selector: 'app-users-stats-skeleton',
	standalone: true,
	imports: [StatsSkeletonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './usuarios-stats-skeleton.component.html',
	styleUrls: ['./usuarios-stats-skeleton.component.scss'],
})
export class UsersStatsSkeletonComponent {}
// #endregion
