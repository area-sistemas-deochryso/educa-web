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
	template: `
		<section class="stats-section">
			@for (_ of [1, 2, 3, 4, 5]; track $index) {
				<div class="stat-card skeleton-card">
					<div class="stat-content">
						<app-skeleton-loader variant="text" width="80px" height="14px" />
						<app-skeleton-loader variant="text" width="60px" height="32px" />
						<app-skeleton-loader variant="text" width="120px" height="12px" />
					</div>
					<div class="stat-icon">
						<app-skeleton-loader variant="circle" width="48px" height="48px" />
					</div>
				</div>
			}
		</section>
	`,
	styles: [
		`
			.skeleton-card {
				opacity: 0.6;
			}
		`,
	],
})
export class UsuariosStatsSkeletonComponent {}
