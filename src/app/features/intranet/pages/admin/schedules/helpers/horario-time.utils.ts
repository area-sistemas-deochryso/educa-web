import type { HorarioResponseDto, HorarioWeeklyBlock } from '../models/horario.interface';
import { cursoColorFor } from '@intranet-shared/config/curso-colors';

const HORA_INICIO_DIA = 7 * 60; // 07:00 AM en minutos

/**
 * Calcula la duración en minutos entre dos horas "HH:mm".
 */
export function calcularDuracionMinutos(horaInicio: string, horaFin: string): number {
	const [hi, mi] = horaInicio.split(':').map(Number);
	const [hf, mf] = horaFin.split(':').map(Number);
	return hf * 60 + mf - (hi * 60 + mi);
}

/**
 * Calcula la posición vertical (en minutos) desde las 07:00.
 */
export function calcularPosicionVertical(horaInicio: string): number {
	const [h, m] = horaInicio.split(':').map(Number);
	return h * 60 + m - HORA_INICIO_DIA;
}

/**
 * Construye los bloques semanales para la vista de calendario.
 * Asigna un color por curso de forma determinística.
 */
export function buildWeeklyBlocks(horarios: HorarioResponseDto[]): HorarioWeeklyBlock[] {
	return horarios.map((horario) => ({
		horario,
		dia: horario.diaSemana,
		color: cursoColorFor(horario.cursoId),
		duracionMinutos: calcularDuracionMinutos(horario.horaInicio, horario.horaFin),
		posicionVertical: calcularPosicionVertical(horario.horaInicio),
	}));
}
