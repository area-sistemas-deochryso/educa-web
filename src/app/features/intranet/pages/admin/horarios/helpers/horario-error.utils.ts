import { HttpErrorResponse } from '@angular/common/http';

import { type ErrorPolicy, DEFAULT_ERROR_POLICY } from '@core/helpers';
import { UI_SUMMARIES } from '@app/shared/constants';

/**
 * Política de error para horarios.
 * Extiende la default con summaries específicos para conflictos y validación.
 */
export const HORARIO_ERROR_POLICY: ErrorPolicy = {
	...DEFAULT_ERROR_POLICY,

	resolveSummary(err: unknown): string {
		if (!(err instanceof HttpErrorResponse)) {
			return DEFAULT_ERROR_POLICY.resolveSummary(err);
		}

		const message = (err.error?.message ?? '') as string;
		const errorCode = (err.error?.errorCode ?? '') as string;

		// Conflict: HORARIO_OVERLAP or message includes conflict keywords
		if (
			errorCode === 'HORARIO_OVERLAP' ||
			message.includes('conflicto') ||
			message.includes('overlap')
		) {
			return UI_SUMMARIES.scheduleConflict;
		}

		// Validation errors
		if (
			errorCode.includes('INVALIDO') ||
			message.includes('validación') ||
			message.includes('validation')
		) {
			return UI_SUMMARIES.validationError;
		}

		return DEFAULT_ERROR_POLICY.resolveSummary(err);
	},
};
