// #region Imports
import { getRolPolicy } from './role-policies.models';
// #endregion

// #region Role Contracts

/**
 * Contrato: entidad que tiene un rol asignado.
 * No es "los campos del formulario" — es el contrato mínimo
 * para cualquier cosa que necesite verificar constraints de rol.
 */
export interface ConRol {
	readonly rol?: string;
}

/**
 * Contrato: entidad asignable a un salón.
 * Extiende ConRol porque la asignabilidad depende del rol.
 */
export interface AsignableASalon extends ConRol {
	salonId?: number;
	esTutor?: boolean;
}

// #endregion

// #region Predicates

/**
 * ¿El rol requiere/permite asignación de salón?
 * Delega a RolPolicy.requiresSalon — fuente única de verdad.
 */
export function rolRequiereSalon(rol: string | undefined): boolean {
	return getRolPolicy(rol).requiresSalon;
}

/**
 * ¿El rol permite el campo esTutor?
 * Delega a RolPolicy.canBeTutor — fuente única de verdad.
 */
export function rolPermiteEsTutor(rol: string | undefined): boolean {
	return getRolPolicy(rol).canBeTutor;
}

// #endregion

// #region Constraint Application

/**
 * Aplica las constraints de rol sobre una entidad asignable a salón.
 *
 * Invariantes que protege:
 * 1. Rol sin salón → salonId = undefined, esTutor = undefined
 * 2. Sin salonId → esTutor = undefined
 * 3. Profesor con salonId sin esTutor → esTutor = false
 *
 * @returns Campos corregidos (solo los que cambiaron).
 */
export function aplicarConstraintsDeRol(
	data: AsignableASalon,
	cambio: Partial<AsignableASalon>,
): Partial<AsignableASalon> {
	const corrections: Partial<AsignableASalon> = {};

	// Invariante 1: rol sin salón → limpiar salonId y esTutor
	if (cambio.rol !== undefined && !rolRequiereSalon(data.rol)) {
		corrections.salonId = undefined;
		corrections.esTutor = undefined;
	}

	// Invariante 2: sin salón → limpiar esTutor
	if (cambio.salonId !== undefined && !data.salonId) {
		corrections.esTutor = undefined;
	}

	// Invariante 3: Profesor con salón y sin esTutor → inicializar en false
	if (
		cambio.salonId !== undefined &&
		data.salonId &&
		data.esTutor === undefined &&
		rolPermiteEsTutor(data.rol)
	) {
		corrections.esTutor = false;
	}

	return corrections;
}

// #endregion
