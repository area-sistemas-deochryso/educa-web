import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
	AuditoriaCorreoAsistenciaDto,
	TIPO_FALLO_LABEL,
	TIPO_FALLO_SEVERITY,
	TipoFalloAuditoria,
} from '../../models';

@Component({
	selector: 'app-auditoria-correos-table',
	standalone: true,
	imports: [CommonModule, ButtonModule, TableModule, TagModule, TooltipModule],
	templateUrl: './auditoria-correos-table.component.html',
	styleUrl: './auditoria-correos-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaCorreosTableComponent {
	readonly items = input.required<AuditoriaCorreoAsistenciaDto[]>();
	readonly universeTotal = input<number>(0);
	readonly hasActiveFilters = input<boolean>(false);

	readonly navegarUsuario = output<AuditoriaCorreoAsistenciaDto>();

	readonly tipoFalloLabel = TIPO_FALLO_LABEL;
	readonly tipoFalloSeverity = TIPO_FALLO_SEVERITY;

	getTipoFalloLabel(tipo: string): string {
		return this.tipoFalloLabel[tipo as TipoFalloAuditoria] ?? tipo;
	}

	getTipoFalloSeverity(tipo: string): 'danger' | 'warn' {
		return this.tipoFalloSeverity[tipo as TipoFalloAuditoria] ?? 'warn';
	}

	onNavegar(item: AuditoriaCorreoAsistenciaDto): void {
		this.navegarUsuario.emit(item);
	}
}
