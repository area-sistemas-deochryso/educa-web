// #region Imports
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { logger } from '@core/helpers';
import { WalFacadeHelper } from '@core/services';
import { environment } from '@env/environment';

import { CrearTicketDto, TicketDto, TicketTipoDto } from '@features/intranet/pages/cross-role/ayuda/models/ticket.models';
import { TicketService } from '@features/intranet/pages/cross-role/ayuda/services/ticket.service';
// #endregion

/**
 * Estado + carga de la sección Ticket. Scoped al componente (no `providedIn:
 * 'root'`), mismo patrón que `AyudaQaFacade`: catálogo de tipos + historial
 * propio se recargan cada vez que se entra a la sección.
 */
@Injectable()
export class AyudaTicketFacade {
	// #region Dependencies
	private readonly ticketService = inject(TicketService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly wal = inject(WalFacadeHelper);
	private readonly apiUrl = `${environment.apiUrl}/api/tickets`;
	// #endregion

	// #region State
	private readonly _tipos = signal<TicketTipoDto[]>([]);
	private readonly _tickets = signal<TicketDto[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal(false);
	private readonly _submitting = signal(false);
	private readonly _submitError = signal(false);

	readonly tipos = this._tipos.asReadonly();
	readonly tickets = this._tickets.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly submitting = this._submitting.asReadonly();
	readonly submitError = this._submitError.asReadonly();
	// #endregion

	// #region Commands
	init(): void {
		this.loadTipos();
		this.loadTickets();
	}

	/**
	 * Crea un ticket y, si sale bien, refresca el historial. Devuelve `true` en
	 * éxito. `server-confirmed` porque no hay estado local que renderizar
	 * optimistamente antes de que el BE asigne id/estado — mismo criterio que
	 * `aprobarEstudiante` en `ProfesorFinalSalonesFacade`.
	 */
	crear(dto: CrearTicketDto): Promise<boolean> {
		this._submitting.set(true);
		this._submitError.set(false);

		return new Promise((resolve) => {
			this.wal.execute<TicketDto>({
				operation: 'CREATE',
				resourceType: 'ticket',
				endpoint: this.apiUrl,
				method: 'POST',
				payload: dto,
				consistencyLevel: 'server-confirmed',
				http$: () => this.ticketService.crear(dto),
				optimistic: {
					apply: () => {},
					rollback: () => {},
				},
				onCommit: () => {
					this._submitting.set(false);
					this.loadTickets();
					resolve(true);
				},
				onError: (err) => {
					logger.warn('[AyudaTicketFacade] Error creando ticket', (err as { status?: number })?.status);
					this._submitting.set(false);
					this._submitError.set(true);
					resolve(false);
				},
			});
		});
	}
	// #endregion

	// #region Private helpers
	private loadTipos(): void {
		this.ticketService
			.getTipos()
			.pipe(
				catchError((err) => {
					logger.warn('[AyudaTicketFacade] Error cargando tipos', err?.status);
					return of([] as TicketTipoDto[]);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((tipos) => this._tipos.set(tipos));
	}

	private loadTickets(): void {
		this._loading.set(true);
		this._error.set(false);

		this.ticketService
			.getMios()
			.pipe(
				catchError((err) => {
					logger.warn('[AyudaTicketFacade] Error cargando historial', err?.status);
					this._error.set(true);
					return of([] as TicketDto[]);
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
