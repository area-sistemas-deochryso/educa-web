export interface ManualRetryResultDto {
	attemptId: number;
	resultado: string;
	senderAddress: string;
	smtpCode: number | null;
	smtpMessage: string | null;
	duracionMs: number;
	tipoFallo: string | null;
}

export interface EmailOutboxManualAttemptDto {
	id: number;
	fecha: string;
	senderAddress: string;
	forced: boolean;
	resultado: string;
	smtpCode: number | null;
	smtpMessage: string | null;
	duracionMs: number;
	operador: string;
}
