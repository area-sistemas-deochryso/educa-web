import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { SignalRService, AttendanceSignalRService } from '@core/services/signalr';
import { EmailHubService } from '@app/features/intranet/pages/admin/email-outbox-dashboard-dia/services/email-hub.service';
import { SwService } from '@app/features/intranet/services/sw/sw.service';

@Component({
	selector: 'app-connection-status-indicator',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (showBanner()) {
			<div class="connection-banner" role="status">
				<i class="pi pi-spin pi-spinner"></i>
				<span>Reconectando actualizaciones en tiempo real...</span>
			</div>
		}
	`,
	styles: `
		.connection-banner {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 0.5rem;
			padding: 0.5rem 1rem;
			background: var(--yellow-500);
			color: #fff;
			font-size: 0.85rem;
			font-weight: 500;
			z-index: 1000;
			text-align: center;
		}
	`,
})
export class ConnectionStatusIndicatorComponent {
	private chatHub = inject(SignalRService);
	private attendanceHub = inject(AttendanceSignalRService);
	private emailHub = inject(EmailHubService);
	private swService = inject(SwService);

	private readonly isOffline = toSignal(
		this.swService.isOnline$.pipe(map((online) => !online)),
		{ initialValue: false },
	);

	private readonly anyReconnecting = computed(
		() => this.chatHub.reconnecting() || this.attendanceHub.reconnecting() || this.emailHub.reconnecting(),
	);

	readonly showBanner = computed(() => !this.isOffline() && this.anyReconnecting());
}
