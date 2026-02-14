// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SkeletonLoaderComponent } from '@shared/components';

/**
 * Skeleton screen para las tablas de asistencia
 * Reserva espacio para evitar CLS y mejora Speed Index
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-attendance-table-skeleton',
	standalone: true,
	imports: [SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './attendance-table-skeleton.component.html',
	styleUrls: ['./attendance-table-skeleton.component.scss'],
})
export class AttendanceTableSkeletonComponent {}
// #endregion
