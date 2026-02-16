// #region Imports
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';
// #endregion

// #region Implementation
@Component({
	selector: 'app-stats-skeleton',
	standalone: true,
	imports: [SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './stats-skeleton.component.html',
	styleUrls: ['./stats-skeleton.component.scss'],
})
export class StatsSkeletonComponent {
	readonly count = input(4);
	readonly iconPosition = input<'left' | 'right'>('left');
	readonly showDescription = input(false);
	readonly minColumnWidth = input('200px');

	readonly cardArray = computed(() => Array(this.count()));
}
// #endregion
