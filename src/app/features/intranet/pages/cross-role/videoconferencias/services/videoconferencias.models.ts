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
}

/** Estado real de la sala, calculado antes del click (ver `videoconferencias.window.utils.ts`). */
export type EstadoSala = 'disponible' | 'fuera-de-horario' | 'no-habilitada';
