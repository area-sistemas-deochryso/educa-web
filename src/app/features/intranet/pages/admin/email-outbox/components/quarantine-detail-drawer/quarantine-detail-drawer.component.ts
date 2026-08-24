import { DatePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { UiMappingService } from '@intranet-shared/services';
import {
	EmailQuarantineDetalleDto,
	EmailQuarantineListaDto,
} from '@data/models';
import { EduDrawer, EduTable, EduTag, EduTemplate, EduTooltip } from '@edu-ui';

/**
 * Plan 37 Chat 3 — drawer detalle de cuarentena (B10).
 * Plan 43 Chat 3.1 — agrega "SMTP response" + "Histórico de hits".
 */
@Component({
	selector: 'app-quarantine-detail-drawer',
	standalone: true,
	imports: [EduDrawer, ButtonModule, EduTag, EduTable, EduTooltip, DatePipe, EduTemplate],
	templateUrl: './quarantine-detail-drawer.component.html',
	styleUrl: './quarantine-detail-drawer.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuarantineDetailDrawerComponent {
	readonly uiMapping = inject(UiMappingService);

	readonly visible = input<boolean>(false);
	readonly entry = input<EmailQuarantineListaDto | null>(null);
	readonly detalle = input<EmailQuarantineDetalleDto | null>(null);

	readonly visibleChange = output<boolean>();
	readonly closeDrawer = output<void>();
	readonly release = output<EmailQuarantineListaDto>();

	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onClose(): void {
		this.closeDrawer.emit();
	}

	onRelease(): void {
		const entry = this.entry();
		if (entry?.estado) this.release.emit(entry);
	}
}
