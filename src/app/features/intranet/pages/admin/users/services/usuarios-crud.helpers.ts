import { HttpErrorResponse } from '@angular/common/http';

import {
	ActualizarUsuarioRequest,
	CrearUsuarioRequest,
	DuplicateNameMatch,
	UsuarioDetalle,
	UsuariosEstadisticas,
} from '../models';

export interface PendingDuplicateConfirmation {
	nombres: string;
	apellidos: string;
	match: DuplicateNameMatch;
}

export const ROL_STAT_KEY: Record<string, keyof UsuariosEstadisticas> = {
	Director: 'totalDirectores',
	Profesor: 'totalProfesores',
	Estudiante: 'totalEstudiantes',
	Apoderado: 'totalApoderados',
	'Asistente Administrativo': 'totalAsistentesAdministrativos',
	Promotor: 'totalPromotores',
	'Coordinador Académico': 'totalCoordinadoresAcademicos',
};

export function extractDuplicateMatch(err: unknown): DuplicateNameMatch | null {
	if (!(err instanceof HttpErrorResponse) || err.status !== 409) return null;
	if (err.error?.errorCode !== 'DUPLICATE_NAME_MATCH') return null;
	const match = err.error?.duplicateMatch;
	if (!match || typeof match.dniPartial !== 'string') return null;
	return match as DuplicateNameMatch;
}

interface SalonOption {
	salonId: number;
	grado: string;
	seccion: string;
}

export function resolveSalonNombre(
	data: Partial<CrearUsuarioRequest & ActualizarUsuarioRequest>,
	selectedUsuario: UsuarioDetalle,
	salones: readonly SalonOption[],
): string | undefined {
	const formatSalon = (salonId: number): string | undefined => {
		const salon = salones.find((s) => s.salonId === salonId);
		return salon ? `${salon.grado} ${salon.seccion}` : undefined;
	};

	if (data.rol === 'Estudiante') {
		return data.salonId ? formatSalon(data.salonId) : undefined;
	}
	if (data.rol === 'Profesor') {
		const firstSalon = data.salones?.[0];
		return firstSalon ? formatSalon(firstSalon.salonId) : undefined;
	}
	return selectedUsuario.salonNombre;
}
