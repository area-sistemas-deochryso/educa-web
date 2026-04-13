import type { CrearUsuarioRequest, ActualizarUsuarioRequest } from '../services';
import { generatePassword } from '@core/helpers';
import { aplicarConstraintsDeRol } from '@shared/models';

type UsuarioFormData = Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>;

/**
 * Aplica políticas de negocio al formulario de usuario después de un cambio parcial.
 *
 * Políticas:
 * - Auto-generar contraseña en creación cuando cambian apellidos/DNI
 * - Constraints de rol (delegadas a `aplicarConstraintsDeRol`)
 */
export function applyFormPolicies(
	currentData: UsuarioFormData,
	updates: Partial<UsuarioFormData>,
	isEditing: boolean,
): UsuarioFormData {
	const newData = { ...currentData, ...updates };

	// Auto-generar contraseña solo en creación
	if (
		!isEditing &&
		(updates.apellidos !== undefined || updates.dni !== undefined)
	) {
		const password = generatePassword(newData.apellidos ?? '', newData.dni ?? '');
		newData.contrasena = password || undefined;
	}

	// Constraints de rol: salonId/salones según el rol seleccionado
	const corrections = aplicarConstraintsDeRol(newData, updates);
	Object.assign(newData, corrections);

	return newData;
}
