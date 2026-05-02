import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '@config/environment';
import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';
import { WalFacadeHelper } from '@core/services/wal';
import {
	CrearEmailDomainPauseDto,
	EmailDomainPauseListaDto,
	LiberarEmailDomainPauseDto,
} from '@data/models/email-domain-pause.models';

import { EmailDomainPauseDataFacade } from './email-domain-pause-data.facade';
import { EmailDomainPauseService } from './email-domain-pause.service';
import { EmailDomainPauseStore } from './email-domain-pause.store';

@Injectable({ providedIn: 'root' })
export class EmailDomainPauseCrudFacade {
	private readonly api = inject(EmailDomainPauseService);
	private readonly store = inject(EmailDomainPauseStore);
	private readonly dataFacade = inject(EmailDomainPauseDataFacade);
	private readonly walHelper = inject(WalFacadeHelper);
	private readonly errorHandler = inject(ErrorHandlerService);

	private readonly apiBase = `${environment.apiUrl}/api/sistema/email-outbox/domain-pauses`;

	addManual(request: CrearEmailDomainPauseDto): boolean {
		if (!request.observacion || request.observacion.trim().length === 0) {
			this.errorHandler.showError(
				'Observación requerida',
				'Para pausar un dominio manualmente, escribí la razón.',
			);
			return false;
		}

		this.walHelper.execute({
			operation: 'CREATE',
			resourceType: 'email-domain-pause',
			endpoint: this.apiBase,
			method: 'POST',
			payload: request,
			http$: () => this.api.crear(request),
			optimistic: {
				apply: () => this.store.closeDialog(),
				rollback: () => {
					this.store.setFormData({
						dominio: request.dominio,
						motivo: request.motivo,
						durationHours: request.durationHours,
						observacion: request.observacion,
					});
					this.store.openDialog();
				},
			},
			onCommit: (result: EmailDomainPauseListaDto) => {
				this.store.addItem(result);
				this.store.onCreada();
				this.errorHandler.showSuccess(
					'Dominio pausado',
					`Envíos a ${result.dominio} pausados.`,
				);
			},
			onError: (err) => {
				logger.error('[EmailDomainPauseCrudFacade] Error al crear', err);
				this.errorHandler.showError(
					'No se pudo pausar',
					`Error al pausar ${request.dominio}.`,
				);
			},
		});
		return true;
	}

	release(entry: EmailDomainPauseListaDto, observacion = ''): void {
		const snapshot = entry;
		const previousIndex = this.store.items().findIndex((i) => i.id === entry.id);
		const dto: LiberarEmailDomainPauseDto = {
			rowVersion: entry.rowVersion,
			observacion,
		};

		this.walHelper.execute({
			operation: 'UPDATE',
			resourceType: 'email-domain-pause',
			resourceId: entry.id,
			endpoint: `${this.apiBase}/${entry.id}/release`,
			method: 'POST',
			payload: dto,
			http$: () => this.api.liberar(entry.id, dto),
			optimistic: {
				apply: () => {
					this.store.removeItem(entry.id);
					this.store.onLiberada();
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
					'Pausa liberada',
					`Envíos a ${entry.dominio} reanudados.`,
				);
			},
			onError: (err) => {
				logger.error('[EmailDomainPauseCrudFacade] Error al liberar', err);
				const status = err instanceof HttpErrorResponse ? err.status : null;
				if (status === 404 || status === 409) {
					this.errorHandler.showWarning(
						'Pausa no encontrada',
						`${entry.dominio} ya estaba liberado.`,
					);
					this.dataFacade.refresh();
					return;
				}
				this.errorHandler.showError(
					'No se pudo liberar',
					`Error al liberar ${entry.dominio}.`,
				);
			},
		});
	}
}
