import type { HorarioResponseDto, HorarioFormData } from '../models/horario.interface';
import type { SalonListDto } from '../models/salon.interface';
import { timeRangesOverlap } from '@shared/models';

/**
 * Filtra salones activos que NO tienen conflicto de horario
 * con el día/hora seleccionados en el formulario.
 *
 * Regla de negocio: dos horarios en el mismo salón y día
 * no pueden solaparse en rango horario.
 */
export function filterSalonesDisponibles(
	activeSalones: SalonListDto[],
	horarios: HorarioResponseDto[],
	formData: HorarioFormData,
	editingId: number | null,
): SalonListDto[] {
	if (!formData.diaSemana || !formData.horaInicio || !formData.horaFin) {
		return activeSalones;
	}

	const formRange = { horaInicio: formData.horaInicio, horaFin: formData.horaFin };

	return activeSalones.filter((salon) => {
		const tieneConflicto = horarios.some((h) => {
			if (editingId !== null && h.id === editingId) return false;
			if (h.salonId !== salon.salonId || h.diaSemana !== formData.diaSemana) return false;
			return timeRangesOverlap(formRange, { horaInicio: h.horaInicio, horaFin: h.horaFin });
		});

		return !tieneConflicto;
	});
}
