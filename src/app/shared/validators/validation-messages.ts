export interface ValidationMessageConfig {
	[key: string]: string | ((params: Record<string, unknown>) => string);
}

/**
 * Mensajes de error en espanol para validadores
 */
export const VALIDATION_MESSAGES: ValidationMessageConfig = {
	// Validadores de Angular
	required: 'Este campo es obligatorio',
	minlength: (params: Record<string, unknown>) =>
		`Debe tener al menos ${params['requiredLength']} caracteres`,
	maxlength: (params: Record<string, unknown>) =>
		`No puede tener mas de ${params['requiredLength']} caracteres`,
	min: (params: Record<string, unknown>) => `El valor minimo es ${params['min']}`,
	max: (params: Record<string, unknown>) => `El valor maximo es ${params['max']}`,
	pattern: 'El formato no es valido',

	// Validadores custom
	dni: 'El DNI debe tener exactamente 8 digitos',
	email: 'Ingrese un correo electronico valido',
	phoneNumber: 'Ingrese un numero de telefono valido (9 digitos)',
	onlyLetters: 'Solo se permiten letras',
	onlyNumbers: 'Solo se permiten numeros',
	mismatch: 'Los campos no coinciden',

	// Password
	password: 'La contrasena debe tener al menos 6 caracteres, una letra y un numero',
	'password.minLength': (params: Record<string, unknown>) =>
		`La contrasena debe tener al menos ${params['requiredLength']} caracteres`,
	'password.noLetter': 'La contrasena debe contener al menos una letra',
	'password.noNumber': 'La contrasena debe contener al menos un numero',

	// Strong password
	strongPassword: 'La contrasena no cumple con los requisitos de seguridad',
	'strongPassword.minLength': 'Minimo 8 caracteres',
	'strongPassword.noUppercase': 'Debe incluir una letra mayuscula',
	'strongPassword.noLowercase': 'Debe incluir una letra minuscula',
	'strongPassword.noNumber': 'Debe incluir un numero',
	'strongPassword.noSpecial': 'Debe incluir un caracter especial (!@#$%^&*)',

	// Range
	range: (params: Record<string, unknown>) =>
		`El valor debe estar entre ${params['min']} y ${params['max']}`,
};

/**
 * Obtiene el mensaje de error para un validador
 */
export function getValidationMessage(
	errorKey: string,
	errorParams?: Record<string, unknown>,
	customMessages?: ValidationMessageConfig,
): string {
	// Buscar en mensajes custom primero
	const messages = { ...VALIDATION_MESSAGES, ...customMessages };
	const message = messages[errorKey];

	if (typeof message === 'function') {
		return message(errorParams ?? {});
	}

	return message || `Error de validacion: ${errorKey}`;
}

/**
 * Obtiene todos los mensajes de error de un control
 */
export function getControlErrors(
	errors: Record<string, unknown> | null,
	customMessages?: ValidationMessageConfig,
): string[] {
	if (!errors) return [];

	return Object.entries(errors).map(([key, params]) =>
		getValidationMessage(key, params as Record<string, unknown>, customMessages),
	);
}
