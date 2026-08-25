import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { ErrorHandlerService } from '@core/services/error';
import { EmailOutboxLista } from '@data/models';

import { TipoFalloLabelPipe } from '@features/intranet/pages/admin/email-outbox-shared';
import { EduButton, EduTable, EduTag, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-dashboard-fallos-table',
	standalone: true,
	imports: [EduTable, EduTag, EduButton, EduTooltip, TipoFalloLabelPipe],
	templateUrl: './dashboard-fallos-table.component.html',
	styleUrl: './dashboard-fallos-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardFallosTableComponent {
	private errorHandler = inject(ErrorHandlerService);

	readonly items = input.required<EmailOutboxLista[]>();

	async onCopy(text: string): Promise<void> {
		if (typeof navigator === 'undefined' || !navigator.clipboard) return;
		try {
			await navigator.clipboard.writeText(text);
			this.errorHandler.showSuccess('Copiado', 'Correo copiado al portapapeles', 1500);
		} catch {
			this.errorHandler.showError('Portapapeles', 'No se pudo copiar');
		}
	}

	formatHora(iso: string): string {
		const match = iso.match(/T(\d{2}:\d{2})/);
		return match ? match[1] : iso;
	}
}
