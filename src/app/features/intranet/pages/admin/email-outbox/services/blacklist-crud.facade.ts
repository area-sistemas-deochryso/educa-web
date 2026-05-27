import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '@config/environment';
import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';
import { WalFacadeHelper } from '@core/services/wal';
import {
	CrearBlacklistRequest,
	EmailBlacklistEntry,
} from '@data/models';

import { BlacklistDataFacade } from './blacklist-data.facade';
import { BlacklistService } from './blacklist.service';
import { BlacklistStore } from './blacklist.store';

/**
 * Plan 38 Chat 5 — operaciones CRUD del tab Blacklist con WAL optimista
 * (rules/optimistic-ui.md).
 *
 *   - **Crear**: refetch tras commit (necesitamos `id` real del servidor).
 *     `apply` solo cierra dialog + ajusta stats.
 *   - **Despejar**: mutación quirúrgica `apply` quita la entrada del listado +
 *     ajusta stats; `rollback` la restaura exactamente en su posición original.
 */
@Injectable({ providedIn: 'root' })
export class BlacklistCrudFacade {
	// #region Dependencias
	private readonly api = inject(BlacklistService);
	private readonly store = inject(BlacklistStore);
	private readonly dataFacade = inject(BlacklistDataFacade);
	private readonly walHelper = inject(WalFacadeHelper);
	private readonly errorHandler = inject(ErrorHandlerService);

	private readonly apiBase = `${environment.apiUrl}/api/sistema/email-blacklist`;
	// #endregion

	// #region CREATE (alta manual)
	crear(request: CrearBlacklistRequest): void {
		this.walHelper.execute({
			operation: 'CREATE',
			resourceType: 'email-blacklist',
			endpoint: this.apiBase,
			method: 'POST',
			payload: request,
			http$: () => this.api.crear(request),
			optimistic: {
				apply: () => {
					this.store.closeDialog();
				},
				rollback: () => {
					// CREATE rollback: el dialog ya se cerró. Re-abrirlo con
					// los datos del request para que el admin reintente sin
					// retipear.
					this.store.setFormData({
						correo: request.correo,
						motivo: request.motivo,
						observacion: request.observacion ?? '',
					});
					this.store.openDialog();
				},
			},
			onCommit: (result: EmailBlacklistEntry) => {
				this.store.addItem(result);
				this.store.onCreado();
				this.errorHandler.showSuccess(
					'Bloqueo registrado',
					`${result.correo} agregado a la blacklist.`,
				);
			},
			onError: (err) => {
				logger.error('[BlacklistCrudFacade] Error al crear', err);
				this.handleCreateError(err, request);
			},
		});
	}
	// #endregion

	// #region UNBLOCK (desbloqueo con motivo)
	unblock(entry: EmailBlacklistEntry, motivo: string): void {
		const snapshot = entry;
		const previousIndex = this.store.items().findIndex((i) => i.id === entry.id);

		this.walHelper.execute({
			operation: 'UPDATE',
			resourceType: 'email-blacklist',
			resourceId: entry.id,
			endpoint: `${this.apiBase}/${entry.id}/unblock`,
			method: 'POST',
			payload: { motivo },
			http$: () => this.api.unblock(entry.id, motivo),
			optimistic: {
				apply: () => {
					this.store.removeItem(entry.id);
					this.store.onDespejado();
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
					this.store.incrementarEstadistica('inactivas', -1);
				},
			},
			onCommit: () => {
				this.errorHandler.showSuccess(
					'Bloqueo desbloqueado',
					`${entry.correo} ya no está bloqueado.`,
				);
			},
			onError: (err) => {
				logger.error('[BlacklistCrudFacade] Error al desbloquear', err);
				this.handleUnblockError(err, entry);
			},
		});
	}

	private handleUnblockError(err: unknown, entry: EmailBlacklistEntry): void {
		if (this.extractStatus(err) === 404) {
			this.errorHandler.showWarning(
				'Bloqueo no encontrado',
				`${entry.correo} ya no estaba bloqueado.`,
			);
			this.dataFacade.refresh();
			return;
		}
		this.errorHandler.showError(
			'No se pudo desbloquear',
			`Error al desbloquear ${entry.correo}. Intenta de nuevo.`,
		);
	}
	// #endregion

	// #region DELETE (despeje)
	despejar(entry: EmailBlacklistEntry): void {
		const snapshot = entry;
		const previousIndex = this.store.items().findIndex((i) => i.id === entry.id);

		this.walHelper.execute({
			operation: 'DELETE',
			resourceType: 'email-blacklist',
			resourceId: entry.id,
			endpoint: `${this.apiBase}/${encodeURIComponent(entry.correo)}`,
			method: 'DELETE',
			payload: { correo: entry.correo },
			http$: () => this.api.despejar(entry.correo),
			optimistic: {
				apply: () => {
					this.store.removeItem(entry.id);
					this.store.onDespejado();
					this.store.closeDrawer();
				},
				rollback: () => {
					// Restaurar en posición original (simple: prepend si era el
					// único o no estaba; otherwise insert at previousIndex).
					const items = this.store.items();
					const restored = [...items];
					if (previousIndex >= 0 && previousIndex <= restored.length) {
						restored.splice(previousIndex, 0, snapshot);
					} else {
						restored.unshift(snapshot);
					}
					this.store.setItems(restored);
					this.store.incrementarEstadistica('activas', 1);
					this.store.incrementarEstadistica('inactivas', -1);
				},
			},
			onCommit: () => {
				this.errorHandler.showSuccess(
					'Bloqueo despejado',
					`${entry.correo} ya no está bloqueado.`,
				);
			},
			onError: (err) => {
				logger.error('[BlacklistCrudFacade] Error al despejar', err);
				this.handleDeleteError(err, entry);
			},
		});
	}
	// #endregion

	// #region Error handling
	private handleCreateError(err: unknown, request: CrearBlacklistRequest): void {
		const status = this.extractStatus(err);
		if (status === 422 || status === 400) {
			const code = this.extractErrorCode(err);
			if (code === 'BLACKLIST_MOTIVO_NO_PERMITIDO') {
				this.errorHandler.showError(
					'Motivo no permitido',
					'Solo se permiten MANUAL o BULK_IMPORT desde la UI.',
				);
				return;
			}
			if (code === 'CORREO_INVALIDO') {
				this.errorHandler.showError('Correo inválido', 'El formato del correo no es válido.');
				return;
			}
		}
		this.errorHandler.showError(
			'No se pudo agregar',
			`Error al bloquear ${request.correo}. Intenta de nuevo.`,
		);
	}

	private handleDeleteError(err: unknown, entry: EmailBlacklistEntry): void {
		if (this.extractStatus(err) === 404) {
			this.errorHandler.showWarning(
				'Bloqueo no encontrado',
				`${entry.correo} ya no estaba bloqueado.`,
			);
			// Refresh para sincronizar con el server
			this.dataFacade.refresh();
			return;
		}
		this.errorHandler.showError(
			'No se pudo despejar',
			`Error al despejar ${entry.correo}. Intenta de nuevo.`,
		);
	}

	private extractStatus(err: unknown): number | null {
		return err instanceof HttpErrorResponse ? err.status : null;
	}

	private extractErrorCode(err: unknown): string | null {
		if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object') {
			const code = (err.error as { errorCode?: unknown }).errorCode;
			return typeof code === 'string' ? code : null;
		}
		return null;
	}
	// #endregion
}
