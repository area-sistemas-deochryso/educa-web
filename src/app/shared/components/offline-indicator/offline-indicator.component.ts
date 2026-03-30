import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SwService } from '@app/features/intranet/services/sw/sw.service';

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
		}
	`,
	styles: `
		.offline-banner {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 0.5rem;
			padding: 0.5rem 1rem;
			background: var(--orange-500);
			color: #fff;
			font-size: 0.85rem;
			font-weight: 500;
			z-index: 1000;
			text-align: center;
		}
	`,
})
export class OfflineIndicatorComponent {
	private swService = inject(SwService);
	readonly isOffline = toSignal(this.swService.isOnline$.pipe(map((online) => !online)), {
		initialValue: false,
	});
}
