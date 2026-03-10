import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RateLimitService } from '@core/services';

@Component({
	selector: 'app-rate-limit-banner',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.rate-limit-overlay {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.4);
			z-index: 10000;
			display: flex;
			align-items: flex-start;
			justify-content: center;
			padding-top: 80px;
			backdrop-filter: blur(2px);
		}

		.rate-limit-card {
			background: var(--surface-card, #fff);
			border-radius: 12px;
			padding: 2rem 2.5rem;
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
			text-align: center;
			max-width: 420px;
			width: 90%;
		}

		.rate-limit-icon {
			font-size: 2.5rem;
			color: var(--orange-500, #f59e0b);
			margin-bottom: 0.75rem;
		}

		.rate-limit-title {
			font-size: 1.15rem;
			font-weight: 600;
			color: var(--text-color, #1e293b);
			margin: 0 0 0.5rem;
		}

		.rate-limit-message {
			font-size: 0.9rem;
			color: var(--text-color-secondary, #64748b);
			margin: 0 0 1.25rem;
			line-height: 1.5;
		}

		.countdown-container {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 0.75rem;
		}

		.countdown-number {
			font-size: 2rem;
			font-weight: 700;
			color: var(--primary-color, #4f46e5);
			font-variant-numeric: tabular-nums;
			min-width: 3ch;
		}

		.countdown-label {
			font-size: 0.85rem;
			color: var(--text-color-secondary, #64748b);
		}

		.progress-bar {
			width: 100%;
			height: 4px;
			background: var(--surface-border, #e2e8f0);
			border-radius: 2px;
			margin-top: 1.25rem;
			overflow: hidden;
		}

		.progress-bar-fill {
			height: 100%;
			background: var(--primary-color, #4f46e5);
			border-radius: 2px;
			transition: width 1s linear;
		}
	`,
	template: `
		@if (rateLimitService.isCoolingDown()) {
			<div class="rate-limit-overlay">
				<div class="rate-limit-card">
					<div class="rate-limit-icon">
						<i class="pi pi-clock"></i>
					</div>
					<h3 class="rate-limit-title">Demasiadas solicitudes</h3>
					<p class="rate-limit-message">
						Se ha excedido el límite de solicitudes. La aplicación se
						reactivará automáticamente.
					</p>
					<div class="countdown-container">
						<span class="countdown-number">{{ rateLimitService.remainingSeconds() }}</span>
						<span class="countdown-label">segundos restantes</span>
					</div>
					<div class="progress-bar">
						<div
							class="progress-bar-fill"
							[style.width.%]="progressPercent()"
						></div>
					</div>
				</div>
			</div>
		}
	`,
})
export class RateLimitBannerComponent {
	readonly rateLimitService = inject(RateLimitService);

	/** Track initial cooldown to calculate progress. */
	private initialSeconds = 0;

	readonly progressPercent = computed(() => {
		const remaining = this.rateLimitService.remainingSeconds();
		if (remaining > this.initialSeconds) {
			this.initialSeconds = remaining;
		}
		if (this.initialSeconds === 0) return 100;
		return ((this.initialSeconds - remaining) / this.initialSeconds) * 100;
	});
}
