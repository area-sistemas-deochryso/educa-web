// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UserPermissionsService } from '@core/services';

import { TicketAdminDto, TicketEstado } from '../models/ticket-admin.models';
import { TicketBandejaFacade } from '../services/ticket-bandeja.facade';
import { EduSelect, EduSortableColumn, EduSpinner, EduTable, EduTag } from '@edu-ui';
// #endregion

const AYUDA_TICKET_MANAGE = 'AYUDA_TICKET_MANAGE';

interface EstadoOption {
	label: string;
	value: TicketEstado | null;
}

const ESTADO_FILTRO_OPTIONS: EstadoOption[] = [
	{ label: 'Todos', value: null },
	{ label: 'Pendiente', value: 'PENDIENTE' },
	{ label: 'En revisión', value: 'EN_REVISION' },
	{ label: 'Resuelto', value: 'RESUELTO' }];

const ESTADO_CAMBIO_OPTIONS: { label: string; value: TicketEstado }[] = [
	{ label: 'Pendiente', value: 'PENDIENTE' },
	{ label: 'En revisión', value: 'EN_REVISION' },
	{ label: 'Resuelto', value: 'RESUELTO' }];

const ESTADO_SEVERITY: Record<TicketEstado, 'warn' | 'info' | 'success'> = {
	PENDIENTE: 'warn',
	EN_REVISION: 'info',
	RESUELTO: 'success',
};

const ESTADO_LABEL: Record<TicketEstado, string> = {
	PENDIENTE: 'Pendiente',
	EN_REVISION: 'En revisión',
	RESUELTO: 'Resuelto',
};

/**
 * Bandeja administrativa de tickets (xrepo-panel-ayuda-intranet F7b). Protegida
 * por `AYUDA_TICKET_MANAGE` — mismo criterio de gate a nivel componente que
 * `MonitoreoHubComponent`/`AttendanceComponent.canViewAdminPanel`.
 */
@Component({
	selector: 'app-ticket-bandeja',
	standalone: true,
	imports: [EduTable, CommonModule, FormsModule, EduSpinner, EduSelect, EduSortableColumn, EduTag],
	providers: [TicketBandejaFacade],
	templateUrl: './ticket-bandeja.component.html',
	styleUrl: './ticket-bandeja.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketBandejaComponent implements OnInit {
	// #region Dependencies
	private readonly facade = inject(TicketBandejaFacade);
	private readonly userPermisos = inject(UserPermissionsService);
	// #endregion

	// #region State
	readonly tickets = this.facade.tickets;
	readonly loading = this.facade.loading;
	readonly error = this.facade.error;
	readonly filtroEstado = this.facade.filtroEstado;
	readonly updatingId = this.facade.updatingId;

	readonly estadoFiltroOptions = ESTADO_FILTRO_OPTIONS;
	readonly estadoCambioOptions = ESTADO_CAMBIO_OPTIONS;

	readonly canAccess = this.userPermisos.hasCapability(AYUDA_TICKET_MANAGE);
	// #endregion

	ngOnInit(): void {
		if (this.canAccess) this.facade.init();
	}

	// #region Handlers
	onFiltroChange(estado: TicketEstado | null): void {
		this.facade.setFiltro(estado);
	}

	onEstadoChange(ticket: TicketAdminDto, nuevoEstado: TicketEstado | null): void {
		if (!nuevoEstado || nuevoEstado === ticket.estado) return;
		this.facade.cambiarEstado(ticket, nuevoEstado);
	}
	// #endregion

	// #region Template helpers
	// El template tipa `let-ticket` implícitamente como `any` (PrimeNG `p-table`
	// no propaga el genérico) — estos wrappers evitan indexar los `Record`
	// directamente desde el HTML con un valor `any` (TS7053).
	labelFor(estado: TicketEstado): string {
		return ESTADO_LABEL[estado];
	}

	severityFor(estado: TicketEstado): 'warn' | 'info' | 'success' {
		return ESTADO_SEVERITY[estado];
	}
	// #endregion
}
