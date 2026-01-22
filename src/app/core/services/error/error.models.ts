export type ErrorSeverity = 'info' | 'warn' | 'error' | 'success'
export type ErrorSource = 'http' | 'client' | 'validation' | 'unknown'

export interface AppError {
	id: string
	message: string
	severity: ErrorSeverity
	source: ErrorSource
	timestamp: Date
	statusCode?: number
	originalError?: unknown
	context?: Record<string, unknown>
}

export interface HttpErrorDetails {
	url: string
	method: string
	statusCode: number
	statusText: string
	message: string
	body?: unknown
}

export interface ErrorNotification {
	severity: ErrorSeverity
	summary: string
	detail: string
	life?: number
	sticky?: boolean
}

/**
 * Mapeo de codigos HTTP a mensajes amigables en espanol
 */
export const HTTP_ERROR_MESSAGES: Record<number, string> = {
	0: 'No se pudo conectar con el servidor. Verifique su conexion a internet.',
	400: 'La solicitud contiene datos invalidos.',
	401: 'Su sesion ha expirado. Por favor, inicie sesion nuevamente.',
	403: 'No tiene permisos para realizar esta accion.',
	404: 'El recurso solicitado no fue encontrado.',
	408: 'La solicitud ha tardado demasiado. Intente nuevamente.',
	422: 'Los datos enviados no pudieron ser procesados.',
	429: 'Demasiadas solicitudes. Espere un momento e intente nuevamente.',
	500: 'Error interno del servidor. Intente mas tarde.',
	502: 'El servidor no esta disponible temporalmente.',
	503: 'Servicio no disponible. Intente mas tarde.',
	504: 'El servidor no responde. Intente mas tarde.',
}
