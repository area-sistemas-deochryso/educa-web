export interface VideoconferenciaItem {
	horarioId: number;
	cursoId: number;
	cursoNombre: string;
	salonDescripcion: string;
	diaSemanaDescripcion: string;
	horaInicio: string;
	horaFin: string;
	profesorNombreCompleto: string | null;
	cantidadEstudiantes: number;
}
