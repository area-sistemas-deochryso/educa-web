import type { HorarioFormData } from '../models/horario.interface';
import { validateTimeRange } from '@shared/models';

/**
 * Valida el formulario del wizard de horarios según el paso actual.
 *
 * Paso 0 (Datos básicos): día, horas, salón y curso obligatorios.
 * Paso 1 (Profesor): opcional.
 * Paso 2 (Estudiantes): opcional.
 */
export function validateHorarioForm(formData: HorarioFormData, wizardStep: number): boolean {
	if (wizardStep === 0) {
		return (
			formData.diaSemana !== null &&
			formData.salonId !== null &&
			formData.cursoId !== null &&
			validateTimeRange(formData.horaInicio, formData.horaFin) === null
		);
	}

	// Pasos 1 y 2 son opcionales
	return wizardStep === 1 || wizardStep === 2;
}

/**
 * Valida la hora de inicio contra la hora de fin.
 * Delega al invariante centralizado en TimeRange.
 */
export function validateHoraInicio(horaInicio: string, horaFin: string): string | null {
	const error = validateTimeRange(horaInicio, horaFin);
	if (!error) return null;
	return error.field === 'horaInicio' || error.field === 'range' ? error.message : null;
}

/**
 * Valida la hora de fin contra la hora de inicio.
 * Delega al invariante centralizado en TimeRange.
 */
export function validateHoraFin(horaFin: string, horaInicio: string): string | null {
	const error = validateTimeRange(horaInicio, horaFin);
	if (!error) return null;
	return error.field === 'horaFin' || error.field === 'range' ? error.message : null;
}
