import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { environment } from '@config/environment';
import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';
import { WalFacadeHelper } from '@core/services/wal';

import {
	CambiarEstadoErrorGroup,
	ESTADO_TRANSITIONS_MAP,
	ErrorGroupEstado,
	ErrorGroupLista,
} from '../models';
import { ErrorGroupsDataFacade } from './error-groups-data.facade';
import { ErrorGroupsService } from './error-groups.service';
import { ErrorGroupsStore } from './error-groups.store';

@Injectable({ providedIn: 'root' })
export class ErrorGroupsCrudFacade {
	// #region Dependencias
	private readonly api = inject(ErrorGroupsService);
	private readonly store = inject(ErrorGroupsStore);
	private readonly dataFacade = inject(ErrorGroupsDataFacade);
	private readonly walHelper = inject(WalFacadeHelper);
	private readonly errorHandler = inject(ErrorHandlerService);

	private readonly apiBase = `${environment.apiUrl}/api/sistema/error-groups`;
	// #endregion

	// #region Cambiar estado (WAL optimistic)
	/**
	 * Cambia el estado del grupo con optimistic update + rollback automático
	 * si el server rechaza. Maneja `INV-ET07_ROW_VERSION_STALE` refetcheando
	 * el grupo y dejando un toast.
	 *
	 * @param snapshot Estado del grupo ANTES del cambio (para rollback exacto).
	 * @param dto Payload del cambio (estado nuevo + observación + rowVersion).
	 */
	cambiarEstado(
		grupoId: number,
		dto: CambiarEstadoErrorGroup,
		snapshot: ErrorGroupLista,
	): void {
		const newEstado: ErrorGroupEstado = dto.estado;

		this.walHelper.execute({
			operation: 'UPDATE',
			resourceType: 'error-groups',
			resourceId: grupoId,
			endpoint: `${this.apiBase}/${grupoId}/estado`,
			method: 'PATCH',
			payload: dto,
			http$: () => this.api.cambiarEstado(grupoId, dto),
			optimistic: {
				apply: () => {
					this.store.updateGroupEstado(grupoId, newEstado);
					this.store.closeDialog();
				},
				rollback: () => {
					this.store.updateGroupEstado(grupoId, snapshot.estado, {
						rowVersion: snapshot.rowVersion,
					});
				},
			},
			onCommit: () => {
				// El BE devuelve un mensaje string, no el grupo actualizado. El
				// rowVersion fresco lo recuperamos solo si el siguiente cambio
				// falla con stale (refetch en onError). Deuda menor documentada
				// en el plan.
				this.errorHandler.showSuccess('Estado actualizado', 'El grupo se actualizó correctamente');
			},
			onError: (err) => {
				logger.error('[ErrorGroupsCrudFacade] Error al cambiar estado:', err);
				this.handleError(err, grupoId);
			},
		});
	}

	/**
	 * Drop directo desde el Kanban: cambia el estado del grupo sin abrir
	 * dialog (decisión 12 del /design — la observación queda opcional desde
	 * el drawer del grupo, no desde el drop).
	 *
	 * Re-valida la transición contra `ESTADO_TRANSITIONS_MAP` (defensa en
	 * profundidad — el drop predicate del Kanban ya filtra visualmente). Si
	 * la transición es inválida, el método hace short-circuit sin pegada al BE.
	 */
	moveCardOptimistic(group: ErrorGroupLista, toEstado: ErrorGroupEstado): void {
		if (!ESTADO_TRANSITIONS_MAP[group.estado].includes(toEstado)) return;

		const dto: CambiarEstadoErrorGroup = {
			estado: toEstado,
			observacion: null,
			rowVersion: group.rowVersion,
		};
		this.cambiarEstado(group.id, dto, group);
	}
	// #endregion

	// #region Error handling
	private handleError(err: unknown, grupoId: number): void {
		const errorCode = this.extractErrorCode(err);

		if (errorCode === 'INV-ET07_ROW_VERSION_STALE') {
			this.errorHandler.showWarning(
				'El grupo fue modificado',
				'Otro admin cambió el grupo. Recargamos los datos.',
			);
			this.dataFacade.refetchGroup(grupoId);
			return;
		}

		if (errorCode === 'ERRORGROUP_TRANSICION_INVALIDA') {
			this.errorHandler.showError(
				'Transición no permitida',
				'La transición está prohibida por la matriz de estados.',
			);
			return;
		}

		if (errorCode === 'INV-ET07_ESTADO_INVALIDO') {
			this.errorHandler.showError(
				'Estado inválido',
				'El estado enviado no está en el catálogo.',
			);
			return;
		}

		if (this.isNotFound(err)) {
			this.errorHandler.showWarning(
				'Grupo no encontrado',
				'El grupo fue eliminado entre cargas.',
			);
			this.store.removeGroup(grupoId);
			this.store.closeDrawer();
			this.store.closeDialog();
			return;
		}

		this.errorHandler.showError('Error al cambiar estado', 'Intenta de nuevo en unos segundos.');
	}

	private extractErrorCode(err: unknown): string | null {
		if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object') {
			const code = (err.error as { errorCode?: unknown }).errorCode;
			return typeof code === 'string' ? code : null;
		}
		return null;
	}

	private isNotFound(err: unknown): boolean {
		return err instanceof HttpErrorResponse && err.status === 404;
	}
	// #endregion
}
