import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SkeletonLoaderComponent } from '@shared/components';

/**
 * Skeleton screen para las tarjetas de estadísticas
 * Se muestra inmediatamente para mejorar Speed Index
 */
@Component({
	selector: 'app-usuarios-stats-skeleton',
	standalone: true,
	imports: [SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './usuarios-stats-skeleton.component.html',
	styleUrls: ['./usuarios-stats-skeleton.component.scss'],
})
export class UsuariosStatsSkeletonComponent {}
