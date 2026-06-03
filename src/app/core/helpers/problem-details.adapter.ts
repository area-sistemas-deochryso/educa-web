import { HttpErrorResponse } from '@angular/common/http';

export interface NormalizedProblemDetails {
	type: string | null;
	title: string | null;
	status: number | null;
	detail: string | null;
	traceId: string | null;
	errorCode: string | null;
	validationErrors: Record<string, string[]> | null;
}

// RFC 7807 ProblemDetails + legacy ApiResponse + ValidationProblemDetails
export function parseProblemDetails(error: HttpErrorResponse): NormalizedProblemDetails {
	const body = error.error as Record<string, unknown> | null;

	const traceId =
		error.headers?.get('X-Correlation-Id') ??
		asString(body?.['traceId']) ??
		null;

	const errorCode = asString(body?.['errorCode']) ?? null;

	const validationErrors = extractValidationErrors(body?.['errors']);

	return {
		type: asString(body?.['type']) ?? null,
		title: asString(body?.['title']) ?? null,
		status: typeof body?.['status'] === 'number' ? body['status'] : error.status,
		detail: asString(body?.['detail']) ?? asString(body?.['message']) ?? asString(body?.['mensaje']) ?? null,
		traceId,
		errorCode,
		validationErrors,
	};
}

function asString(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

function extractValidationErrors(errors: unknown): Record<string, string[]> | null {
	if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return null;

	const result: Record<string, string[]> = {};
	let hasEntries = false;

	for (const [field, messages] of Object.entries(errors as Record<string, unknown>)) {
		if (Array.isArray(messages) && messages.length > 0 && typeof messages[0] === 'string') {
			result[field] = messages as string[];
			hasEntries = true;
		}
	}

	return hasEntries ? result : null;
}
