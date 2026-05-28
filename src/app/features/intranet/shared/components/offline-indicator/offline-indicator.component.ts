import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SwService } from '@app/features/intranet/services/sw/sw.service';

const RECONNECTED_DISPLAY_MS = 3_000;

@Component({
	selector: 'app-offline-indicator',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (isOffline()) {
			<div class="offline-banner" role="alert">
				<i class="pi pi-wifi"></i>
				<span>Sin conexión — los datos podrían no estar actualizados</span>
			</div>
		} @else if (justReconnected()) {
			<div class="reconnected-banner" role="status">
				<i class="pi pi-check-circle"></i>
				<span>Conexión restaurada</span>
			</div>
		}
	`,
	styles: `
		.offline-banner,
		.reconnected-banner {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 0.5rem;
			padding: 0.5rem 1rem;
			color: #fff;
			font-size: 0.85rem;
			font-weight: 500;
			z-index: 1000;
			text-align: center;
		}

		.offline-banner {
			background: var(--orange-500);
		}

		.reconnected-banner {
			background: var(--green-600);
		}
	`,
})
export class OfflineIndicatorComponent {
	private swService = inject(SwService);
	private dismissTimer: ReturnType<typeof setTimeout> | null = null;

	readonly isOffline = toSignal(this.swService.isOnline$.pipe(map((online) => !online)), {
		initialValue: false,
	});
	readonly justReconnected = signal(false);

	constructor() {
		let wasOffline = false;
		effect(() => {
			const offline = this.isOffline();
			if (offline) {
				wasOffline = true;
				this.clearDismissTimer();
				this.justReconnected.set(false);
			} else if (wasOffline) {
				wasOffline = false;
				this.justReconnected.set(true);
				this.dismissTimer = setTimeout(() => this.justReconnected.set(false), RECONNECTED_DISPLAY_MS);
			}
		});
	}

	private clearDismissTimer(): void {
		if (this.dismissTimer) {
			clearTimeout(this.dismissTimer);
			this.dismissTimer = null;
		}
	}
}
