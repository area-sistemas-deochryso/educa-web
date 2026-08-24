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
import { EmailBlacklistEntry } from '@data/models';
import { EduDrawer, EduTag, EduTooltip } from '@edu-ui';

/**
 * Plan 38 Chat 5 — drawer detalle (B10 de `design-system.md`).
 * Right-side, info-list con audit completo. Botón "Despejar" si está activa.
 */
@Component({
	selector: 'app-blacklist-detail-drawer',
	standalone: true,
	imports: [EduDrawer, ButtonModule, EduTag, EduTooltip, DatePipe],
	templateUrl: './blacklist-detail-drawer.component.html',
	styleUrl: './blacklist-detail-drawer.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlacklistDetailDrawerComponent {
	readonly uiMapping = inject(UiMappingService);

	// #region Inputs
	readonly visible = input<boolean>(false);
	readonly entry = input<EmailBlacklistEntry | null>(null);
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly closeDrawer = output<void>();
	readonly despejar = output<EmailBlacklistEntry>();
	readonly unblock = output<EmailBlacklistEntry>();
	// #endregion

	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onClose(): void {
		this.closeDrawer.emit();
	}

	onDespejar(): void {
		const entry = this.entry();
		if (entry?.estado) this.despejar.emit(entry);
	}

	onUnblock(): void {
		const entry = this.entry();
		if (entry?.estado) this.unblock.emit(entry);
	}
}
