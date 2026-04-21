import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RateLimitCountdownService } from '@core/services/rate-limit-countdown';

/**
 * Toast flotante informativo para respuestas 429.
 *
 * - Solo aparece cuando `RateLimitCountdownService.isActive()` es true.
 * - NO bloquea ninguna request. Solo muestra al usuario cuánto esperar.
 * - Auto-oculta al llegar a 0.
 */
@Component({
	selector: 'app-rate-limit-countdown-toast',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './rate-limit-countdown-toast.component.html',
	styleUrl: './rate-limit-countdown-toast.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RateLimitCountdownToastComponent {
	private readonly countdown = inject(RateLimitCountdownService);

	readonly visible = this.countdown.isActive;
	readonly remaining = this.countdown.remaining;
	readonly endpoint = this.countdown.endpoint;

	/** "1 segundo" vs "N segundos" */
	readonly remainingLabel = computed(() => {
		const n = this.remaining();
		return n === 1 ? '1 segundo' : `${n} segundos`;
	});

	onDismiss(): void {
		this.countdown.stop();
	}
}
