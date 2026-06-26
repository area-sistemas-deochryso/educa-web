import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { SignalRService, AttendanceSignalRService } from '@core/services/signalr';
import { EmailHubService } from '@app/features/intranet/pages/admin/email-outbox-dashboard-dia/services/email-hub.service';
import { SwService } from '@core/services/sw';

@Component({
	selector: 'app-connection-status-indicator',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (showReconnecting()) {
			<div class="connection-banner reconnecting" role="status">
				<i class="pi pi-spin pi-spinner"></i>
				<span>Reconectando actualizaciones en tiempo real...</span>
			</div>
		} @else if (showDisconnected()) {
			<div class="connection-banner disconnected" role="alert">
				<i class="pi pi-exclamation-triangle"></i>
				<span>Conexión perdida — las actualizaciones en tiempo real no están disponibles</span>
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
			color: #fff;
			font-size: 0.85rem;
			font-weight: 500;
			z-index: 1000;
			text-align: center;
		}

		.reconnecting {
			background: var(--yellow-500);
		}

		.disconnected {
			background: var(--red-500);
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

	private readonly anyDisconnected = computed(
		() => this.chatHub.disconnected() || this.attendanceHub.disconnected() || this.emailHub.disconnected(),
	);

	readonly showReconnecting = computed(() => !this.isOffline() && this.anyReconnecting());
	readonly showDisconnected = computed(() => !this.isOffline() && !this.anyReconnecting() && this.anyDisconnected());
}
