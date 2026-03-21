import { HttpErrorResponse } from '@angular/common/http';

import { ErrorHandlerService } from '@core/services';
import {
	UI_ADMIN_ERROR_DETAILS,
	UI_ADMIN_ERROR_DETAILS_DYNAMIC,
	UI_GENERIC_MESSAGES,
	UI_SUMMARIES,
} from '@app/shared/constants';

/**
 * Handler compartido de errores de API para horarios.
 * Clasifica el mensaje del backend y muestra feedback apropiado.
 */
export function handleHorarioApiError(
	errorHandler: ErrorHandlerService,
	err: unknown,
	accion: string,
): void {
	let mensaje: string;
	if (err instanceof HttpErrorResponse) {
		mensaje = err.error?.message ?? err.message ?? UI_GENERIC_MESSAGES.unknownError;
	} else if (err instanceof Error) {
		mensaje = err.message ?? UI_GENERIC_MESSAGES.unknownError;
	} else {
		mensaje = UI_GENERIC_MESSAGES.unknownError;
	}

	if (mensaje.includes('conflicto') || mensaje.includes('overlap')) {
		errorHandler.showError(
			UI_SUMMARIES.scheduleConflict,
			UI_ADMIN_ERROR_DETAILS.horarioConflict,
		);
	} else if (mensaje.includes('no encontrado') || mensaje.includes('not found')) {
		errorHandler.showError(
			UI_SUMMARIES.error,
			UI_ADMIN_ERROR_DETAILS_DYNAMIC.horarioActionNotFound(accion),
		);
	} else if (mensaje.includes('validación') || mensaje.includes('validation')) {
		errorHandler.showError(
			UI_SUMMARIES.validationError,
			UI_ADMIN_ERROR_DETAILS_DYNAMIC.horarioValidation(mensaje),
		);
	} else {
		errorHandler.showError(
			UI_SUMMARIES.error,
			UI_ADMIN_ERROR_DETAILS_DYNAMIC.horarioActionFailed(accion),
		);
	}
}
