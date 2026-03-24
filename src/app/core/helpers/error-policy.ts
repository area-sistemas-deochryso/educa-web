import { HttpErrorResponse } from '@angular/common/http';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { UI_ERROR_CODES, UI_SUMMARIES } from '@app/shared/constants';
import { logger } from './logs/logger';
import { extractErrorMessage } from './error.utils';

// #region Types

/**
 * Política de resolución de errores.
 * El flujo es siempre el mismo (log → toast → cleanup).
 * La política decide QUÉ mostrar y con qué severidad.
 */
export interface ErrorPolicy {
	/** Resuelve el mensaje que ve el usuario a partir del error y un fallback. */
	resolveMessage(err: unknown, fallback: string): string;

	/** Determina la severidad del toast según el tipo de error. */
	resolveSeverity(err: unknown): 'error' | 'warn';

	/** Determina el summary/título del toast. */
	resolveSummary(err: unknown): string;
}

export interface FacadeErrorHandlerConfig {
	/** Tag para logs (ej: 'CursosFacade'). */
	tag: string;
	/** ErrorHandlerService inyectado en el facade. */
	errorHandler: ErrorHandlerService;
	/** Política custom. Si no se provee, usa la default. */
	policy?: ErrorPolicy;
}

export interface FacadeErrorHandler {
	/**
	 * Maneja un error de facade: log → toast → cleanup.
	 *
	 * @param err - El error original (HttpErrorResponse, Error, unknown)
	 * @param accion - Descripción de la acción que falló (ej: 'cargar cursos')
	 * @param cleanup - Side effect post-error (ej: resetear loading). Opcional.
	 */
	handle(err: unknown, accion: string, cleanup?: () => void): void;
}

// #endregion

// #region Default policy

/**
 * Política default: intenta extraer errorCode del backend,
 * luego mensaje directo, luego fallback.
 * Severity basada en HTTP status.
 */
export const DEFAULT_ERROR_POLICY: ErrorPolicy = {
	resolveMessage(err: unknown, fallback: string): string {
		if (err instanceof HttpErrorResponse) {
			// 1. Resolver por errorCode estable del backend
			const errorCode = err.error?.errorCode as string | undefined;
			if (errorCode && UI_ERROR_CODES[errorCode]) {
				return UI_ERROR_CODES[errorCode];
			}

			// 2. Mensaje directo del backend
			const backendMsg = extractErrorMessage(err, '');
			if (backendMsg) {
				return backendMsg;
			}
		}

		// 3. Fallback del facade
		return fallback;
	},

	resolveSeverity(_err: unknown): 'error' | 'warn' {
		// Default: siempre 'error' para coincidir con el interceptor HTTP.
		// Esto permite que el dedup de ErrorHandlerService suprima el toast duplicado
		// cuando el interceptor y el facade resuelven el mismo errorCode.
		// Políticas especializadas (SILENT_404_POLICY) pueden overridear a 'warn'.
		return 'error';
	},

	resolveSummary(err: unknown): string {
		if (err instanceof HttpErrorResponse && err.status === 0) {
			return 'Error de conexión';
		}
		return UI_SUMMARIES.error;
	},
};

// #endregion

// #region Factory

/**
 * Crea un error handler para un facade específico.
 *
 * @example
 * ```typescript
 * // En el facade:
 * private errHandler = facadeErrorHandler({
 *   tag: 'CursosFacade',
 *   errorHandler: this.errorHandler,
 * });
 *
 * // En cada operación:
 * this.api.update(id, data).subscribe({
 *   next: () => { ... },
 *   error: (err) => this.errHandler.handle(err, 'actualizar curso', () => {
 *     this.store.setLoading(false);
 *   }),
 * });
 *
 * // Con política custom (raro, pero posible):
 * private errHandler = facadeErrorHandler({
 *   tag: 'ImportFacade',
 *   errorHandler: this.errorHandler,
 *   policy: SILENT_404_POLICY,
 * });
 * ```
 */
export function facadeErrorHandler(config: FacadeErrorHandlerConfig): FacadeErrorHandler {
	const policy = config.policy ?? DEFAULT_ERROR_POLICY;

	return {
		handle(err: unknown, accion: string, cleanup?: () => void): void {
			const fallback = `No se pudo ${accion}`;
			const message = policy.resolveMessage(err, fallback);
			const severity = policy.resolveSeverity(err);
			const summary = policy.resolveSummary(err);

			logger.error(`${config.tag}: Error al ${accion}`, err);

			if (severity === 'error') {
				config.errorHandler.showError(summary, message);
			} else {
				config.errorHandler.showWarning(summary, message);
			}

			cleanup?.();
		},
	};
}

// #endregion

// #region Políticas alternativas

/**
 * Política que silencia 404 (útil para deletes donde el recurso ya no existe).
 * Muestra info en vez de error para 404.
 */
export const SILENT_404_POLICY: ErrorPolicy = {
	...DEFAULT_ERROR_POLICY,

	resolveMessage(err: unknown, fallback: string): string {
		if (err instanceof HttpErrorResponse && err.status === 404) {
			return 'El recurso ya fue eliminado o no existe.';
		}
		return DEFAULT_ERROR_POLICY.resolveMessage(err, fallback);
	},

	resolveSeverity(err: unknown): 'error' | 'warn' {
		if (err instanceof HttpErrorResponse && err.status === 404) {
			return 'warn';
		}
		return DEFAULT_ERROR_POLICY.resolveSeverity(err);
	},
};

/**
 * Política que prioriza mensajes estáticos de UI_ADMIN_ERROR_DETAILS
 * sobre mensajes del backend. Útil para facades WAL donde el mensaje
 * viene del frontend, no del error.
 */
export const STATIC_MESSAGE_POLICY: ErrorPolicy = {
	...DEFAULT_ERROR_POLICY,

	resolveMessage(err: unknown, fallback: string): string {
		// Prioriza el fallback (mensaje estático del facade)
		// Solo usa backend si el fallback es genérico
		if (fallback && !fallback.startsWith('No se pudo ')) {
			return fallback;
		}
		return DEFAULT_ERROR_POLICY.resolveMessage(err, fallback);
	},
};

// #endregion
