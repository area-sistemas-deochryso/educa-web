import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
	TableSkeletonComponent,
	SkeletonColumnDef,
} from '@intranet-shared/components/table-skeleton';
import { StatsSkeletonComponent } from '@intranet-shared/components/stats-skeleton/stats-skeleton.component';

@Component({
	selector: 'app-auditoria-correos-skeleton',
	standalone: true,
	imports: [TableSkeletonComponent, StatsSkeletonComponent],
	templateUrl: './auditoria-correos-skeleton.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaCorreosSkeletonComponent {
	readonly tableColumns: SkeletonColumnDef[] = [
		{ width: '120px', cellType: 'badge' },
		{ width: '110px', cellType: 'text' },
		{ width: 'flex', cellType: 'text' },
		{ width: '220px', cellType: 'text' },
		{ width: '150px', cellType: 'badge' },
		{ width: 'flex', cellType: 'text' },
		{ width: '80px', cellType: 'actions' },
	];
}
