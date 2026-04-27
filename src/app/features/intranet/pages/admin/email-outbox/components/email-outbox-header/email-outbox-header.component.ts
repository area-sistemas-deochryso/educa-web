import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { PageHeaderComponent } from '@intranet-shared/components/page-header/page-header.component';

@Component({
	selector: 'app-email-outbox-header',
	standalone: true,
	imports: [PageHeaderComponent, ButtonModule],
	template: `
		<app-page-header
			icon="pi pi-envelope"
			title="Bandeja de Correos"
			subtitle="Auditoría y trazabilidad de correos enviados"
		>
			<button
				pButton
				icon="pi pi-refresh"
				label="Refrescar"
				class="p-button-outlined p-button-sm"
				(click)="refresh.emit()"
			></button>
			<button
				pButton
				icon="pi pi-file-excel"
				label="Exportar"
				class="p-button-success p-button-sm"
				(click)="exportExcel.emit()"
			></button>
		</app-page-header>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxHeaderComponent {
	readonly refresh = output<void>();
	readonly exportExcel = output<void>();
}
