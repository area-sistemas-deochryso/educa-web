import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

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
				class="p-button-outlined"
				(click)="refresh.emit()"
			></button>
		</app-page-header>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxHeaderComponent {
	readonly refresh = output<void>();
}
