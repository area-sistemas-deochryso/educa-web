import type { HorarioResponseDto, HorarioWeeklyBlock } from '../models/horario.interface';
import { CURSO_COLORS } from '../models/horario.interface';

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
 * @deprecated Usar `timeRangesOverlap` de `@shared/models` en su lugar.
 */
export function hasOverlap(
	inicioA: string,
	finA: string,
	inicioB: string,
	finB: string,
): boolean {
	return (
		(inicioA >= inicioB && inicioA < finB) ||
		(finA > inicioB && finA <= finB) ||
		(inicioA <= inicioB && finA >= finB)
	);
}

/**
 * Construye los bloques semanales para la vista de calendario.
 * Asigna un color por curso de forma determinística.
 */
export function buildWeeklyBlocks(horarios: HorarioResponseDto[]): HorarioWeeklyBlock[] {
	const cursoColorMap = new Map<number, string>();
	let colorIndex = 0;

	return horarios.map((horario) => {
		if (!cursoColorMap.has(horario.cursoId)) {
			cursoColorMap.set(horario.cursoId, CURSO_COLORS[colorIndex % CURSO_COLORS.length]);
			colorIndex++;
		}

		return {
			horario,
			dia: horario.diaSemana,
			color: cursoColorMap.get(horario.cursoId) || CURSO_COLORS[0],
			duracionMinutos: calcularDuracionMinutos(horario.horaInicio, horario.horaFin),
			posicionVertical: calcularPosicionVertical(horario.horaInicio),
		};
	});
}
