import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ErrorHandlerService } from '@core/services/error';
import { logger, resolveErrorMessage } from '@core/helpers';
import { EmailOutboxLista } from '@data/models';

import { EmailOutboxApiService } from './email-outbox.service';
import { EmailOutboxStore } from './email-outbox.store';

@Injectable({ providedIn: 'root' })
export class EmailOutboxUiFacade {
	// #region Dependencias
	private api = inject(EmailOutboxApiService);
	private store = inject(EmailOutboxStore);
	private errorHandler = inject(ErrorHandlerService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Drawer detalle
	openDetail(item: EmailOutboxLista): void {
		this.store.openDrawer(item);
		this.loadPreview(item.id);
		this.loadManualAttempts(item.id);
	}

	closeDrawer(): void {
		this.store.closeDrawer();
	}

	private loadPreview(id: number): void {
		this.store.setPreviewLoading(true);
		this.api
			.obtenerHtml(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (html) => {
					this.store.setPreviewHtml(html);
					this.store.setPreviewLoading(false);
				},
				error: () => this.store.setPreviewLoading(false),
			});
	}
	// #endregion

	private loadManualAttempts(id: number): void {
		this.store.setManualAttemptsLoading(true);
		this.api
			.getManualAttempts(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (attempts) => {
					this.store.setManualAttempts(attempts);
					this.store.setManualAttemptsLoading(false);
				},
				error: () => this.store.setManualAttemptsLoading(false),
			});
	}
	// #endregion

	// #region Manual retry
	openManualRetryDialog(): void {
		this.store.openManualRetryDialog();
	}

	closeManualRetryDialog(): void {
		this.store.closeManualRetryDialog();
	}

	confirmManualRetry(senderAddress?: string): void {
		const item = this.store.selectedItem();
		if (!item) return;

		this.store.setManualRetryLoading(true);
		this.api
			.manualRetry(item.id, senderAddress)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.store.setManualRetryLoading(false);
					this.store.setManualRetryResult(result);
					if (result.resultado === 'SENT') {
						this.store.markAsRetrying(item.id);
						this.errorHandler.showSuccess(
							'Reintento exitoso',
							`El correo a ${item.destinatario} fue enviado.`,
						);
					}
					this.loadManualAttempts(item.id);
				},
				error: (err) => {
					this.store.setManualRetryLoading(false);
					this.handleManualRetryError(err, item);
				},
			});
	}

	private handleManualRetryError(err: unknown, item: EmailOutboxLista): void {
		if (err instanceof HttpErrorResponse && err.status === 409) {
			const body = err.error as { message?: string; errorCode?: string } | null;
			const reason = body?.errorCode === 'DESTINATARIO_BLACKLISTED'
				? 'El destinatario está en blacklist.'
				: body?.errorCode === 'DESTINATARIO_QUARANTINED'
					? 'El destinatario está en cuarentena activa.'
					: (body?.message ?? 'No se puede reintentar este correo.');
			this.errorHandler.showWarning('Reintento bloqueado', reason);
			return;
		}
		logger.error('[EmailOutboxUiFacade] Error en manual retry', err);
		this.errorHandler.showError(
			'Error al reintentar',
			`No se pudo reintentar el correo a ${item.destinatario}.`,
		);
	}
	// #endregion

	// #region Reintento (queue)
	reintentar(item: EmailOutboxLista): void {
		this.api
			.reintentar(item.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.markAsRetrying(item.id);
					this.errorHandler.showSuccess(
						'Correo reencolado',
						`El correo a ${item.destinatario} se reintentará.`,
					);
				},
				error: (err) => this.handleRetryError(err, item),
			});
	}

	private handleRetryError(err: unknown, item: EmailOutboxLista): void {
		if (err instanceof HttpErrorResponse && err.status === 409) {
			const body = err.error as { message?: string; errorCode?: string } | null;
			const reason = body?.errorCode === 'DESTINATARIO_BLACKLISTED'
				? 'El destinatario está en blacklist.'
				: body?.errorCode === 'DESTINATARIO_QUARANTINED'
					? 'El destinatario está en cuarentena activa.'
					: (body?.message ?? 'No se puede reintentar este correo.');
			this.errorHandler.showWarning('Reintento bloqueado', reason);
			return;
		}
		if (err instanceof HttpErrorResponse && err.status === 404) {
			this.errorHandler.showWarning('Correo no encontrado', 'El registro ya no existe.');
			return;
		}
		logger.error('[EmailOutboxUiFacade] Error en reintentar', err);
		this.errorHandler.showError(
			'Error al reintentar',
			`No se pudo reencolar el correo a ${item.destinatario}.`,
		);
	}
	// #endregion

	// #region Export caso
	openExportDrawer(item: EmailOutboxLista): void {
		this.store.setExportLoading(true);
		this.store.setExportDrawerVisible(true);
		this.store.setExportData(null);

		this.api
			.exportarCaso(item.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setExportData(data);
					this.store.setExportLoading(false);
				},
				error: (err) => {
					logger.error('[EmailOutboxUiFacade] Error en exportarCaso', err);
					this.store.setExportLoading(false);
					this.errorHandler.showError(
						'Error al exportar',
						resolveErrorMessage(err, 'No se pudo obtener los datos del caso.'),
					);
					this.store.setExportDrawerVisible(false);
				},
			});
	}

	closeExportDrawer(): void {
		this.store.setExportDrawerVisible(false);
		this.store.setExportData(null);
	}
	// #endregion
}
