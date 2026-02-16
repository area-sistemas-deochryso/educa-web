// #region Imports
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

import type { SkeletonColumnDef } from './table-skeleton.types';
// #endregion

// #region Implementation
@Component({
	selector: 'app-table-skeleton',
	standalone: true,
	imports: [SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './table-skeleton.component.html',
	styleUrls: ['./table-skeleton.component.scss'],
})
export class TableSkeletonComponent {
	readonly columns = input.required<SkeletonColumnDef[]>();
	readonly rows = input(10);
	readonly minHeight = input('420px');
	readonly showHeader = input(true);

	readonly rowArray = computed(() => Array(this.rows()));
}
// #endregion
