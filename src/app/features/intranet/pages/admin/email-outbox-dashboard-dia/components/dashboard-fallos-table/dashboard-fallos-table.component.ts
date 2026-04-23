import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { EmailOutboxLista } from '@data/models/email-outbox.models';

import { TipoFalloLabelPipe } from '@features/intranet/pages/admin/email-outbox/pipes/tipo-fallo-label.pipe';

@Component({
	selector: 'app-dashboard-fallos-table',
	standalone: true,
	imports: [TableModule, TagModule, ButtonModule, TooltipModule, TipoFalloLabelPipe],
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
