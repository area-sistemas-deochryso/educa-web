// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TableSkeletonComponent } from '@shared/components';
import type { SkeletonColumnDef } from '@shared/components';
// #endregion

// #region Implementation
@Component({
	selector: 'app-users-table-skeleton',
	standalone: true,
	imports: [TableSkeletonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './usuarios-table-skeleton.component.html',
	styleUrls: ['./usuarios-table-skeleton.scss'],
})
export class UsersTableSkeletonComponent {
	readonly columns: SkeletonColumnDef[] = [
		{ width: '80px', cellType: 'text' },
		{ width: '100px', cellType: 'text' },
		{ width: 'flex', cellType: 'avatar-text' },
		{ width: '150px', cellType: 'text' },
		{ width: '120px', cellType: 'badge' },
		{ width: '100px', cellType: 'badge' },
		{ width: '140px', cellType: 'actions' },
	];
}
// #endregion
