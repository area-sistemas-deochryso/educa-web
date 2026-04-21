import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { logger } from '@core/helpers';

import { RateLimitEventListaDto, displayPolicy } from '../../models';

@Component({
	selector: 'app-rate-limit-detail-drawer',
	standalone: true,
	imports: [CommonModule, DatePipe, ButtonModule, DrawerModule, TagModule, TooltipModule],
	templateUrl: './rate-limit-detail-drawer.component.html',
	styleUrl: './rate-limit-detail-drawer.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RateLimitDetailDrawerComponent {
	// #region Dependencias
	private readonly router = inject(Router);
	private readonly messageService = inject(MessageService);
	// #endregion

	// #region Inputs / Outputs
	readonly visible = input<boolean>(false);
	readonly item = input<RateLimitEventListaDto | null>(null);
	readonly visibleChange = output<boolean>();
	// #endregion

	readonly displayPolicy = displayPolicy;

	onVisibleChange(value: boolean): void {
		this.visibleChange.emit(value);
	}

	async onCopyCorrelation(correlationId: string | null): Promise<void> {
		if (!correlationId) return;
		if (typeof navigator === 'undefined' || !navigator.clipboard) return;
		try {
			await navigator.clipboard.writeText(correlationId);
			this.messageService.add({
				severity: 'success',
				summary: 'Copiado',
				detail: 'CorrelationId copiado al portapapeles',
				life: 2000,
			});
		} catch (err) {
			logger.warn('[RateLimitDetailDrawer] Clipboard API no disponible:', err);
		}
	}

	onBuscarEnErrorLog(correlationId: string | null): void {
		if (!correlationId) return;
		this.router.navigate(['/intranet/admin/trazabilidad-errores'], {
			queryParams: { correlationId },
		});
	}
}
