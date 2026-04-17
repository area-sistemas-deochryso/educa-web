export interface ErrorReportPayload {
	correlationId: string | null;
	origen: ErrorOrigen;
	mensaje: string;
	stackTrace: string | null;
	url: string;
	httpMethod: string | null;
	httpStatus: number | null;
	errorCode: string | null;
	severidad: 'CRITICAL' | 'ERROR' | 'WARNING';
	plataforma: 'WEB' | 'ANDROID' | 'IOS';
	userAgent: string;
	sourceLocation: string | null;
	requestBody: string | null;
	responseBody: string | null;
	breadcrumbs: BreadcrumbPayload[];
}

export interface BreadcrumbPayload {
	tipo: string;
	descripcion: string;
	ruta: string;
	timestamp: number;
	metadata: string | null;
}

import type { ErrorOrigen } from './error-reporter.helpers';

export const BREADCRUMB_LIMITS: Record<string, number> = {
	js_unhandled: 30,
	http_500: 30,
	http_422: 15,
	http_400: 15,
	http_401: 10,
	http_403: 10,
	http_409: 10,
	http_network: 5,
	default: 15,
};
