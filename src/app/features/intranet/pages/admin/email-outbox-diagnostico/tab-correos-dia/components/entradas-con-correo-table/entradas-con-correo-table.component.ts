import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { CorrelationIdPillComponent } from '@shared/components/correlation-id-pill';

import { EntradaConCorreoEnviado } from '../../models/correos-dia.models';

@Component({
	selector: 'app-entradas-con-correo-table',
	standalone: true,
	imports: [
		TableModule,
		TagModule,
		TooltipModule,
		DatePipe,
		CorrelationIdPillComponent,
	],
	templateUrl: './entradas-con-correo-table.component.html',
	styleUrl: './entradas-con-correo-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntradasConCorreoTableComponent {
	readonly data = input.required<EntradaConCorreoEnviado[]>();

	// * Si el remitente está disponible, lo expone como tooltip del timestamp
	// * de envío para que el admin pueda identificar el buzón emisor sin
	// * abrir la fila completa.
	senderTooltip(remitente: string | null): string {
		return remitente ? `Remitente: ${remitente}` : '';
	}
}
