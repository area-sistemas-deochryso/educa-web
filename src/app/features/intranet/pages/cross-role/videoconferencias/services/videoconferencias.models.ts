export interface VideoconferenciaItem {
	horarioId: number;
	cursoId: number;
	cursoNombre: string;
	salonDescripcion: string;
	diaSemana: number;
	diaSemanaDescripcion: string;
	horaInicio: string;
	horaFin: string;
	profesorNombreCompleto: string | null;
	cantidadEstudiantes: number;
	habilitada: boolean;
	/** Evaluado por el BE al consultar: sala habilitada abierta fuera de horario (profesor presente o intervalo vigente). */
	aperturaFueraDeHorario: boolean;
	/** Intervalo de apertura fijado por el profesor, en hora Perú sin offset (`yyyy-MM-ddTHH:mm:ss`). */
	aperturaDesde: string | null;
	aperturaHasta: string | null;
}

/** Datos con los que el profesor abre la sala fuera del horario de clase (`PUT habilitacion`). */
export interface AperturaSalaRequest {
	/** Intervalo desde-hasta; ambos o ninguno. Sin intervalo la sala queda abierta mientras el profesor esté presente. */
	desde: string | null;
	hasta: string | null;
	motivo: string;
}

/** Estado real de la sala, calculado antes del click (ver `videoconferencias.window.utils.ts`). */
export type EstadoSala = 'disponible' | 'fuera-de-horario' | 'esperando-apertura' | 'no-habilitada';
