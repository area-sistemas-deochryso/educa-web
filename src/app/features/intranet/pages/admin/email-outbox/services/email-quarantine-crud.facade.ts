import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '@config/environment';
import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';
import { WalFacadeHelper } from '@core/services/wal';
import {
	CrearEmailQuarantineDto,
	EmailQuarantineListaDto,
	LiberarEmailQuarantineDto,
} from '@data/models/email-quarantine.models';

import { EmailQuarantineDataFacade } from './email-quarantine-data.facade';
import { EmailQuarantineService } from './email-quarantine.service';
import { EmailQuarantineStore } from './email-quarantine.store';

/**
 * Plan 37 Chat 3 — operaciones CRUD del tab Cuarentena con WAL optimista.
 *
 *   - **Crear manual**: rechaza si observación vacía. Apply cierra dialog;
 *     onCommit agrega item (necesitamos id real del server).
 *   - **Liberar**: apply quita la entrada activa (si filtro=activa) o la
 *     marca como liberada en el listado; rollback restaura el snapshot.
 */
@Injectable({ providedIn: 'root' })
export class EmailQuarantineCrudFacade {
	private readonly api = inject(EmailQuarantineService);
	private readonly store = inject(EmailQuarantineStore);
	private readonly dataFacade = inject(EmailQuarantineDataFacade);
	private readonly walHelper = inject(WalFacadeHelper);
	private readonly errorHandler = inject(ErrorHandlerService);

	private readonly apiBase = `${environment.apiUrl}/api/sistema/email-outbox/quarantine`;

	// #region CREATE
	addManual(request: CrearEmailQuarantineDto): boolean {
		if (!request.observacion || request.observacion.trim().length === 0) {
			this.errorHandler.showError(
				'Observación requerida',
				'Para crear una cuarentena manual debes escribir una observación.',
			);
			return false;
		}

		this.walHelper.execute({
			operation: 'CREATE',
			resourceType: 'email-quarantine',
			endpoint: this.apiBase,
			method: 'POST',
			payload: request,
			http$: () => this.api.crear(request),
			optimistic: {
				apply: () => {
					this.store.closeDialog();
				},
				rollback: () => {
					this.store.setFormData({
						destinatario: request.destinatario,
						motivo: request.motivo,
						durationHours: request.durationHours,
						observacion: request.observacion,
					});
					this.store.openDialog();
				},
			},
			onCommit: (result: EmailQuarantineListaDto) => {
				this.store.addItem(result);
				this.store.onCreada();
				this.errorHandler.showSuccess(
					'Cuarentena creada',
					`${result.destinatario} en cuarentena hasta ${new Date(result.retryAfter).toLocaleString()}.`,
				);
			},
			onError: (err) => {
				logger.error('[EmailQuarantineCrudFacade] Error al crear', err);
				this.errorHandler.showError(
					'No se pudo crear',
					`Error al poner en cuarentena ${request.destinatario}.`,
				);
			},
		});
		return true;
	}
	// #endregion

	// #region RELEASE
	release(entry: EmailQuarantineListaDto, motivoLiberacion = 'OTRO', observacion = ''): void {
		const snapshot = entry;
		const previousIndex = this.store.items().findIndex((i) => i.id === entry.id);
		const dto: LiberarEmailQuarantineDto = {
			rowVersion: entry.rowVersion,
			motivoLiberacion: motivoLiberacion as LiberarEmailQuarantineDto['motivoLiberacion'],
			observacion,
		};

		this.walHelper.execute({
			operation: 'UPDATE',
			resourceType: 'email-quarantine',
			resourceId: entry.id,
			endpoint: `${this.apiBase}/${entry.id}/release`,
			method: 'POST',
			payload: dto,
			http$: () => this.api.liberar(entry.id, dto),
			optimistic: {
				apply: () => {
					this.store.removeItem(entry.id);
					this.store.onLiberada();
					this.store.closeDrawer();
				},
				rollback: () => {
					const items = this.store.items();
					const restored = [...items];
					if (previousIndex >= 0 && previousIndex <= restored.length) {
						restored.splice(previousIndex, 0, snapshot);
					} else {
						restored.unshift(snapshot);
					}
					this.store.setItems(restored);
					this.store.incrementarEstadistica('activas', 1);
					this.store.incrementarEstadistica('liberadas', -1);
				},
			},
			onCommit: () => {
				this.errorHandler.showSuccess(
					'Cuarentena liberada',
					`${entry.destinatario} ya no está en cuarentena.`,
				);
			},
			onError: (err) => {
				logger.error('[EmailQuarantineCrudFacade] Error al liberar', err);
				this.handleReleaseError(err, entry);
			},
		});
	}
	// #endregion

	// #region Error handling
	private handleReleaseError(err: unknown, entry: EmailQuarantineListaDto): void {
		const status = err instanceof HttpErrorResponse ? err.status : null;
		if (status === 404 || status === 409) {
			this.errorHandler.showWarning(
				'Cuarentena no encontrada',
				`${entry.destinatario} ya estaba liberada.`,
			);
			this.dataFacade.refresh();
			return;
		}
		this.errorHandler.showError(
			'No se pudo liberar',
			`Error al liberar ${entry.destinatario}.`,
		);
	}
	// #endregion
}
