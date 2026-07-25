// #region Imports
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';

import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';
import { WalFacadeHelper } from '@core/services';
import { environment } from '@env/environment';

import { TicketAdminDto, TicketEstado } from '../models/ticket-admin.models';
import { TicketAdminService } from './ticket-admin.service';
// #endregion

/**
 * Estado + carga de la bandeja admin de tickets. Scoped al componente (no
 * `providedIn: 'root'`), mismo criterio que `AyudaTicketFacade` (F5): se
 * recarga cada vez que se entra a la vista.
 */
@Injectable()
export class TicketBandejaFacade {
	// #region Dependencies
	private readonly ticketAdminService = inject(TicketAdminService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly wal = inject(WalFacadeHelper);
	private readonly errorHandler = inject(ErrorHandlerService);
	// #endregion

	// #region State
	private readonly _tickets = signal<TicketAdminDto[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal(false);
	private readonly _filtroEstado = signal<TicketEstado | null>(null);
	private readonly _updatingId = signal<number | null>(null);

	readonly tickets = this._tickets.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly filtroEstado = this._filtroEstado.asReadonly();
	readonly updatingId = this._updatingId.asReadonly();
	// #endregion

	// #region Commands
	init(): void {
		this.loadTickets();
	}

	setFiltro(estado: TicketEstado | null): void {
		this._filtroEstado.set(estado);
		this.loadTickets();
	}

	/**
	 * Cambia el estado de un ticket. `server-confirmed`: no hay valor local
	 * confiable a mostrar optimistamente antes de que el BE confirme (mismo
	 * criterio que `AyudaTicketFacade.crear`). Un 409 (RowVersion desactualizado
	 * — otro admin cambió el estado en simultáneo) se comunica como advertencia
	 * clara y refresca la bandeja, en vez de propagar el error crudo.
	 */
	cambiarEstado(ticket: TicketAdminDto, nuevoEstado: TicketEstado): void {
		this._updatingId.set(ticket.id);

		this.wal.execute<TicketAdminDto>({
			operation: 'UPDATE',
			resourceType: 'ticket-admin',
			resourceId: ticket.id,
			endpoint: `${environment.apiUrl}/api/admin/tickets/${ticket.id}/estado`,
			method: 'PATCH',
			payload: { estado: nuevoEstado, rowVersion: ticket.rowVersion },
			consistencyLevel: 'server-confirmed',
			http$: () =>
				this.ticketAdminService.actualizarEstado(ticket.id, {
					estado: nuevoEstado,
					rowVersion: ticket.rowVersion,
				}),
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
			onCommit: (result) => {
				this._updatingId.set(null);
				this._tickets.update((tickets) => tickets.map((t) => (t.id === result.id ? result : t)));
				this.errorHandler.showSuccess('Estado actualizado', `Ticket #${ticket.id} actualizado.`);
			},
			onError: (err) => {
				this._updatingId.set(null);
				const status = err instanceof HttpErrorResponse ? err.status : null;
				logger.warn('[TicketBandejaFacade] Error cambiando estado', status);

				if (status === 409) {
					this.errorHandler.showWarning(
						'Ticket modificado por otro administrador',
						`El ticket #${ticket.id} cambió mientras lo editabas. Se refrescó la bandeja con el valor actual.`,
					);
					this.loadTickets();
					return;
				}

				this.errorHandler.showError(
					'No se pudo cambiar el estado',
					`Error al actualizar el ticket #${ticket.id}.`,
				);
			},
		});
	}
	// #endregion

	// #region Private helpers
	private loadTickets(): void {
		this._loading.set(true);
		this._error.set(false);

		this.ticketAdminService
			.getBandeja(this._filtroEstado() ?? undefined)
			.pipe(
				catchError((err) => {
					logger.warn('[TicketBandejaFacade] Error cargando bandeja', err?.status);
					this._error.set(true);
					return of([] as TicketAdminDto[]);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((tickets) => {
				this._tickets.set(tickets);
				this._loading.set(false);
			});
	}
	// #endregion
}
