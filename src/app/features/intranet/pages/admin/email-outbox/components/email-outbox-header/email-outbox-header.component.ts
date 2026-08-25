import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { EduButton } from '@edu-ui';

import { PageHeaderComponent } from '@intranet-shared/components/page-header/page-header.component';

@Component({
	selector: 'app-email-outbox-header',
	standalone: true,
	imports: [PageHeaderComponent, EduButton],
	template: `
		<app-page-header
			icon="pi pi-envelope"
			title="Bandeja de Correos"
			subtitle="Auditoría y trazabilidad de correos enviados"
		>
			<edu-button
				icon="pi pi-refresh"
				label="Refrescar"
				[outlined]="true"
				size="small"
				data-info-anchor="email-outbox-refresh-btn"
				(click)="refresh.emit()"
			/>
			<edu-button
				icon="pi pi-file-excel"
				label="Exportar"
				severity="success"
				size="small"
				data-info-anchor="admin-email-outbox-exportar-excel-btn"
				(click)="exportExcel.emit()"
			/>
		</app-page-header>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxHeaderComponent {
	readonly refresh = output<void>();
	readonly exportExcel = output<void>();
}
