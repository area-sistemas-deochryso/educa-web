import type { CrearUsuarioRequest, ActualizarUsuarioRequest } from '../services';

type UsuarioFormData = Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateDni(dni: string | undefined): string | null {
	if (!dni) return null;
	if (!/^\d+$/.test(dni)) return 'El DNI solo debe contener numeros';
	if (dni.length !== 8) return 'El DNI debe tener exactamente 8 digitos';
	return null;
}

export function validateCorreo(correo: string | undefined): string | null {
	if (!correo) return null;
	if (!EMAIL_REGEX.test(correo)) return 'Ingrese un correo valido';
	return null;
}

export function validateCorreoApoderado(
	correo: string | undefined,
	_rol: string | undefined,
): string | null {
	if (!correo) return null;
	if (!EMAIL_REGEX.test(correo)) return 'Ingrese un correo valido';
	return null;
}

export function validateNombreApoderado(
	_nombre: string | undefined,
	_rol: string | undefined,
): string | null {
	return null;
}

export function validateTelefonoApoderado(
	_telefono: string | undefined,
	_rol: string | undefined,
): string | null {
	return null;
}

/**
 * Valida si el formulario de usuario tiene todos los campos requeridos completos.
 */
export function isUsuarioFormValid(
	data: UsuarioFormData,
	isEditing: boolean,
	errors: {
		dniError: string | null;
		correoError: string | null;
		correoApoderadoError: string | null;
		nombreApoderadoError: string | null;
		telefonoApoderadoError: string | null;
	},
): boolean {
	if (!data.dni || !data.nombres || !data.apellidos) return false;
	if (!isEditing && (!data.rol || !data.contrasena)) return false;
	if (errors.dniError) return false;
	if (errors.correoError) return false;
	if (errors.correoApoderadoError) return false;
	if (errors.nombreApoderadoError) return false;
	if (errors.telefonoApoderadoError) return false;
	return true;
}
