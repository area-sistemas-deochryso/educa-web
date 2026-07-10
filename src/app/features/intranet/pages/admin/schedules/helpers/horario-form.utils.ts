import { HORAS_DIA, type HorarioFormData } from '../models/horario.interface';
import { validateTimeRange } from '@shared/models';

const PRIMERA_HORA_VISIBLE = HORAS_DIA[0];
const ULTIMA_HORA_VISIBLE = HORAS_DIA[HORAS_DIA.length - 1];

/**
 * La grilla semanal solo renderiza filas para HORAS_DIA (07:00–17:00), ubicando cada
 * bloque por la hora de HorInicio. Un horario que empieza fuera de ese rango se guarda
 * pero desaparece de la grilla sin ningún aviso — este chequeo evita ese estado inválido.
 */
function validateHoraInicioEnRangoVisible(horaInicio: string): string | null {
	if (horaInicio < PRIMERA_HORA_VISIBLE || horaInicio > ULTIMA_HORA_VISIBLE) {
		return `La hora de inicio debe estar entre ${PRIMERA_HORA_VISIBLE} y ${ULTIMA_HORA_VISIBLE}`;
	}
	return null;
}

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
			validateTimeRange(formData.horaInicio, formData.horaFin) === null &&
			validateHoraInicioEnRangoVisible(formData.horaInicio) === null
		);
	}

	// Pasos 1 y 2 son opcionales
	return wizardStep === 1 || wizardStep === 2;
}

/**
 * Valida la hora de inicio contra la hora de fin y contra el rango visible en la grilla.
 * Delega al invariante centralizado en TimeRange.
 */
export function validateHoraInicio(horaInicio: string, horaFin: string): string | null {
	const error = validateTimeRange(horaInicio, horaFin);
	if (error) {
		return error.field === 'horaInicio' || error.field === 'range' ? error.message : null;
	}
	return validateHoraInicioEnRangoVisible(horaInicio);
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
