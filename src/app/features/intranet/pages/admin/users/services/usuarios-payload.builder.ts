import {
	ActualizarUsuarioRequest,
	CrearUsuarioRequest,
	UsuarioDetalle,
} from '../models';

type FormData = Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>;

/**
 * Construye el payload para crear usuario.
 * Retorna null si faltan campos requeridos (rol, contrasena).
 */
export function buildCrearUsuarioPayload(data: FormData): CrearUsuarioRequest | null {
	if (!data.rol || !data.contrasena) return null;
	return {
		dni: data.dni!,
		nombres: data.nombres!,
		apellidos: data.apellidos!,
		contrasena: data.contrasena,
		rol: data.rol,
		telefono: data.telefono,
		correo: data.correo,
		sedeId: data.sedeId,
		fechaNacimiento: data.fechaNacimiento,
		grado: data.grado,
		seccion: data.seccion,
		nombreApoderado: data.nombreApoderado,
		telefonoApoderado: data.telefonoApoderado,
		correoApoderado: data.correoApoderado,
		salonId: data.salonId,
		salones: data.salones,
	};
}

/**
 * Construye el payload para actualizar usuario.
 * Retorna null si no hay usuario seleccionado.
 */
export function buildActualizarUsuarioPayload(
	data: FormData,
	usuario: UsuarioDetalle | null,
): ActualizarUsuarioRequest | null {
	if (!usuario) return null;
	return {
		dni: data.dni!,
		nombres: data.nombres!,
		apellidos: data.apellidos!,
		contrasena: data.contrasena || undefined,
		estado: data.estado ?? true,
		telefono: data.telefono,
		correo: data.correo,
		sedeId: data.sedeId,
		fechaNacimiento: data.fechaNacimiento,
		grado: data.grado,
		seccion: data.seccion,
		nombreApoderado: data.nombreApoderado,
		telefonoApoderado: data.telefonoApoderado,
		correoApoderado: data.correoApoderado,
		salonId: data.salonId,
		salones: data.salones,
		rowVersion: usuario.rowVersion,
	};
}
