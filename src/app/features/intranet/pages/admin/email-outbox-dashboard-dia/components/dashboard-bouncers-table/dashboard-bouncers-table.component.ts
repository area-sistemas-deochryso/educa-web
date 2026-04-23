import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';

import { EmailBouncesAcumulados } from '../../models/email-dashboard-dia.models';

const WARNING_THRESHOLD = 2;
const CRITICAL_THRESHOLD = 3;

@Component({
	selector: 'app-dashboard-bouncers-table',
	standalone: true,
	imports: [TableModule, TagModule, ButtonModule, TooltipModule],
	templateUrl: './dashboard-bouncers-table.component.html',
	styleUrl: './dashboard-bouncers-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardBouncersTableComponent {
	// #region Dependencias
	private errorHandler = inject(ErrorHandlerService);
	// #endregion

	readonly data = input.required<EmailBouncesAcumulados[]>();

	// #region Helpers usados en template
	severity(bounces: number): 'warn' | 'danger' {
		return bounces >= CRITICAL_THRESHOLD ? 'danger' : 'warn';
	}

	isCritical(bounces: number): boolean {
		return bounces >= CRITICAL_THRESHOLD;
	}

	isWarning(bounces: number): boolean {
		return bounces >= WARNING_THRESHOLD && bounces < CRITICAL_THRESHOLD;
	}
	// #endregion

	async onCopy(text: string): Promise<void> {
		if (typeof navigator === 'undefined' || !navigator.clipboard) return;
		try {
			await navigator.clipboard.writeText(text);
			this.errorHandler.showSuccess('Copiado', 'Texto copiado al portapapeles', 1500);
		} catch {
			this.errorHandler.showError('Portapapeles', 'No se pudo copiar');
		}
	}
}
