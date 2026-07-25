// #region Imports
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';

import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';
import { WalFacadeHelper } from '@core/services';
import { environment } from '@env/environment';

import { TicketTipoAdminDto } from '../models/ticket-admin.models';
import { TicketAdminService } from './ticket-admin.service';
// #endregion

/**
 * Estado + CRUD del catálogo de tipos de problema (`TicketTipo`, F7a en
 * `Educa.API`). Sin hard-delete — `toggleEstado` activa/desactiva, nunca
 * elimina (ver DECISIONES YA TOMADAS del brief 484).
 */
@Injectable()
export class TicketTipoCatalogoFacade {
	// #region Dependencies
	private readonly ticketAdminService = inject(TicketAdminService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly wal = inject(WalFacadeHelper);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly tiposUrl = `${environment.apiUrl}/api/admin/ticket-tipos`;
	// #endregion

	// #region State
	private readonly _tipos = signal<TicketTipoAdminDto[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal(false);
	private readonly _submitting = signal(false);

	readonly tipos = this._tipos.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly submitting = this._submitting.asReadonly();
	// #endregion

	// #region Commands
	init(): void {
		this.loadTipos();
	}

	crear(nombre: string): void {
		this._submitting.set(true);

		this.wal.execute<TicketTipoAdminDto>({
			operation: 'CREATE',
			resourceType: 'ticket-tipo',
			endpoint: this.tiposUrl,
			method: 'POST',
			payload: { nombre },
			consistencyLevel: 'server-confirmed',
			http$: () => this.ticketAdminService.crearTipo({ nombre }),
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
			onCommit: (result) => {
				this._submitting.set(false);
				this._tipos.update((tipos) => [...tipos, result]);
				this.errorHandler.showSuccess('Tipo creado', `"${result.nombre}" agregado al catálogo.`);
			},
			onError: (err) => {
				this._submitting.set(false);
				logger.warn('[TicketTipoCatalogoFacade] Error creando tipo', (err as { status?: number })?.status);
				this.errorHandler.showError('No se pudo crear', `Error al crear el tipo "${nombre}".`);
			},
		});
	}

	editar(tipo: TicketTipoAdminDto, nombre: string): void {
		this._submitting.set(true);

		this.wal.execute<TicketTipoAdminDto>({
			operation: 'UPDATE',
			resourceType: 'ticket-tipo',
			resourceId: tipo.id,
			endpoint: `${this.tiposUrl}/${tipo.id}`,
			method: 'PUT',
			payload: { nombre, rowVersion: tipo.rowVersion },
			consistencyLevel: 'server-confirmed',
			http$: () => this.ticketAdminService.actualizarTipo(tipo.id, { nombre, rowVersion: tipo.rowVersion }),
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
			onCommit: (result) => {
				this._submitting.set(false);
				this._tipos.update((tipos) => tipos.map((t) => (t.id === result.id ? result : t)));
				this.errorHandler.showSuccess('Tipo actualizado', `"${result.nombre}" guardado.`);
			},
			onError: (err) => this.handleMutationError(err, tipo, `editar "${nombre}"`),
		});
	}

	/** Activa/desactiva un tipo — nunca lo elimina (F7a no expone hard-delete). */
	toggleEstado(tipo: TicketTipoAdminDto): void {
		const nuevoEstado = !tipo.estado;
		this._submitting.set(true);

		this.wal.execute<TicketTipoAdminDto>({
			operation: 'UPDATE',
			resourceType: 'ticket-tipo',
			resourceId: tipo.id,
			endpoint: `${this.tiposUrl}/${tipo.id}/estado`,
			method: 'PATCH',
			payload: { estado: nuevoEstado, rowVersion: tipo.rowVersion },
			consistencyLevel: 'server-confirmed',
			http$: () =>
				this.ticketAdminService.cambiarEstadoTipo(tipo.id, {
					estado: nuevoEstado,
					rowVersion: tipo.rowVersion,
				}),
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
			onCommit: (result) => {
				this._submitting.set(false);
				this._tipos.update((tipos) => tipos.map((t) => (t.id === result.id ? result : t)));
				this.errorHandler.showSuccess(
					result.estado ? 'Tipo activado' : 'Tipo desactivado',
					`"${result.nombre}" ${result.estado ? 'vuelve a estar disponible' : 'ya no aparece en el formulario de creación de ticket'}.`,
				);
			},
			onError: (err) => this.handleMutationError(err, tipo, `cambiar el estado de "${tipo.nombre}"`),
		});
	}
	// #endregion

	// #region Private helpers
	private loadTipos(): void {
		this._loading.set(true);
		this._error.set(false);

		this.ticketAdminService
			.getTipos()
			.pipe(
				catchError((err) => {
					logger.warn('[TicketTipoCatalogoFacade] Error cargando catálogo', err?.status);
					this._error.set(true);
					return of([] as TicketTipoAdminDto[]);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((tipos) => {
				this._tipos.set(tipos);
				this._loading.set(false);
			});
	}

	private handleMutationError(err: unknown, tipo: TicketTipoAdminDto, actionLabel: string): void {
		this._submitting.set(false);
		const status = err instanceof HttpErrorResponse ? err.status : null;
		logger.warn('[TicketTipoCatalogoFacade] Error en mutación', status);

		if (status === 409) {
			this.errorHandler.showWarning(
				'Tipo modificado por otro administrador',
				`"${tipo.nombre}" cambió mientras lo editabas. Se refrescó el catálogo con el valor actual.`,
			);
			this.loadTipos();
			return;
		}

		this.errorHandler.showError('No se pudo guardar', `Error al ${actionLabel}.`);
	}
	// #endregion
}
