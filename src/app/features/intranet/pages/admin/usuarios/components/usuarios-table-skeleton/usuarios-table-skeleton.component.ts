// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SkeletonLoaderComponent } from '@shared/components';

/**
 * Skeleton screen para la tabla de usuarios
 * Reserva espacio para evitar CLS y mejora Speed Index
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-usuarios-table-skeleton',
	standalone: true,
	imports: [SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './usuarios-table-skeleton.component.html',
	styleUrls: ['./usuarios-table-skeleton.scss'],
})
export class UsuariosTableSkeletonComponent {}
// #endregion
