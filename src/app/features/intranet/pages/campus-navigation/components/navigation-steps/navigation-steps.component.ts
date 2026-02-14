// #region Imports
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PathResult } from '../../models';

// #endregion
// #region Implementation
@Component({
	selector: 'app-navigation-steps',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (pathResult(); as result) {
			<div class="navigation-steps">
				<h4 class="steps-title">
					<i class="pi pi-directions"></i>
					Instrucciones
				</h4>

				<div class="steps-list">
					@for (step of result.steps; track $index) {
						<div class="step" [class.floor-change]="step.floorChange">
							<div class="step-icon">
								@if (step.floorChange) {
									<i class="pi pi-arrow-up-right"></i>
								} @else if ($last) {
									<i class="pi pi-map-marker"></i>
								} @else {
									<i class="pi pi-arrow-right"></i>
								}
							</div>
							<span class="step-text">{{ step.instruction }}</span>
						</div>
					}
				</div>

				<div class="estimated-time">
					<i class="pi pi-stopwatch"></i>
					Tiempo estimado: ~{{ estimatedMinutes() }} min
				</div>
			</div>
		}
	`,
	styles: `
		.navigation-steps {
			border: 1px solid var(--surface-border);
			border-radius: 8px;
			padding: 1rem;
		}

		.steps-title {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			margin: 0 0 0.75rem;
			font-size: 0.95rem;
			font-weight: 600;

			i {
				color: var(--primary-color);
			}
		}

		.steps-list {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}

		.step {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.5rem 0.75rem;
			border-radius: 6px;
			background: var(--surface-50);
			font-size: 0.85rem;

			&.floor-change {
				background: color-mix(in srgb, var(--primary-color) 10%, transparent);
				font-weight: 600;
			}
		}

		.step-icon {
			width: 24px;
			height: 24px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			background: var(--primary-color);
			color: #ffffff;
			font-size: 0.7rem;
			flex-shrink: 0;
		}

		.step-text {
			flex: 1;
		}

		.estimated-time {
			margin-top: 0.75rem;
			padding-top: 0.75rem;
			border-top: 1px solid var(--surface-border);
			font-size: 0.85rem;
			font-weight: 600;
			color: var(--text-color-secondary);
			display: flex;
			align-items: center;
			gap: 0.5rem;

			i {
				color: var(--primary-color);
			}
		}
	`,
})
export class NavigationStepsComponent {
	readonly pathResult = input<PathResult | null>(null);

	readonly estimatedMinutes = computed(() => {
		const result = this.pathResult();
		if (!result) return 0;
		return Math.max(1, Math.round(result.totalDistance / 60));
	});
}
// #endregion
