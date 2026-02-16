// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TableSkeletonComponent } from '@shared/components';
import type { SkeletonColumnDef } from '@shared/components';
// #endregion

// #region Implementation
@Component({
	selector: 'app-horarios-table-skeleton',
	standalone: true,
	imports: [TableSkeletonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './horarios-table-skeleton.component.html',
	styleUrls: ['./horarios-table-skeleton.component.scss'],
})
export class HorariosTableSkeletonComponent {
	readonly columns: SkeletonColumnDef[] = [
		{ width: '80px', cellType: 'text' },
		{ width: '100px', cellType: 'text' },
		{ width: '110px', cellType: 'text' },
		{ width: '100px', cellType: 'badge' },
		{ width: 'flex', cellType: 'avatar-text' },
		{ width: '90px', cellType: 'text' },
		{ width: '90px', cellType: 'badge' },
		{ width: '120px', cellType: 'actions' },
	];
}
// #endregion
