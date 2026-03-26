import type { CalificacionDto, NotaResumenDto, PeriodoCalificacionDto, PromedioDto } from '@data/models';
import { MESES_LIMITE_EDICION } from '../models';

/**
 * Promedio ponderado: sum(nota * peso).
 * Los pesos son fracciones absolutas (ej: 0.2 = 20%) que suman ~1.0
 * cuando todas las evaluaciones están presentes, por lo que NO se
 * normaliza dividiendo por la suma de pesos.
 */
export function calcularPromedioPonderado(
	notas: { nota: number; peso: number }[],
): number | null {
	if (notas.length === 0) return null;
	const suma = notas.reduce((acc, n) => acc + n.nota * n.peso, 0);
	return Math.round(suma * 10) / 10;
}

/**
 * Recalculate period promedios for a student locally after editing a nota.
 * Mirrors backend CalcularPromedios logic: sum(nota * peso) per period.
 */
export function recalcularPromedios(
	notas: NotaResumenDto[],
	evaluaciones: CalificacionDto[],
	periodos: PeriodoCalificacionDto[],
): PromedioDto[] {
	const notasMap = new Map<number, number | null>();
	for (const n of notas) {
		notasMap.set(n.calificacionId, n.nota);
	}

	const result: PromedioDto[] = [];

	for (const periodo of periodos) {
		const entries: { nota: number; peso: number }[] = [];
		for (const ev of evaluaciones) {
			if (ev.numeroSemana >= periodo.semanaInicio && ev.numeroSemana <= periodo.semanaFin) {
				const nota = notasMap.get(ev.id);
				if (nota !== null && nota !== undefined) {
					entries.push({ nota, peso: ev.peso });
				}
			}
		}
		result.push({ periodo: periodo.nombre, promedio: calcularPromedioPonderado(entries) });
	}

	// General = all evaluaciones
	const allEntries: { nota: number; peso: number }[] = [];
	for (const ev of evaluaciones) {
		const nota = notasMap.get(ev.id);
		if (nota !== null && nota !== undefined) {
			allEntries.push({ nota, peso: ev.peso });
		}
	}
	result.push({ periodo: 'General', promedio: calcularPromedioPonderado(allEntries) });

	return result;
}

export function esNotaEditable(fechaCalificacion: string): boolean {
	const fecha = new Date(fechaCalificacion);
	const limite = new Date(fecha);
	limite.setMonth(limite.getMonth() + MESES_LIMITE_EDICION);
	return new Date() < limite;
}
