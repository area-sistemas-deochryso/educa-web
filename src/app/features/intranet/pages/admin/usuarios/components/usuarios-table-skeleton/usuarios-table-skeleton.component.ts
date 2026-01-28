import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonLoaderComponent } from '@shared/components';

/**
 * Skeleton screen para la tabla de usuarios
 * Reserva espacio para evitar CLS y mejora Speed Index
 */
@Component({
	selector: 'app-usuarios-table-skeleton',
	standalone: true,
	imports: [SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="table-skeleton" style="min-height: 420px;">
			<!-- Header skeleton -->
			<div class="table-skeleton__header">
				@for (_ of [1, 2, 3, 4, 5, 6]; track $index) {
					<div class="header-cell">
						<app-skeleton-loader variant="text" width="80%" height="16px" />
					</div>
				}
			</div>

			<!-- Rows skeleton -->
			@for (_ of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track $index) {
				<div class="table-skeleton__row">
					<div class="row-cell">
						<app-skeleton-loader variant="text" width="40px" height="20px" />
					</div>
					<div class="row-cell">
						<app-skeleton-loader variant="text" width="70px" height="16px" />
					</div>
					<div class="row-cell" style="flex: 1;">
						<div style="display: flex; gap: 12px; align-items: center;">
							<app-skeleton-loader variant="circle" width="40px" height="40px" />
							<div style="flex: 1;">
								<app-skeleton-loader variant="text" width="80%" height="16px" />
								<app-skeleton-loader variant="text" width="60%" height="12px" />
							</div>
						</div>
					</div>
					<div class="row-cell">
						<app-skeleton-loader variant="rect" width="80px" height="24px" />
					</div>
					<div class="row-cell">
						<app-skeleton-loader variant="rect" width="70px" height="24px" />
					</div>
					<div class="row-cell">
						<div style="display: flex; gap: 8px;">
							<app-skeleton-loader variant="circle" width="32px" height="32px" />
							<app-skeleton-loader variant="circle" width="32px" height="32px" />
							<app-skeleton-loader variant="circle" width="32px" height="32px" />
						</div>
					</div>
				</div>
			}
		</div>
	`,
	styles: [
		`
			.table-skeleton {
				background: var(--surface-card);
				border-radius: var(--border-radius);
				padding: 1rem;
			}

			.table-skeleton__header {
				display: flex;
				gap: 1rem;
				padding-bottom: 1rem;
				border-bottom: 1px solid var(--surface-border);
				margin-bottom: 0.5rem;
			}

			.header-cell {
				flex: 0 0 auto;
				&:nth-child(1) {
					width: 80px;
				}
				&:nth-child(2) {
					width: 100px;
				}
				&:nth-child(3) {
					flex: 1;
				}
				&:nth-child(4) {
					width: 120px;
				}
				&:nth-child(5) {
					width: 100px;
				}
				&:nth-child(6) {
					width: 140px;
				}
			}

			.table-skeleton__row {
				display: flex;
				gap: 1rem;
				padding: 0.75rem 0;
				border-bottom: 1px solid var(--surface-border);

				&:last-child {
					border-bottom: none;
				}
			}

			.row-cell {
				display: flex;
				align-items: center;
				flex: 0 0 auto;

				&:nth-child(1) {
					width: 80px;
				}
				&:nth-child(2) {
					width: 100px;
				}
				&:nth-child(3) {
					flex: 1;
				}
				&:nth-child(4) {
					width: 120px;
				}
				&:nth-child(5) {
					width: 100px;
				}
				&:nth-child(6) {
					width: 140px;
				}
			}
		`,
	],
})
export class UsuariosTableSkeletonComponent {}
