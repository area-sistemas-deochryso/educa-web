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
 * - Estudiante usa salonId (salón único).
 * - Profesor usa salones[] (múltiples con tutoría).
 */
export interface AsignableASalon extends ConRol {
	salonId?: number;
	salones?: { salonId: number; esTutor: boolean }[];
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
 * 1. Rol sin salón → salonId = undefined, salones = undefined
 * 2. Cambio de rol a no-profesor → limpiar salones
 *
 * @returns Campos corregidos (solo los que cambiaron).
 */
export function aplicarConstraintsDeRol(
	data: AsignableASalon,
	cambio: Partial<AsignableASalon>,
): Partial<AsignableASalon> {
	const corrections: Partial<AsignableASalon> = {};

	// Invariante 1: rol sin salón → limpiar salonId y salones
	if (cambio.rol !== undefined && !rolRequiereSalon(data.rol)) {
		corrections.salonId = undefined;
		corrections.salones = undefined;
	}

	// Invariante 2: cambio a rol que no permite tutor → limpiar salones
	if (cambio.rol !== undefined && !rolPermiteEsTutor(data.rol)) {
		corrections.salones = undefined;
	}

	// Invariante 3: sin salón para estudiante → limpiar salonId
	if (cambio.salonId !== undefined && !data.salonId) {
		// No-op, salonId already cleared
	}

	return corrections;
}

// #endregion
