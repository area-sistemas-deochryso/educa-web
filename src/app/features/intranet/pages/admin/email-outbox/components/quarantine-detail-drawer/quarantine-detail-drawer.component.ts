import { DatePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TagModule } from 'primeng/tag';

import { UiMappingService } from '@shared/services';
import { EmailQuarantineListaDto } from '@data/models/email-quarantine.models';

/**
 * Plan 37 Chat 3 — drawer detalle de cuarentena (B10).
 */
@Component({
	selector: 'app-quarantine-detail-drawer',
	standalone: true,
	imports: [DrawerModule, ButtonModule, TagModule, DatePipe],
	templateUrl: './quarantine-detail-drawer.component.html',
	styleUrl: './quarantine-detail-drawer.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuarantineDetailDrawerComponent {
	readonly uiMapping = inject(UiMappingService);

	readonly visible = input<boolean>(false);
	readonly entry = input<EmailQuarantineListaDto | null>(null);

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
