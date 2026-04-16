import { determinarNiveles } from '@core/helpers';
import { formatFullName } from '@shared/pipes';
import type { CursoListaDto, CursoOption, CursosPorNivel } from '../models/curso.interface';
import type { ProfesorListDto, ProfesorOption } from '../models/profesor.interface';
import type { SalonListDto, SalonOption } from '../models/salon.interface';

/** Convierte un SalonListDto a SalonOption para dropdown. */
export function mapSalonToOption(salon: SalonListDto): SalonOption {
	return {
		value: salon.salonId,
		label: salon.nombreSalon,
		grado: salon.grado,
		gradoOrden: salon.gradoOrden,
		seccion: salon.seccion,
		sede: salon.sede,
		totalEstudiantes: salon.totalEstudiantes,
		tutorNombre: salon.tutorNombre,
	};
}

/** Convierte un array de SalonListDto a SalonOption[]. */
export function mapSalonesToOptions(salones: SalonListDto[]): SalonOption[] {
	return salones.map(mapSalonToOption);
}

/** Convierte un CursoListaDto a CursoOption con niveles derivados. */
export function mapCursoToOption(curso: CursoListaDto): CursoOption {
	const grados = curso.grados.map((g) => g.nombre);
	const niveles = determinarNiveles(grados);

	return {
		value: curso.id,
		label: curso.nombre,
		grados,
		niveles,
	};
}

/** Convierte un array de CursoListaDto a CursoOption[]. */
export function mapCursosToOptions(cursos: CursoListaDto[]): CursoOption[] {
	return cursos.map(mapCursoToOption);
}

/** Agrupa cursos por nivel educativo. */
export function groupCursosByNivel(cursos: CursoOption[]): CursosPorNivel {
	return {
		inicial: cursos.filter((c) => c.niveles.includes('Inicial')),
		primaria: cursos.filter((c) => c.niveles.includes('Primaria')),
		secundaria: cursos.filter((c) => c.niveles.includes('Secundaria')),
	};
}

/** Convierte un ProfesorListDto a ProfesorOption para dropdown. */
export function mapProfesorToOption(profesor: ProfesorListDto): ProfesorOption {
	return {
		value: profesor.id,
		label: formatFullName(profesor.apellidos, profesor.nombre),
		dni: profesor.dni,
	};
}

/** Convierte un array de ProfesorListDto a ProfesorOption[]. */
export function mapProfesToOptions(profesores: ProfesorListDto[]): ProfesorOption[] {
	return profesores.map(mapProfesorToOption);
}
