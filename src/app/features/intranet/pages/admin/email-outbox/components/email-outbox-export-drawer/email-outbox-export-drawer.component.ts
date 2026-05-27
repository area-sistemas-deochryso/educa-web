import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { EmailOutboxExportDto } from '../../models/email-outbox-export.models';

@Component({
	selector: 'app-email-outbox-export-drawer',
	standalone: true,
	imports: [DrawerModule, ButtonModule, TagModule, TooltipModule, DatePipe],
	templateUrl: './email-outbox-export-drawer.component.html',
	styleUrl: './email-outbox-export-drawer.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxExportDrawerComponent {
	readonly visible = input(false);
	readonly data = input<EmailOutboxExportDto | null>(null);
	readonly loading = input(false);
	readonly visibleChange = output<boolean>();

	onVisibleChange(value: boolean): void {
		this.visibleChange.emit(value);
	}

	downloadJson(): void {
		const exportData = this.data();
		if (!exportData) return;

		const json = JSON.stringify(exportData, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `email-caso-${exportData.outbox.id}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
}
