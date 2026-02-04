import { ErrorHandler, Injectable, inject, NgZone } from '@angular/core';
import { ErrorHandlerService } from './error-handler.service';
import { logger } from '@core/helpers';
import { UI_GENERIC_MESSAGES } from '@app/shared/constants';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
	private errorService = inject(ErrorHandlerService);
	private zone = inject(NgZone);

	handleError(error: unknown): void {
		// Ejecutar en zona Angular para actualizar UI
		this.zone.run(() => {
			if (error instanceof Error) {
				// Ignorar errores de navegacion cancelada
				if (error.message?.includes('Navigation cancelled')) {
					logger.warn('[GlobalErrorHandler] Navigation cancelled:', error.message);
					return;
				}

				// Ignorar errores de chunk loading (lazy loading)
				if (error.message?.includes('Loading chunk')) {
					logger.warn('[GlobalErrorHandler] Chunk loading error, reloading...');
					window.location.reload();
					return;
				}

				this.errorService.handleClientError(error);
			} else {
				logger.error('[GlobalErrorHandler] Unknown error type:', error);
				this.errorService.handleClientError(
					new Error(`${UI_GENERIC_MESSAGES.unknownError}: ${String(error)}`),
				);
			}
		});
	}
}
