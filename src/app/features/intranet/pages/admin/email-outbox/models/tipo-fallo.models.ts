// #region Tipos semánticos
export const TIPOS_FALLO = [
	'FAILED_INVALID_ADDRESS',
	'FAILED_NO_EMAIL',
	'FAILED_MAILBOX_FULL',
	'FAILED_REJECTED',
	'FAILED_UNKNOWN',
	'FAILED_TRANSIENT',
	'TRANSIENT',
] as const;

export type TipoFallo = (typeof TIPOS_FALLO)[number];

export const TIPOS_PERMANENTES: readonly TipoFallo[] = [
	'FAILED_INVALID_ADDRESS',
	'FAILED_NO_EMAIL',
	'FAILED_MAILBOX_FULL',
	'FAILED_REJECTED',
];
// #endregion

// #region Helpers
export function esPermanente(tipo: TipoFallo | string | null | undefined): boolean {
	if (!tipo) return false;
	return (TIPOS_PERMANENTES as readonly string[]).includes(tipo);
}
// #endregion
