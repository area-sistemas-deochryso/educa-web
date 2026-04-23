import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export interface AuditoriaCorreosStatsVm {
	total: number;
	estudiantes: number;
	apoderados: number;
	profesores: number;
}

@Component({
	selector: 'app-auditoria-correos-stats',
	standalone: true,
	imports: [DecimalPipe],
	templateUrl: './auditoria-correos-stats.component.html',
	styleUrl: './auditoria-correos-stats.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaCorreosStatsComponent {
	readonly stats = input.required<AuditoriaCorreosStatsVm>();
}
