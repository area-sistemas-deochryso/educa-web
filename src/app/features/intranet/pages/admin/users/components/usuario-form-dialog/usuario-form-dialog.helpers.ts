// #region Imports
import { SalonListDto } from '@features/intranet/pages/admin/schedules/models/salon.interface';
import { esSeccionDeVerano } from '@shared/models';
import { SalonAsignacion } from '../../services';

// #endregion
// #region Implementation

export function formatSeccionLabel(seccion: string): string {
	return esSeccionDeVerano(seccion) ? 'Verano' : seccion;
}

export function computeGradosOptions(salones: SalonListDto[]): { label: string; value: string }[] {
	const gradosUnicos = new Set<string>();
	const result: { label: string; value: string }[] = [];

	salones.forEach((s) => {
		if (!gradosUnicos.has(s.grado)) {
			gradosUnicos.add(s.grado);
			result.push({ label: s.grado, value: s.grado });
		}
	});

	return result;
}

export function computeSeccionesOptions(
	salones: SalonListDto[],
	grado: string | null,
): { label: string; value: string }[] {
	if (!grado) return [];

	return salones
		.filter((s) => s.grado === grado)
		.map((s) => ({
			label: formatSeccionLabel(s.seccion),
			value: s.seccion,
		}));
}

export function findSalonSeleccionado(
	salones: SalonListDto[],
	grado: string | null,
	seccion: string | null,
): SalonListDto | null {
	if (!grado || !seccion) return null;

	return salones.find((s) => s.grado === grado && s.seccion === seccion) || null;
}

export interface SalonAsignadoView {
	salonId: number;
	salonNombre: string;
	esTutor: boolean;
}

export function computeSalonesAsignados(
	asignaciones: SalonAsignacion[],
	salones: SalonListDto[],
): SalonAsignadoView[] {
	return asignaciones.map((a) => {
		const salon = salones.find((s) => s.salonId === a.salonId);
		return {
			salonId: a.salonId,
			salonNombre: salon ? `${salon.grado} - ${formatSeccionLabel(salon.seccion)}` : `Salón #${a.salonId}`,
			esTutor: a.esTutor,
		};
	});
}

export function isSalonYaAsignado(salon: SalonListDto | null, asignaciones: SalonAsignacion[]): boolean {
	if (!salon) return false;
	return asignaciones.some((a) => a.salonId === salon.salonId);
}

// #endregion
